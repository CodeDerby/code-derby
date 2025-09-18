// src/client/ui/About.tsx
import React, { useEffect, useState } from 'react';

type Health = {
  ok?: boolean;
  week?: string;
  entries?: number;
  mockScoring?: boolean;
  error?: string;
};

export default function About() {
  const [h, setH] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/health', { cache: 'no-store' });
      const j = await r.json();
      setH(j);
    } catch (e: any) {
      setH({ ok: false, error: e?.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>About</h2>

      <h3>Current scoring (Season Beta / Mock)</h3>
      <ul className="bullets">
        <li>Release <b>+8</b></li>
        <li>Merged PR <b>+5</b></li>
        <li>Closed Issue <b>+2</b></li>
        <li>Star Δ <b>+1</b> (cap <b>20</b>/repo)</li>
        <li>NPM Δ / 5k <b>+1</b></li>
      </ul>
      <p className="muted">When GitHub/NPM allowlist is pending, scores are generated deterministically per repo+week.</p>

      <h3>Future scoring (Full)</h3>
      <ul className="bullets">
        <li>Releases, merged PRs, closed issues from GitHub REST</li>
        <li>Star delta baseline per week with 21-day retention</li>
        <li>NPM weekly downloads delta (normalized per 5k)</li>
      </ul>

      <h3>Health</h3>
      <div className="health">
        <button className="link" onClick={load} disabled={loading}>
          {loading ? 'Checking…' : 'Refresh'}
        </button>
        <div className="row">
          <span>Status:</span>
          <b>{h?.ok ? 'OK' : 'Error'}</b>
          {h?.error && <span className="muted"> — {h.error}</span>}
        </div>
        <div className="row"><span>Mode:</span> {h?.mockScoring ? 'Mock' : 'Real'}</div>
        <div className="row"><span>Week:</span> {h?.week || '—'}</div>
        <div className="row"><span>Entries:</span> {h?.entries ?? 0}</div>
      </div>

      <p className="muted" style={{ marginTop: 16 }}>
        For fun only. No gambling or redeemable prizes.
      </p>
    </div>
  );
}
