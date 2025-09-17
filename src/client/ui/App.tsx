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
      <div className="hero">
        <div className="hero-text">
          <div className="hero-eyebrow">Fantasy OSS League</div>
          <h1>Code Derby</h1>
          <p className="hero-copy">Draft three GitHub repos, track their momentum, and win the weekly derby.</p>
        </div>
        <div className="hero-promo">
          <span className="hero-note">Season Beta</span>
          <span className="hero-note hero-note--secondary">Live leaderboard updates daily</span>
        </div>
      </div>

      <section className="panel panel--tabs">
        <Nav active={view} onChange={setView} />
        <div className="tab-body">
          {view === 'draft' && <Draft />}
          {view === 'leaderboard' && <Leaderboard />}
          {view === 'about' && (
            <div>
              <h2 style={{ marginTop: 0 }}>About</h2>
              <p>Scoring: Release +8 - Merged PR +5 - Closed Issue +2 - Star delta +1 (cap) - NPM delta / 5k yields +1.</p>
              <p>No gambling or cash-out rewards. For fun only.</p>
            </div>
          )}
        </div>
      </section>

      <Links />
    </div>
  );
}
