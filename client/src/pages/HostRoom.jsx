import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { socket, emitAck } from '../lib/socket.js';
import { getHostKey } from '../lib/storage.js';
import QuestionForm from '../components/QuestionForm.jsx';
import QuestionList from '../components/QuestionList.jsx';
import ResultsView from '../components/ResultsView.jsx';
import ParticipantList from '../components/ParticipantList.jsx';
import { card, btnDanger } from '../components/ui.js';

export default function HostRoom() {
  const code = useParams().code.toUpperCase();
  const hostKey = getHostKey(code);

  const [room, setRoom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [viewing, setViewing] = useState(null); // { questionId, results }
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const loadQuestions = useCallback(async () => {
    const { questions } = await api.listQuestions(code, hostKey);
    setQuestions(questions);
  }, [code, hostKey]);

  useEffect(() => {
    if (!hostKey) return;
    loadQuestions().catch((err) => setError(err.message));
  }, [hostKey, loadQuestions]);

  useEffect(() => {
    if (!hostKey) return;

    async function join() {
      setConnected(true);
      const res = await emitAck('host:join', { code, hostKey });
      if (!res.ok) return setError(res.error);
      setRoom(res.room);
      setParticipants(res.participants);
      if (res.activeQuestion) setViewing({ questionId: res.activeQuestion.id, results: res.results });
    }

    const onDisconnect = () => setConnected(false);
    const onParticipants = ({ participants }) => setParticipants(participants);
    const onStarted = ({ question }) => {
      setRoom((r) => (r ? { ...r, status: 'live', activeQuestion: question.id } : r));
      setQuestions((qs) => qs.map((q) => (q.id === question.id ? question : q)));
    };
    const onClosed = ({ questionId }) => {
      setRoom((r) => (r && r.activeQuestion === questionId ? { ...r, activeQuestion: null } : r));
      setQuestions((qs) => qs.map((q) => (q.id === questionId ? { ...q, status: 'closed' } : q)));
    };
    const onDetail = (results) => setViewing({ questionId: results.questionId, results });
    const onEnded = () => setRoom((r) => (r ? { ...r, status: 'ended', activeQuestion: null } : r));

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on('participants:update', onParticipants);
    socket.on('question:started', onStarted);
    socket.on('question:closed', onClosed);
    socket.on('results:detail', onDetail);
    socket.on('room:ended', onEnded);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off('participants:update', onParticipants);
      socket.off('question:started', onStarted);
      socket.off('question:closed', onClosed);
      socket.off('results:detail', onDetail);
      socket.off('room:ended', onEnded);
      socket.disconnect();
    };
  }, [code, hostKey]);

  if (!hostKey) {
    return (
      <div className={`${card} mx-auto max-w-md text-center`}>
        <p className="font-medium">You are not the host of this room.</p>
        <p className="mt-1 text-sm text-slate-500">The host key for {code} is not saved in this browser.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Back home
        </Link>
      </div>
    );
  }

  async function run(fn) {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  }

  const createQuestion = async (body) => {
    await api.createQuestion(code, hostKey, body);
    await loadQuestions();
  };
  const updateQuestion = async (body) => {
    await api.updateQuestion(code, hostKey, editing.id, body);
    setEditing(null);
    await loadQuestions();
  };
  const deleteQuestion = (q) =>
    run(async () => {
      await api.deleteQuestion(code, hostKey, q.id);
      if (editing?.id === q.id) setEditing(null);
      if (viewing?.questionId === q.id) setViewing(null);
      await loadQuestions();
    });
  const launch = (q) =>
    run(async () => {
      const res = await emitAck('host:launch', { code, hostKey, questionId: q.id });
      if (!res.ok) throw new Error(res.error);
    });
  const close = (q) =>
    run(async () => {
      const res = await emitAck('host:close', { code, hostKey, questionId: q.id });
      if (!res.ok) throw new Error(res.error);
    });
  const viewResults = (q) =>
    run(async () => {
      const { results } = await api.getResults(code, hostKey, q.id);
      setViewing({ questionId: q.id, results });
    });
  const endSession = () =>
    run(async () => {
      const res = await emitAck('host:end', { code, hostKey });
      if (!res.ok) throw new Error(res.error);
    });

  const ended = room?.status === 'ended';
  const viewedQuestion = questions.find((q) => q.id === viewing?.questionId);

  return (
    <div className="space-y-6">
      <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <p className="text-sm text-slate-500">Hosting</p>
          <h1 className="text-2xl font-bold">{room?.name ?? '…'}</h1>
          <p className="mt-1 text-xs text-slate-400">
            {connected ? 'Connected' : 'Connecting…'} · Status: {room?.status ?? '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Join code</p>
          <p className="font-mono text-4xl font-bold tracking-widest text-indigo-600">{code}</p>
        </div>
        {!ended && room && (
          <button className={btnDanger} onClick={endSession}>
            End session
          </button>
        )}
      </div>

      {ended && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This session has ended. Students can no longer join or answer.
        </p>
      )}
      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className={card}>
            <h2 className="mb-3 text-lg font-semibold">{editing ? 'Edit question' : 'New question'}</h2>
            <QuestionForm
              key={editing?.id ?? 'new'}
              initial={editing}
              onSubmit={editing ? updateQuestion : createQuestion}
              onCancel={editing ? () => setEditing(null) : undefined}
            />
          </section>

          <section className={card}>
            <h2 className="mb-3 text-lg font-semibold">Questions</h2>
            <QuestionList
              questions={questions}
              roomEnded={ended}
              onEdit={setEditing}
              onDelete={deleteQuestion}
              onLaunch={launch}
              onClose={close}
              onViewResults={viewResults}
            />
          </section>
        </div>

        <div className="space-y-6">
          <section className={card}>
            <h2 className="mb-1 text-lg font-semibold">Results</h2>
            {viewedQuestion ? (
              <>
                <p className="mb-3 font-medium break-words">
                  {viewedQuestion.text}
                  {viewedQuestion.status === 'open' && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                      live
                    </span>
                  )}
                </p>
                <ResultsView question={viewedQuestion} results={viewing.results} showDetail />
              </>
            ) : (
              <p className="text-sm text-slate-500">Launch a question to see live results.</p>
            )}
          </section>

          <section className={card}>
            <ParticipantList participants={participants} />
          </section>
        </div>
      </div>
    </div>
  );
}
