const express = require('express');
const next = require('next');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const audioStateManager = require('./AudioStateManager');
const { streamAudio, getStreamState } = require('./modified-stream-handler');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();


// Path to waitlist file
const WAITLIST_FILE = path.join(__dirname, 'data', 'android-waitlist.json');

// Initialize waitlist file
async function initWaitlist() {
    const dir = path.dirname(WAITLIST_FILE);
    try {
        await fs.promises.access(dir);
    } catch {
        await fs.promises.mkdir(dir, { recursive: true });
        console.log('Created data directory:', dir);
    }

    try {
        await fs.promises.access(WAITLIST_FILE);
    } catch {
        const initialData = { users: [] };
        await fs.promises.writeFile(WAITLIST_FILE, JSON.stringify(initialData, null, 2));
        console.log('Created waitlist file:', WAITLIST_FILE);
    }
}

// Initialize audio state with your 25-minute track
function initializeAudioState() {
    return new Promise((resolve, reject) => {
        audioStateManager.scanAudioFolders((err, folders) => {
            if (err) {
                console.error('Failed to scan audio folders:', err);
                reject(err);
                return;
            }

            console.log('Found audio folders:', folders.map(f => f.name));
            
            if (folders.length > 0) {
                audioStateManager.loadFolderTracks(folders[0].name, (err) => {
                    if (err) {
                        console.error('Failed to load initial folder:', err);
                        reject(err);
                        return;
                    }
                    console.log('Initial folder loaded:', folders[0].name);
                    console.log('Audio state initialized successfully');
                    resolve();
                });
            } else {
                console.log('No audio folders found');
                resolve();
            }
        });
    });
}



app.prepare().then(async () => {
    try {
        await initWaitlist();
        await initializeAudioState();
    } catch (error) {
        console.error('Error during initialization:', error);
    }

    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer);

    // Initialize socket.io for audio state manager
    audioStateManager.initializeSocket(io);

    // Middleware setup
    server.use(express.json({ limit: '100mb' }));
    server.use(express.urlencoded({ limit: '100mb', extended: true }));

    // API Routes
    server.get('/api/stream/state', (req, res) => {
        const state = audioStateManager.getStreamInfo();
        res.json(state);
    });

    server.get('/api/nowplaying', (req, res) => {
        const nowPlaying = audioStateManager.getNowPlaying();
        res.json(nowPlaying);
    });

    // Audio streaming endpoint
    server.get('/api/audio/:folder/:file', streamAudio);

    // Music generation endpoints
    server.post('/api/generate', async (req, res) => {
        try {
            const backendResponse = await axios.post(
                'https://gary.thecollabagepatch.com/generate',
                req.body,
                { responseType: 'json' }
            );
            res.json(backendResponse.data);
        } catch (error) {
            console.error('Error in /api/generate:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    server.post('/api/continue', async (req, res) => {
        try {
            const backendResponse = await axios.post(
                'https://gary.thecollabagepatch.com/continue',
                req.body,
                { responseType: 'json' }
            );
            res.json(backendResponse.data);
        } catch (error) {
            console.error('Error in /api/continue:', error);
            res.status(500).send('Internal Server Error');
        }
    });
    
    server.post('/api/playback/mode', (req, res) => {
        const { mode } = req.body;
        if (mode === 'random' || mode === 'sequential') {
            audioStateManager.playlist.playbackOrder = mode;
            res.json({ message: `Playback mode set to ${mode}` });
        } else {
            res.status(400).json({ message: 'Invalid playback mode' });
        }
    });

    // Waitlist endpoint
    server.post('/api/waitlist', async (req, res) => {
        try {
            const { email, firstName } = req.body;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ message: 'Invalid email address' });
            }

            if (!firstName || firstName.trim().length === 0) {
                return res.status(400).json({ message: 'First name is required' });
            }

            await initWaitlist();

            const data = JSON.parse(await fs.promises.readFile(WAITLIST_FILE, 'utf8'));

            if (data.users.some(user => user.email === email)) {
                return res.status(409).json({ message: 'Email already registered' });
            }

            data.users.push({
                email,
                firstName,
                signupDate: new Date().toISOString()
            });

            await fs.promises.writeFile(WAITLIST_FILE, JSON.stringify(data, null, 2));

            res.status(200).json({ message: 'Successfully added to waitlist' });
        } catch (error) {
            console.error('Waitlist error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Track check interval for playlist management
    setInterval(() => {
        audioStateManager.checkAndUpdateTrack((err) => {
            if (err) {
                console.error('Error checking track status:', err);
            }
        });
    }, 1000);

    // Default handler for non-API routes
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    // Start the server
    httpServer.listen(3000, (err) => {
        if (err) throw err;
        console.log('> Ready on http://localhost:3000');
        console.log('> WebSocket server initialized');
    });
}).catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
});