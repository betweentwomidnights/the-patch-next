// audioStateManager.js
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const io = require('socket.io');

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

    scanAudioFolders(callback) {
        const audioPath = path.join(process.cwd(), 'public', 'audio');
        fs.readdir(audioPath, (err, folders) => {
            if (err) {
                console.error('Error reading audio directory:', err);
                callback(err);
                return;
            }

            this.playlist.folders = [];
            let foldersProcessed = 0;

            folders.forEach(folder => {
                const folderPath = path.join(audioPath, folder);
                fs.stat(folderPath, (err, stats) => {
                    if (err) {
                        console.error(`Error stating ${folder}:`, err);
                        if (++foldersProcessed === folders.length) {
                            callback(null, this.playlist.folders);
                        }
                        return;
                    }

                    if (stats.isDirectory()) {
                        fs.readdir(folderPath, (err, files) => {
                            if (err) {
                                console.error(`Error reading ${folder}:`, err);
                                if (++foldersProcessed === folders.length) {
                                    callback(null, this.playlist.folders);
                                }
                                return;
                            }

                            const audioFiles = files.filter(file => 
                                file.endsWith('.mp3') || file.endsWith('.wav')
                            );

                            if (audioFiles.length > 0) {
                                this.playlist.folders.push({
                                    name: folder,
                                    files: audioFiles
                                });
                            }

                            if (++foldersProcessed === folders.length) {
                                callback(null, this.playlist.folders);
                            }
                        });
                    } else if (++foldersProcessed === folders.length) {
                        callback(null, this.playlist.folders);
                    }
                });
            });
        });
    }

    loadFolderTracks(folderName, callback) {
        const folder = this.playlist.folders.find(f => f.name === folderName);
        if (!folder) {
            callback(new Error(`Folder ${folderName} not found`));
            return;
        }

        this.playlist.currentFolder = folderName;
        this.playlist.tracks = folder.files;
        this.playlist.currentTrack = 0;
        this.playlist.startTime = Date.now();  // Add this line
        
        // Only initialize the first track
        this.initializeTrack(folderName, folder.files[0], callback);
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

    switchFolder(callback) {
        const currentIndex = this.playlist.folders.findIndex(
            f => f.name === this.playlist.currentFolder
        );
        const nextIndex = (currentIndex + 1) % this.playlist.folders.length;
        const nextFolder = this.playlist.folders[nextIndex];
        
        this.loadFolderTracks(nextFolder.name, (err) => {
            if (err) {
                console.error('Error switching folder:', err);
                callback(err);
                return;
            }
            console.log(`Switched to folder: ${nextFolder.name}`);
            callback(null);
        });
    }

    checkAndUpdateTrack(callback) {
        if (!this.currentState.startTime || !this.currentState.duration) {
            callback(null);
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
                this.switchFolder(callback);
            } else {
                this.playlist.currentTrack = nextTrackIndex;
                this.initializeTrack(
                    this.playlist.currentFolder,
                    this.playlist.tracks[nextTrackIndex],
                    callback
                );
            }
        } else {
            callback(null);
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
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    console.error('Error getting duration:', err);
                    reject(err);
                    return;
                }
                resolve(metadata.format.duration);
            });
        });
    }

    initializeTrack(folder, file, callback) {
        const filePath = path.join(process.cwd(), 'public', 'audio', folder, file);
        
        this.getAudioDuration(filePath)
            .then(duration => {
                this.currentState = {
                    folder,
                    file,
                    startTime: Date.now(),
                    duration,
                    listeners: 0,
                    loopCount: 0
                };
                
                console.log(`Initialized track: ${file} with duration: ${duration} seconds`);
                callback(null);
            })
            .catch(error => {
                console.error('Error initializing track:', error);
                callback(error);
            });
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