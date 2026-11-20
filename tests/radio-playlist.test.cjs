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

// ---- cooldowns: an album and its single tracks keep apart ----

const HOUR = 3600 * 1000;
const cooldownConfig = {
    timeZone: 'America/Phoenix',
    defaultWeight: 1,
    repeatGap: 0,
    relatedTrackGap: 0,
    tracks: {},
    cooldowns: [
        { after: 'album', wait: 'singles', hours: 3 },
        { after: 'singles', wait: 'album', hours: 3 },
    ],
};
const albumTracks = [
    { key: 'old/album.mp3', folder: 'old', file: 'album.mp3', rotationGroup: 'album' },
    { key: 'new/one.mp3', folder: 'new', file: 'one.mp3', rotationGroup: 'singles' },
    { key: 'new/two.mp3', folder: 'new', file: 'two.mp3', rotationGroup: 'singles' },
    { key: 'misc/other.mp3', folder: 'misc', file: 'other.mp3', rotationGroup: 'misc/other.mp3' },
];
const isSingle = track => track.rotationGroup === 'singles';

test('after the album starts, no single track starts for the cooldown, then they can', () => {
    let next = 0;
    const draws = [0, 0.99, 0.5, 0.3, 0.7];
    const rotation = new RadioRotation(albumTracks, { config: cooldownConfig, random: () => draws[next++ % draws.length] });
    assert.equal(play(rotation, 0).key, 'old/album.mp3');
    for (let at = 10 * 60 * 1000; at < 3 * HOUR; at += 10 * 60 * 1000) {
        assert(!isSingle(play(rotation, at)), `a single played ${at / 60000} minutes after the album`);
    }
    const later = new RadioRotation(albumTracks, { config: cooldownConfig, random: () => 0.5 });
    play(later, 0);
    // weights 1 each over [album, one, two, other]: 0.5 lands on a single once they're allowed
    assert(isSingle(play(later, 3 * HOUR + 1)));
});

test('after a single track starts, the album waits, but other singles do not', () => {
    // random 0 takes the first track in the pool; the album is first whenever it's allowed
    const rotation = new RadioRotation(albumTracks, { config: cooldownConfig, random: () => 0 });
    rotation.groupStarts.set('singles', 0); // a single started at time 0
    // an hour later the album is skipped, and another single is fine
    assert.equal(play(rotation, HOUR).key, 'new/one.mp3');
    // that single restarted the cooldown, so the album waits until 3 hours after it
    assert.notEqual(rotation.prepare(4 * HOUR - 1).key, 'old/album.mp3');
    rotation.pending = null;
    assert.equal(rotation.prepare(4 * HOUR + 1).key, 'old/album.mp3');
});

test('a cooldown relaxes when nothing else could play', () => {
    const only = albumTracks.slice(0, 3);
    const rotation = new RadioRotation(only, { config: cooldownConfig, random: () => 0 });
    rotation.groupStarts.set('singles', 0);
    rotation.groupStarts.set('album', 0);
    assert(rotation.prepare(HOUR));
});

test('bad cooldowns are rejected', () => {
    const bad = cooldowns => () => new RadioRotation(albumTracks, { config: { ...cooldownConfig, cooldowns } });
    assert.throws(bad([{ after: 'album', hours: 3 }]));
    assert.throws(bad([{ after: 'album', wait: 'album', hours: 3 }]));
    assert.throws(bad([{ after: 'album', wait: 'singles', hours: 0 }]));
    assert.throws(bad([{ after: 'album', wait: 'singles' }]));
    assert.throws(bad([{ after: 'album', wait: 'singles', hours: 1, minutes: 5 }]));
    assert.throws(bad({}));
});

test('cooldowns are one-way, and each direction has its own length', () => {
    const oneWay = { ...cooldownConfig, cooldowns: [
        { after: 'album', wait: 'singles', hours: 3 },
        { after: 'singles', wait: 'album', minutes: 20 },
    ] };
    const rotation = new RadioRotation(albumTracks, { config: oneWay });
    const album = albumTracks[0];
    const single = albumTracks[1];
    rotation.groupStarts.set('singles', 0);
    assert(rotation.coolingDown(album, 19 * 60 * 1000));
    assert(!rotation.coolingDown(album, 21 * 60 * 1000));
    rotation.groupStarts.clear();
    rotation.groupStarts.set('album', 0);
    assert(rotation.coolingDown(single, 2 * HOUR));
    assert(!rotation.coolingDown(single, 3 * HOUR + 1));
});

test('the station keeps captains chair s2 and its single episodes apart', () => {
    const rotation = new RadioRotation(tracks, { config });
    const full = rotation.tracks.find(t => t.key === 'CCFiles/the_clusterfuck.mp3');
    const episodes = rotation.tracks.filter(t => t.folder === 'cc2');
    assert.equal(full.rotationGroup, 'captains-chair-s2-full');
    assert.equal(full.weight, 0.02);
    assert.equal(episodes.length, 10);
    assert(episodes.every(t => t.rotationGroup === 'captains-chair-s2' && t.weight === 1));
    // after the full season: episodes wait 3 hours
    rotation.groupStarts.set('captains-chair-s2-full', 0);
    assert(episodes.every(t => rotation.coolingDown(t, 2 * HOUR)));
    assert(!episodes.some(t => rotation.coolingDown(t, 3 * HOUR + 1)));
    // after an episode: the full season waits 20 minutes, other episodes don't
    rotation.groupStarts.clear();
    rotation.groupStarts.set('captains-chair-s2', 0);
    assert(rotation.coolingDown(full, 19 * 60 * 1000));
    assert(!rotation.coolingDown(full, 21 * 60 * 1000));
    assert(!episodes.some(t => rotation.coolingDown(t, 60 * 1000)));
});
