// What the visuals hear. One shared, mutable snapshot of the music, updated
// once per frame from two AnalyserNodes and read by whichever engine is
// drawing.
//
// The browser's analyser does the FFT natively (this replaced the old
// worklet + wasm path). What makes the picture musical is what happens after
// the FFT, and that's all here:
//   - sixteen log-spaced bands, each measured against its own recent range,
//     so a quiet hi-hat moves its band as much as a loud bass moves its own
//   - three separate onset detectors (kick, snare, hat) on an unsmoothed
//     analyser, each judged against its own recent history
//   - brightness (where the weight of the spectrum sits)

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

  private mean(lo: number, hi: number): number {
    const a = Math.max(1, Math.floor(lo / this.hzPerBin));
    const b = Math.min(this.bins.length - 1, Math.max(a, Math.ceil(hi / this.hzPerBin) - 1));
    let sum = 0;
    for (let i = a; i <= b; i++) sum += this.bins[i];
    return sum / ((b - a + 1) * 255);
  }

  update(dt: number): void {
    this.analyser.getByteFrequencyData(this.bins);
    this.fast.getByteFrequencyData(this.fastBins);

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
    const kick = this.kickOnset.step(this.fastBins, this.fastHz, dt);
    if (kick > 0) {
      features.kick = kick;
      features.kickSeed = Math.random();
      features.kickCount++;
    } else features.kick *= Math.exp(-dt * 9);

    const snare = this.snareOnset.step(this.fastBins, this.fastHz, dt);
    features.snare = snare > 0 ? Math.max(features.snare, snare) : features.snare * Math.exp(-dt * 10);

    const hat = this.hatOnset.step(this.fastBins, this.fastHz, dt);
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

/** Called once per frame by the visual layer. */
export function tickFeatures(dt: number): void {
  if (extractor && listening) extractor.update(dt);
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
