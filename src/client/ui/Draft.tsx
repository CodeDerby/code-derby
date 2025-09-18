// src/client/ui/Draft.tsx
import React, { useState } from 'react';
import type { Entry, RepoSlug } from '../../shared/types';

export default function Draft({ onSubmit }: { onSubmit?: (entry: Entry) => void }) {
  const [r1, setR1] = useState('');
  const [r2, setR2] = useState('');
  const [r3, setR3] = useState('');
  const [e1, setE1] = useState<string | null>(null);
  const [e2, setE2] = useState<string | null>(null);
  const [e3, setE3] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateRepo(v: string): string | null {
    const val = (v || '').trim();
    if (!val) return 'Required';
    const re = /^[\w.-]+\/[\w.-]+$/;
    if (!re.test(val)) return 'Use owner/repo format';
    return null;
  }

  const submit = async () => {
    const v1 = validateRepo(r1); setE1(v1);
    const v2 = validateRepo(r2); setE2(v2);
    const v3 = validateRepo(r3); setE3(v3);
    if (v1 || v2 || v3) return;

    if (!onSubmit) return;
    setSubmitting(true);
    try {
      const entry: Entry = {
        user: 'me', // 由 server 蓋掉
        repos: [r1 as RepoSlug, r2 as RepoSlug, r3 as RepoSlug],
        score: 0,
      };
      await onSubmit(entry);
      // 成功後清空欄位與錯誤
      setR1(''); setR2(''); setR3('');
      setE1(null); setE2(null); setE3(null);
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Draft</h2>
      <p>Enter three repos in <code>owner/repo</code> format:</p>

      <label>Repo 1
        <input
          type="text"
          value={r1}
          placeholder="vercel/next.js"
          autoComplete="off"
          onKeyDown={onKeyDown}
          onChange={e => { const v = e.target.value; setR1(v); setE1(validateRepo(v)); }}
        />
      </label>
      {e1 && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{e1}</div>}

      <label>Repo 2
        <input
          type="text"
          value={r2}
          placeholder="facebook/react"
          autoComplete="off"
          onKeyDown={onKeyDown}
          onChange={e => { const v = e.target.value; setR2(v); setE2(validateRepo(v)); }}
        />
      </label>
      {e2 && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{e2}</div>}

      <label>Repo 3
        <input
          type="text"
          value={r3}
          placeholder="angular/angular"
          autoComplete="off"
          onKeyDown={onKeyDown}
          onChange={e => { const v = e.target.value; setR3(v); setE3(validateRepo(v)); }}
        />
      </label>
      {e3 && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{e3}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={submit} disabled={submitting}>Submit</button>
      </div>
    </div>
  );
}
