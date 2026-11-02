import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Question from '../models/Question.js';
import Participant from '../models/Participant.js';
import Response from '../models/Response.js';
import { verifyHostKey } from '../utils/codes.js';
import { getResults } from '../services/results.js';

const roomChannel = (code) => `room:${code}`;
const hostChannel = (code) => `host:${code}`;

const normCode = (code) => (typeof code === 'string' ? code.trim().toUpperCase() : '');

// Wraps a handler so thrown errors become { ok: false } acks
function handle(fn) {
  return async (payload = {}, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try {
      reply(await fn(payload ?? {}));
    } catch (err) {
      console.error(err);
      reply({ ok: false, error: 'Server error' });
    }
  };
}

async function loadHostRoom(code, hostKey) {
  const room = await Room.findOne({ code: normCode(code) }).select('+hostKeyHash');
  if (!room) return { error: 'Room not found' };
  if (!verifyHostKey(room, hostKey)) return { error: 'Invalid host key' };
  return { room };
}

async function loadActiveQuestion(room) {
  if (!room.activeQuestion) return null;
  const question = await Question.findOne({ _id: room.activeQuestion, status: 'open' });
  return question;
}

async function broadcastParticipants(io, room) {
  const participants = await Participant.find({ room: room._id }).sort({ createdAt: 1 }).lean();
  const list = participants.map((p) => ({ nickname: p.nickname, connected: p.connected }));
  io.to(hostChannel(room.code)).emit('participants:update', { participants: list });
  io.to(roomChannel(room.code)).emit('participants:count', {
    count: list.filter((p) => p.connected).length,
  });
}

async function broadcastResults(io, room, question) {
  const [publicResults, detail] = await Promise.all([
    getResults(question),
    getResults(question, { detail: true }),
  ]);
  io.to(roomChannel(room.code)).emit('results:update', publicResults);
  io.to(hostChannel(room.code)).emit('results:detail', detail);
}

async function closeQuestion(io, room, question) {
  question.status = 'closed';
  await question.save();
  io.to(roomChannel(room.code)).emit('question:closed', {
    questionId: question._id,
    results: await getResults(question),
  });
}

function validateAnswer(question, { optionIds, text }) {
  if (question.type === 'text') {
    const value = typeof text === 'string' ? text.trim() : '';
    if (!value) return { error: 'Answer cannot be empty' };
    if (value.length > 500) return { error: 'Answer max 500 characters' };
    return { data: { text: value } };
  }

  if (!Array.isArray(optionIds)) return { error: 'Select an option' };
  const valid = new Set(question.options.map((o) => String(o._id)));
  const picked = [...new Set(optionIds.map(String))];
  if (picked.some((id) => !valid.has(id))) return { error: 'Invalid option' };

  if (question.type === 'multi') {
    if (picked.length < 1) return { error: 'Select at least one option' };
  } else if (picked.length !== 1) {
    return { error: 'Select exactly one option' };
  }
  return { data: { optionIds: picked.map((id) => new mongoose.Types.ObjectId(id)) } };
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(
      'host:join',
      handle(async ({ code, hostKey }) => {
        const { room, error } = await loadHostRoom(code, hostKey);
        if (error) return { ok: false, error };

        socket.join([roomChannel(room.code), hostChannel(room.code)]);
        socket.data.hostOf = room.code;

        const question = await loadActiveQuestion(room);
        const participants = await Participant.find({ room: room._id }).sort({ createdAt: 1 }).lean();
        return {
          ok: true,
          room: room.toPublic(),
          activeQuestion: question?.toPublic() ?? null,
          results: question ? await getResults(question, { detail: true }) : null,
          participants: participants.map((p) => ({ nickname: p.nickname, connected: p.connected })),
        };
      })
    );

    socket.on(
      'student:join',
      handle(async ({ code, nickname, participantId }) => {
        const room = await Room.findOne({ code: normCode(code) });
        if (!room) return { ok: false, error: 'Room not found' };
        if (room.status === 'ended') return { ok: false, error: 'This session has ended' };

        const nick = typeof nickname === 'string' ? nickname.trim() : '';
        if (!nick) return { ok: false, error: 'Nickname is required' };
        if (nick.length > 30) return { ok: false, error: 'Nickname max 30 characters' };
        if (typeof participantId !== 'string' || participantId.length < 8 || participantId.length > 64) {
          return { ok: false, error: 'Invalid participant id' };
        }

        const taken = await Participant.findOne({ room: room._id, nicknameLower: nick.toLowerCase() });
        if (taken && taken.participantId !== participantId) {
          return { ok: false, error: 'Nickname already taken in this room' };
        }

        let participant;
        try {
          participant = await Participant.findOneAndUpdate(
            { room: room._id, participantId },
            { nickname: nick, nicknameLower: nick.toLowerCase(), connected: true, socketId: socket.id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (err) {
          if (err.code === 11000) return { ok: false, error: 'Nickname already taken in this room' };
          throw err;
        }

        socket.join(roomChannel(room.code));
        socket.data.participant = { roomId: String(room._id), code: room.code, participantId, nickname: nick };

        const question = await loadActiveQuestion(room);
        let myAnswer = null;
        if (question) {
          const r = await Response.findOne({ question: question._id, participantId }).lean();
          if (r) myAnswer = { optionIds: r.optionIds.map(String), text: r.text };
        }

        await broadcastParticipants(io, room);
        return {
          ok: true,
          room: room.toPublic(),
          nickname: participant.nickname,
          activeQuestion: question?.toPublic() ?? null,
          results: question ? await getResults(question) : null,
          myAnswer,
        };
      })
    );

    socket.on(
      'host:launch',
      handle(async ({ code, hostKey, questionId }) => {
        const { room, error } = await loadHostRoom(code, hostKey);
        if (error) return { ok: false, error };
        if (room.status === 'ended') return { ok: false, error: 'Session has ended' };
        if (!mongoose.isValidObjectId(questionId)) return { ok: false, error: 'Question not found' };

        const question = await Question.findOne({ _id: questionId, room: room._id });
        if (!question) return { ok: false, error: 'Question not found' };
        if (question.status !== 'draft') return { ok: false, error: 'Only draft questions can be launched' };

        const openOnes = await Question.find({ room: room._id, status: 'open' });
        for (const q of openOnes) await closeQuestion(io, room, q);

        question.status = 'open';
        await question.save();
        room.status = 'live';
        room.activeQuestion = question._id;
        await room.save();

        const results = await getResults(question);
        io.to(roomChannel(room.code)).emit('question:started', { question: question.toPublic(), results });
        io.to(hostChannel(room.code)).emit('results:detail', await getResults(question, { detail: true }));
        return { ok: true };
      })
    );

    socket.on(
      'host:close',
      handle(async ({ code, hostKey, questionId }) => {
        const { room, error } = await loadHostRoom(code, hostKey);
        if (error) return { ok: false, error };
        if (!mongoose.isValidObjectId(questionId)) return { ok: false, error: 'Question not found' };

        const question = await Question.findOne({ _id: questionId, room: room._id });
        if (!question) return { ok: false, error: 'Question not found' };
        if (question.status !== 'open') return { ok: false, error: 'Question is not open' };

        await closeQuestion(io, room, question);
        room.activeQuestion = null;
        await room.save();
        return { ok: true };
      })
    );

    socket.on(
      'host:end',
      handle(async ({ code, hostKey }) => {
        const { room, error } = await loadHostRoom(code, hostKey);
        if (error) return { ok: false, error };

        const openOnes = await Question.find({ room: room._id, status: 'open' });
        for (const q of openOnes) await closeQuestion(io, room, q);

        room.status = 'ended';
        room.activeQuestion = null;
        await room.save();
        io.to(roomChannel(room.code)).emit('room:ended');
        return { ok: true };
      })
    );

    socket.on(
      'student:answer',
      handle(async ({ questionId, optionIds, text }) => {
        const me = socket.data.participant;
        if (!me) return { ok: false, error: 'Join the room first' };
        if (!mongoose.isValidObjectId(questionId)) return { ok: false, error: 'Question not found' };

        const room = await Room.findById(me.roomId);
        if (!room || room.status === 'ended') return { ok: false, error: 'This session has ended' };

        const question = await Question.findOne({ _id: questionId, room: room._id });
        if (!question) return { ok: false, error: 'Question not found' };
        if (question.status !== 'open') return { ok: false, error: 'Question is closed' };

        const { data, error } = validateAnswer(question, { optionIds, text });
        if (error) return { ok: false, error };

        try {
          await Response.create({
            room: room._id,
            question: question._id,
            participantId: me.participantId,
            nickname: me.nickname,
            ...data,
          });
        } catch (err) {
          if (err.code === 11000) return { ok: false, error: 'You already answered this question' };
          throw err;
        }

        await broadcastResults(io, room, question);
        return {
          ok: true,
          myAnswer: { optionIds: (data.optionIds ?? []).map(String), text: data.text },
        };
      })
    );

    socket.on('disconnect', async () => {
      const me = socket.data.participant;
      if (!me) return;
      try {
        // Only mark offline if this socket is still the participant's latest one
        const updated = await Participant.findOneAndUpdate(
          { room: me.roomId, participantId: me.participantId, socketId: socket.id },
          { connected: false, socketId: null }
        );
        if (updated) {
          const room = await Room.findById(me.roomId);
          if (room) await broadcastParticipants(io, room);
        }
      } catch (err) {
        console.error(err);
      }
    });
  });
}
