import React, { useEffect, useState } from 'react';
import type { LeaderboardPayload, Entry } from '../../shared/types';

export default function Leaderboard() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [week, setWeek] = useState<string>('');

  async function load() {
    const d: LeaderboardPayload = await fetch('/api/leaderboard').then(r=>r.json());
    setRows(d.entries);
    setWeek(d.week);
  }
  useEffect(()=>{ load(); },[]);

  return (
    <div>
      <h2 style={{marginTop:0}}>Leaderboard</h2>
      <div style={{opacity:.7, marginBottom:8}}>Week: {week || '—'}</div>
      <table className="table">
        <thead><tr><th className="rank">#</th><th>User</th><th>Repos</th><th style={{textAlign:'right'}}>Score</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="rank">{i+1}</td>
              <td>{r.user}</td>
              <td>{r.repos.join(', ')}</td>
              <td className="score" style={{textAlign:'right'}}>{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
