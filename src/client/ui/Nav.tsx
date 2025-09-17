import React from 'react';

export type ViewKey = 'draft' | 'leaderboard' | 'about';

const TABS: { key: ViewKey; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'about', label: 'About' }
];

export default function Nav({
  active,
  onChange
}: {
  active: ViewKey;
  onChange: (v: ViewKey) => void;
}) {
  function go(v: ViewKey) {
    if (v === active) return;
    window.location.hash = v;
    onChange(v);
  }

  return (
    <nav aria-label="Primary" role="tablist" className="nav">
      {TABS.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          className={`nav__tab ${active === t.key ? 'is-active' : ''}`}
          onClick={() => go(t.key)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') go(t.key);
          }}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
