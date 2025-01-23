// modified-stream-handler.js
const path = require('path');
const fs = require('fs');
const audioStateManager = require('./AudioStateManager');

// Stream audio function
const streamAudio = async (req, res) => {
    const { folder, file } = req.params;
    const requestTime = Date.now();
    
    console.log(`[${requestTime}] Stream request for ${folder}/${file}`);
    console.log('Headers:', req.headers);
    
    const filePath = path.join(process.cwd(), 'public', 'audio', folder, file);

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        res.status(404).json({ error: 'Audio file not found' });
        return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    
    console.log('Current audio state:', {
        serverTime: Date.now(),
        currentFile: audioStateManager.currentState.file,
        position: audioStateManager.getCurrentPosition(),
        duration: audioStateManager.currentState.duration
    });

    // Handle range requests for Safari compatibility
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        console.log(`Range request: ${start}-${end} for ${file}`);
        
        const chunksize = (end - start) + 1;
        const stream = fs.createReadStream(filePath, { start, end });
        
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache'
        });
        
        stream.pipe(res);
    } else {
        console.log(`Initial request for ${file}, sending full file`);
        
        const stream = fs.createReadStream(filePath);
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': fileSize,
            'Cache-Control': 'no-cache'
        });
        
        stream.pipe(res);
    }

    audioStateManager.addListener();
    
    req.on('close', () => {
        console.log(`[${Date.now()}] Stream closed for ${folder}/${file}`);
        audioStateManager.removeListener();
    });
};

// Get stream state function
const getStreamState = async (req, res) => {
    res.json(audioStateManager.getStreamInfo());
};

// Export both functions
module.exports = {
    streamAudio,
    getStreamState
};