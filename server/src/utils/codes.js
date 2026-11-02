import crypto from 'crypto';

// No 0/O/1/I to avoid confusion when reading the code aloud
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

export function generateHostKey() {
  return crypto.randomBytes(24).toString('hex');
}

export function hashKey(key) {
  return crypto.createHash('sha256').update(String(key)).digest('hex');
}

export function verifyHostKey(room, key) {
  if (!room || !key) return false;
  const a = Buffer.from(hashKey(key));
  const b = Buffer.from(room.hostKeyHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
