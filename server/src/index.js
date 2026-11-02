import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import roomsRouter from './routes/rooms.js';
import questionsRouter from './routes/questions.js';
import { registerSocketHandlers } from './socket/index.js';

const PORT = process.env.PORT || 5001;
// Comma-separated list, e.g. "http://localhost:5173,https://my-app.vercel.app"
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/rooms', roomsRouter);
app.use('/api/rooms/:code/questions', questionsRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });
registerSocketHandlers(io);

connectDB(process.env.MONGODB_URI)
  .then(() => server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
