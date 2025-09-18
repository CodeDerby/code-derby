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
function nextMondayUTC(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getUTCDay(); const diff = (8 - day) % 7 || 7;
  const res = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  res.setUTCDate(res.getUTCDate() + diff);
  return res;
}
function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function App() {
  const [view, setView] = useState<ViewKey>(getHashView());
  const [week, setWeek] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 1600); };

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/leaderboard', { headers: { 'cache-control': 'no-store' } });
      const d: LeaderboardPayload = await r.json();
      setWeek(d.week || '');
      setWeekStart(d.weekStart || d.week || '');
      setWeekEnd(d.weekEnd || '');
      setUpdatedAt(d.updatedAt);
      setRows(sortEntries(d.entries || []));
    } catch (e) {
      console.error('load leaderboard failed', e);
      setRows([]);
      setWeek(''); setWeekStart(''); setWeekEnd(''); setUpdatedAt(undefined);
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

  useEffect(() => { if (view === 'leaderboard') void loadLeaderboard(); }, [view, loadLeaderboard]);

  useEffect(() => {
    if (view !== 'leaderboard') return;
    const id = setInterval(() => { if (!document.hidden) void loadLeaderboard(); }, 20000);
    const onVis = () => { if (!document.hidden) void loadLeaderboard(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [view, loadLeaderboard]);

  const handleRosterSubmit = useCallback(async (entry: Entry) => {
    const res = await fetch('/api/roster/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ repos: entry.repos })
    });
    const j = await res.json();
    if (j.ok) {
      showToast('Submitted ✓');
      await loadLeaderboard();
      setView('leaderboard'); window.location.hash = 'leaderboard';
    } else {
      showToast('Submit failed');
    }
  }, [loadLeaderboard]);

  const [untilLock, setUntilLock] = useState('');
  useEffect(() => {
    const tick = () => setUntilLock(fmtCountdown(nextMondayUTC().getTime() - Date.now()));
    tick(); const id = setInterval(tick, 60000); return () => clearInterval(id);
  }, []);

  const panels = useMemo(() => ({
    draft: <Draft onSubmit={handleRosterSubmit} />,
    leaderboard: loading && rows.length === 0
      ? <div style={{ opacity: .7 }}>Loading leaderboard…</div>
      : <Leaderboard
          week={week}
          weekStart={weekStart}
          weekEnd={weekEnd}
          rows={rows}
          updatedAt={updatedAt}
          onGoDraft={() => { setView('draft'); window.location.hash = 'draft'; }}
        />,
    about: (
      <div>
        <h2 style={{ marginTop: 0 }}>About</h2>
        <p>Scoring: Release +8 · Merged PR +5 · Closed Issue +2 · Star Δ +1 (cap) · NPM Δ / 5k → +1.</p>
        <p>For fun only. No gambling or redeemable prizes.</p>
      </div>
    ),
  }), [handleRosterSubmit, loading, rows, week, weekStart, weekEnd, updatedAt]);

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
          <span className="hero-note">Draft locks in {untilLock}</span>
        </div>
      </div>

      <section className="panel panel--tabs">
        <Nav active={view} onChange={(v) => { setView(v); window.location.hash = v; }} />
      </section>

      <div className="card fade" hidden={view !== 'draft'}>{panels.draft}</div>
      <div className="card fade" hidden={view !== 'leaderboard'}>{panels.leaderboard}</div>
      <div className="card fade" hidden={view !== 'about'}>{panels.about}</div>

      <Links />
      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}
    </div>
  );
}
