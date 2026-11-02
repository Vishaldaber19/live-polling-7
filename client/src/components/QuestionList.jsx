import { useState } from 'react';
import { typeLabel } from '../lib/questionTypes.js';
import { btnSecondary, btnDanger, btnSuccess } from './ui.js';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-amber-100 text-amber-700',
};

export default function QuestionList({ questions, roomEnded, onEdit, onDelete, onLaunch, onClose, onViewResults }) {
  const [confirmId, setConfirmId] = useState(null);

  if (!questions.length) {
    return <p className="text-sm text-slate-500">No questions yet. Add one above.</p>;
  }

  return (
    <ul className="space-y-3">
      {questions.map((q, i) => (
        <li key={q.id} className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium break-words">
                {i + 1}. {q.text}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {typeLabel(q.type)}
                {q.options.length > 0 && ` · ${q.options.map((o) => o.text).join(', ')}`}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[q.status]}`}>
              {q.status}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {q.status === 'draft' && (
              <>
                <button className={btnSuccess} disabled={roomEnded} onClick={() => onLaunch(q)}>
                  Launch
                </button>
                <button className={btnSecondary} onClick={() => onEdit(q)}>
                  Edit
                </button>
              </>
            )}
            {q.status === 'open' && (
              <button className={btnDanger} onClick={() => onClose(q)}>
                Close
              </button>
            )}
            {q.status === 'closed' && (
              <button className={btnSecondary} onClick={() => onViewResults(q)}>
                Results
              </button>
            )}
            {q.status !== 'open' &&
              (confirmId === q.id ? (
                <>
                  <button
                    className={btnDanger}
                    onClick={() => {
                      setConfirmId(null);
                      onDelete(q);
                    }}
                  >
                    Confirm delete
                  </button>
                  <button className={btnSecondary} onClick={() => setConfirmId(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button className={btnSecondary} onClick={() => setConfirmId(q.id)}>
                  Delete
                </button>
              ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
