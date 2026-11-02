import { io } from 'socket.io-client';
import { API_URL } from './config.js';

// No API_URL → same origin (Vite proxies /socket.io in dev)
export const socket = io(API_URL || undefined, { autoConnect: false });

// Promise wrapper around emit-with-ack
export function emitAck(event, payload) {
  return new Promise((resolve) => {
    socket.timeout(10000).emit(event, payload, (err, res) => {
      if (err) resolve({ ok: false, error: 'Server did not respond' });
      else resolve(res);
    });
  });
}
