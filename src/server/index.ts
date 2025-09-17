import express from 'express';
import cors from 'cors';
import type { Entry, LeaderboardPayload, UserPayload, RepoSlug } from '../shared/types.js';

const app = express();
app.use(cors());
app.use(express.json());

const entries: Entry[] = [];

function currentWeekISO() {
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return monday.toISOString().slice(0,10);
}

app.get('/api/user', (_req, res) => {
  const payload: UserPayload = { userName: 'anonymous', week: currentWeekISO(), today: new Date().toISOString() };
  res.json(payload);
});

app.post('/api/roster/submit', (req, res) => {
  const body = req.body ?? {};
  const repos: RepoSlug[] = Array.isArray(body.repos) ? body.repos.slice(0,3) : [];
  const user = 'anonymous'; // TODO: derive from Devvit context once available in server runtime
  let e = entries.find(x => x.user === user);
  if (!e) {
    e = { user, repos, score: 0 };
    entries.push(e);
  } else {
    e.repos = repos;
  }
  res.json({ ok: true });
});

app.get('/api/leaderboard', (_req, res) => {
  const payload: LeaderboardPayload = { week: currentWeekISO(), entries: entries.sort((a,b)=>b.score-a.score) };
  res.json(payload);
});

// cron stubs
app.post('/internal/cron/settle', (_req, res) => { res.json({ ok: true, ran: 'settle' }); });
app.post('/internal/cron/new-round', (_req, res) => { entries.length = 0; res.json({ ok: true, ran: 'new-round' }); });
app.post('/internal/cron/weekly-autopost', (_req, res) => { res.json({ ok: true, ran: 'weekly-autopost' }); });

export default app;
