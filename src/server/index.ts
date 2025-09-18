import express from 'express';
import cors from 'cors';
import { createServer, getServerPort, context, reddit } from '@devvit/web/server';
import { redis } from '@devvit/redis';
import type { Entry, LeaderboardPayload, UserPayload, RepoSlug } from '../shared/types.js';

const app = express();
app.use(cors());
app.use(express.json());

const REDIS_ENTRIES_PREFIX = 'code-derby:entries';

function leaderboardKey(week: string): string {
  return `${REDIS_ENTRIES_PREFIX}:${week}`;
}

function currentWeekISO(now: Date = new Date()): string {
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = utcMidnight.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - daysSinceMonday);
  return utcMidnight.toISOString().slice(0, 10);
}

function weekEndFromWeekISO(weekISO: string): string {
  const start = new Date(`${weekISO}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return end.toISOString().slice(0, 10);
}


function logInfo(message: string, metadata?: Record<string, unknown>): void {
  if (context.logger) {
    context.logger.info(message, metadata);
  }
  else {
    console.log(`[info] ${message}`, metadata ?? '');
  }
}

function logError(message: string, metadata?: Record<string, unknown>): void {
  if (context.logger) {
    context.logger.error(message, metadata);
  }
  else {
    console.error(`[error] ${message}`, metadata ?? '');
  }
}

async function loadEntriesForWeek(week: string): Promise<Entry[]> {
  const key = leaderboardKey(week);
  try {
    const stored = await redis.hGetAll(key);
    const entries: Entry[] = [];
    for (const raw of Object.values(stored)) {
      try {
        const parsed: Entry = JSON.parse(raw);
        entries.push(parsed);
      }
      catch (parseError) {
        logError('Unable to parse entry from Redis', {
          week,
          raw,
          error: parseError instanceof Error ? parseError.message : parseError,
        });
      }
    }
    return entries;
  }
  catch (error) {
    logError('Failed to load entries from Redis', {
      week,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

async function saveEntryForWeek(week: string, entry: Entry): Promise<Entry> {
  const key = leaderboardKey(week);
  try {
    const existingRaw = await redis.hGet(key, entry.user);
    if (existingRaw) {
      try {
        const existing: Entry = JSON.parse(existingRaw);
        entry.score = existing.score;
      }
      catch (parseError) {
        logError('Failed to parse existing entry while saving roster', {
          week,
          user: entry.user,
          error: parseError instanceof Error ? parseError.message : parseError,
        });
      }
    }
    await redis.hSet(key, { [entry.user]: JSON.stringify(entry) });
    try {
      await redis.expire(key, 60 * 60 * 24 * 21);
    }
    catch (expireError) {
      logError('Failed to set Redis expiration for leaderboard key', {
        week,
        error: expireError instanceof Error ? expireError.message : expireError,
      });
    }
    return entry;
  }
  catch (error) {
    logError('Failed to save entry to Redis', {
      week,
      user: entry.user,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
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

async function resolveCurrentUser(): Promise<string> {
  try {
    const username = await reddit.getCurrentUsername();
    if (username) {
      return username;
    }
  }
  catch (error) {
    console.warn('resolveCurrentUser failed, falling back to anonymous', error);
  }
  return 'anonymous';
}

app.get('/api/user', async (_req, res) => {
  const payload: UserPayload = {
    userName: await resolveCurrentUser(),
    week: currentWeekISO(),
    today: new Date().toISOString(),
  };
  res.json(payload);
});

app.post('/api/roster/submit', async (req, res) => {
  const body = req.body ?? {};
  const repos: RepoSlug[] = Array.isArray(body.repos) ? body.repos.map((repo: string) => repo?.trim()).slice(0, 3) : [];
  const sanitizedRepos = repos.filter((repo): repo is RepoSlug => Boolean(repo)) as RepoSlug[];
  if (sanitizedRepos.length !== 3) {
    res.status(400).json({ ok: false, error: 'Please provide exactly three repositories.' });
    return;
  }

  const user = await resolveCurrentUser();
  const week = currentWeekISO();
  const entry: Entry = { user, repos: sanitizedRepos, score: 0 };

  try {
    const savedEntry = await saveEntryForWeek(week, entry);
    logInfo('Roster submission saved', { user, week, repos: sanitizedRepos });
    res.json({ ok: true, entry: savedEntry });
  }
  catch (error) {
    logError('Roster submission failed', {
      user,
      week,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ ok: false, error: 'Failed to save roster. Please try again.' });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  const week = currentWeekISO();
  try {
    const entries = await loadEntriesForWeek(week);
    const payload: LeaderboardPayload = {
      updatedAt: new Date().toISOString(),
      week,
      weekStart: week,
      weekEnd: weekEndFromWeekISO(week),
      entries: entries.sort((a, b) => b.score - a.score || a.user.localeCompare(b.user)),
    };
    res.json(payload);
  }
  catch (error) {
    logError('Failed to load leaderboard', {
      week,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ ok: false, error: 'Unable to load leaderboard right now.', week });
  }
});

// cron stubs
app.post('/internal/cron/settle', (_req, res) => {
  res.json({ ok: true, ran: 'settle' });
});
app.post('/internal/cron/new-round', (_req, res) => {
  entries.length = 0;
  res.json({ ok: true, ran: 'new-round' });
});


// --- Diagnostics ---
app.get('/internal/redis/ping', async (_req, res) => {
  try {
    const pong = await redis.ping();
    const week = currentWeekISO();
    const hlen = await redis.hLen(leaderboardKey(week));
    res.json({ ok: true, pong, week, entries: hlen });
  }
  catch (error) {
    logError('Redis ping failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ ok: false, error: 'redis unreachable' });
  }
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

// Health check (Devvit Redis SDK 沒有 ping())
app.get('/api/health', async (_req, res) => {
  try {
    const week = currentWeekISO();
    const key = leaderboardKey(week);
    const entries = await redis.hLen(key);             // 讀
    const probeKey = `code-derby:health:${Date.now()}`;// 寫
    await redis.hSet(probeKey, 'ok', '1');
    await redis.expire(probeKey, 60);
    res.json({ ok: true, week, entries });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});


const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error: ${err instanceof Error ? err.stack : err}`));
server.listen(port);

export default app;
