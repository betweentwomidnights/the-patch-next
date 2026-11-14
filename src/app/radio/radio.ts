// The radio, as one long-lived object outside React.
//
// The server (server.js + AudioStateManager.js) decides what is playing and
// where in the track "now" is; everyone who tunes in hears the same thing.
// This file follows that clock: it asks /api/stream/state where we are, plays
// /api/audio/<folder>/<file> from that position, listens on socket.io for the
// next track, and nudges playback back in line if it drifts.
//
// Because it lives outside any page, the music keeps going while you browse.

import { io, type Socket } from 'socket.io-client';
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

const audioUrl = (folder: string, file: string) => `/api/audio/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;

function prettyName(file: string): string {
  return file.replace(/\.(mp3|wav)$/i, '').replace(/[_-]+/g, ' ').trim();
}

class Radio {
  private snapshot: RadioSnapshot = OFF;
  private listeners = new Set<() => void>();

  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private socket: Socket | null = null;
  private timer: number | null = null;
  private switchTimer: number | null = null;

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
  /** The track the server last told us was coming next. */
  private announced: string | null = null;
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
        const info = (trackInfo as Record<string, TrackInfo>)[key] ?? null;
        this.set({
          listeners: state.listeners ?? 0,
          track: {
            key,
            folder: state.folder,
            file: state.file,
            title: info?.displayName ?? prettyName(state.file),
            info,
            duration: state.duration ?? 0,
          },
        });
      }
      return state;
    } catch {
      return null;
    }
  }

  /** Bring the audio element in line with the server. */
  private async sync(force = false): Promise<void> {
    const state = await this.fetchState();
    const audio = this.audio;
    if (!state || !state.folder || !state.file || !audio || !this.wantPlaying) return;
    const key = `${state.folder}/${state.file}`;
    const duration = state.duration ?? 0;

    if (key !== this.loadedKey || force) {
      // We may already be on the next track (the server announced it) while
      // the server is still wrapping up this one. Don't go back.
      if (this.loadedKey === this.announced && duration > 0 && this.position() > duration - 8) return;
      // The server holds a finished track for a moment before moving on.
      if (duration > 0 && this.position() >= duration - 0.25) return;
      await this.load(state.folder, state.file, () => this.position());
      return;
    }
    if (this.wantPlaying && !audio.seeking && audio.readyState >= 2) {
      if (audio.paused) audio.play().catch(() => undefined);
      this.steer(audio, duration);
    }
  }

  /**
   * Keep in step with the station without the listener hearing it happen.
   * Being a couple of seconds off from everyone else doesn't matter; a seek
   * does, it's an audible skip. So: within two seconds, leave it alone.
   * Further out, play 2.5% fast or slow until it's back. Only jump when it's
   * far gone (after a long stall, or a laptop waking up).
   */
  private steer(audio: HTMLAudioElement, duration: number): void {
    const target = this.position();
    const drift = audio.currentTime - target; // positive: we're ahead
    const off = Math.abs(drift);
    if (off > 6 && target < duration - 2) {
      audio.playbackRate = 1;
      audio.currentTime = target;
    } else if (off > 2) {
      audio.playbackRate = drift > 0 ? 0.975 : 1.025;
    } else if (off < 0.5 && audio.playbackRate !== 1) {
      audio.playbackRate = 1;
    }
  }

  private load(folder: string, file: string, position: () => number): Promise<void> {
    const audio = this.audio;
    if (!audio) return Promise.resolve();
    this.loadedKey = `${folder}/${file}`;
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
    const delay = this.wantPlaying ? 2000 : 12000;
    this.timer = window.setTimeout(async () => {
      if (!document.hidden || this.wantPlaying) await this.sync();
      this.schedule();
    }, delay);
  }

  private ensureSocket(): void {
    if (this.socket) return;
    this.socket = io('/stream');
    // The server announces the next track about five seconds early, with the
    // moment (its clock) it will start.
    this.socket.on('trackChange', (data: { nextTrack?: { folder: string; file: string; startTime: number } }) => {
      const next = data?.nextTrack;
      if (!next) return;
      const startsAt = next.startTime - this.clockOffset; // on our clock
      if (this.switchTimer !== null) window.clearTimeout(this.switchTimer);
      this.switchTimer = window.setTimeout(() => {
        if (!this.wantPlaying) return;
        this.announced = `${next.folder}/${next.file}`;
        void this.load(next.folder, next.file, () => Math.max(0, (this.localNow() - startsAt) / 1000));
      }, Math.max(0, startsAt - this.localNow()));
    });
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
    audio.addEventListener('ended', () => void this.sync());
    audio.addEventListener('error', () => {
      if (!this.wantPlaying) return;
      this.loadedKey = null;
      this.set({ status: 'error' });
    });
    this.audio = audio;
    return audio;
  }

  /** Route the audio through analysers so the visuals can hear it. */
  private ensureGraph(audio: HTMLAudioElement): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const source = ctx.createMediaElementSource(audio);
      const smooth = ctx.createAnalyser();
      smooth.fftSize = 2048;
      smooth.smoothingTimeConstant = 0.35;
      const fast = ctx.createAnalyser();
      fast.fftSize = 1024;
      fast.smoothingTimeConstant = 0;
      source.connect(ctx.destination);
      source.connect(smooth);
      source.connect(fast);
      setExtractor(new FeatureExtractor(smooth, fast));
      this.ctx = ctx;
      void ctx.resume();
    } catch (err) {
      // No analysis is fine: the radio still plays, the ink just doesn't dance.
      console.warn('[radio] audio analysis unavailable:', err);
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
    this.ensureSocket();
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
    } else if (this.loadedKey) {
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
