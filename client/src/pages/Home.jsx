import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { setHostKey, setNickname } from '../lib/storage.js';
import { card, input, btnPrimary } from '../components/ui.js';

export default function Home() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNick] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [busy, setBusy] = useState(false);

  async function createRoom(e) {
    e.preventDefault();
    setCreateError('');
    if (!roomName.trim()) return setCreateError('Enter a room name');
    setBusy(true);
    try {
      const { room, hostKey } = await api.createRoom(roomName.trim());
      setHostKey(room.code, hostKey);
      navigate(`/host/${room.code}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function joinRoom(e) {
    e.preventDefault();
    setJoinError('');
    const c = code.trim().toUpperCase();
    if (!c) return setJoinError('Enter the room code');
    if (!nickname.trim()) return setJoinError('Enter a nickname');
    setNickname(c, nickname.trim());
    navigate(`/play/${c}`);
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <form onSubmit={joinRoom} className={`${card} space-y-4`}>
        <div>
          <h2 className="text-xl font-semibold">Join a room</h2>
          <p className="text-sm text-slate-500">Enter the code shown by your host.</p>
        </div>
        <input
          className={`${input} font-mono tracking-widest uppercase`}
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ROOM CODE"
        />
        <input
          className={input}
          maxLength={30}
          value={nickname}
          onChange={(e) => setNick(e.target.value)}
          placeholder="Your nickname"
        />
        {joinError && <p className="text-sm text-rose-600">{joinError}</p>}
        <button type="submit" className={`${btnPrimary} w-full`}>
          Join
        </button>
      </form>

      <form onSubmit={createRoom} className={`${card} space-y-4`}>
        <div>
          <h2 className="text-xl font-semibold">Host a room</h2>
          <p className="text-sm text-slate-500">Create a room and add your questions.</p>
        </div>
        <input
          className={input}
          maxLength={100}
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Room name, e.g. Math 101"
        />
        {createError && <p className="text-sm text-rose-600">{createError}</p>}
        <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
          Create room
        </button>
      </form>
    </div>
  );
}
