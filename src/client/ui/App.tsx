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
  const day = d.getUTCDay();          // 0 Sun..6 Sat
  const diff = (8 - day) % 7 || 7;    // next Monday
  const res = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  res.setUTCDate(res.getUTCDate() + diff);
  return res;                          // 00:00 UTC
}
function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function App() {
  const [view, setView] = useState<ViewKey>(getHashView());
  const [week, setWeek] = useState('');
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(''), 1600);
  }

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/leaderboard');
      if (!r.ok) throw new Error('load leaderboard failed');
      const d: LeaderboardPayload = await r.json();
      setWeek(d.week || '');
      setRows(sortEntries(d.entries || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始載入 + 監聽 hash
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

  // 排行榜分頁背景 revalidate（每 20s、視窗回到前景）
  useEffect(() => {
    if (view !== 'leaderboard') return;
    const id = setInterval(() => { if (!document.hidden) void loadLeaderboard(); }, 20000);
    const onVis = () => { if (!document.hidden) void loadLeaderboard(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [view, loadLeaderboard]);

  // 草稿送出：樂觀更新 + 切頁 + Toast
  const handleRosterSubmit = useCallback(async (entry: Entry) => {
    setRows(prev => {
      const next = prev.filter(r => r.user !== entry.user); next.push(entry);
      return sortEntries(next);
    });
    await loadLeaderboard();
    showToast('Submitted ✓');
    setView('leaderboard');
    window.location.hash = 'leaderboard';
  }, [loadLeaderboard]);

  // hero 倒數（每分鐘）
  const [untilLock, setUntilLock] = useState('');
  useEffect(() => {
    const tick = () => setUntilLock(fmtCountdown(nextMondayUTC().getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const panels = useMemo(() => ({
    draft: <Draft onSubmit={handleRosterSubmit} />,
    leaderboard: loading && rows.length === 0
      ? <div style={{ opacity: .7 }}>Loading leaderboard…</div>
      : <Leaderboard
          week={week}
          rows={rows}
          updatedAt={new Date().toISOString()}
          onGoDraft={() => { setView('draft'); window.location.hash = 'draft'; }}
        />,
    about: (
      <div>
        <h2 style={{ marginTop: 0 }}>About</h2>
        <p>Scoring: Release +8 · Merged PR +5 · Closed Issue +2 · Star Δ +1 (cap) · NPM Δ / 5k → +1.</p>
        <p>For fun only. No gambling or redeemable prizes.</p>

        {/* Health (可視化 /api/health) */}
        <AboutHealth />
      </div>
    ),
  }), [handleRosterSubmit, loading, rows, week]);

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
        <Nav
          active={view}
          onChange={(v) => { setView(v); window.location.hash = v; }}
        />
      </section>

      {/* 一次只顯示一個（不吃樣式的原生 hidden） */}
      <div className="card fade" hidden={view !== 'draft'}>{panels.draft}</div>
      <div className="card fade" hidden={view !== 'leaderboard'}>{panels.leaderboard}</div>
      <div className="card fade" hidden={view !== 'about'}>{panels.about}</div>

      <Links />
      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}
    </div>
  );
}

/** About 分頁中的 Health 視覺化 */
function AboutHealth() {
  const [data, setData] = useState<{ok:boolean; week?: string; entries?: number} | null>(null);
  useEffect(() => { fetch('/api/health').then(r=>r.json()).then(setData).catch(()=>{}); }, []);
  return (
    <div style={{ marginTop: 12, opacity: .9 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Health</div>
      <div style={{ fontSize: 14 }}>
        Status: {data?.ok ? 'OK' : 'Checking…'}{data?.ok === false ? ' (error)' : ''}
        {data?.week ? <> · Week key: {data.week}</> : null}
        {typeof data?.entries === 'number' ? <> · Entries: {data.entries}</> : null}
      </div>
    </div>
  );
}
