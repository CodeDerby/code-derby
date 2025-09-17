# Code Derby

[![CI](https://github.com/CodeDerby/code-derby/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeDerby/code-derby/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
![DCO](https://img.shields.io/badge/DCO-required-green)
![Devvit](https://img.shields.io/badge/Devvit-Web%20App-orange)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

**Pick 3 GitHub repositories. Watch them rise. Win the week.**

Code Derby is a weekly fantasy game on Reddit. Players draft **three** repos; we tally **daily deltas** from repo activity (Issues / PRs / Stars / Forks). Anti-cheat keeps it fair. Leaderboards and weekly drafts keep it fun.

> This repo is a **Devvit Web** app (interactive post + Express server).  
> If you’re a moderator, you can install it in your subreddit and start a weekly league.

## Table of Contents

- [Code Derby](#code-derby)
  - [Table of Contents](#table-of-contents)
  - [How to Play (for Players)](#how-to-play-for-players)
  - [Scoring](#scoring)
  - [Anti-Cheat (high-level)](#anti-cheat-high-level)
  - [Install in Your Subreddit (for Moderators)](#install-in-your-subreddit-for-moderators)
  - [Playtest → Publish → Install](#playtest--publish--install)
  - [Weekly Auto-Post (optional)](#weekly-auto-post-optional)
  - [Local Development](#local-development)
  - [API](#api)
  - [Repository Layout](#repository-layout)
  - [License \& Contributing](#license--contributing)
  - [Support \& Security](#support--security)
  - [Troubleshooting](#troubleshooting)
  - [Known issues](#known-issues)

## How to Play (for Players)

1. Open the weekly **Code Derby** post in your subreddit.
2. Click **Launch App** (interactive post).
3. In **Draft**, enter three repos in `owner/repo` format (e.g., `vercel/next.js`) and **Submit**.
4. Check the **Leaderboard** during the week; scores refresh after each daily settlement.

**Draft deadline:** Sunday 23:00 UTC  
**New round:** Monday 00:00 UTC

## Scoring

We compute per-repo **daily deltas** from the previous snapshot and apply weights:

- Issues and PRs (weighted), Stars (×1), Forks (×2).
- Your three repos’ deltas are summed and added to your weekly score.
- Suspicious spikes can be delayed or down-weighted by anti-cheat.

> Note: the open-source starter wires the UI, storage, and endpoints.  
> Detailed GitHub metrics/weights can be enabled in cloud mode.

## Anti-Cheat (high-level)

Signals we consider:

- Star spikes vs trailing baseline; temporal clustering of events  
- Fork anomalies (lots of forks with little PR activity)  
- Account freshness among actors; churny issue/PR bursts

Actions:

- **Delay**: exclude a repo for the day pending review  
- **Down-weight**: scale suspicious deltas (e.g., 0.5×)  
- **Quarantine**: exclude for the round with moderator review

We publish high-level criteria; parameters may evolve across releases.

## Install in Your Subreddit (for Moderators)

You must be a moderator of the target subreddit.

```bash
npm i -g @devvit/cli
devvit login

# From this repo’s root:
devvit upload
devvit playtest <your_test_subreddit>    # e.g. codederby_dev

# In the subreddit:
# Create post → Launch App → pick “Code Derby”
# Verify the interactive post renders.

# When ready:
devvit publish                           # unlisted is fine first
devvit install <your_production_subreddit>
```

## Playtest → Publish → Install

- **Playtest** in a staging subreddit (e.g., `r/CodeDerbyBeta`).  
- **Publish** as unlisted for early trials; make public later.  
- **Install** into production (e.g., `r/CodeDerby`).

## Weekly Auto-Post (optional)

The server can post a weekly **Draft** thread at **Monday 00:05 UTC**.

```ini
AUTOPUBLISH_ENABLED=true
AUTOPUBLISH_SUBREDDIT=<your_subreddit>
# optional fallback when running outside Devvit:
# AUTOPUBLISH_FORCE_OAUTH=1  + Reddit OAuth vars (see .env.sample)
```

## Local Development

```bash
npm install
npm run start      # LOCAL_SERVER=1 node (see package.json)
# Smoke tests:
curl -s http://localhost:3000/api/user
curl -s -X POST http://localhost:3000/api/roster/submit   -H 'content-type: application/json'   -d '{"repos":["vercel/next.js","facebook/react","angular/angular"]}'
curl -s http://localhost:3000/api/leaderboard
```

> If you see “Launch App” missing in old Reddit, open in **new.reddit.com** or the **mobile app**.

## API

All endpoints are mounted by the embedded Express server.

- `GET /api/user` → `{ userName, week, today }`  
- `POST /api/roster/submit` `{ repos: string[] }` → `{ ok: true }`  
- `GET /api/leaderboard` → `{ week, entries: Array<{ user, score }> }`

Cron stubs (wired for cloud or local testing):

- `POST /internal/cron/settle`  
- `POST /internal/cron/new-round`  
- `POST /internal/cron/weekly-autopost`

## Repository Layout

```
public/            WebView UI (interactive post)
  └─ index.html
src/server/        Express API + cron stubs
  └─ index.ts      (or index.js if you prefer JavaScript)
devvit.json        Devvit config (entrypoints, permissions)
```

## License & Contributing

- **License:** AGPL-3.0 (see `LICENSE`)  
- **Contributing:** DCO — sign every commit using `git commit -s`  
- **Code of Conduct:** Contributor Covenant v2.1

## Support & Security

Open an Issue or start a Discussion.  
Security reports → see `SECURITY.md`.

---

## Troubleshooting

**Interactive post shows “Server error”**  
- Confirm the server is running in Devvit Cloud (it is when you `devvit upload` / `playtest`).  
- Check logs:
  ```bash
  devvit logs <your_test_subreddit>
  ```
- Smoke-test the endpoints:
  ```bash
  curl -s https://<your-cloud-host>/api/user
  curl -s https://<your-cloud-host>/api/leaderboard
  ```
  (When running locally: use `http://localhost:3000/...`)

**No “Launch App” in the post composer**  
- Use **new.reddit.com** or the **mobile app**. Old Reddit does not expose the Devvit Web “Launch App” surface.  
- Ensure `devvit.json` contains the WebView entry:
  ```json
  "post": { "dir": "public", "entrypoints": { "default": { "entry": "index.html", "height": "tall" } } }
  ```

**`Error: Your devvit.json references files that don't exist: config.server (dist/server/...)`**  
- You’re mixing build artefacts. Fix the **server entry** and clean state:
  ```json
  "server": { "entry": "src/server/index.ts" }   // or index.js if you use JS
  ```
  Then:
  ```bash
  rm -rf .devvit .devvit-state dist
  npm install
  devvit upload && devvit playtest <subreddit>
  ```

**`Cannot find package 'express' imported from /srv/main.js`**  
- Ensure **dependencies** (not devDependencies) include Express and CORS:
  ```json
  "dependencies": { "express": "^5.1.0", "cors": "^2.8.5" }
  ```
  Re-upload afterwards.

**`Cannot use 'in' operator to search for 'text'` during playtest**  
- This typically occurs when trying to render on old web; open the post on **new.reddit.com** or the **mobile app**.

**`marketingAssets is not allowed to have the additional property 'cover'`**  
- Only `icon` is supported today:
  ```json
  "marketingAssets": { "icon": "public/assets/icon.png" }
  ```

**Auto-post didn’t run on Monday**  
- Cron triggers in cloud; verify env:
  ```ini
  AUTOPUBLISH_ENABLED=true
  AUTOPUBLISH_SUBREDDIT=<your_subreddit>
  ```
- Manually trigger to test:
  ```bash
  curl -X POST https://<your-cloud-host>/internal/cron/weekly-autopost
  ```

**UI updated but subreddit still shows the old version**  
- Devvit assets can be cached. Do a **hard refresh** or reinstall the playtest version:
  ```bash
  devvit playtest <subreddit>
  ```

## Known issues

- **New Reddit required**: Interactive posts render on new Reddit and the mobile app. Old Reddit lacks this surface.
- **Domain exceptions**: Calls to non-whitelisted domains require approval in the Dev Portal. Until approved, those calls may fail.
- **Private subreddits**: Non-mods in a private subreddit can’t see/play drafts; this is expected. Test with a public or staged sub.
- **GitHub API limits**: Without tokens or elevated rate limits, advanced scoring can be throttled. Starter uses local/in-memory scoring stubs (zeros) unless configured.
- **Cron in playtest**: Time-based triggers in playtest environments can be paused or delayed. Use manual POSTs during testing.
- **Strict height**: The interactive post has finite height (`"tall"`). Very long content will scroll inside the WebView.
- **Third-party cookie / content blockers**: Some browser extensions can block embedded auth flows; try an incognito window or disable blockers.
