// src/client/ui/Leaderboard.tsx
import React from 'react';
import type { Entry } from '../../shared/types';

export default function Leaderboard({
  week,
  weekStart,
  weekEnd,
  rows,
  updatedAt,
  onGoDraft
}: {
  week: string;
  weekStart?: string;
  weekEnd?: string;
  rows: Entry[];
  updatedAt?: string;
  onGoDraft?: () => void;
}) {
  const range = formatWeekRange(weekStart, weekEnd, week);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
      <div className="lb-meta">
        <span className="lb-week">Week: {range}</span>
        <span className="dot">•</span>
        <span className="lb-updated">Updated: {formatUpdated(updatedAt)}</span>
      </div>

      <table className="table lb-table">
        <colgroup>
          <col style={{ width: '48px' }} />
          <col className="lb-user" />
          <col />
          <col style={{ width: '72px' }} />
        </colgroup>
        <thead>
          <tr>
            <th className="rank">#</th>
            <th>USER</th>
            <th>REPOS</th>
            <th style={{ textAlign: 'right' }}>SCORE</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} style={{ opacity: .78, padding: '16px 8px' }}>
                No entries yet. Draft your roster to take the lead.
                {onGoDraft && (
                  <button
                    className="link"
                    onClick={onGoDraft}
                    style={{ marginLeft: 12, letterSpacing: 0.2 }}
                  >
                    Go to Draft
                  </button>
                )}
              </td>
            </tr>
          )}

          {rows.map((r, i) => (
            <tr key={r.user}>
              <td className="rank">{i + 1}</td>
              <td className="lb-user">
                <div className="truncate">
                  <a href={`https://www.reddit.com/u/${r.user}`} target="_blank" rel="noopener">{r.user}</a>
                </div>
              </td>
              <td className="lb-repos">
                {r.repos.map((repo, ix) => (
                  <div className="repo" key={ix}>
                    <a href={`https://github.com/${repo}`} target="_blank" rel="noopener">{repo}</a>
                  </div>
                ))}
              </td>
              <td className="score score-mono" style={{ textAlign: 'right' }}>{formatScore(r.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatWeekRange(weekStart?: string, weekEnd?: string, fallbackWeek?: string) {
  // 如果都沒有，計算「本週一到週日（UTC）」做為保底
  let startISO = weekStart || fallbackWeek || '';
  let endISO = weekEnd || '';
  if (!startISO) {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = (day + 6) % 7;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - diff);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
    return `${fmt(start)} \u2013 ${fmt(end)}`;
  }
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = endISO ? new Date(`${endISO}T00:00:00Z`) : (() => { const s = new Date(start); s.setUTCDate(s.getUTCDate() + 6); return s; })();
  return `${fmt(start)} \u2013 ${fmt(end)}`;
}
function fmt(d: Date) {
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
}
function formatUpdated(updatedAt?: string) {
  try {
    const d = updatedAt ? new Date(updatedAt) : new Date();
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC';
  } catch { return '—'; }
}
function formatScore(n: number) {
  try { return n.toLocaleString('en-US'); } catch { return String(n); }
}
