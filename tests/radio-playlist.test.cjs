const assert = require('node:assert/strict');
const test = require('node:test');
const { RadioRotation, stationTracks } = require('../radio-playlist');
const { AudioStateManager } = require('../AudioStateManager');
const config = require('../radio-rotation.json');
const collections = require('../src/app/radio/catalog');

function seededRandom(seed) {
    return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 2 ** 32;
    };
}

const folders = [
    ...collections.map(collection => ({ name: collection.folder, files: collection.tracks.map(track => track.file) })),
    { name: 'CCFiles', files: ['the_clusterfuck.mp3'] },
    { name: 'PoloFiles', files: ['ip_1.mp3'] },
    { name: 'CC_1_Files', files: ['old-a.mp3', 'old-b.mp3'] },
];
const tracks = stationTracks(folders, collections);

function play(rotation, at = 0) {
    const track = rotation.prepare(at);
    rotation.commit(track);
    return track;
}

test('all collections share one pool, with rare overrides and defaults for older files', () => {
    const rotation = new RadioRotation(tracks, { config });
    assert.equal(rotation.tracks.length, folders.reduce((n, f) => n + f.files.length, 0));
    assert.equal(rotation.tracks.find(t => t.key === 'PoloFiles/ip_1.mp3').weight, 0.005);
    assert.equal(rotation.tracks.find(t => t.key === 'CCFiles/the_clusterfuck.mp3').weight, 0.02);
    assert.equal(rotation.tracks.find(t => t.file === 'netrunner2.mp3').weight, 0.1);
    assert.equal(rotation.tracks.find(t => t.file === 'old-a.mp3').weight, 1);
    for (const key of Object.keys(config.tracks)) assert(rotation.tracks.some(t => t.key === key), key);
    const john = rotation.tracks.find(t => t.file === 'cc3_10_mynameisjohn_continuation3.mp3');
    assert(john);
    assert.equal(john.rotationGroup, rotation.tracks.find(t => t.file === 'cc3_10_continued_BASED_2.mp3').rotationGroup);
});

test('relative weights produce the expected selection rates with gaps disabled', () => {
    const names = ['normal', 'netrunner', 's2', 'polo'];
    const sample = names.map(name => ({ key: name, folder: 'test', file: name, rotationGroup: name }));
    const weights = [1, 0.1, 0.02, 0.005];
    const settings = { ...config, repeatGap: 0, relatedTrackGap: 0,
        tracks: Object.fromEntries(names.map((name, i) => [name, { weight: weights[i] }])) };
    const rotation = new RadioRotation(sample, { config: settings, random: seededRandom(27) });
    const counts = Object.fromEntries(names.map(name => [name, 0]));
    const total = 200_000;
    for (let i = 0; i < total; i++) counts[play(rotation).key]++;
    for (let i = 0; i < names.length; i++) {
        const expected = total * weights[i] / weights.reduce((a, b) => a + b);
        assert(Math.abs(counts[names[i]] / expected - 1) < 0.12, `${names[i]}: ${counts[names[i]]} vs ${expected}`);
    }
});

test('station-wide history spaces variants and avoids the last twelve tracks across 100 seeded runs', () => {
    for (let seed = 1; seed <= 100; seed++) {
        const rotation = new RadioRotation(tracks, { config, random: seededRandom(seed) });
        const history = [];
        for (let i = 0; i < 300; i++) {
            const track = play(rotation);
            assert(!history.slice(-12).some(t => t.key === track.key), `seed ${seed}: repeat ${track.key}`);
            assert(!history.slice(-2).some(t => t.rotationGroup === track.rotationGroup), `seed ${seed}: variant ${track.key}`);
            history.push(track);
        }
    }
});

test('a reservation never rerolls or changes history before the song actually starts', () => {
    let draws = 0;
    const rotation = new RadioRotation(tracks, { config, random: () => (++draws % 10) / 10 });
    const first = rotation.prepare(1000);
    for (let i = 0; i < 10; i++) assert.equal(rotation.prepare(2000), first);
    assert.equal(draws, 1);
    assert.deepEqual(rotation.history, []);
    rotation.commit(first);
    assert.equal(rotation.history[0], first);
    assert.equal(rotation.pending, null);
    rotation.prepare(3000);
    assert.equal(draws, 2);
});

test('small libraries relax spacing without ever selecting a disabled or ineligible track', () => {
    const small = ['a', 'b', 'disabled', 'blocked'].map(key => ({ key, file: key, folder: 'small', rotationGroup: 'same' }));
    const rotation = new RadioRotation(small, {
        config: { ...config, tracks: { disabled: { weight: 0 } } }, random: () => 0,
        isEligible: track => track.key !== 'blocked',
    });
    assert.deepEqual(Array.from({ length: 8 }, () => play(rotation).key), ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b']);
    const only = new RadioRotation([small[0]], { config });
    assert.equal(play(only).key, 'a');
    assert.equal(play(only).key, 'a');
    const none = new RadioRotation(small, { config, isEligible: () => false });
    assert.throws(() => none.prepare(0), /No eligible/);
});

test('future eligibility policies receive an explicit epoch and timezone before weighting', () => {
    const calls = [];
    const rotation = new RadioRotation(tracks, { config, isEligible: (track, context) => {
        calls.push(context);
        return track.key !== 'PoloFiles/ip_1.mp3';
    } });
    rotation.prepare(Date.UTC(2026, 10, 15, 7));
    assert.equal(calls.length, tracks.length);
    assert(calls.every(call => call.at === Date.UTC(2026, 10, 15, 7) && call.timeZone === 'America/Phoenix'));
    assert.notEqual(rotation.pending.key, 'PoloFiles/ip_1.mp3');
});

test('bad weights, gaps and implicit or invalid timezones fail clearly', () => {
    for (const weight of [-1, NaN, Infinity, 'rare']) {
        assert.throws(() => new RadioRotation(tracks, { config: { ...config, defaultWeight: weight } }), /defaultWeight/);
        assert.throws(() => new RadioRotation(tracks, { config: { ...config, tracks: { [tracks[0].key]: { weight } } } }), /weight/);
    }
    assert.throws(() => new RadioRotation(tracks, { config: { ...config, repeatGap: -1 } }), /repeatGap/);
    assert.throws(() => new RadioRotation(tracks, { config: { ...config, timeZone: undefined } }), /timeZone/);
    assert.throws(() => new RadioRotation(tracks, { config: { ...config, timeZone: 'not-a-timezone' } }), RangeError);
});

function station(options = {}) {
    let now = 1_000_000;
    const manager = new AudioStateManager({ now: () => now, random: seededRandom(17), ...options });
    manager.configureRotation(folders);
    manager.getAudioDuration = async () => 30;
    return { manager, advance: seconds => { now += seconds * 1000; } };
}

test('the five-second announcement is the exact song started at the boundary, with no reroll', async () => {
    const { manager, advance } = station();
    await manager.startRotation();
    manager.addListener();
    advance(24);
    await manager.checkAndUpdateTrack();
    assert.equal(manager.nextTrack, null);
    advance(2);
    await manager.checkAndUpdateTrack();
    const announced = manager.nextTrack;
    const reserved = manager.rotation.pending;
    assert.equal(announced.startTime, 1_030_000);
    advance(1);
    await manager.checkAndUpdateTrack();
    assert.equal(manager.nextTrack, announced);
    advance(4);
    await manager.checkAndUpdateTrack();
    assert.equal(manager.currentState.folder, announced.folder);
    assert.equal(manager.currentState.file, announced.file);
    assert.equal(manager.rotation.history.at(-1), reserved);
    assert.equal(manager.currentState.listeners, 1);
    assert.equal(manager.getNowPlaying().folder, announced.folder);
    assert.equal(manager.nextTrack, null);
});

test('a late tick selects and starts the next song without needing an advance announcement', async () => {
    const { manager, advance } = station();
    await manager.startRotation();
    const previous = manager.currentState.file;
    advance(35);
    await manager.checkAndUpdateTrack();
    assert.notEqual(manager.currentState.file, previous);
    assert.equal(manager.currentState.startTime, 1_035_000);
});

test('future schedule policy checks use the announced start time, not the five-second warning time', async () => {
    const calls = [];
    const { manager, advance } = station({ isEligible: (track, context) => { calls.push(context); return true; } });
    await manager.startRotation();
    calls.length = 0;
    advance(26);
    await manager.checkAndUpdateTrack();
    assert(calls.every(context => context.at === 1_030_000));
    assert(calls.every(context => context.timeZone === 'America/Phoenix'));
});

test('overlapping timer ticks cannot start two songs or consume a second reservation', async () => {
    const { manager, advance } = station();
    await manager.startRotation();
    advance(31);
    let release;
    manager.getAudioDuration = () => new Promise(resolve => { release = resolve; });
    const first = manager.checkAndUpdateTrack();
    const announced = manager.nextTrack;
    await manager.checkAndUpdateTrack();
    assert.equal(manager.nextTrack, announced);
    assert.equal(manager.rotation.history.length, 1);
    release(30);
    await first;
    assert.equal(manager.rotation.history.length, 2);
    assert.equal(manager.currentState.file, announced.file);
});

test('a failed audio load preserves the announced song for retry and never consumes history', async () => {
    const { manager, advance } = station();
    await manager.startRotation();
    advance(26);
    await manager.checkAndUpdateTrack();
    const announced = manager.nextTrack;
    manager.getAudioDuration = async () => { throw new Error('transient probe failure'); };
    advance(5);
    const original = console.error;
    console.error = () => {};
    try { await manager.checkAndUpdateTrack(); } finally { console.error = original; }
    assert.equal(manager.nextTrack, announced);
    assert.equal(manager.rotation.history.length, 1);
    assert.equal(manager.isTrackSwitching(), false);
    manager.getAudioDuration = async () => 30;
    await manager.checkAndUpdateTrack();
    assert.equal(manager.currentState.file, announced.file);
    assert.equal(manager.rotation.history.length, 2);
});
