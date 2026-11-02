import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import HostRoom from './pages/HostRoom.jsx';
import PlayRoom from './pages/PlayRoom.jsx';

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Link to="/" className="text-lg font-bold text-indigo-600">
            Live Poll
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host/:code" element={<HostRoom />} />
          <Route path="/play/:code" element={<PlayRoom />} />
          <Route path="*" element={<p className="text-slate-500">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
