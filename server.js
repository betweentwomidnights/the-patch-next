const express = require('express');
const next = require('next');
const multer = require('multer');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: './' }); // Explicitly setting the directory
const handle = app.getRequestHandler();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.prepare().then(() => {
  const server = express();

  server.post('/api/upload', upload.single('wavFile'), (req, res) => {
    res.json({ path: `/uploads/${req.file.filename}` });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
