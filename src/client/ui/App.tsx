// src/client/ui/App.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Leaderboard from './Leaderboard';
import Draft from './Draft';
import Links from './Links';
import Nav, { ViewKey } from './Nav';
import type { Entry, LeaderboardPayload } from '../../shared/types';

function getHashView(): ViewKey {
  const h = (window.location.hash || '').replace('#', '').toLowerCase();
  return (h === 'draft' || h === 'leaderboard' || h === 'about') ? (h as ViewKey) : 'leaderboard';
}

function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => b.score - a.score || a.user.localeCompare(b.user));
}

export default function App() {
  const [view, setView] = useState<ViewKey>(getHashView());
  const [week, setWeek] = useState('');
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/leaderboard');
      const d: LeaderboardPayload = await r.json();
      setWeek(d.week || '');
      setRows(sortEntries(d.entries || []));
    } catch (e) {
      console.error('failed to load leaderboard', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
    const onHash = () => setView(getHashView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadLeaderboard]);

  // 切到排行榜時強制 refresh
  useEffect(() => {
    if (view === 'leaderboard') void loadLeaderboard();
  }, [view, loadLeaderboard]);

  // Draft 送出後：樂觀更新 + 轉到排行榜
  const handleRosterSubmit = useCallback(
    async (entry: Entry) => {
      setRows((prev) => {
        const next = prev.filter((r) => r.user !== entry.user);
        next.push(entry);
        return sortEntries(next);
      });
      await loadLeaderboard();
      setView('leaderboard');
      window.location.hash = 'leaderboard';
    },
    [loadLeaderboard]
  );

  const panels = useMemo(
    () => ({
      draft: <Draft onSubmit={handleRosterSubmit} />,
      leaderboard: loading && rows.length === 0
        ? <div style={{opacity:.7}}>Loading leaderboard…</div>
        : <Leaderboard week={week} rows={rows} />,
      about: (
        <div>
          <h2 style={{marginTop:0}}>About</h2>
          <p>Scoring: Release +8 · Merged PR +5 · Closed Issue +2 · Star Δ +1 (cap) · NPM Δ / 5k → +1.</p>
          <p>For fun only. No gambling or redeemable prizes.</p>
        </div>
      ),
    }),
    [handleRosterSubmit, loading, rows, week]
  );

  return (
    <div className="container">
      <div className="hero">
        <div className="hero-text">
          <div className="hero-eyebrow">Fantasy OSS League</div>
          <h1>Code Derby</h1>
          <p className="hero-copy">
            Draft three GitHub repos, track their momentum, and win the weekly derby.
          </p>
        </div>
        <div className="hero-promo">
          <span className="hero-note">Season Beta</span>
          <span className="hero-note hero-note--secondary">Live leaderboard updates daily</span>
        </div>
      </div>

      <section className="panel panel--tabs">
        <Nav
          active={view}
          onChange={(v) => {
            setView(v);
            window.location.hash = v;
          }}
        />

        {/* 一次只顯示一個，使用原生 hidden 確保不受樣式影響 */}
        <div className="card" hidden={view !== 'draft'}>{panels.draft}</div>
        <div className="card" hidden={view !== 'leaderboard'}>{panels.leaderboard}</div>
        <div className="card" hidden={view !== 'about'}>{panels.about}</div>
      </section>

      <Links />
    </div>
  );
}
