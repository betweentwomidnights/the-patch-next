// The drum-hit detector (public/worklets/hits.js) runs on the browser's audio
// thread. Here it runs in a sandbox over drums we make ourselves, so we know
// exactly when every hit really happened.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const RATE = 48000;
const BLOCK = 128;

/**
 * Feed samples through the processor the way a browser would; collect
 * [kind, time, strength]. `resetAt` (seconds) tells it a new track began there.
 */
function detect(samples, resetAt = Infinity) {
  const hits = [];
  const sandbox = { sampleRate: RATE, currentTime: 0, Math, Float64Array, Infinity };
  sandbox.AudioWorkletProcessor = class {
    constructor() {
      this.port = { postMessage: (found) => hits.push(...found) };
    }
  };
  let Processor;
  sandbox.registerProcessor = (_name, cls) => {
    Processor = cls;
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/worklets/hits.js'), 'utf8'), sandbox);
  const processor = new Processor();
  for (let i = 0; i + BLOCK <= samples.length; i += BLOCK) {
    sandbox.currentTime = i / RATE;
    if (sandbox.currentTime >= resetAt) {
      processor.port.onmessage({ data: 'reset' });
      resetAt = Infinity;
    }
    const block = samples.subarray(i, i + BLOCK);
    processor.process([[block, block]]);
  }
  return hits;
}

/** A 120bpm loop: kick on every beat, snare on every other, hats on the eighths, over a held bass note. */
function drums(seconds, bass) {
  const out = new Float32Array(RATE * seconds);
  const truth = { kick: [], snare: [], hat: [] };
  let seed = 7;
  const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  for (let beat = 0; 0.5 + beat * 0.5 < seconds - 1; beat++) {
    // nudged off the 128-sample grid, differently each beat
    const at = 0.5 + beat * 0.5 + 0.00137 * (beat % 7);
    const start = Math.floor(at * RATE);
    truth.kick.push(at);
    let phase = 0;
    for (let i = 0; i < RATE * 0.25; i++) {
      const t = i / RATE;
      phase += (2 * Math.PI * (50 + 110 * Math.exp(-t * 28))) / RATE;
      out[start + i] += 0.8 * Math.sin(phase) * Math.exp(-t * 11);
    }
    if (beat % 2 === 1) {
      truth.snare.push(at);
      let low = 0;
      for (let i = 0; i < RATE * 0.12; i++) {
        const n = noise();
        low += 0.35 * (n - low);
        out[start + i] += 0.5 * (n - low * 0.3) * Math.exp((-i / RATE) * 30);
      }
    }
    for (const offset of [0, 0.25]) {
      truth.hat.push(at + offset);
      const from = Math.floor((at + offset) * RATE);
      let prev = 0;
      for (let i = 0; i < RATE * 0.04; i++) {
        const n = noise();
        out[from + i] += 0.2 * (n - prev) * Math.exp((-i / RATE) * 90);
        prev = n;
      }
    }
  }
  for (let i = 0; i < out.length; i++) out[i] += bass * Math.sin((2 * Math.PI * 55 * i) / RATE);
  return { out, truth };
}

/** For each real hit, how far off (ms) the nearest detected one was; plus detections matching nothing. */
function compare(hits, truth, kind) {
  const found = hits.filter((h) => h[0] === kind).map((h) => h[1]);
  const errors = truth.map((t) => Math.min(...found.map((f) => Math.abs(f - t))) * 1000);
  const extra = found.filter((f) => !truth.some((t) => Math.abs(f - t) < 0.03)).length;
  return { errors, extra };
}

test('every hit is found and dated to within a few milliseconds', () => {
  const { out, truth } = drums(12, 0);
  const hits = detect(out);
  for (const [kind, tolerance] of [['kick', 6], ['snare', 3], ['hat', 3]]) {
    const { errors } = compare(hits, truth[kind], kind);
    assert.ok(Math.max(...errors) < tolerance, `${kind} was up to ${Math.max(...errors).toFixed(1)}ms out`);
  }
  assert.equal(compare(hits, truth.kick, 'kick').extra, 0, 'kicks that were not there');
});

test('kicks are still found, and still on time, over a held bass note', () => {
  const { out, truth } = drums(12, 0.15);
  const { errors } = compare(detect(out), truth.kick, 'kick');
  assert.ok(Math.max(...errors) < 8, `a kick was ${Math.max(...errors).toFixed(1)}ms out`);
});

test('a held bass note is not a string of kicks', () => {
  // It starts at half a second (that start is fair game), then holds for
  // seven more with a slow wobble in its level.
  const out = new Float32Array(RATE * 8);
  for (let i = RATE / 2; i < out.length; i++) {
    const t = i / RATE;
    out[i] = 0.4 * (1 + 0.15 * Math.sin(2 * Math.PI * 5 * t)) * Math.sin(2 * Math.PI * 55 * t);
  }
  const later = detect(out).filter((h) => h[0] === 'kick' && h[1] > 0.6);
  assert.equal(later.length, 0);
});

test('silence and very quiet noise produce nothing', () => {
  const out = new Float32Array(RATE * 4);
  let seed = 3;
  for (let i = 0; i < out.length; i++) out[i] = (((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1) * 1e-4;
  assert.equal(detect(out).length, 0);
});

test('strengths stay between 0 and 1, and a louder kick is stronger', () => {
  const { out, truth } = drums(12, 0);
  // make every other kick (and everything with it) half as loud
  truth.kick.forEach((at, n) => {
    if (n % 2 === 0) return;
    for (let i = Math.floor((at - 0.01) * RATE); i < Math.floor((at + 0.45) * RATE); i++) out[i] *= 0.5;
  });
  const kicks = detect(out).filter((h) => h[0] === 'kick');
  for (const [, , strength] of kicks) assert.ok(strength > 0 && strength <= 1);
  const near = (at) => kicks.find((k) => Math.abs(k[1] - at) < 0.03);
  const loud = near(truth.kick[4]);
  const quiet = near(truth.kick[5]);
  assert.ok(loud && quiet, 'both kicks found');
  assert.ok(loud[2] > quiet[2] + 0.1, `loud ${loud[2].toFixed(2)} vs quiet ${quiet[2].toFixed(2)}`);
});

/** The loop at full level for `loud` seconds, then everything scaled by `level` for the rest. */
function dropTo(level, loud = 8.25, seconds = 16) {
  // (the change falls between two beats, so no hit straddles it)
  const { out, truth } = drums(seconds, 0);
  for (let i = Math.floor(loud * RATE); i < out.length; i++) out[i] *= level;
  return { out, truth, loud };
}

test('when the beat drops out, soft low thumps are not kicks', () => {
  // a quarter of the level: 12dB down
  const { out, loud } = dropTo(0.25);
  const after = detect(out).filter((h) => h[0] === 'kick' && h[1] > loud);
  assert.equal(after.length, 0, `${after.length} soft thumps were called kicks`);
});

test('a passage that is only somewhat quieter keeps its kicks, gently at first', () => {
  const { out, truth, loud } = dropTo(0.6);
  const kicks = detect(out).filter((h) => h[0] === 'kick');
  const before = kicks.filter((k) => k[1] < loud);
  const after = kicks.filter((k) => k[1] > loud);
  assert.equal(after.length, truth.kick.filter((t) => t > loud).length, 'every quieter kick still found');
  const full = before[before.length - 1][2];
  assert.ok(after[0][2] < full - 0.15, `first quiet kick ${after[0][2].toFixed(2)} vs full ${full.toFixed(2)}`);
  assert.ok(after[after.length - 1][2] > after[0][2] + 0.1, 'and they grow as the passage becomes the new normal');
});

test('a new track starts from a clean slate', () => {
  const { out, truth, loud } = dropTo(0.25);
  const after = detect(out, loud).filter((h) => h[0] === 'kick' && h[1] > loud);
  assert.equal(after.length, truth.kick.filter((t) => t > loud).length);
});
