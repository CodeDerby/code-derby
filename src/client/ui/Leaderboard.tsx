// src/client/ui/Leaderboard.tsx
import React from 'react';
import type { Entry } from '../../shared/types';

export default function Leaderboard({
  week,
  rows,
  updatedAt,
  onGoDraft
}: {
  week: string;
  rows: Entry[];
  updatedAt?: string;
  onGoDraft?: () => void;
}) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
      <div className="lb-meta">
        <span className="lb-week">Week: {formatWeek(week)}</span>
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
            <th>User</th>
            <th>Repos</th>
            <th style={{ textAlign: 'right' }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} style={{ opacity: .75, padding: '16px 8px' }}>
                No entries yet. Draft your roster to take the lead.
                {onGoDraft && <button className="link" onClick={onGoDraft} style={{ marginLeft: 8 }}>Go to Draft</button>}
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

function formatWeek(weekISO: string) {
  const start = new Date(`${weekISO}T00:00:00Z`);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
  return `${fmt(start)} \u2013 ${fmt(end)}`;
}
function fmt(d: Date) {
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
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
