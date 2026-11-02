import { io } from 'socket.io-client';

// Same origin; Vite proxies /socket.io to the server in dev
export const socket = io({ autoConnect: false });

// Promise wrapper around emit-with-ack
export function emitAck(event, payload) {
  return new Promise((resolve) => {
    socket.timeout(10000).emit(event, payload, (err, res) => {
      if (err) resolve({ ok: false, error: 'Server did not respond' });
      else resolve(res);
    });
  });
}
