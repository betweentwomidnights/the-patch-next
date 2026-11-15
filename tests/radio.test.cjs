const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function station(position = 60) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/app/radio/radio.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: () => ({}), // Clock correction needs no socket, audio graph, or metadata.
    performance: { timeOrigin: 1_000_000, now: () => position * 1000 },
  });
  const radio = exports.getRadio();
  radio.state = { startTime: 1_000_000, duration: 300 };
  return radio;
}

test('ordinary drift keeps music at native speed without skipping', () => {
  for (const drift of [-6, -3, -1, 0, 1, 3, 6]) {
    const radio = station();
    const audio = { currentTime: 60 + drift, playbackRate: 1 };
    radio.steer(audio, 300);
    assert.equal(audio.playbackRate, 1, `drift ${drift}s must not time-stretch music`);
    assert.equal(audio.currentTime, 60 + drift, `drift ${drift}s must not seek`);
  }
});

test('a large stall rejoins the station at native speed', () => {
  for (const drift of [-20, 20]) {
    const audio = { currentTime: 60 + drift, playbackRate: 1 };
    station().steer(audio, 300);
    assert.equal(audio.currentTime, 60);
    assert.equal(audio.playbackRate, 1);
  }
});

test('a previous speed correction is cleared even with moderate drift', () => {
  for (const rate of [0.975, 1.025]) {
    const audio = { currentTime: 63, playbackRate: rate };
    station().steer(audio, 300);
    assert.equal(audio.playbackRate, 1);
    assert.equal(audio.currentTime, 63);
  }
});

test('near a track boundary, wait for the next track instead of seeking', () => {
  const audio = { currentTime: 280, playbackRate: 1 };
  station(299).steer(audio, 300);
  assert.equal(audio.currentTime, 280);
  assert.equal(audio.playbackRate, 1);
});
