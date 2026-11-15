const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const io = require('socket.io');
const { RadioRotation, stationTracks } = require('./radio-playlist');
const collections = require('./src/app/radio/catalog');
const rotationConfig = require('./radio-rotation.json');

// Simple LRU Cache implementation
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
        this.metadataTimeout = 1000 * 60 * 60; // 1 hour
    }

    get(key) {
        if (!this.cache.has(key)) return null;
        
        const item = this.cache.get(key);
        // Check if metadata has expired
        if (Date.now() - item.timestamp > this.metadataTimeout) {
            this.cache.delete(key);
            return null;
        }
        
        // Refresh the entry
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Remove the first (oldest) item
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
}

class AudioStateManager {
    constructor({ config = rotationConfig, random = Math.random, isEligible, now = Date.now } = {}) {
        this.currentState = { folder: null, file: null, startTime: null, duration: null, listeners: 0 };
        this.rotationOptions = { config, random, isEligible };
        this.now = now;
        this.folders = [];
        this.rotation = null;
        this.durationCache = new LRUCache(100);
        this.nextTrack = null;
        this.isTrackSwitchInProgress = false;
        this.io = null;
    }

    initializeSocket(server) {
        this.io = io(server);
        this.io.of('/stream').on('connection', socket => {
            this.addListener();
            socket.on('disconnect', () => this.removeListener());
        });
    }

    async scanAudioFolders() {
        const audioPath = path.join(process.cwd(), 'public', 'audio');
        const names = await fs.readdir(audioPath);
        const folders = await Promise.all(names.map(async name => {
            const folderPath = path.join(audioPath, name);
            if (!(await fs.stat(folderPath)).isDirectory()) return null;
            const files = (await fs.readdir(folderPath)).filter(file => /\.(mp3|wav)$/i.test(file));
            return files.length ? { name, files } : null;
        }));
        this.configureRotation(folders.filter(Boolean));
        return this.folders;
    }

    configureRotation(folders) {
        this.folders = folders;
        this.rotation = new RadioRotation(stationTracks(folders, collections), this.rotationOptions);
    }

    async startRotation() {
        const track = this.rotation.prepare(this.now());
        await this.initializeTrack(track.folder, track.file);
        this.rotation.commit(track);
    }

    isTrackSwitching() {
        return this.isTrackSwitchInProgress;
    }

    getNextTrackInfo() {
        return this.nextTrack;
    }

    async checkAndUpdateTrack() {
        if (this.isTrackSwitchInProgress || this.currentState.startTime === null || !this.currentState.duration) return;
        const nextStartTime = this.currentState.startTime + this.currentState.duration * 1000;
        if (this.now() < nextStartTime - 5000) return;
        this.isTrackSwitchInProgress = true;
        try {
            if (!this.nextTrack) {
                // The intended start time is passed to the policy layer. Future
                // schedules can check it in the configured timezone, before
                // weights are applied, without changing the playback clock.
                const track = this.rotation.prepare(Math.max(this.now(), nextStartTime));
                this.nextTrack = { folder: track.folder, file: track.file, startTime: nextStartTime };
                if (this.io) this.io.of('/stream').emit('trackChange', { nextTrack: this.nextTrack });
            }
            if (this.now() >= nextStartTime) {
                const track = this.rotation.pending;
                await this.initializeTrack(track.folder, track.file);
                this.rotation.commit(track);
                this.nextTrack = null;
            }
        } catch (error) {
            // Keep the reservation on a failed load; retry the same announced
            // song on the next tick instead of silently rerolling it.
            console.error('Error updating radio track:', error);
        } finally {
            this.isTrackSwitchInProgress = false;
        }
    }

    async getAudioDuration(filePath) {
        const cached = this.durationCache.get(filePath);
        if (cached !== null) return cached;
        const duration = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (error, metadata) => {
                if (error) return reject(error);
                const seconds = metadata.format.duration;
                if (!Number.isFinite(seconds) || seconds <= 0) return reject(new Error(`Invalid duration: ${filePath}`));
                resolve(seconds);
            });
        });
        this.durationCache.set(filePath, duration);
        return duration;
    }

    async initializeTrack(folder, file) {
        const filePath = path.join(process.cwd(), 'public', 'audio', folder, file);
        const duration = await this.getAudioDuration(filePath);
        this.currentState = {
            folder, file, duration, startTime: this.now(),
            listeners: this.currentState.listeners, loopCount: 0,
        };
        console.log(`Initialized track: ${folder}/${file} (${duration}s)`);
    }

    getCurrentPosition() {
        if (this.currentState.startTime === null) return 0;
        return Math.min((this.now() - this.currentState.startTime) / 1000, this.currentState.duration);
    }

    getStreamInfo() {
        return {
            ...this.currentState,
            currentPosition: this.getCurrentPosition(),
            timestamp: this.now(),
            nextTrack: this.nextTrack,
        };
    }

    getNowPlaying() {
        return {
            folder: this.currentState.folder, track: this.currentState.file,
            position: this.getCurrentPosition(), duration: this.currentState.duration,
            timestamp: this.now(),
        };
    }

    addListener() {
        this.currentState.listeners++;
    }

    removeListener() {
        if (this.currentState.listeners > 0) this.currentState.listeners--;
    }
}

module.exports = new AudioStateManager();
module.exports.AudioStateManager = AudioStateManager;
