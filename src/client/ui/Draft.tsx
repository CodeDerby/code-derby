// src/client/ui/Draft.tsx
import React, { useState } from 'react';
import type { Entry } from '../../shared/types';

export default function Draft({ onSubmit }: { onSubmit?: (entry: Entry) => void }) {
  const [r1, setR1] = useState('vercel/next.js');
  const [r2, setR2] = useState('facebook/react');
  const [r3, setR3] = useState('angular/angular');
  const [msg, setMsg] = useState('');
  const [e1, setE1] = useState<string | null>(null);
  const [e2, setE2] = useState<string | null>(null);
  const [e3, setE3] = useState<string | null>(null);

  function isValidPart(s: string) {
    return /^[A-Za-z0-9_.-]+$/.test(s);
  }
  function validateRepo(v: string): string | null {
    const val = (v || '').trim();
    if (!val) return 'Required';
    const parts = val.split('/');
    if (parts.length !== 2) return 'Use owner/repo format';
    const [owner, name] = parts;
    if (!isValidPart(owner) || !isValidPart(name)) return 'Use only letters, numbers, . _ -';
    return null;
  }

  async function submit() {
    // 驗證
    const v1 = validateRepo(r1), v2 = validateRepo(r2), v3 = validateRepo(r3);
    setE1(v1); setE2(v2); setE3(v3);
    if (v1 || v2 || v3) return;

    // 去重 / 乾淨化
    let repos = [r1, r2, r3].map(s => s.trim());
    const set = new Set<string>();
    repos = repos.filter(x => { if (set.has(x)) return false; set.add(x); return true; });

    const res = await fetch('/api/roster/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ repos })
    });
    const j = await res.json();
    setMsg(j.ok ? 'Submitted! Check the leaderboard.' : 'Error');

    if (j.ok) onSubmit?.({ user: j.user || 'anonymous', repos, score: 0 });
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Draft</h2>
      <p style={{ opacity: .8 }}>Enter three repos in <code>owner/repo</code> format:</p>

      <label>Repo 1
        <input type="text" value={r1}
          onChange={e => { const v = e.target.value; setR1(v); setE1(validateRepo(v)); }} />
      </label>
      {e1 && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{e1}</div>}

      <label>Repo 2
        <input type="text" value={r2}
          onChange={e => { const v = e.target.value; setR2(v); setE2(validateRepo(v)); }} />
      </label>
      {e2 && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{e2}</div>}

      <label>Repo 3
        <input type="text" value={r3}
          onChange={e => { const v = e.target.value; setR3(v); setE3(validateRepo(v)); }} />
      </label>
      {e3 && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{e3}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={submit}>Submit</button>
        <div role="status" aria-live="polite" style={{ alignSelf: 'center', opacity: .8 }}>{msg}</div>
      </div>
    </div>
  );
}
