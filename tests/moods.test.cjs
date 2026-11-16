// The moods a formed picture goes through (src/app/visual/moods.ts).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/visual/moods.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, Math });
  return exports.Moods;
}

/** Runs `seconds` of music at 60 frames a second with a kick every half second. */
function play(moods, seconds, { on = true, energy = 0.6, each } = {}) {
  const dt = 1 / 60;
  for (let frame = 0; frame < seconds * 60; frame++) {
    moods.step({ dt, on, energy, kick: frame % 30 === 0 ? 0.9 : 0 });
    if (each) each(frame * dt);
  }
}

/** A stand-in for Math.random that always says the same thing. */
const always = (value) => () => value;

test('with no music the picture simply holds', () => {
  const Moods = load();
  const moods = new Moods(always(0.1));
  play(moods, 120, { on: false });
  assert.equal(moods.mood, 'steady');
  assert.equal(moods.grip, 1);
  assert.ok(moods.stir < 1e-6);
});

test('with music it takes turns between steady and loose, and never lets go', () => {
  const Moods = load();
  const moods = new Moods(always(0.1));
  const turns = [];
  let loosest = 1;
  play(moods, 120, {
    each: () => {
      if (turns[turns.length - 1] !== moods.mood) turns.push(moods.mood);
      loosest = Math.min(loosest, moods.grip);
      assert.ok(moods.grip > 0.4 && moods.grip <= 1, 'particles are always held to their places');
      assert.ok(moods.stir >= 0 && moods.stir < 0.6);
      if (moods.mood === 'steady') assert.ok(moods.grip > 0.9 || turns.length > 1);
    },
  });
  assert.ok(turns.length >= 6, `it changed ${turns.length - 1} times in two minutes`);
  turns.forEach((mood, i) => assert.equal(mood, i % 2 === 0 ? 'steady' : 'loose'));
  assert.ok(loosest < 0.6, 'the hold really does slacken in the loose mood');
  // then the music stops: within a few seconds it is held firm again
  play(moods, 4, { on: false });
  assert.ok(moods.grip > 0.99 && moods.stir < 0.01);
});

test('louder music stirs harder, in both moods', () => {
  const Moods = load();
  for (const mood of ['steady', 'loose']) {
    const quiet = new Moods(always(0.5));
    const loud = new Moods(always(0.5));
    quiet.pin = loud.pin = mood;
    play(quiet, 8, { energy: 0.1 });
    play(loud, 8, { energy: 0.9 });
    assert.equal(loud.mood, mood);
    assert.ok(loud.stir > quiet.stir * 1.5, `${mood}: ${loud.stir.toFixed(2)} vs ${quiet.stir.toFixed(2)}`);
  }
});

test('moods change on a kick, not between them', () => {
  const Moods = load();
  const moods = new Moods(always(0.9));
  const dt = 1 / 60;
  let was = moods.mood;
  for (let frame = 0; frame < 60 * 60; frame++) {
    const kick = frame % 30 === 0 ? 0.9 : 0;
    moods.step({ dt, on: true, energy: 0.5, kick });
    if (moods.mood !== was) assert.ok(kick > 0, `changed to ${moods.mood} off the beat`);
    was = moods.mood;
  }
});
