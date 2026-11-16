// Finds drum hits in the radio's audio. Runs on the audio thread.
//
// Why here and not in the page: the page only gets to look at the sound once
// per drawn frame, through a blurry 20ms window, so it can never say when a
// kick happened more exactly than "some time in the last frame or two". This
// code sees every 128 samples (under 3ms) and stamps each hit with the audio
// clock time at which it began. The speakers are held back a moment (see
// radio.ts), so the page learns about a hit before anyone hears it and can
// have the picture ready for exactly that instant.
//
// Each of the three bands is listened to the same way: filter it out, follow
// its energy, and call a hit when the energy jumps well clear of where it was
// a moment ago and ends up loud next to both the recent loudest and the hits
// this track usually has. The hit is dated from the bottom of the jump, not
// from when we became sure of it.
//
// Plain JavaScript on purpose: worklets load as their own file, outside the
// app bundle. tests/hits.test.cjs runs this same file against made-up drums.

const BANDS = [
  // name, filters [type, Hz, Q], energy window, how far back a jump is measured from,
  // jump needed (energy ratio), loudness needed next to the recent loudest (energy ratio),
  // shortest time between hits, and how late the filters deliver (all in seconds).
  {
    name: 'kick',
    filters: [['high', 32, 0.707], ['low', 120, 0.541], ['low', 120, 1.307]],
    window: 0.021,
    span: 0.019,
    jump: 2.2,
    loud: 0.2,
    gap: 0.2,
    lag: 0.0045,
  },
  {
    name: 'snare',
    filters: [['high', 1200, 0.541], ['high', 1200, 1.307], ['low', 5000, 0.707]],
    window: 0.008,
    span: 0.008,
    jump: 2.6,
    loud: 0.22,
    gap: 0.14,
    lag: 0.0006,
  },
  {
    name: 'hat',
    filters: [['high', 7000, 0.541], ['high', 7000, 1.307]],
    window: 0.0055,
    span: 0.0055,
    jump: 2.2,
    loud: 0.15,
    gap: 0.07,
    lag: 0.0002,
  },
];

/** Quieter than this (mean square) is nothing at all: about -66 dBFS. */
const FLOOR = 2.5e-7;
/** A hit has to stop getting louder within this long (plus its energy window), in seconds. */
const CREST = 0.06;
/** How long "the recent loudest" is remembered, in seconds. */
const MEMORY = 3;
/**
 * How long the track's usual hit is remembered once hits like it stop, in
 * seconds. This is what keeps a beat drop quiet: when the drums fall away,
 * a soft bass note is suddenly the loudest thing in the last few seconds,
 * but it is still nothing next to the kicks that were just there.
 */
const USUAL_MEMORY = 40;

function makeFilter(type, hz, q, rate) {
  const w = (2 * Math.PI * hz) / rate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const b1 = type === 'low' ? 1 - cos : -(1 + cos);
  const b0 = type === 'low' ? b1 / 2 : -b1 / 2;
  return { b0: b0 / a0, b1: b1 / a0, b2: b0 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0, z1: 0, z2: 0 };
}

class Band {
  constructor(spec, rate, blockSize) {
    const block = blockSize / rate;
    this.name = spec.name;
    this.block = block;
    this.filters = spec.filters.map(([type, hz, q]) => makeFilter(type, hz, q, rate));
    this.energies = new Float64Array(Math.max(1, Math.round(spec.window / block)));
    this.at = 0;
    this.sum = 0;
    // the last few levels (log energy), to measure a jump from
    this.levels = new Float64Array(Math.max(1, Math.round(spec.span / block))).fill(-30);
    this.times = new Float64Array(this.levels.length);
    this.li = 0;
    this.jump = Math.log(spec.jump);
    this.loud = spec.loud;
    this.gap = spec.gap;
    this.lag = spec.lag;
    this.forget = Math.exp(-block / MEMORY);
    this.fade = Math.exp(-block / USUAL_MEMORY);
    this.usual = 0;
    this.patience = this.energies.length + Math.round(CREST / block);
    this.loudest = 0;
    this.last = -1;
    this.rising = false;
    this.start = 0;
    this.from = 0;
    this.top = 0;
    this.flat = 0;
    this.blocks = 0;
  }

  /** One sample in; returns it filtered down to this band. */
  filter(x) {
    const fs = this.filters;
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      const y = f.b0 * x + f.z1;
      f.z1 = f.b1 * x - f.a1 * y + f.z2;
      f.z2 = f.b2 * x - f.a2 * y;
      x = y;
    }
    return x;
  }

  /**
   * One block's energy in (mean square), with the time the block began.
   * Returns { time, strength } when a hit has just been confirmed, else null.
   */
  step(energy, time) {
    this.sum += energy - this.energies[this.at];
    this.energies[this.at] = energy;
    this.at = (this.at + 1) % this.energies.length;
    if (this.sum < 0) this.sum = 0;
    const e = this.sum / this.energies.length;

    this.loudest = Math.max(e, this.loudest * this.forget);
    this.usual *= this.fade;
    // Levels are logs, with a floor 30 dB under the recent loudest: a jump out
    // of dead silence then counts as a big jump, not an infinite one, and
    // rustling in a quiet gap counts as nothing.
    const floor = this.loudest * 1e-3 + 1e-9;
    const level = Math.log(e + floor);

    // The lowest of the last few levels, and the last moment it was still
    // down there (a held bass note wobbles a little; the jump starts where
    // the wobble ends, not at its lowest point).
    let low = Infinity;
    for (let i = 0; i < this.levels.length; i++) low = Math.min(low, this.levels[i]);
    let lowTime = time;
    for (let k = this.levels.length - 1; k >= 0; k--) {
      const i = (this.li + k) % this.levels.length;
      if (this.levels[i] <= low + this.jump * 0.25) {
        lowTime = this.times[i];
        break;
      }
    }
    this.levels[this.li] = level;
    this.times[this.li] = time;
    this.li = (this.li + 1) % this.levels.length;

    let hit = null;
    if (!this.rising) {
      if (level - low > this.jump && e > FLOOR && time - this.last > this.gap) {
        this.rising = true;
        // it began in the block after the low one; call it the middle of that block
        this.start = lowTime + this.block * 1.5 - this.lag;
        this.from = low;
        this.top = e;
        this.flat = 0;
        this.blocks = 0;
      }
    } else {
      this.blocks++;
      if (e > this.top) {
        this.top = e;
        this.flat = 0;
      } else this.flat++;
      // Wait for it to crest, so we know how big it was. A drum is at its
      // loudest within a few hundredths of a second; something still
      // climbing after that is a swell or a fade-in, not a hit.
      const crested = this.flat >= 2;
      if (crested || this.blocks > this.patience) {
        this.rising = false;
        // It has to stand up next to both the loudest of the last few
        // seconds and the hits this track usually has.
        const against = Math.max(this.loudest, this.usual);
        if (crested && this.top > this.loud * against) {
          this.last = this.start;
          const size = Math.sqrt(this.top / against);
          const rise = Math.min(1, (Math.log(this.top + floor) - this.from - this.jump) / 3);
          hit = { time: this.start, strength: Math.min(1, size * (0.75 + 0.25 * rise)) };
          // Learn what's usual from the hits themselves: quickly when they
          // get louder, more slowly when they get softer, so a quieter
          // passage becomes the new normal after a few bars of it.
          if (this.usual === 0) this.usual = this.top;
          else this.usual += (this.top - this.usual) * (this.top > this.usual ? 0.5 : 0.15);
        }
      }
    }
    return hit;
  }
}

class HitsProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bands = null;
    this.sums = new Float64Array(BANDS.length);
    // A new track is a clean slate: what was usual for the last one says
    // nothing about this one.
    this.port.onmessage = (e) => {
      if (e.data === 'reset') this.bands = null;
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const left = input[0];
    const right = input.length > 1 ? input[1] : left;
    const n = left.length;
    if (!this.bands) this.bands = BANDS.map((spec) => new Band(spec, sampleRate, n));
    const bands = this.bands;
    const sums = this.sums;
    sums.fill(0);
    for (let i = 0; i < n; i++) {
      // (the tiny offset keeps silent filters out of slow denormal arithmetic)
      const x = (left[i] + right[i]) * 0.5 + 1e-18;
      for (let b = 0; b < bands.length; b++) {
        const y = bands[b].filter(x);
        sums[b] += y * y;
      }
    }
    let found = null;
    for (let b = 0; b < bands.length; b++) {
      const hit = bands[b].step(sums[b] / n, currentTime);
      if (hit) (found ??= []).push([bands[b].name, hit.time, hit.strength]);
    }
    if (found) this.port.postMessage(found);
    return true;
  }
}

registerProcessor('hits', HitsProcessor);
