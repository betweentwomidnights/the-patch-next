const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const next = require('next');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Initialize with new structure
const WAITLIST_FILE = path.join(__dirname, 'data', 'android-waitlist.json');

// Ensure the data directory and waitlist file exist
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

app.prepare().then(async () => {
    // Initialize waitlist file
    try {
        await initWaitlist();
    } catch (error) {
        console.error('Error initializing waitlist:', error);
    }
    const server = express();

    server.use(express.json({ limit: '100mb' }));
    server.use(express.urlencoded({ limit: '100mb', extended: true }));

    // Define streams configuration
    const STREAMS = [
        'captains_chair.mp3',
        'infinitepolo.mp3',
        'playlist.mp3',
        'audiocraft.mp3',
        'kemp.mp3',
        'yikesawjeez.mp3'
    ];

    // Create proxy routes for each stream
    STREAMS.forEach(streamName => {
        server.get(`/api/streams/${streamName}`, createProxyMiddleware({
            target: 'http://localhost:8000',
            changeOrigin: true,
            pathRewrite: {
                [`^/api/streams/${streamName}`]: `/${streamName}`
            },
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }));
    });

    // Special handler for Safari users accessing the clusterfuck stream
    server.get('/api/safari-streams/clusterfuck', async (req, res) => {
        try {
            const ffmpeg = spawn('ffmpeg', [
                '-i', 'rtsp://localhost:8554/clusterfuck',
                '-c:a', 'copy',
                '-f', 'mp3',
                'pipe:1'
            ]);
    
            res.setHeader('Content-Type', 'audio/mpeg');
            ffmpeg.stdout.pipe(res);
    
            ffmpeg.stderr.on('data', (data) => {
                console.log(`FFmpeg log: ${data}`);
            });
    
            req.on('close', () => {
                ffmpeg.kill();
            });
        } catch (error) {
            console.error('Error:', error);
            res.redirect('/api/streams/captains_chair.mp3');
        }
    });

    server.post('/api/generate', async (req, res) => {
        try {
            const backendResponse = await axios.post(
                'https://gary.thecollabagepatch.com/generate',
                req.body,
                {
                    responseType: 'json',
                }
            );
            res.json(backendResponse.data);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    server.post('/api/continue', async (req, res) => {
        try {
            const backendResponse = await axios.post(
                'https://gary.thecollabagepatch.com/continue',
                req.body,
                {
                    responseType: 'json',
                }
            );
            res.json(backendResponse.data);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    server.post('/api/crop-audio', async (req, res) => {
        try {
            const backendResponse = await axios.post(
                'https://express.thecollabagepatch.com/crop-audio',
                req.body,
                {
                    responseType: 'text',
                }
            );
            res.send(backendResponse.data);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    server.post('/api/export-to-mp3', async (req, res) => {
        const { audioData } = req.body;
        const buffer = Buffer.from(audioData, 'base64');
        const tempFilePath = path.join(__dirname, 'tempAudio.wav');
        const outputFilePath = path.join(__dirname, 'outputAudio.mp3');
    
        await fs.promises.writeFile(tempFilePath, buffer);
    
        ffmpeg(tempFilePath)
            .toFormat('mp3')
            .on('end', async () => {
                const outputBuffer = await fs.promises.readFile(outputFilePath);
                res.send(outputBuffer.toString('base64'));
                await fs.promises.unlink(tempFilePath);
                await fs.promises.unlink(outputFilePath);
            })
            .on('error', (err) => {
                console.error(`Error exporting to MP3: ${err.message}`);
                res.status(500).send('Error exporting to MP3');
            })
            .save(outputFilePath);
    });

    // New waitlist endpoint using promises
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
    
            const data = JSON.parse(
                await fs.promises.readFile(WAITLIST_FILE, 'utf8')
            );
    
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

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    server.listen(3000, (err) => {
        if (err) throw err;
        console.log('> Ready on http://localhost:3000');
    });
});
