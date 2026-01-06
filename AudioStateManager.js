// audioStateManager.js
const path = require('path');
const fs = require('fs').promises; // Using promises version for async operations
const ffmpeg = require('fluent-ffmpeg');
const io = require('socket.io');

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
    constructor() {
        this.currentState = {
            folder: null,
            file: null,
            startTime: null,
            duration: null,
            listeners: 0
        };
        
        this.playlist = {
            folders: [],
            currentFolder: null,
            tracks: [],
            currentTrack: 0,
            startTime: null,
            playbackOrder: 'sequential'
        };
        
        // Initialize caches
        this.metadataCache = new LRUCache(100); // Cache for file metadata
        this.durationCache = new LRUCache(100);  // Cache for audio durations
        
        this.nextTrack = null;
        this.isTrackSwitchInProgress = false;
        this.io = null;
    }

    initializeSocket(server) {
        this.io = io(server);
        
        this.io.of('/stream').on('connection', (socket) => {
            console.log('Client connected to stream');
            this.addListener();
            
            socket.on('disconnect', () => {
                this.removeListener();
            });
        });
    }

    async scanAudioFolders() {
        const audioPath = path.join(process.cwd(), 'public', 'audio');
        try {
            const folders = await fs.readdir(audioPath);
            this.playlist.folders = [];
            
            // Process all folders concurrently
            const folderPromises = folders.map(async folder => {
                const folderPath = path.join(audioPath, folder);
                try {
                    const stats = await fs.stat(folderPath);
                    if (stats.isDirectory()) {
                        const files = await fs.readdir(folderPath);
                        const audioFiles = files.filter(file => 
                            file.endsWith('.mp3') || file.endsWith('.wav')
                        );
                        
                        if (audioFiles.length > 0) {
                            // Cache folder metadata
                            const folderMetadata = {
                                name: folder,
                                files: audioFiles
                            };
                            this.metadataCache.set(`folder:${folder}`, folderMetadata);
                            return folderMetadata;
                        }
                    }
                } catch (error) {
                    console.error(`Error processing folder ${folder}:`, error);
                }
                return null;
            });

            const processedFolders = (await Promise.all(folderPromises)).filter(Boolean);
            this.playlist.folders = processedFolders;
            return processedFolders;
            
        } catch (error) {
            console.error('Error scanning audio folders:', error);
            throw error;
        }
    }

    async loadFolderTracks(folderName) {
        // Check cache first
        const cachedFolder = this.metadataCache.get(`folder:${folderName}`);
        if (cachedFolder) {
            this.playlist.currentFolder = folderName;
            this.playlist.tracks = cachedFolder.files;
            this.playlist.currentTrack = 0;
            this.playlist.startTime = Date.now();
            
            // Initialize first track
            await this.initializeTrack(folderName, cachedFolder.files[0]);
            return;
        }

        // If not in cache, load normally
        const folder = this.playlist.folders.find(f => f.name === folderName);
        if (!folder) {
            throw new Error(`Folder ${folderName} not found`);
        }

        this.playlist.currentFolder = folderName;
        this.playlist.tracks = folder.files;
        this.playlist.currentTrack = 0;
        this.playlist.startTime = Date.now();
        
        // Cache the folder data
        this.metadataCache.set(`folder:${folderName}`, folder);
        
        // Initialize first track
        await this.initializeTrack(folderName, folder.files[0]);
    }

    getNextTrack() {
        if (this.playlist.playbackOrder === 'random') {
            return Math.floor(Math.random() * this.playlist.tracks.length);
        }
        return (this.playlist.currentTrack + 1) % this.playlist.tracks.length;
    }

    isTrackSwitching() {
        return this.isTrackSwitchInProgress;
    }

    getNextTrackInfo() {
        return this.nextTrack;
    }

    async switchFolder() {
        try {
            const currentIndex = this.playlist.folders.findIndex(
                f => f.name === this.playlist.currentFolder
            );
            const nextIndex = (currentIndex + 1) % this.playlist.folders.length;
            const nextFolder = this.playlist.folders[nextIndex];
            
            await this.loadFolderTracks(nextFolder.name);
            console.log(`Switched to folder: ${nextFolder.name}`);
        } catch (error) {
            console.error('Error switching folder:', error);
            throw error;
        }
    }

    async checkAndUpdateTrack() {
        try {
            if (!this.currentState.startTime || !this.currentState.duration) {
                return;
            }
    
            const elapsed = (Date.now() - this.currentState.startTime) / 1000;
            const duration = this.currentState.duration;
            const nextTrackIndex = this.getNextTrack();
            
            // Notify about upcoming track change
            if (duration - elapsed <= 5 && !this.nextTrack) {
                // Calculate next start time
                console.log('Preparing next track notification');
                const nextStartTime = Date.now() + ((duration - elapsed) * 1000);
                
                if (nextTrackIndex === 0 && this.playlist.currentTrack === this.playlist.tracks.length - 1) {
                    // Switching folders
                    const currentIndex = this.playlist.folders.findIndex(
                        f => f.name === this.playlist.currentFolder
                    );
                    const nextIndex = (currentIndex + 1) % this.playlist.folders.length;
                    const nextFolder = this.playlist.folders[nextIndex];
                    
                    this.nextTrack = {
                        folder: nextFolder.name,
                        file: nextFolder.files[0],
                        startTime: nextStartTime
                    };
                } else {
                    // Next track in current folder
                    this.nextTrack = {
                        folder: this.playlist.currentFolder,
                        file: this.playlist.tracks[nextTrackIndex],
                        startTime: nextStartTime
                    };
                }
                
                // Notify clients
                if (this.io) {
                    this.io.of('/stream').emit('trackChange', { 
                        nextTrack: this.nextTrack
                    });
                }
            }
            
            // Switch track if current one is finished
            if (elapsed >= duration) {
                const currentNextTrackIndex = this.getNextTrack();
                this.nextTrack = null;
                
                if (currentNextTrackIndex === 0 && this.playlist.currentTrack === this.playlist.tracks.length - 1) {
                    await this.switchFolder();
                } else {
                    this.playlist.currentTrack = nextTrackIndex;
                    await this.initializeTrack(
                        this.playlist.currentFolder,
                        this.playlist.tracks[nextTrackIndex]
                    );
                }
            }
        } catch (error) {
            console.error('Error in checkAndUpdateTrack:', error);
            // Don't throw here - we want the stream to continue even if there's an error
        }
    }


    getNowPlaying() {
        return {
            folder: this.playlist.currentFolder,
            track: this.currentState.file,
            position: this.getCurrentPosition(),
            duration: this.currentState.duration,
            timestamp: Date.now(),
            loopCount: this.currentState.loopCount
        };
    }

    async getAudioDuration(filePath) {
        // Check duration cache first
        const cachedDuration = this.durationCache.get(filePath);
        if (cachedDuration !== null) {
            return cachedDuration;
        }

        // If not cached, get duration using ffmpeg
        try {
            const duration = await new Promise((resolve, reject) => {
                ffmpeg.ffprobe(filePath, (err, metadata) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(metadata.format.duration);
                });
            });

            // Cache the duration
            this.durationCache.set(filePath, duration);
            return duration;
        } catch (error) {
            console.error('Error getting duration:', error);
            throw error;
        }
    }

    async initializeTrack(folder, file) {
        const filePath = path.join(process.cwd(), 'public', 'audio', folder, file);
        
        try {
            const duration = await this.getAudioDuration(filePath);
            
            this.currentState = {
                folder,
                file,
                startTime: Date.now(),
                duration,
                listeners: 0,
                loopCount: 0
            };
            
            console.log(`Initialized track: ${file} with duration: ${duration} seconds`);
            
        } catch (error) {
            console.error('Error initializing track:', error);
            throw error;
        }
    }

    getCurrentPosition() {
        if (!this.currentState.startTime) return 0;
        const elapsed = (Date.now() - this.currentState.startTime) / 1000;
        return Math.min(elapsed, this.currentState.duration);
    }

    getStreamInfo() {
        return {
            ...this.currentState,
            currentPosition: this.getCurrentPosition(),
            timestamp: Date.now(),
            nextTrack: this.nextTrack
        };
    }

    getNowPlaying() {
        return {
            folder: this.playlist.currentFolder,
            track: this.currentState.file,
            position: this.getCurrentPosition(),
            duration: this.currentState.duration,
            timestamp: Date.now()
        };
    }

    addListener() {
        this.currentState.listeners++;
        console.log(`Listener added. Total listeners: ${this.currentState.listeners}`);
    }

    removeListener() {
        if (this.currentState.listeners > 0) {
            this.currentState.listeners--;
            console.log(`Listener removed. Total listeners: ${this.currentState.listeners}`);
        }
    }
}

module.exports = new AudioStateManager();