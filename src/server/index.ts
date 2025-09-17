import express from 'express';
import cors from 'cors';
import { createServer, getServerPort, context, reddit } from '@devvit/web/server';
import type { Entry, LeaderboardPayload, UserPayload, RepoSlug } from '../shared/types.js';

const app = express();
app.use(cors());
app.use(express.json());

const entries: Entry[] = [];

function currentWeekISO() {
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return monday.toISOString().slice(0, 10);
}

async function createInteractivePost() {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required to create an interactive post');
  }

  return await reddit.submitCustomPost({
    subredditName,
    title: 'Code Derby',
    splash: {
      appDisplayName: 'Code Derby',
    },
  });
}

app.get('/api/user', (_req, res) => {
  const payload: UserPayload = {
    userName: 'anonymous',
    week: currentWeekISO(),
    today: new Date().toISOString(),
  };
  res.json(payload);
});

app.post('/api/roster/submit', (req, res) => {
  const body = req.body ?? {};
  const repos: RepoSlug[] = Array.isArray(body.repos) ? body.repos.slice(0, 3) : [];
  const user = 'anonymous'; // TODO: derive from Devvit context once available in server runtime
  let entry = entries.find((x) => x.user === user);
  if (!entry) {
    entry = { user, repos, score: 0 };
    entries.push(entry);
  } else {
    entry.repos = repos;
  }
  res.json({ ok: true });
});

app.get('/api/leaderboard', (_req, res) => {
  const payload: LeaderboardPayload = { week: currentWeekISO(), entries: entries.sort((a, b) => b.score - a.score) };
  res.json(payload);
});

// cron stubs
app.post('/internal/cron/settle', (_req, res) => {
  res.json({ ok: true, ran: 'settle' });
});
app.post('/internal/cron/new-round', (_req, res) => {
  entries.length = 0;
  res.json({ ok: true, ran: 'new-round' });
});
app.post('/internal/cron/weekly-autopost', (_req, res) => {
  res.json({ ok: true, ran: 'weekly-autopost' });
});

app.post('/internal/on-app-install', async (_req, res) => {
  try {
    const post = await createInteractivePost();
    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName ?? 'unknown'} with id ${post.id}`,
    });
  } catch (error) {
    console.error('Error creating default post on install', error);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

app.post('/internal/menu/post-create', async (_req, res) => {
  try {
    const post = await createInteractivePost();
    const subreddit = context.subredditName;
    if (!subreddit) {
      throw new Error('subredditName missing from context');
    }
    res.json({ navigateTo: `https://reddit.com/r/${subreddit}/comments/${post.id}` });
  } catch (error) {
    console.error('Error creating post from menu', error);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error: ${err instanceof Error ? err.stack : err}`));
server.listen(port);

export default app;
