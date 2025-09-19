# Code Derby - A Fantasy Open Source Software League

[![CI](https://github.com/CodeDerby/code-derby/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeDerby/code-derby/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
![DCO](https://img.shields.io/badge/DCO-required-green)
![Devvit](https://img.shields.io/badge/Devvit-Web%20App-orange)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

**Pick 3 GitHub repositories. Watch them rise. Win the week.**

Code Derby is a weekly, social game that runs *inside a Reddit post* via **Devvit Web**. Players draft three GitHub repositories (`owner/repo`). Each week (UTC **Mon–Sun**), real project activity turns into points on a live leaderboard.

## Quick Links

- **App listing:** <https://developers.reddit.com/apps/codederby>
- **Demo post:** <https://www.reddit.com/r/codederby_dev/comments/1nj89dz/code_derby>
- **Developers:** [u/Sofus_Deng](https://www.reddit.com/user/Sofus_Deng)

## How to Play 🎮

1. Open the **demo Reddit post** (desktop web or the official Reddit app).  
2. Go to **Draft**, enter **three** repos in `owner/repo` format, and submit.  
3. You’ll see a toast and the app switches to **Leaderboard**—your entry appears instantly.  
4. The leaderboard updates during the week and shows the UTC **week range**.  
5. In **About → Health**, see server status (mock/real), current week, and entry count.

No install required; it’s *just a Reddit post*.

## Scoring Rules 🧮

### Season Beta (current, shipped)

To keep the experience fully reviewable while external allowlists (GitHub/npm) are pending, the app ships with a deterministic **Mock Scoring** mode.

- **Release**: +8  
- **Merged PR**: +5  
- **Closed Issue**: +2  
- **Star Δ**: +1 per star gained (cap **20** / repo / week)  
- **npm Δ / 5k**: +1 per 5,000 downloads gained

Mock mode uses reproducible values based on `repo + week`, so demos are stable and comparable.

### Full / Real mode (after allowlist approval)

- GitHub: releases, merged PRs, closed issues, star delta (with weekly baselines retained for **21 days**).  
- npm: weekly download delta (smoothed; +1 per 5,000).  
- Redis‑backed caches for fast reads and rate‑limit safety.

**Fair‑play note:** No gambling or redeemable prizes. Anti‑gaming heuristics (rate limits, duplicate checks) are on the roadmap.

## Screens & UX Details ✨

- **Draft**: empty inputs with helpful placeholders; `Enter` submits; on success we **clear inputs**, show a **toast**, and switch to **Leaderboard**.  
- **Leaderboard**: clearly labeled UTC week (Mon–Sun); empty state nudges to “Go to Draft”; auto‑refreshes ~every 20s (and on tab switch).  
- **About**: rules + a **Health** panel with one‑click *Refresh* (shows `{ ok, week, mockScoring, entries }`).  
- **Design**: modern/tech style—gradient hero, text tabs, glass buttons, accessible contrast, mobile‑first with smooth fallbacks.

## Tech Stack 🧱

- **Devvit Web** (WebView + server runtime)  
- **Frontend**: React + TypeScript, Vite, custom CSS (dark/tech theme)  
- **Server**: Express on Devvit Web Server  
- **Storage**: Devvit **Redis** (weekly entries, baselines, short‑lived metrics caches)

## Repository Structure

```txt
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

## API 🔌

All routes are served by the Devvit Web server.

- `GET /api/user` → `{ "user": string }`
- `POST /api/roster/submit`  
  **body:** `{ "repos": string[3] }` (`owner/repo` each)  
  **returns:** `{ "ok": true, "user": string }`
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

- `GET /api/health` → `{ "ok": boolean, "week": string, "entries": number, "mockScoring": boolean }`
- (diagnostic) `GET /api/gh/stars?repo=owner/repo` → `{ "stars": number }` (real mode)

> Leaderboard responses set `Cache-Control: no-store` to avoid stale data in the WebView.

## Settings & Environment ⚙️

Use either **Devvit Settings** or a local `.env`.

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

Ensure `devvit.json` includes:

```json
"settings": {
  "global": {
    "githubToken": { "type": "string", "label": "GitHub Token", "isSecret": true, "defaultValue": "" },
    "mockScoring": { "type": "string", "label": "Mock Scoring (true/false)", "isSecret": false, "defaultValue": "true" }
  }
}
```

## Getting Started (local / playtest) 🚀

```bash
npm install
npm run dev     # builds client + server and deploys to Devvit playtest
```

Then open your test subreddit and refresh the post (or use the UI simulator) to see changes.

**Notes**  

- Requires **New Reddit** (and the official mobile app). *Old Reddit* doesn’t render interactive posts.  
- External domains (e.g., `api.github.com`, `registry.npmjs.org`) need allowlist approval in the Dev Portal. Keep **Mock Scoring** ON until approved.

## License & Contributing 🤝

- License: **AGPL‑3.0** (see `LICENSE`)  
- Contributions welcome! See `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`.