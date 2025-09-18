// src/server/index.ts
import express, { type Request } from 'express';
import cors from 'cors';
import { createServer, getServerPort, reddit, settings } from '@devvit/web/server';
import { redis } from '@devvit/redis';
import type { Entry, LeaderboardPayload, RepoSlug } from '../shared/types.js';

// ---- App bootstrap ----
const app = express();
app.use(cors());
app.use(express.json());

// ---- Keys / time helpers ----
const REDIS_ENTRIES_PREFIX = 'code-derby:entries';
const REDIS_STAR_BASE_PREFIX = 'code-derby:star-baseline';
const REDIS_STAR_NOW_PREFIX  = 'code-derby:star-now';

function leaderboardKey(week: string): string { return `${REDIS_ENTRIES_PREFIX}:${week}`; }
function starBaselineKey(week: string): string { return `${REDIS_STAR_BASE_PREFIX}:${week}`; }
function starNowCacheKey(repo: string): string { return `${REDIS_STAR_NOW_PREFIX}:${repo}`; }

function currentWeekISO(now: Date = new Date()): string {
  // 週一 00:00 UTC
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  base.setUTCDate(base.getUTCDate() - diff);
  return base.toISOString().slice(0, 10);
}
function weekEndFromWeekISO(weekISO: string): string {
  const start = new Date(`${weekISO}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return end.toISOString().slice(0, 10);
}

// ---- GitHub integration (token via settings, fallback .env) ----
async function getGitHubToken(): Promise<string> {
  try { return (await settings.get('githubToken')) || process.env.GITHUB_TOKEN || ''; }
  catch { return process.env.GITHUB_TOKEN || ''; }
}
async function gh(path: string, query: Record<string, string | number> = {}): Promise<any> {
  const url = new URL(`https://api.github.com/${path}`);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const token = await getGitHubToken();
  const r = await fetch(url.toString(), {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'code-derby-app',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text().catch(() => r.statusText)}`);
  return r.json();
}
async function getStars(owner: string, repo: string): Promise<number> {
  const data = await gh(`repos/${owner}/${repo}`);
  return Number(data.stargazers_count ?? 0);
}
async function getStarsCached(repo: string): Promise<number> {
  const cacheK = starNowCacheKey(repo);
  const cached = await redis.get(cacheK);
  if (cached) return Number(cached);
  const [owner, name] = repo.split('/');
  const now = await getStars(owner!, name!);
  await redis.set(cacheK, String(now));
  await redis.expire(cacheK, 300); // 5m
  return now;
}
async function getWeeklyStarDelta(repo: string, week: string): Promise<number> {
  const baselineK = starBaselineKey(week);
  let baseStr = await redis.hGet(baselineK, repo);
  if (!baseStr) {
    const cur = await getStarsCached(repo);
    baseStr = String(cur);
    await redis.hSet(baselineK, { [repo]: baseStr });
    await redis.expire(baselineK, 60 * 60 * 24 * 21);
  }
  const now = await getStarsCached(repo);
  const base = Number(baseStr);
  return Math.max(0, now - base);
}

const CAP_PER_REPO = 20;
async function scoreEntryByStars(entry: Entry, week: string): Promise<number> {
  const deltas = await Promise.all(entry.repos.map((r) => getWeeklyStarDelta(r, week)));
  return deltas.reduce((s, d) => s + Math.min(CAP_PER_REPO, d), 0);
}

// ---- Storage helpers ----
async function saveEntryForWeek(week: string, entry: Entry): Promise<void> {
  await redis.hSet(leaderboardKey(week), { [entry.user]: JSON.stringify(entry) });
  await redis.expire(leaderboardKey(week), 60 * 60 * 24 * 21);
}
async function loadEntriesForWeek(week: string): Promise<Entry[]> {
  const map = await redis.hGetAll(leaderboardKey(week));
  const out: Entry[] = [];
  for (const v of Object.values(map)) {
    try { out.push(JSON.parse(v) as Entry); } catch {}
  }
  return out;
}

// ---- User helper（不要用 context；用 reddit + header） ----
async function resolveCurrentUser(req?: Request): Promise<string> {
  // 先試 header（Devvit Web 會在 webview/測試時帶過來）
  const h = req?.headers?.['x-reddit-username'];
  if (typeof h === 'string' && h) return h;

  // 再試 SDK
  try {
    const username = await reddit.getCurrentUsername();
    if (username) return username;
  } catch {
    // ignore
  }
  return 'anonymous';
}

// ---- Routes ----
app.get('/api/user', async (req, res) => {
  const user = await resolveCurrentUser(req);
  res.json({ user });
});

app.post('/api/roster/submit', async (req, res) => {
  try {
    const body = (req.body ?? {}) as { repos?: string[] };

    // 清理/驗證成 RepoSlug（owner/repo）
    const input = (body.repos ?? []) as string[];
    const cleaned: RepoSlug[] = [];
    const seen = new Set<string>();
    for (const raw of input) {
      const v = (raw || '').trim();
      if (!v) continue;
      if (!/^[\w.-]+\/[\w.-]+$/.test(v)) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      cleaned.push(v as RepoSlug);
    }
    if (cleaned.length < 3) return res.status(400).json({ ok: false, error: 'need 3 repos' });

    const user = await resolveCurrentUser(req);
    const week = currentWeekISO();
    const entry: Entry = { user, repos: cleaned, score: 0 };
    await saveEntryForWeek(week, entry);

    // 再讀回確認
    const exists = await redis.hGet(leaderboardKey(week), user);
    if (!exists) throw new Error('failed to persist entry');

    res.json({ ok: true, user });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message ?? String(e) });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const week = currentWeekISO();
    const entries = await loadEntriesForWeek(week);
    const withScores = await Promise.all(entries.map(async e => ({ ...e, score: await scoreEntryByStars(e, week) })));
    withScores.sort((a, b) => b.score - a.score || a.user.localeCompare(b.user));
    const payload: LeaderboardPayload = {
      updatedAt: new Date().toISOString(),
      week,
      weekStart: week,
      weekEnd: weekEndFromWeekISO(week),
      entries: withScores,
    };
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message ?? String(e) });
  }
});

app.get('/api/gh/stars', async (req, res) => {
  try {
    const repo = String(req.query.repo ?? '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return res.status(400).json({ ok: false, error: 'invalid repo' });
    const week = currentWeekISO();
    const baseKey = starBaselineKey(week);
    let baseline = await redis.hGet(baseKey, repo);
    if (!baseline) {
      const cur = await getStarsCached(repo);
      baseline = String(cur);
      await redis.hSet(baseKey, { [repo]: baseline });
      await redis.expire(baseKey, 60 * 60 * 24 * 21);
    }
    const now = await getStarsCached(repo);
    const delta = Math.max(0, now - Number(baseline));
    res.json({ ok: true, repo, stars: now, baseline: Number(baseline), delta });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message ?? String(e) });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const week = currentWeekISO();
    const key = leaderboardKey(week);
    const entries = await redis.hLen(key);

    // 一次性 probe：確認可寫
    const probeKey = `code-derby:health:${Date.now()}`;
    await redis.hSet(probeKey, { ok: '1' });
    await redis.expire(probeKey, 60);

    res.json({ ok: true, week, entries });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ---- Server start ----
const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error: ${err instanceof Error ? err.stack : err}`));
server.listen(port);

export default app;
