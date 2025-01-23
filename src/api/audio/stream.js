import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const { folder, file } = req.query; // Get folder and file from query params

    // Construct the absolute file path
    const filePath = path.join(process.cwd(), 'public', 'audio', folder, file);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Audio file not found' });
        return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Set headers for audio streaming
    res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache', // Avoid caching for dynamic streaming
    });

    // Create a read stream and pipe it to the response
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);

    readStream.on('error', (err) => {
        console.error('Stream Error:', err);
        res.status(500).end('Error streaming the file');
    });

    readStream.on('end', () => {
        console.log(`Finished streaming: ${file}`);
    });
}