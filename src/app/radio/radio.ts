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
import { FeatureExtractor, pictureDelay, setExtractor, setListening } from '../visual/features';
import { OutputClock } from './outputClock';

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
 * How long the speakers are held back, in seconds. Everything the visuals do
 * in time with the music depends on knowing about a sound before it's heard:
 * long enough to be sure a kick was a kick, get word of it to the page, and
 * get a frame through the browser and onto the screen. Nobody can tell a
 * radio is 150ms late; everybody can see a kick landing late.
 */
const HOLD = 0.15;

/**
 * The spectrum bands are smoothed, so they trail the sound by about this
 * many milliseconds. The analysers are shown the sound that much early.
 */
const BAND_LAG = 30;

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
  private clock: OutputClock | null = null;
  private hitsPort: MessagePort | null = null;
  private clockTimer: number | null = null;

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
    // The hit detector judges each hit against what's usual for the track.
    // New track, new usual.
    this.hitsPort?.postMessage('reset');
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
   * Route the audio through the things that listen for the visuals, and line
   * picture and sound up in time.
   *
   * The sound takes three paths out of the player:
   *
   *   to the speakers, held back by HOLD. That gap is what lets the picture
   *   be on time rather than chasing the sound.
   *
   *   to the hit detector (public/worklets/hits.js), straight away. It
   *   stamps each drum hit with the audio-clock time it happened; the clock
   *   below turns that into the moment it will be heard, and the visuals
   *   hold the hit until the frame that is on screen at that moment.
   *
   *   to the analysers (the spectrum), through a delay that is kept such
   *   that what they show now is what will be heard when the frame being
   *   drawn now reaches the screen. See tune().
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
      heard.delayTime.value = Math.round(HOLD / block) * block;
      source.connect(heard).connect(ctx.destination);
      const clock = new OutputClock(ctx, heard.delayTime.value);

      const seen = ctx.createDelay(1);
      seen.delayTime.value = heard.delayTime.value;
      const smooth = ctx.createAnalyser();
      smooth.fftSize = 2048;
      smooth.smoothingTimeConstant = 0.35;
      const fast = ctx.createAnalyser();
      fast.fftSize = 1024;
      fast.smoothingTimeConstant = 0;
      source.connect(seen);
      seen.connect(smooth);
      seen.connect(fast);
      const extractor = new FeatureExtractor(smooth, fast);
      setExtractor(extractor);

      this.ctx = ctx;
      this.clock = clock;
      this.analysisDelay = seen;
      void ctx.resume();
      void this.listenForHits(ctx, source, extractor, clock);
    } catch (err) {
      // No analysis is fine: the radio still plays, the ink just doesn't dance.
      console.warn('[radio] audio analysis unavailable:', err);
    }
  }

  private async listenForHits(ctx: AudioContext, source: AudioNode, extractor: FeatureExtractor, clock: OutputClock): Promise<void> {
    try {
      await ctx.audioWorklet.addModule('/worklets/hits.js');
      const hits = new AudioWorkletNode(ctx, 'hits', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2 });
      // It makes no sound, but some browsers only run a node whose output
      // leads somewhere, so lead it to the speakers through a closed door.
      const silent = ctx.createGain();
      silent.gain.value = 0;
      source.connect(hits).connect(silent).connect(ctx.destination);
      extractor.listen(hits.port, clock);
      this.hitsPort = hits.port;
    } catch (err) {
      // Older browsers, or a page not served securely: the extractor keeps
      // finding hits itself, less exactly.
      console.warn('[radio] timed hit detection unavailable:', err);
    }
  }

  /**
   * Keep the clock fresh and the analysers pointed at the right moment.
   *
   * A sound leaving the player is heard HOLD plus the output latency later.
   * A frame drawn from the analysers is seen one picture delay later, and
   * the bands in it are BAND_LAG behind. So the analysers should be reading
   * the sound that is (picture delay + BAND_LAG) short of being heard.
   *
   * The browser only knows its real output latency once sound is flowing,
   * and it changes when the listener switches speakers, so this runs a few
   * times a second. Moving this delay is inaudible: nothing downstream of it
   * reaches the speakers.
   */
  private tune(): void {
    const ctx = this.ctx;
    const clock = this.clock;
    if (!ctx || !clock || !this.analysisDelay) return;
    clock.sample();
    const want = Math.min(0.95, Math.max(0, clock.hold + clock.latency() - (pictureDelay() + BAND_LAG) / 1000));
    if (Math.abs(want - this.analysisDelay.delayTime.value) > 0.004) {
      this.analysisDelay.delayTime.setTargetAtTime(want, ctx.currentTime, 0.05);
    }
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as Record<string, unknown>).__clock = {
        outputLatency: Math.round(clock.latency() * 1000),
        reported: Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000),
        analysisDelay: Math.round(want * 1000),
      };
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
    if (this.clockTimer === null) this.clockTimer = window.setInterval(() => this.tune(), 250);
  }

  /** Stop the sound. The station carries on; play() rejoins it live. */
  pause(): void {
    this.wantPlaying = false;
    this.audio?.pause();
    if (this.clockTimer !== null) window.clearInterval(this.clockTimer);
    this.clockTimer = null;
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
