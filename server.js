const express = require('express');
const next = require('next');
const axios = require('axios');
const { Server } = require('socket.io');
const http = require('http');
const audioStateManager = require('./AudioStateManager');
const { streamAudio, getStreamState } = require('./modified-stream-handler');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();


// Discover every collection, then start the shared weighted rotation.
async function initializeAudioState() {
    try {
        const folders = await audioStateManager.scanAudioFolders();
        console.log('Found audio folders:', folders.map(f => f.name));
        
        if (folders.length > 0) {
            await audioStateManager.startRotation();
            console.log('Audio state initialized successfully');
        } else {
            console.log('No audio folders found');
        }
    } catch (error) {
        console.error('Failed to initialize audio state:', error);
        throw error; // Let the caller handle the error
    }
}



app.prepare().then(async () => {
    try {
        await initializeAudioState();
    } catch (error) {
        console.error('Error during initialization:', error);
    }

    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        allowUpgrades: true,
        pingTimeout: 60000,
        pingInterval: 25000
    });
    
//    // Add global middleware for COOP and COEP headers
//         server.use((req, res, next) => {
//             // Required for SharedArrayBuffer
//             res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
//             res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            
//             // Optional but recommended security headers
//             res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
//             next();
//         });
    
        // Specific headers for the worklet file
        server.get('/worklet/fft-processor.js', (req, res, next) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            next();
        });

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
    
    // Track check interval for playlist management
    setInterval(async () => {
        try {
            await audioStateManager.checkAndUpdateTrack();
        } catch (error) {
            console.error('Error checking track status:', error);
        }
    }, 1000);

    // Default handler for non-API routes
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    // Start the server
    const port = process.env.PORT || 3000;
    httpServer.listen(port, '0.0.0.0', (err) => {
        if (err) throw err;
        console.log(`> Ready on http://0.0.0.0:${port}`);
        console.log('> WebSocket server initialized');
    });
}).catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
});
