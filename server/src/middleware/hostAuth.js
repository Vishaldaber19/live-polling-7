import Room from '../models/Room.js';
import { verifyHostKey } from '../utils/codes.js';

// Loads room by :code and requires matching x-host-key header
export async function hostAuth(req, res, next) {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() }).select('+hostKeyHash');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!verifyHostKey(room, req.get('x-host-key'))) {
      return res.status(401).json({ error: 'Invalid host key' });
    }
    req.room = room;
    next();
  } catch (err) {
    next(err);
  }
}
