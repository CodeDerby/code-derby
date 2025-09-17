import React, { useEffect, useState } from 'react';
import Leaderboard from './Leaderboard';
import Draft from './Draft';
import Links from './Links';
import Nav, { ViewKey } from './Nav';

function getHashView(): ViewKey {
  const h = (window.location.hash || '').replace('#', '').toLowerCase();
  if (h === 'draft' || h === 'leaderboard' || h === 'about') return h;
  return 'leaderboard';
}

export default function App() {
  const [view, setView] = useState<ViewKey>(getHashView());

  useEffect(() => {
    const onHash = () => setView(getHashView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="container">
      <div className="header">
        <span className="badge">Devvit Web · React</span>
        <h1 style={{ margin: 0 }}>Code Derby</h1>
        <div style={{ opacity: 0.6 }}>Fantasy OSS League</div>
      </div>

      <div className="card" style={{ paddingBottom: 8 }}>
        <Nav active={view} onChange={setView} />
      </div>

      {view === 'draft' && (
        <div className="card">
          <Draft />
        </div>
      )}
      {view === 'leaderboard' && (
        <div className="card">
          <Leaderboard />
        </div>
      )}
      {view === 'about' && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>About</h2>
          <p>Scoring: Release +8 - Merged PR +5 - Closed Issue +2 - Star delta +1 (cap) - NPM delta / 5k yields +1.</p>
          <p>No gambling or cash-out rewards. For fun only.</p>
        </div>
      )}

      <Links />
    </div>
  );
}
