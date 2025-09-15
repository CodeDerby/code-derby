# Code Derby — Open Core (AGPL-3.0)

Pick 3 repos. Watch them rise. Win the week.

This repository contains the **open-source core** for the Code Derby Reddit Interactive Post (Devvit Web).

- Minimal web view (Draft / Leaderboard / Highlights)
- Express-style server (`/api/*`, `/internal/cron/*`)
- Scheduler: daily settlement (00:00 UTC) + weekly rollover (Mon 00:00 UTC) + **Devvit-native weekly auto‑post**
- **License:** AGPL-3.0 — copyleft for network services
- **Contributing:** DCO (sign‑off each commit) + Contributor Covenant v2.1

## Playtest → Publish → Install (replace placeholders)

**Playtest to _your_ test subreddit**
```bash
devvit upload
devvit playtest <your_test_subreddit>
# In that subreddit: Create post → Launch App → select Code Derby
```

**Publish (Unlisted is fine for first submissions)**
```bash
devvit publish           # add --public later when ready
```

**Install to _your_ production subreddit**
```bash
devvit install <your_production_subreddit>
# or specify a version explicitly:
# devvit install <your_production_subreddit> code-derby@1.0.0
```

> Notes
> - You must be a moderator of the target subreddit to playtest/install.
> - Weekly auto‑post uses **Devvit native Reddit API** by default and falls back to OAuth only if forced.
