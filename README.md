# Code Derby

[![CI](https://github.com/CodeDerby/code-derby/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeDerby/code-derby/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
![DCO](https://img.shields.io/badge/DCO-required-green)
![Devvit](https://img.shields.io/badge/Devvit-Web%20App-orange)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

**Pick 3 GitHub repositories. Watch them rise. Win the week.**

Code Derby is a weekly fantasy game inside Reddit. Players draft three repos; we compute **daily deltas** from repo activity (Issues / PRs / Stars / Forks). Anti-cheat rules keep it fair. Leaderboards and daily highlights keep it fun.

## Table of Contents

- [Code Derby](#code-derby)
  - [Table of Contents](#table-of-contents)
  - [How to Play (for Players)](#how-to-play-for-players)
  - [Scoring](#scoring)
  - [Anti-Cheat (high-level)](#anti-cheat-high-level)
  - [Install in Your Subreddit (for Moderators)](#install-in-your-subreddit-for-moderators)
  - [Weekly Auto-Post (optional)](#weekly-auto-post-optional)
  - [Playtest → Publish → Install](#playtest--publish--install)
  - [Local Development](#local-development)
  - [Repository Layout](#repository-layout)
  - [License \& Contributing](#license--contributing)
  - [Support ＆ Security](#support--security)

## How to Play (for Players)

1. Open the weekly **Code Derby** post in your subreddit.
2. Click **Launch App** (interactive post).
3. In **Draft**, enter three repos in `owner/repo` (e.g., `vercel/next.js`) and **Submit**.
4. Check **Leaderboard** and **Highlights** during the week. Scores refresh after the daily settlement.

**Draft deadline:** Sunday 23:00 UTC.  
**New round:** Monday 00:00 UTC.

## Scoring

We compute per-repo **daily deltas** from the previous snapshot and apply weights:

- Issues / PR merges (weighted), Stars (×1), Forks (×2).
- Your three repos’ deltas are summed and added to your weekly score.
- Anti-cheat can delay or down-weight obviously manipulated spikes (see below).

## Anti-Cheat (high-level)

Signals we consider (illustrative, evolving):

- Star spikes vs. trailing baseline; temporal clustering of events
- Fork anomalies (many forks without proportional PR activity)
- Account freshness among actors; issue/PR churn in short bursts

Actions:

- **Delay**: exclude a repo for the day pending review  
- **Down-weight**: scale suspicious deltas (e.g., 0.5×)  
- **Quarantine**: exclude for the round with moderator review

We publish high-level criteria; specific parameters may change across releases.

## Install in Your Subreddit (for Moderators)

You must be a **moderator** of the target subreddit.

```bash
devvit upload
devvit playtest <your_test_subreddit>
# In the subreddit: Create post → Launch App → pick Code Derby
devvit publish                 # unlisted is okay first
devvit install <your_production_subreddit>
```

## Weekly Auto-Post (optional)

Posts a weekly “Draft” thread on **Monday 00:05 UTC**.

```env
AUTOPUBLISH_ENABLED=true
AUTOPUBLISH_SUBREDDIT=<your_subreddit>
# optional fallback when running outside Devvit:
# AUTOPUBLISH_FORCE_OAUTH=1  + Reddit OAuth vars (see .env.sample)
```

## Playtest → Publish → Install

- **Playtest** in a staging subreddit (e.g., `r/CodeDerbyBeta`).
- **Publish** unlisted for early trials; make public when ready.
- **Install** into your production subreddit (e.g., `r/CodeDerby`).

## Local Development

```bash
npm install
npm start   # LOCAL_SERVER=1 node src/server/index.js
# Smoke tests:
curl -s http://localhost:3000/api/user
curl -s -X POST http://localhost:3000/api/roster/submit   -H 'content-type: application/json'   -d '{"repos":["vercel/next.js","facebook/react","angular/angular"]}'
curl -s -X POST http://localhost:3000/internal/cron/settle
curl -s http://localhost:3000/api/leaderboard
```

## Repository Layout

```
public/            Interactive post web UI (Draft / Leaderboard / Highlights)
src/server/        API + cron endpoints (daily settlement, weekly rollover, weekly autopost)
devvit.json        Devvit config (permissions, scheduler, entrypoints)
```

## License & Contributing

- **License:** AGPL-3.0 (see `LICENSE`)
- **Contributing:** DCO — sign every commit using `git commit -s`
- **Code of Conduct:** Contributor Covenant v2.1

## Support ＆ Security

Open an Issue or start a Discussion.
