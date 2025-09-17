import React, { useState } from 'react';
import type { RepoSlug } from '../../shared/types';

export default function Draft() {
  const [r1, setR1] = useState<RepoSlug>('vercel/next.js' as RepoSlug);
  const [r2, setR2] = useState<RepoSlug>('facebook/react' as RepoSlug);
  const [r3, setR3] = useState<RepoSlug>('angular/angular' as RepoSlug);
  const [msg, setMsg] = useState<string>('');

  async function submit() {
    const body = { repos: [r1,r2,r3] };
    const res = await fetch('/api/roster/submit', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json();
    setMsg(j.ok ? 'Submitted! Check the leaderboard below.' : 'Error');
  }

  return (
    <div>
      <h2 style={{marginTop:0}}>Draft</h2>
      <p style={{opacity:.8}}>Enter three repos in <code>owner/repo</code> format:</p>
      <label>Repo 1<input type="text" value={r1} onChange={e=>setR1(e.target.value as RepoSlug)} /></label>
      <label>Repo 2<input type="text" value={r2} onChange={e=>setR2(e.target.value as RepoSlug)} /></label>
      <label>Repo 3<input type="text" value={r3} onChange={e=>setR3(e.target.value as RepoSlug)} /></label>
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button onClick={submit}>Submit</button>
        <div role="status" aria-live="polite" style={{alignSelf:'center',opacity:.8}}>{msg}</div>
      </div>
    </div>
  );
}
