export default function ResultsView({ question, results, myAnswer, showDetail = false }) {
  if (!question || !results) return null;
  const total = results.total ?? 0;
  const optionText = Object.fromEntries(question.options.map((o) => [String(o.id), o.text]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {total} {total === 1 ? 'response' : 'responses'}
      </p>

      {question.type === 'text' ? (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {(results.texts ?? []).map((t, i) => (
            <li key={i} className="rounded-lg bg-slate-100 px-3 py-2 text-sm break-words">
              {t}
            </li>
          ))}
          {!results.texts?.length && <li className="text-sm text-slate-400">No answers yet.</li>}
        </ul>
      ) : (
        <ul className="space-y-3">
          {question.options.map((o) => {
            const count = results.counts?.[String(o.id)] ?? 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const mine = myAnswer?.optionIds?.includes(String(o.id));
            return (
              <li key={o.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={mine ? 'font-semibold text-indigo-700' : ''}>
                    {o.text}
                    {mine && ' (you)'}
                  </span>
                  <span className="text-slate-500">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showDetail && results.responses && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">Who answered what</h4>
          {results.responses.length ? (
            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm">
              {results.responses.map((r, i) => (
                <li key={i} className="flex gap-3 px-3 py-2">
                  <span className="shrink-0 font-medium">{r.nickname}</span>
                  <span className="text-slate-600 break-words">
                    {question.type === 'text' ? r.text : r.optionIds.map((id) => optionText[id]).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No answers yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
