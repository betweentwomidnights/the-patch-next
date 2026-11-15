// Pure station selection: no timers, filesystem access, or host-local dates.
// A pending pick is reserved until it actually starts, so advance notices and
// playback always refer to the same song.
class RadioRotation {
    constructor(tracks, { config, random = Math.random, isEligible = () => true }) {
        const { defaultWeight, repeatGap, relatedTrackGap, timeZone } = config;
        if (!Number.isFinite(defaultWeight) || defaultWeight < 0) throw new Error('Invalid defaultWeight');
        for (const [name, gap] of Object.entries({ repeatGap, relatedTrackGap })) {
            if (!Number.isInteger(gap) || gap < 0) throw new Error(`Invalid ${name}`);
        }
        // Validate the explicit timezone once; never depend on the VM timezone.
        if (typeof timeZone !== 'string' || !timeZone) throw new Error('A radio timeZone is required');
        new Intl.DateTimeFormat('en', { timeZone }).format(0);
        this.tracks = tracks.map(track => {
            const rule = config.tracks?.[track.key] || {};
            const weight = rule.weight ?? defaultWeight;
            if (!Number.isFinite(weight) || weight < 0) throw new Error(`Invalid weight for ${track.key}`);
            return { ...track, ...rule, weight };
        });
        this.repeatGap = repeatGap;
        this.relatedTrackGap = relatedTrackGap;
        this.timeZone = timeZone;
        this.random = random;
        this.isEligible = isEligible;
        this.history = [];
        this.pending = null;
    }

    prepare(at) {
        if (this.pending) return this.pending;
        if (!Number.isFinite(at)) throw new Error('A radio selection needs an epoch timestamp');
        const context = { at, timeZone: this.timeZone };
        const eligible = this.tracks.filter(track => track.weight > 0 && this.isEligible(track, context));
        if (!eligible.length) throw new Error('No eligible radio tracks');

        const recentGroups = this.history.slice(-this.relatedTrackGap).map(track => track.rotationGroup);
        // slice(-0) returns everything, so handle an explicitly disabled gap.
        const spaced = this.relatedTrackGap === 0 ? eligible
            : eligible.filter(track => !recentGroups.includes(track.rotationGroup));
        const groupPool = spaced.length ? spaced : eligible;
        const recentKeys = this.repeatGap === 0 ? [] : this.history.slice(-this.repeatGap).map(track => track.key);
        const unrepeated = groupPool.filter(track => !recentKeys.includes(track.key));
        let pool = unrepeated.length ? unrepeated : groupPool;
        // Tiny libraries still play, but avoid an immediate repeat if possible.
        const different = pool.filter(track => track.key !== this.history.at(-1)?.key);
        if (this.repeatGap > 0 && different.length) pool = different;

        const total = pool.reduce((sum, track) => sum + track.weight, 0);
        let ticket = this.random() * total;
        this.pending = pool[pool.length - 1];
        for (const track of pool) {
            ticket -= track.weight;
            if (ticket < 0) {
                this.pending = track;
                break;
            }
        }
        return this.pending;
    }

    commit(track) {
        if (!this.pending || this.pending.key !== track.key) throw new Error('Radio track was not reserved');
        this.history.push(this.pending);
        this.history = this.history.slice(-Math.max(1, this.repeatGap, this.relatedTrackGap));
        this.pending = null;
    }
}

function stationTracks(folders, collections) {
    const metadata = new Map(collections.flatMap(collection => collection.tracks.map(track => [
        `${collection.folder}/${track.file}`, track,
    ])));
    return folders.flatMap(folder => folder.files.map(file => {
        const key = `${folder.name}/${file}`;
        return { key, folder: folder.name, file, rotationGroup: metadata.get(key)?.rotationGroup || key };
    }));
}

module.exports = { RadioRotation, stationTracks };
