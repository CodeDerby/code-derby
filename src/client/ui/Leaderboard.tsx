// src/client/ui/Leaderboard.tsx
import React from 'react';
import type { Entry } from '../../shared/types';

export default function Leaderboard({ week, rows }: { week: string; rows: Entry[] }) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
      <div style={{ opacity: 0.8, marginBottom: 8 }}>
        Week: {formatWeek(week)}
      </div>

      <table className="table lb-table">
        {/* 固定欄寬，避免使用者名稱壓到 Score */}
        <colgroup>
          <col style={{ width: '48px' }} />     {/* rank */}
          <col />                               {/* user（自適應＋ellipsis） */}
          <col />                               {/* repos（可換行） */}
          <col style={{ width: '64px' }} />     {/* score */}
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
              <td colSpan={4} style={{ opacity: 0.75, padding: '16px 8px' }}>
                No entries yet. Draft your roster to take the lead.
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={r.user}>
              <td className="rank">{i + 1}</td>
              <td className="lb-user">
                <div className="truncate">{r.user}</div>
              </td>
              <td className="lb-repos">
                {/* 每個 repo 一行，較好讀；小螢幕會自動換行 */}
                {r.repos.map((repo, ix) => (
                  <div className="repo" key={ix}>{repo}</div>
                ))}
              </td>
              <td className="score" style={{ textAlign: 'right' }}>{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatWeek(weekISO: string) {
  // 週一~週日；此處仍以 week=週一（UTC）為準
  const start = new Date(`${weekISO}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return `${fmt(start)} - ${fmt(end)}`;
}
function fmt(d: Date) {
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
}
