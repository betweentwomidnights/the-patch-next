// The radio, as one long-lived object outside React.
//
// The server (server.js + AudioStateManager.js) decides what is playing and
// where in the track "now" is; everyone who tunes in hears the same thing.
// This file follows that clock: it asks /api/stream/state where we are, plays
// /api/audio/<folder>/<file> from that position, and rejoins the station
// after a substantial stall.
//
// Track changes: each track is played to its own end and the next one is
// started from its first sample. The server says what's next in the same
// state answer during a track's last five seconds, so polling is enough.
// (The server also has a socket.io announcement, but its namespace has never
// accepted connections, so nothing here depends on it.)
//
// Because it lives outside any page, the music keeps going while you browse.

import trackInfo from '../components/NowPlaying/trackInfo';
import type { TrackInfo } from '../types/track';
import { FeatureExtractor, setExtractor, setListening } from '../visual/features';

interface StreamState {
  folder: string | null;
  file: string | null;
  /** When the track started, on the server's clock (ms since epoch). */
  startTime: number | null;
  duration: number | null;
  currentPosition: number;
  timestamp: number;
  listeners: number;
  nextTrack?: { folder: string; file: string; startTime: number } | null;
}

export interface RadioTrack {
  key: string;
  folder: string;
  file: string;
  title: string;
  info: TrackInfo | null;
  duration: number;
}

export type RadioStatus = 'off' | 'loading' | 'playing' | 'paused' | 'error';

export interface RadioSnapshot {
  status: RadioStatus;
  /** True once the listener has pressed play in this visit. */
  tunedIn: boolean;
  track: RadioTrack | null;
  listeners: number;
}

const OFF: RadioSnapshot = { status: 'off', tunedIn: false, track: null, listeners: 0 };

/**
 * How long the picture takes to answer a sound, in seconds: reading the
 * analyser, drawing, and the ink getting under way. The speakers are held
 * back by this much so the two arrive together (see ensureGraph). Raise it
 * if the ink still looks late, lower it if it looks early.
 */
const LOOKAHEAD = 0.07;

const audioUrl = (folder: string, file: string) => `/api/audio/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;

function prettyName(file: string): string {
  return file.replace(/\.(mp3|wav)$/i, '').replace(/[_-]+/g, ' ').trim();
}

class Radio {
  private snapshot: RadioSnapshot = OFF;
  private listeners = new Set<() => void>();

  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private analysisDelay: DelayNode | null = null;

  private state: StreamState | null = null;
  // Server clock minus ours, in ms. Every answer from the server gives an
  // estimate, but one that took a while to arrive could be off by half its
  // round trip. So we keep the estimate from the quickest answer and only
  // replace it with a quicker one (or once it has gone stale). Trusting each
  // answer as it came is what made the radio skip: one slow response and it
  // would decide we were seconds off and jump.
  private clockOffset = 0;
  private offsetRtt = Infinity;
  private offsetAt = 0;
  /** What plays after the loaded track, once the server has said. */
  private next: { folder: string; file: string } | null = null;
  /** The track we just played out. The server may still be on it for a moment. */
  private finishedKey: string | null = null;
  /** Our track has ended and we don't know yet what follows. */
  private waiting = false;
  private loadedKey: string | null = null;
  private wantPlaying = false;
  private watching = 0;

  // ---- store plumbing (useSyncExternalStore) ----
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = (): RadioSnapshot => this.snapshot;

  private set(patch: Partial<RadioSnapshot>): void {
    const next = { ...this.snapshot, ...patch };
    const same =
      next.status === this.snapshot.status &&
      next.tunedIn === this.snapshot.tunedIn &&
      next.listeners === this.snapshot.listeners &&
      next.track?.key === this.snapshot.track?.key &&
      next.track?.duration === this.snapshot.track?.duration;
    if (same) return;
    this.snapshot = next;
    setListening(next.status === 'playing');
    this.updateMediaSession();
    this.listeners.forEach((l) => l());
  }

  // ---- following the server ----

  /** Our clock, in ms since epoch, immune to the system clock being changed. */
  private localNow(): number {
    return performance.timeOrigin + performance.now();
  }

  /** Where the server is in the current track right now, in seconds. */
  position(): number {
    const start = this.state?.startTime;
    if (!start) return 0;
    const at = (this.localNow() + this.clockOffset - start) / 1000;
    const duration = this.state?.duration ?? 0;
    return Math.max(0, duration > 0 ? Math.min(at, duration) : at);
  }

  private describe(folder: string, file: string, duration: number): RadioTrack {
    const key = `${folder}/${file}`;
    const info = (trackInfo as Record<string, TrackInfo>)[key] ?? null;
    return { key, folder, file, title: info?.displayName ?? prettyName(file), info, duration };
  }

  private async fetchState(): Promise<StreamState | null> {
    try {
      const t0 = this.localNow();
      const res = await fetch('/api/stream/state', { cache: 'no-store' });
      const t1 = this.localNow();
      if (!res.ok) return null;
      const state = (await res.json()) as StreamState;
      const rtt = t1 - t0;
      const stale = performance.now() - this.offsetAt > 120_000;
      if (rtt <= this.offsetRtt || stale) {
        this.clockOffset = state.timestamp - (t0 + t1) / 2;
        this.offsetRtt = rtt;
        this.offsetAt = performance.now();
      }
      this.state = state;
      if (state.folder && state.file) {
        const key = `${state.folder}/${state.file}`;
        // If we've already moved on from this track, keep showing ours.
        if (key === this.finishedKey && this.loadedKey !== key) this.set({ listeners: state.listeners ?? 0 });
        else this.set({ listeners: state.listeners ?? 0, track: this.describe(state.folder, state.file, state.duration ?? 0) });
      }
      return state;
    } catch {
      return null;
    }
  }

  /** Bring the audio element in line with the server. */
  private async sync(): Promise<void> {
    const state = await this.fetchState();
    const audio = this.audio;
    if (!state || !state.folder || !state.file || !audio || !this.wantPlaying) return;
    const key = `${state.folder}/${state.file}`;
    const duration = state.duration ?? 0;
    this.matchLatency();

    if (key === this.loadedKey) {
      this.finishedKey = null;
      if (state.nextTrack) this.next = { folder: state.nextTrack.folder, file: state.nextTrack.file };
      if (audio.ended || this.waiting) {
        // We reached the end before the server did. Start what's next if we
        // know it. (If the server has gone round to this same file again,
        // rejoin it where it is.) Never press play on an ended track: that
        // starts it over from the top.
        if (this.next) this.startNext();
        else if (this.position() < duration - 8) void this.load(state.folder, state.file, () => this.position());
        return;
      }
      if (!audio.seeking && audio.readyState >= 2) {
        if (audio.paused) audio.play().catch(() => undefined);
        this.steer(audio, duration);
      }
      return;
    }

    // ---- the server is on a different track from us ----
    if (key === this.finishedKey) {
      // It's still wrapping up the one we've already finished: we're a touch
      // ahead of it, which is fine.
      if (this.waiting && state.nextTrack) {
        this.next = { folder: state.nextTrack.folder, file: state.nextTrack.file };
        this.startNext();
      }
      return;
    }
    const there = { folder: state.folder, file: state.file };
    if (this.waiting) {
      // Ours is over and this is what followed it. From the top, unless the
      // server is already well into it (we must have stalled).
      this.next = there;
      this.startNext(this.position() < 12 ? undefined : () => this.position());
      return;
    }
    const tail = Number.isFinite(audio.duration) ? audio.duration - audio.currentTime : Infinity;
    if (this.loadedKey && !audio.ended && !audio.paused && tail < 14) {
      // We're a little behind and still playing out the last seconds. Let
      // them finish; `ended` will start this one from its beginning.
      this.next = there;
      return;
    }
    // Just tuned in, or badly out of step: join the station where it is.
    await this.load(state.folder, state.file, () => this.position());
  }

  /** Our track finished: move on. */
  private onEnded(): void {
    if (!this.wantPlaying) return;
    this.finishedKey = this.loadedKey;
    if (this.next) {
      this.startNext();
    } else {
      this.waiting = true;
      void this.sync().then(() => this.schedule());
    }
  }

  private startNext(position: () => number = () => 0): void {
    const next = this.next;
    if (!next) return;
    this.next = null;
    this.waiting = false;
    // Say what's on now; the server will fill in the length when it catches up.
    if (this.snapshot.track?.key !== `${next.folder}/${next.file}`) this.set({ track: this.describe(next.folder, next.file, 0) });
    void this.load(next.folder, next.file, position);
  }

  /**
   * Keep in step with the station without the listener hearing it happen.
   * Being a few seconds off from everyone else doesn't matter; a seek
   * does, it's an audible skip. Leave ordinary clock drift alone.
   * Keep playback at its native rate: changing speed invokes the browser's
   * pitch correction and can smear music. Only seek after a substantial
   * stall or a laptop waking up.
   */
  private steer(audio: HTMLAudioElement, duration: number): void {
    const target = this.position();
    const drift = audio.currentTime - target; // positive: we're ahead
    const off = Math.abs(drift);
    if (audio.playbackRate !== 1) audio.playbackRate = 1;
    // The threshold is generous on purpose. Playing tracks back to back we
    // settle a few seconds ahead of the server (it pauses for a moment
    // between tracks, we don't), and that must never trigger a jump.
    if (off > 10 && target < duration - 12) {
      audio.currentTime = target;
    }
  }

  private load(folder: string, file: string, position: () => number): Promise<void> {
    const audio = this.audio;
    if (!audio) return Promise.resolve();
    this.loadedKey = `${folder}/${file}`;
    this.next = null;
    this.waiting = false;
    return new Promise((resolve) => {
      const onMeta = () => {
        audio.removeEventListener('loadedmetadata', onMeta);
        const at = position();
        if (at > 0.5 && Number.isFinite(audio.duration) && at < audio.duration - 0.5) audio.currentTime = at;
        if (this.wantPlaying) audio.play().catch(() => this.set({ status: 'paused' }));
        resolve();
      };
      audio.addEventListener('loadedmetadata', onMeta);
      audio.playbackRate = 1;
      audio.src = audioUrl(folder, file);
      audio.load();
      if (this.wantPlaying) audio.play().catch(() => undefined);
    });
  }

  private schedule(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    if (!this.snapshot.tunedIn && this.watching === 0) return;
    // Between tracks, ask often: the answer is what we're waiting on.
    const delay = this.waiting && this.wantPlaying ? 400 : this.wantPlaying ? 2000 : 12000;
    this.timer = window.setTimeout(async () => {
      if (!document.hidden || this.wantPlaying) await this.sync();
      this.schedule();
    }, delay);
  }

  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('playing', () => this.set({ status: 'playing' }));
    audio.addEventListener('waiting', () => {
      if (this.wantPlaying) this.set({ status: 'loading' });
    });
    audio.addEventListener('pause', () => {
      if (!this.wantPlaying) this.set({ status: 'paused' });
    });
    audio.addEventListener('ended', () => this.onEnded());
    audio.addEventListener('error', () => {
      if (!this.wantPlaying) return;
      this.loadedKey = null;
      this.set({ status: 'error' });
    });
    this.audio = audio;
    return audio;
  }

  /**
   * Route the audio through analysers so the visuals can hear it, and line
   * the two up in time.
   *
   * Left alone they don't line up, in two ways. The analysers see a sample
   * the instant it enters the graph, but the listener hears it one output
   * latency later (tens of milliseconds, far more on bluetooth), so the
   * picture runs ahead of the sound. And the picture itself is slow to
   * answer: a frame to read the analyser, a frame or two to draw, and ink
   * that has to physically start moving.
   *
   * So there are two delays. The analysers listen through one equal to the
   * output latency, which puts them exactly where the speakers are. And the
   * speakers get the sound LOOKAHEAD later than that, which gives the ink a
   * head start the size of its own reaction time. Nobody can hear a radio
   * being 70ms late; everybody can see a kick landing late.
   */
  private ensureGraph(audio: HTMLAudioElement): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor({ latencyHint: 'playback' });
      const source = ctx.createMediaElementSource(audio);

      // A whole number of render blocks, so the delay copies samples exactly
      // instead of interpolating between them. Set once and never moved:
      // changing a delay you can hear bends the pitch.
      const block = 128 / ctx.sampleRate;
      const heard = ctx.createDelay(1);
      heard.delayTime.value = Math.round(LOOKAHEAD / block) * block;
      source.connect(heard).connect(ctx.destination);

      const seen = ctx.createDelay(1);
      seen.delayTime.value = 0;
      const smooth = ctx.createAnalyser();
      smooth.fftSize = 2048;
      smooth.smoothingTimeConstant = 0.35;
      const fast = ctx.createAnalyser();
      fast.fftSize = 1024;
      fast.smoothingTimeConstant = 0;
      source.connect(seen);
      seen.connect(smooth);
      seen.connect(fast);
      setExtractor(new FeatureExtractor(smooth, fast));

      this.ctx = ctx;
      this.analysisDelay = seen;
      void ctx.resume().then(() => this.matchLatency());
    } catch (err) {
      // No analysis is fine: the radio still plays, the ink just doesn't dance.
      console.warn('[radio] audio analysis unavailable:', err);
    }
  }

  /**
   * Keep the analysers' delay equal to the output latency. The browser only
   * knows the real figure once sound is flowing, and it changes when the
   * listener switches speakers, so this is called again every sync. Moving
   * this delay is inaudible: nothing downstream of it reaches the speakers.
   */
  private matchLatency(): void {
    const ctx = this.ctx;
    if (!ctx || !this.analysisDelay) return;
    const latency = Math.min(0.9, Math.max(0, (ctx.baseLatency || 0) + (ctx.outputLatency || 0)));
    if (Math.abs(latency - this.analysisDelay.delayTime.value) > 0.004) {
      this.analysisDelay.delayTime.setTargetAtTime(latency, ctx.currentTime, 0.05);
    }
  }

  private updateMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const { track, status } = this.snapshot;
    if (track && typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: 'the patch radio',
        artwork: [{ src: '/brand/collabage-patch-logo-512.png', sizes: '512x512', type: 'image/png' }],
      });
    }
    navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : status === 'off' ? 'none' : 'paused';
  }

  // ---- what the UI calls ----

  /** Learn what's on without tuning in (for "now playing" labels). */
  async peek(): Promise<void> {
    if (!this.state) await this.fetchState();
  }

  /** Keep "now playing" fresh while something on screen shows it. */
  watch(): () => void {
    this.watching++;
    void this.peek();
    this.schedule();
    return () => {
      this.watching = Math.max(0, this.watching - 1);
    };
  }

  /** Tune in. Call from a click or tap: browsers require a gesture for sound. */
  play(): void {
    this.wantPlaying = true;
    const audio = this.ensureAudio();
    this.ensureGraph(audio);
    this.set({ tunedIn: true, status: 'loading' });
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
    }
    // If we already know the track, start it inside the gesture (iOS needs
    // that), then correct the position once the fresh state arrives.
    const s = this.state;
    if (s?.folder && s.file && this.loadedKey !== `${s.folder}/${s.file}`) {
      const duration = s.duration ?? 0;
      if (!(duration > 0 && this.position() >= duration - 0.25)) void this.load(s.folder, s.file, () => this.position());
    } else if (this.loadedKey && !audio.ended) {
      audio.play().catch(() => undefined);
    }
    // A couple of extra quick looks at the server's clock, so the estimate
    // is good before the first note rather than a minute later.
    void this.fetchState();
    void this.sync().then(() => this.schedule());
  }

  /** Stop the sound. The station carries on; play() rejoins it live. */
  pause(): void {
    this.wantPlaying = false;
    this.audio?.pause();
    this.set({ status: this.snapshot.tunedIn ? 'paused' : 'off' });
    this.schedule();
  }

  toggle(): void {
    if (this.wantPlaying) this.pause();
    else this.play();
  }
}

let instance: Radio | null = null;

/** The one radio. Only exists in the browser. */
export function getRadio(): Radio {
  if (!instance) instance = new Radio();
  return instance;
}

export const RADIO_OFF = OFF;
