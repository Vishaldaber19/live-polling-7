import { useState } from 'react';
import { input, btnPrimary } from './ui.js';

export default function AnswerForm({ question, onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isMulti = question.type === 'multi';
  const isText = question.type === 'text';

  function toggle(id) {
    if (isMulti) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setSelected([id]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (isText && !text.trim()) return setError('Type an answer');
    if (!isText && !selected.length) return setError('Pick an option');

    setSubmitting(true);
    const res = await onSubmit(isText ? { text: text.trim() } : { optionIds: selected });
    setSubmitting(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {isText ? (
        <textarea
          className={input}
          rows={3}
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your answer"
        />
      ) : (
        <div className="space-y-2">
          {isMulti && <p className="text-sm text-slate-500">Select all that apply.</p>}
          {question.options.map((o) => {
            const id = String(o.id);
            const checked = selected.includes(id);
            return (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                  checked ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name="answer"
                  checked={checked}
                  onChange={() => toggle(id)}
                  className="accent-indigo-600"
                />
                <span className="break-words">{o.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <p className="text-xs text-slate-400">You can answer once — answers are locked after submitting.</p>
      <button type="submit" className={`${btnPrimary} w-full`} disabled={submitting}>
        Submit answer
      </button>
    </form>
  );
}
