// src/client/ui/App.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Leaderboard from './Leaderboard';
import Draft from './Draft';
import Links from './Links';
import Nav, { ViewKey } from './Nav';
import type { Entry, LeaderboardPayload } from '../../shared/types';

function getHashView(): ViewKey {
  const h = (window.location.hash || '').replace('#', '').toLowerCase();
  if (h === 'draft' || h === 'leaderboard' || h === 'about') return h as ViewKey;
  return 'leaderboard';
}

function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => b.score - a.score || a.user.localeCompare(b.user));
}

export default function App() {
  const [view, setView] = useState<ViewKey>(getHashView());
  const [leaderboardWeek, setLeaderboardWeek] = useState('');
  const [leaderboardRows, setLeaderboardRows] = useState<Entry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const payload: LeaderboardPayload = await fetch('/api/leaderboard').then((r) => r.json());
      setLeaderboardWeek(payload.week);
      setLeaderboardRows(sortEntries(payload.entries || []));
    } catch (error) {
      console.error('Failed to load leaderboard', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  // 初始載入
  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  // 切到 leaderboard 分頁時強制重載
  useEffect(() => {
    if (view === 'leaderboard') {
      void loadLeaderboard();
    }
  }, [view, loadLeaderboard]);

  // 監聽 hash 變化（重新整理後還能回到原分頁）
  useEffect(() => {
    const onHash = () => setView(getHashView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Draft 送出：先本地更新 → 重新抓 → 自動跳排行榜並更新 hash
  const handleRosterSubmit = useCallback(
    async (entry: Entry) => {
      setLeaderboardRows((prev) => {
        const next = prev.filter((row) => row.user !== entry.user);
        next.push(entry);
        return sortEntries(next);
      });
      await loadLeaderboard();
      setView('leaderboard');
      window.location.hash = 'leaderboard';
    },
    [loadLeaderboard]
  );

  const tabPanels = useMemo(
    () => ({
      draft: <Draft onSubmit={handleRosterSubmit} />,
      leaderboard: <Leaderboard week={leaderboardWeek} rows={leaderboardRows} />,
      about: (
        <div>
          <h2 style={{ marginTop: 0 }}>About</h2>
          <p>
            Scoring: Release +8 · Merged PR +5 · Closed Issue +2 · Star Δ +1 (cap) · NPM Δ / 5k → +1.
          </p>
          <p>No gambling or cash-out rewards. For fun only.</p>
        </div>
      ),
    }),
    [leaderboardWeek, leaderboardRows, handleRosterSubmit]
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
            window.location.hash = v; // 讓重新整理後仍留在同一分頁
          }}
        />
        <div className="tab-body">
          <div className={`tab-panel${view === 'draft' ? ' is-active' : ''}`}>{tabPanels.draft}</div>
          <div className={`tab-panel${view === 'leaderboard' ? ' is-active' : ''}`}>
            {loadingLeaderboard && leaderboardRows.length === 0 ? (
              <div style={{ opacity: 0.7 }}>Loading leaderboard…</div>
            ) : (
              tabPanels.leaderboard
            )}
          </div>
          <div className={`tab-panel${view === 'about' ? ' is-active' : ''}`}>{tabPanels.about}</div>
        </div>
      </section>

      <Links />
    </div>
  );
}
