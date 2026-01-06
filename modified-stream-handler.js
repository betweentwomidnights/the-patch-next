// modified-stream-handler.js
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');  // We still need sync version for createReadStream
const audioStateManager = require('./AudioStateManager');

// Stream audio function
const streamAudio = async (req, res) => {
    const { folder, file } = req.params;
    const requestTime = Date.now();
    
    console.log(`[${requestTime}] Stream request for ${folder}/${file}`);
    
    try {
        const filePath = path.join(process.cwd(), 'public', 'audio', folder, file);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            console.error(`File not found: ${filePath}`);
            res.status(404).json({ error: 'Audio file not found' });
            return;
        }

        const stat = await fs.stat(filePath);
        const fileSize = stat.size;
        
        console.log('Current audio state:', {
            serverTime: Date.now(),
            currentFile: audioStateManager.currentState.file,
            position: audioStateManager.getCurrentPosition(),
            duration: audioStateManager.currentState.duration
        });

        // Handle range requests for Safari compatibility
        const range = req.headers.range;
        let stream;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            
            console.log(`Range request: ${start}-${end} for ${file}`);
            
            const chunksize = (end - start) + 1;
            stream = fsSync.createReadStream(filePath, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache'
            });
        } else {
            console.log(`Initial request for ${file}, sending full file`);
            stream = fsSync.createReadStream(filePath);
            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileSize,
                'Cache-Control': 'no-cache'
            });
        }

        // Set up error handling for the stream
        stream.on('error', (error) => {
            console.error(`Stream error for ${file}:`, error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream error' });
            }
            stream.destroy();
        });

        // Handle client disconnect
        req.on('close', () => {
            console.log(`[${Date.now()}] Stream closed for ${folder}/${file}`);
            stream.destroy();
            audioStateManager.removeListener();
        });

        audioStateManager.addListener();
        stream.pipe(res);

    } catch (error) {
        console.error('Stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

// Get stream state function
const getStreamState = async (req, res) => {
    try {
        const streamInfo = audioStateManager.getStreamInfo();
        res.json(streamInfo);
    } catch (error) {
        console.error('Error getting stream state:', error);
        res.status(500).json({ error: 'Error getting stream state' });
    }
};

module.exports = {
    streamAudio,
    getStreamState
};