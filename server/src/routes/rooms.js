import { Router } from 'express';
import Room from '../models/Room.js';
import { generateRoomCode, generateHostKey, hashKey } from '../utils/codes.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'Room name is required' });
    if (name.length > 100) return res.status(400).json({ error: 'Room name max 100 characters' });

    const hostKey = generateHostKey();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const room = await Room.create({ name, code: generateRoomCode(), hostKeyHash: hashKey(hostKey) });
        return res.status(201).json({ room: room.toPublic(), hostKey });
      } catch (err) {
        if (err.code !== 11000) throw err; // retry only on code collision
      }
    }
    res.status(500).json({ error: 'Could not generate room code, try again' });
  } catch (err) {
    next(err);
  }
});

router.get('/:code', async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room: room.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
