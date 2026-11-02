import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { socket, emitAck } from '../lib/socket.js';
import { getNickname, setNickname, getParticipantId } from '../lib/storage.js';
import AnswerForm from '../components/AnswerForm.jsx';
import ResultsView from '../components/ResultsView.jsx';
import { card, input, btnPrimary } from '../components/ui.js';

export default function PlayRoom() {
  const code = useParams().code.toUpperCase();

  const [nickname, setNick] = useState(() => getNickname(code) ?? '');
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);
  const [results, setResults] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [closed, setClosed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [count, setCount] = useState(0);

  // Holds the nickname the student actually submitted (not the in-progress input)
  const nickRef = useRef(getNickname(code));
  const questionRef = useRef(null);
  questionRef.current = question;
  const joinRef = useRef(null);

  useEffect(() => {
    async function join() {
      if (!nickRef.current) return;
      const res = await emitAck('student:join', {
        code,
        nickname: nickRef.current,
        participantId: getParticipantId(),
      });
      if (!res.ok) {
        setJoined(false);
        setJoinError(res.error);
        if (res.error === 'This session has ended') setEnded(true);
        return;
      }
      setJoinError('');
      setJoined(true);
      setRoom(res.room);
      setNick(res.nickname);
      if (res.activeQuestion) {
        setQuestion(res.activeQuestion);
        setResults(res.results);
        setMyAnswer(res.myAnswer);
        setClosed(false);
      }
    }

    const onStarted = ({ question, results }) => {
      setQuestion(question);
      setResults(results);
      setMyAnswer(null);
      setClosed(false);
    };
    const onClosed = ({ questionId, results }) => {
      if (questionRef.current?.id !== questionId) return;
      setResults(results);
      setClosed(true);
    };
    const onResults = (r) => {
      if (questionRef.current?.id === r.questionId) setResults(r);
    };
    const onCount = ({ count }) => setCount(count);
    const onEnded = () => setEnded(true);

    socket.on('connect', join);
    socket.on('question:started', onStarted);
    socket.on('question:closed', onClosed);
    socket.on('results:update', onResults);
    socket.on('participants:count', onCount);
    socket.on('room:ended', onEnded);
    joinRef.current = join;
    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.off('connect', join);
      socket.off('question:started', onStarted);
      socket.off('question:closed', onClosed);
      socket.off('results:update', onResults);
      socket.off('participants:count', onCount);
      socket.off('room:ended', onEnded);
      joinRef.current = null;
      socket.disconnect();
    };
  }, [code]);

  function submitNickname(e) {
    e.preventDefault();
    const nick = nickname.trim();
    if (!nick) return setJoinError('Enter a nickname');
    nickRef.current = nick;
    setNickname(code, nick);
    joinRef.current?.();
  }

  async function submitAnswer(answer) {
    const res = await emitAck('student:answer', { questionId: question.id, ...answer });
    if (res.ok) setMyAnswer(res.myAnswer);
    else if (res.error === 'You already answered this question') setMyAnswer(answer);
    return res;
  }

  if (ended) {
    return (
      <div className={`${card} mx-auto max-w-md text-center`}>
        <h2 className="text-xl font-semibold">Session ended</h2>
        <p className="mt-1 text-sm text-slate-500">Thanks for participating!</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Back home
        </Link>
      </div>
    );
  }

  if (!joined) {
    return (
      <form onSubmit={submitNickname} className={`${card} mx-auto max-w-md space-y-4`}>
        <div>
          <h2 className="text-xl font-semibold">Join room {code}</h2>
          <p className="text-sm text-slate-500">Pick a nickname so the host can see you.</p>
        </div>
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
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {room?.name} · <span className="font-mono">{code}</span>
        </span>
        <span>
          {nickname} · {count} online
        </span>
      </div>

      {!question ? (
        <div className={`${card} text-center`}>
          <p className="text-lg font-medium">You're in!</p>
          <p className="mt-1 text-sm text-slate-500">Waiting for the host to start a question…</p>
        </div>
      ) : (
        <div className={`${card} space-y-4`}>
          <h2 className="text-xl font-semibold break-words">{question.text}</h2>
          {!myAnswer && !closed ? (
            <AnswerForm key={question.id} question={question} onSubmit={submitAnswer} />
          ) : (
            <>
              {myAnswer && <p className="text-sm font-medium text-emerald-700">Answer submitted ✓</p>}
              <ResultsView question={question} results={results} myAnswer={myAnswer} />
            </>
          )}
          {closed && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
              Question closed. Waiting for the next question…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
