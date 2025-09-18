# Code Derby - a Fantasy Open Source Software League

[![CI](https://github.com/CodeDerby/code-derby/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeDerby/code-derby/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
![DCO](https://img.shields.io/badge/DCO-required-green)
![Devvit](https://img.shields.io/badge/Devvit-Web%20App-orange)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

**Pick 3 GitHub repositories. Watch them rise. Win the week.**

Code Derby is a weekly, social game that runs *inside a Reddit post* via **Devvit Web**. Players draft three GitHub repositories (`owner/repo`). Each week (UTC Monday → Sunday) real project momentum is turned into points and a live leaderboard.

## Quick links

- **App listing:** [https://developers.reddit.com/apps/codederby](https://developers.reddit.com/apps/codederby)
- **Demo post:** [https://www.reddit.com/r/codederby_dev/comments/1nj89dz/code_derby](https://www.reddit.com/r/codederby_dev/comments/1nj89dz/code_derby)
- **Developers:** [u/Sofus_Deng](https://www.reddit.com/user/Sofus_Deng)

## How to play

1. Open the **demo Reddit post** (desktop web or the official app on mobile).  
2. Go to **Draft**, enter **three** repos in `owner/repo` format, and submit.  
3. The app shows a toast and switches to **Leaderboard**. Your entry appears instantly.  
4. The leaderboard updates during the week and shows the UTC **week range**.  
5. In **About → Health** you can see server status (mock/real), current week, and entry count.

## Scoring rules

### Season Beta (current, shipped)

We ship with a deterministic **Mock Scoring** mode so the app is fully reviewable while domain allowlists for GitHub/npm are pending.

- **Release**: +8  
- **Merged PR**: +5  
- **Closed Issue**: +2  
- **Star Δ**: +1 per star gained (cap **20** / repo / week)  
- **NPM Δ / 5k**: +1 per 5,000 downloads gained

Mock mode uses reproducible values based on `repo + week`, so demos are stable and comparable.

### Full / Real mode (after allowlist approval)

- GitHub: Releases, merged PRs, closed issues, star delta (with weekly baselines retained for **21 days**).
- npm: weekly download delta (smoothed; +1 per 5,000).  
- Redis-backed caches for fast reads and rate‑limit safety.

**Fair-play note:** No gambling or redeemable prizes. Anti‑gaming heuristics (rate limits, duplicate checks) on the roadmap.

## Screens & UX details

- **Draft**: empty inputs with placeholders; `Enter` submits; on success we **clear inputs**, show a **toast**, and switch to **Leaderboard**.
- **Leaderboard**: clearly labeled UTC week (Mon–Sun); empty state nudges to “Go to Draft”; auto-refresh every ~20s (and on tab switch).
- **About**: rules + **Health** panel with a one-click *Refresh* (shows `{ ok, week, mockScoring, entries }`).
- **Design**: modern tech style—gradient hero, text tabs, glass buttons, accessible contrast, mobile-first with smooth fallbacks.

## Tech stack

- **Devvit Web** (WebView + server runtime)
- **Frontend**: React + TypeScript, Vite, custom CSS (dark/tech theme)
- **Server**: Express on Devvit Web Server
- **Storage**: Devvit **Redis** (weekly entries, baselines, short‑lived metrics caches)

## Repository structure

```bash
src/
├─ client/                 # React app (WebView UI)
│  ├─ ui/
│  │  ├─ App.tsx
│  │  ├─ Draft.tsx
│  │  ├─ Leaderboard.tsx
│  │  └─ About.tsx
│  └─ styles.css           # custom theme
├─ server/                 # Express routes served by Devvit Web
│  └─ index.ts
└─ shared/                 # Shared types between client/server
   └─ types.ts
```

## API

All routes are served by the Devvit Web server.

- `GET /api/user` → `{ user: string }`
- `POST /api/roster/submit`  
  **body:** `{ repos: string[3] }` (`owner/repo` each)  
  **returns:** `{ ok: true, user: string }`
- `GET /api/leaderboard` →

  ```json
  {
    "updatedAt": "2025-09-15T10:00:00Z",
    "week": "2025-09-15",
    "weekStart": "2025-09-15",
    "weekEnd": "2025-09-21",
    "entries": [
      { "user": "Sofus_Deng", "repos": ["vercel/next.js","facebook/react","angular/angular"], "score": 0 }
    ]
  }
  ```

- `GET /api/health` → `{ ok: boolean, week: string, entries: number, mockScoring: boolean }`
- (diagnostic) `GET /api/gh/stars?repo=owner/repo` → `{ stars: number }` (real mode)
- All leaderboard responses set `Cache-Control: no-store` to avoid stale data in WebView caches.

## Settings & environment

Both **Devvit Settings** and `.env` are supported.

- **Mock Scoring (default ON)**
  - Devvit Settings: `mockScoring = "true" | "false"`
  - `.env`:

    ```bash
    MOCK_SCORING=1   # 1/true to enable, 0/false to disable
    ```

- **GitHub Token** (used in *Real* mode)
  - Devvit Settings:

    ```bash
    npx devvit settings set githubToken
    ```

  - or `.env`:

    ```bash
    GITHUB_TOKEN=ghp_xxx...
    ```

> Ensure `devvit.json` includes:
>
> ```json
> "settings": {
>   "global": {
>     "githubToken": { "type": "string", "label": "GitHub Token", "isSecret": true, "defaultValue": "" },
>     "mockScoring": { "type": "string", "label": "Mock Scoring (true/false)", "isSecret": false, "defaultValue": "true" }
>   }
> }
> ```

---

## Getting started (local / playtest)

```bash
npm install
npm run dev     # concurrently builds client + server and deploys to Devvit playtest
```

Then open your test subreddit and refresh the post (or use the UI simulator) to see changes.

**Notes**

- Requires **New Reddit** (and the official mobile app). Old Reddit does not render interactive posts.
- External domains (e.g., `api.github.com`, `registry.npmjs.org`) need allowlist approval in the Dev Portal. Use **Mock Scoring** until approved.

## License & contributing

- License: **AGPL‑3.0** (see `LICENSE`)
- Contributions welcome! See `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`.
