// src/client/ui/App.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Draft from './Draft';
import Leaderboard from './Leaderboard';
import About from './About';
import type { Entry, LeaderboardPayload } from '../../shared/types';

type ViewKey = 'draft' | 'leaderboard' | 'about';

export default function App() {
  const [view, setView] = useState<ViewKey>('leaderboard');
  const [lb, setLb] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const popToast = useCallback((msg: string) => {
    setToast(msg);
    // 2.2s 後自動消失
    window.clearTimeout((popToast as any)._t);
    (popToast as any)._t = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/leaderboard', { cache: 'no-store' });
      const j: LeaderboardPayload = await r.json();
      setLb(j);
    } catch (e) {
      console.error('leaderboard fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  const onSubmit = useCallback(async (entry: Entry) => {
    try {
      const res = await fetch('/api/roster/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repos: entry.repos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `submit failed (${res.status})`);
      }
      await refreshLeaderboard();
      popToast('Submitted! ✅');
      setView('leaderboard');
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    } catch (e) {
      console.error(e);
      alert('Submit failed. Please try again.');
    }
  }, [refreshLeaderboard]);

  const tabs = useMemo(
    () => ([
      { k: 'draft', label: 'Draft' },
      { k: 'leaderboard', label: 'Leaderboard' },
      { k: 'about', label: 'About' },
    ] as { k: ViewKey; label: string }[]),
    []
  );

  return (
    <div className="container">
      {/* Hero */}
      <div className="card hero">
        <div className="eyebrow">FANTASY OSS LEAGUE</div>
        <h1 className="title">Code Derby</h1>
        <p className="sub">
          Draft three GitHub repos, track their momentum, and win the weekly derby.
        </p>
        <div className="meta-row">
          <span className="badge">SEASON BETA</span>
          <span className="sep"> </span>
          <span className="muted">LIVE LEADERBOARD UPDATES DAILY</span>
        </div>
      </div>

      {/* Tabs + Content in ONE card */}
      <div className="card">
        <div className="tabs">
          {tabs.map(t => (
            <button
              key={t.k}
              className={`tab ${view === t.k ? 'active' : ''}`}
              onClick={() => setView(t.k as ViewKey)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="content">
          {view === 'draft' && <Draft onSubmit={onSubmit} />}

          {view === 'leaderboard' && (
            <>
              {loading && <div className="muted" style={{ marginBottom: 8 }}>Loading…</div>}
              <Leaderboard
                week={lb?.week ?? ''}
                weekStart={lb?.weekStart}
                weekEnd={lb?.weekEnd}
                updatedAt={lb?.updatedAt}
                rows={lb?.entries ?? []}
                onGoDraft={() => setView('draft')}
              />
            </>
          )}

          {view === 'about' && <About />}
        </div>
      </div>

      {toast && <div className="cd-toast">{toast}</div>}

      {/* Footer links */}
      <div className="footer-links">
        <a className="link" href="/terms" target="_blank" rel="noopener">Terms</a>
        <a className="link" href="/privacy" target="_blank" rel="noopener">Privacy</a>
      </div>
    </div>
  );
}
