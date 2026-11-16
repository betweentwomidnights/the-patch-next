// What the visuals hear. One shared, mutable snapshot of the music, updated
// once per frame from two AnalyserNodes and read by whichever engine is
// drawing.
//
// The browser's analyser does the FFT natively (this replaced the old
// worklet + wasm path). What makes the picture musical is what happens after
// the FFT, and that's all here:
//   - sixteen log-spaced bands, each measured against its own recent range,
//     so a quiet hi-hat moves its band as much as a loud bass moves its own
//   - brightness (where the weight of the spectrum sits)
//
// Drum hits come from somewhere else: public/worklets/hits.js finds them on
// the audio thread and says exactly when each one will be heard. This file
// holds each hit until the frame that will be on screen at that moment.
// (Browsers that can't run the worklet fall back to the onset detectors
// below, which look at the analyser once a frame and are far less exact.)

export const BAND_COUNT = 16;

export interface AudioFeatures {
  /** True while audio is actually flowing. */
  active: boolean;
  /** Eases 0..1 with `active`; scale effects by it so silence is calm. */
  presence: number;
  /** Smoothed broad energies, roughly 0..1. */
  level: number;
  bass: number;
  mid: number;
  high: number;
  /** Sixteen bands from about 40 Hz to 14 kHz, each 0..1 against its own recent range. */
  bands: Float32Array;
  /** 0 = all low end, 1 = all top end. */
  bright: number;
  /** Onset envelopes: jump on a hit, then fall away quickly. */
  kick: number;
  snare: number;
  hat: number;
  /** Changes on every kick; use it to vary what a kick does. */
  kickSeed: number;
  /** Counts kicks, so listeners can react exactly once to each. */
  kickCount: number;
}

export const features: AudioFeatures = {
  active: false,
  presence: 0,
  level: 0,
  bass: 0,
  mid: 0,
  high: 0,
  bands: new Float32Array(BAND_COUNT),
  bright: 0,
  kick: 0,
  snare: 0,
  hat: 0,
  kickSeed: 0,
  kickCount: 0,
};

const LOW_HZ = 40;
const HIGH_HZ = 14000;

// ---- timing: when does what we draw now reach the eye? ----

/** Typical time between frames, in ms. */
let frameMs = 1000 / 60;
/** Set with ?sync=<ms> to nudge the picture later (positive) or earlier. */
let trim: number | null = null;

function readTrim(): number {
  if (trim !== null) return trim;
  trim = 0;
  try {
    const asked = new URLSearchParams(window.location.search).get('sync');
    if (asked !== null && Number.isFinite(Number(asked))) window.localStorage.setItem('patch-sync', String(Number(asked)));
    trim = Math.min(300, Math.max(-300, Number(window.localStorage.getItem('patch-sync')) || 0));
  } catch {
    // no storage: no trim
  }
  return trim;
}

/**
 * Milliseconds from the start of a frame to its light leaving the screen.
 * The frame has to be drawn (one frame's time), then waits for the next
 * screen refresh in the system's compositor, then the panel itself takes a
 * few milliseconds. Nothing in the page can measure this, so it's that
 * usual sum, adjusted by the listener's trim (a positive trim says the
 * screen is quicker than we think, which moves the picture later).
 */
export function pictureDelay(): number {
  return frameMs + Math.min(frameMs, 17) + 6 - readTrim();
}

/** Says when a moment on the audio clock will be heard, on the page's clock (ms). */
export interface HitClock {
  heardAt(contextTime: number): number;
}

type HitKind = 'kick' | 'snare' | 'hat';
interface PendingHit {
  kind: HitKind;
  /** performance.now() time at which it will be heard. */
  at: number;
  strength: number;
  /** When we learned of it. */
  known: number;
}

/** In development, how the last hits were timed (see window.__sync). */
export const hitLog: { kind: HitKind; notice: number; error: number }[] = [];

/** Finds sudden rises in one slice of the spectrum (spectral flux). */
class Onset {
  private prev = 0;
  private avg = 0;
  private peak = 0;
  private since = 1;
  constructor(
    private lo: number,
    private hi: number,
    private minGap: number,
    private floor: number,
  ) {}

  /** Returns the hit's strength (0..1) on the frame it lands, else 0. */
  step(bins: Uint8Array, hzPerBin: number, dt: number): number {
    const a = Math.max(1, Math.floor(this.lo / hzPerBin));
    const b = Math.min(bins.length - 1, Math.ceil(this.hi / hzPerBin));
    let sum = 0;
    for (let i = a; i <= b; i++) sum += bins[i];
    const energy = sum / ((b - a + 1) * 255);
    const flux = Math.max(0, energy - this.prev);
    this.prev = energy;
    this.avg += (flux - this.avg) * (1 - Math.exp(-dt * 2.5));
    // only hits that stand up next to the loudest recent one count, so a
    // busy track still reads as a beat rather than constant rattling
    this.peak = Math.max(flux, this.peak * Math.exp(-dt * 0.6));
    this.since += dt;
    const ratio = flux / Math.max(this.avg, 0.004);
    if (flux > 0.035 && ratio > 3 && flux > this.peak * 0.5 && energy > this.floor && this.since > this.minGap) {
      this.since = 0;
      return Math.min(1, 0.3 + (ratio - 3) * 0.07 + flux * 1.6);
    }
    return 0;
  }
}

export class FeatureExtractor {
  private analyser: AnalyserNode;
  private fast: AnalyserNode;
  private bins: Uint8Array;
  private fastBins: Uint8Array;
  private hzPerBin: number;
  private fastHz: number;
  private edges: number[] = [];
  private bandMean = new Float32Array(BAND_COUNT);
  private bandDev = new Float32Array(BAND_COUNT).fill(0.05);
  private silentFor = 0;
  private pending: PendingHit[] = [];
  private timed = false;
  private kickOnset = new Onset(35, 140, 0.22, 0.3);
  private snareOnset = new Onset(180, 3200, 0.14, 0.18);
  private hatOnset = new Onset(6000, 14000, 0.07, 0.06);

  /** `analyser` is lightly smoothed (for bands); `fast` is unsmoothed (for onsets). */
  constructor(analyser: AnalyserNode, fast: AnalyserNode) {
    this.analyser = analyser;
    this.fast = fast;
    this.bins = new Uint8Array(analyser.frequencyBinCount);
    this.fastBins = new Uint8Array(fast.frequencyBinCount);
    this.hzPerBin = analyser.context.sampleRate / analyser.fftSize;
    this.fastHz = fast.context.sampleRate / fast.fftSize;
    for (let i = 0; i <= BAND_COUNT; i++) this.edges.push(LOW_HZ * Math.pow(HIGH_HZ / LOW_HZ, i / BAND_COUNT));
  }

  /**
   * Take hits from the audio-thread detector instead of finding them here.
   * Each message is a list of [kind, audio-clock time it began, strength].
   */
  listen(port: MessagePort, clock: HitClock): void {
    this.timed = true;
    port.onmessage = (e: MessageEvent<[HitKind, number, number][]>) => {
      const known = performance.now();
      for (const [kind, time, strength] of e.data) this.pending.push({ kind, at: clock.heardAt(time), strength, known });
      // (nothing draws in a hidden tab, so nothing would ever clear these out)
      if (this.pending.length > 200) this.pending.splice(0, this.pending.length - 200);
    };
  }

  /** The hits that belong to the frame being drawn: strongest of each kind, 0 if none. */
  private due(frameTime: number): Record<HitKind, number> {
    const now = { kick: 0, snare: 0, hat: 0 };
    if (this.pending.length === 0) return now;
    // This frame is what the listener will be looking at around `shown`.
    // A hit goes to whichever frame is nearest its moment.
    const shown = frameTime + pictureDelay();
    this.pending = this.pending.filter((hit) => {
      const error = shown - hit.at;
      if (error < -frameMs / 2) return true; // not yet
      // (after a stall, hits that are long gone are dropped, not played in a burst)
      if (error < 150) {
        now[hit.kind] = Math.max(now[hit.kind], hit.strength);
        if (process.env.NODE_ENV !== 'production') {
          hitLog.push({ kind: hit.kind, notice: Math.round(hit.at - hit.known), error: Math.round(error) });
          if (hitLog.length > 400) hitLog.shift();
        }
      }
      return false;
    });
    return now;
  }

  private mean(lo: number, hi: number): number {
    const a = Math.max(1, Math.floor(lo / this.hzPerBin));
    const b = Math.min(this.bins.length - 1, Math.max(a, Math.ceil(hi / this.hzPerBin) - 1));
    let sum = 0;
    for (let i = a; i <= b; i++) sum += this.bins[i];
    return sum / ((b - a + 1) * 255);
  }

  /** `frameTime` is the frame's own timestamp (what requestAnimationFrame passes). */
  update(dt: number, frameTime: number): void {
    this.analyser.getByteFrequencyData(this.bins);

    // ---- bands ----
    // Each band is read two ways and blended: how it's moving against its own
    // last second or two (so every band dances, whatever the mix), and how
    // loud it simply is (so quiet passages still look quiet).
    const up = 1 - Math.exp(-dt * 45);
    const down = 1 - Math.exp(-dt * 9);
    const slow = 1 - Math.exp(-dt * 0.7);
    let weight = 0;
    let moment = 0;
    for (let i = 0; i < BAND_COUNT; i++) {
      const raw = this.mean(this.edges[i], this.edges[i + 1]);
      this.bandMean[i] += (raw - this.bandMean[i]) * slow;
      this.bandDev[i] += (Math.abs(raw - this.bandMean[i]) - this.bandDev[i]) * slow;
      const moving = 0.5 + (0.5 * (raw - this.bandMean[i])) / Math.max(this.bandDev[i] * 2.5, 0.035);
      const loud = (raw - 0.25) / 0.6;
      const value = Math.min(1, Math.max(0, 0.65 * moving + 0.35 * loud));
      const cur = features.bands[i];
      features.bands[i] = cur + (value - cur) * (value > cur ? up : down);
      weight += raw;
      moment += raw * (i / (BAND_COUNT - 1));
    }
    const bright = weight > 0.001 ? moment / weight : 0;

    // ---- broad levels ----
    const bass = this.mean(30, 180);
    const mid = this.mean(300, 2400);
    const high = this.mean(4000, 12000);
    const level = bass * 0.45 + mid * 0.4 + high * 0.15;
    const ease = 1 - Math.exp(-dt * 14);
    features.bass += (bass - features.bass) * ease;
    features.mid += (mid - features.mid) * ease;
    features.high += (high - features.high) * ease;
    features.level += (level - features.level) * ease;
    features.bright += (bright - features.bright) * (1 - Math.exp(-dt * 6));

    this.silentFor = level < 0.02 ? this.silentFor + dt : 0;
    features.active = this.silentFor < 0.6;
    features.presence += ((features.active ? 1 : 0) - features.presence) * (1 - Math.exp(-dt * 3));

    // ---- hits ----
    let kick: number, snare: number, hat: number;
    if (this.timed) ({ kick, snare, hat } = this.due(frameTime));
    else {
      this.fast.getByteFrequencyData(this.fastBins);
      kick = this.kickOnset.step(this.fastBins, this.fastHz, dt);
      snare = this.snareOnset.step(this.fastBins, this.fastHz, dt);
      hat = this.hatOnset.step(this.fastBins, this.fastHz, dt);
    }

    if (kick > 0) {
      features.kick = kick;
      features.kickSeed = Math.random();
      features.kickCount++;
    } else features.kick *= Math.exp(-dt * 9);
    features.snare = snare > 0 ? Math.max(features.snare, snare) : features.snare * Math.exp(-dt * 10);
    features.hat = hat > 0 ? Math.max(features.hat, hat) : features.hat * Math.exp(-dt * 16);
  }
}

let extractor: FeatureExtractor | null = null;
let listening = false;

/** The radio hands over its analysers once the audio graph exists. */
export function setExtractor(e: FeatureExtractor | null): void {
  extractor = e;
}

/** The radio says whether sound is playing right now. */
export function setListening(on: boolean): void {
  listening = on;
}

/** Called once per frame by the visual layer, with the frame's timestamp. */
export function tickFeatures(dt: number, frameTime: number): void {
  frameMs += (Math.min(50, Math.max(4, dt * 1000)) - frameMs) * 0.05;
  if (extractor && listening) extractor.update(dt, frameTime);
  else relaxFeatures(dt);
}

/** Let everything settle when the music stops. */
function relaxFeatures(dt: number): void {
  const k = Math.exp(-dt * 4);
  features.active = false;
  features.presence *= k;
  features.level *= k;
  features.bass *= k;
  features.mid *= k;
  features.high *= k;
  features.bright *= k;
  features.kick *= Math.exp(-dt * 9);
  features.snare *= Math.exp(-dt * 10);
  features.hat *= Math.exp(-dt * 16);
  for (let i = 0; i < BAND_COUNT; i++) features.bands[i] *= k;
}
