// status-service/src/server.ts
import express from 'express';
import cors from 'cors';
import { StatusStorage } from './storage';

const app = express();
const port = process.env.PORT || 3001;  // Different from Next.js port

app.use(cors());

// Base middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// The endpoint will be available at /status-api/status after nginx routing
app.get('/api/status', async (req, res) => {
  const storage = await StatusStorage.getInstance();
  res.json(await storage.getStatus());
});

app.listen(port, () => {
  console.log(`Status service listening on port ${port}`);
  console.log(`Service will be available at https://thecollabagepatch.com/status-api/status`);
});
