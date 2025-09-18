import React from 'react';
import type { Entry } from '../../shared/types';

function formatWeekRange(isoWeek: string): string {
  if (!isoWeek) return '—';
  const start = new Date(`${isoWeek}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    return isoWeek;
  }
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

interface LeaderboardProps {
  week: string;
  rows: Entry[];
}

export default function Leaderboard({ week, rows }: LeaderboardProps) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
      <div style={{ opacity: 0.7, marginBottom: 8 }}>Week: {formatWeekRange(week)}</div>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No entries yet. Draft your roster to take the lead.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th className="rank">#</th>
              <th>User</th>
              <th>Repos</th>
              <th style={{ textAlign: 'right' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, index) => (
              <tr key={`${entry.user}-${index}`}>
                <td className="rank">{index + 1}</td>
                <td>{entry.user}</td>
                <td className="repo-cell">
                  <ul className="repo-list">
                    {entry.repos.map((repo) => (
                      <li key={`${entry.user}-${repo}`}>{repo}</li>
                    ))}
                  </ul>
                </td>
                <td className="score" style={{ textAlign: 'right' }}>
                  {entry.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
