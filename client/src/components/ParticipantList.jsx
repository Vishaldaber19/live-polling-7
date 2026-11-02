export default function ParticipantList({ participants }) {
  const online = participants.filter((p) => p.connected).length;
  return (
    <div>
      <h3 className="mb-2 font-semibold">
        Participants <span className="text-sm font-normal text-slate-500">({online} online)</span>
      </h3>
      {participants.length ? (
        <ul className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <li
              key={p.nickname}
              className={`rounded-full px-3 py-1 text-sm ${
                p.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {p.nickname}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Waiting for students to join…</p>
      )}
    </div>
  );
}
