import { useState } from 'react';
import { QUESTION_TYPES, MIN_OPTIONS, MAX_OPTIONS } from '../lib/questionTypes.js';
import { input, btnPrimary, btnSecondary } from './ui.js';

const needsOptions = (type) => type === 'single' || type === 'multi';

export default function QuestionForm({ initial, onSubmit, onCancel }) {
  const [text, setText] = useState(initial?.text ?? '');
  const [type, setType] = useState(initial?.type ?? 'single');
  const [options, setOptions] = useState(
    initial && needsOptions(initial.type) ? initial.options.map((o) => o.text) : ['', '']
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateOption = (i, value) => setOptions((opts) => opts.map((o, idx) => (idx === i ? value : o)));
  const removeOption = (i) => setOptions((opts) => opts.filter((_, idx) => idx !== i));
  const addOption = () => setOptions((opts) => [...opts, '']);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const body = { text: text.trim(), type };
    if (needsOptions(type)) body.options = options.map((o) => o.trim()).filter(Boolean);

    if (!body.text) return setError('Question text is required');
    if (needsOptions(type) && body.options.length < MIN_OPTIONS) {
      return setError(`Add at least ${MIN_OPTIONS} options`);
    }

    setSaving(true);
    try {
      await onSubmit(body);
      if (!initial) {
        setText('');
        setOptions(['', '']);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Question</label>
        <textarea
          className={input}
          rows={2}
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What do you want to ask?"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
        <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {needsOptions(type) && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Options</label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={input}
                maxLength={200}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > MIN_OPTIONS && (
                <button type="button" className={btnSecondary} onClick={() => removeOption(i)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button type="button" className="text-sm font-medium text-indigo-600" onClick={addOption}>
              + Add option
            </button>
          )}
        </div>
      )}

      {type === 'truefalse' && <p className="text-sm text-slate-500">Options: True / False</p>}
      {type === 'text' && <p className="text-sm text-slate-500">Students type a free-text answer.</p>}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={saving}>
          {initial ? 'Save changes' : 'Add question'}
        </button>
        {onCancel && (
          <button type="button" className={btnSecondary} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
