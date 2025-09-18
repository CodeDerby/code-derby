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

// ---- Settings helpers ----
async function getBoolSetting(name: string, envKey: string, def: boolean): Promise<boolean> {
  // env 優先
  if (process.env[envKey] != null) return process.env[envKey] === '1' || process.env[envKey] === 'true';
  try {
    const v = await settings.get(name);
    if (typeof v === 'string') return v === '1' || v === 'true';
    if (typeof v === 'boolean') return v;
  } catch {}
  return def;
}
async function getGitHubToken(): Promise<string> {
  try { return (await settings.get('githubToken')) || process.env.GITHUB_TOKEN || ''; }
  catch { return process.env.GITHUB_TOKEN || ''; }
}

// ---- GitHub (real path; 在 mock 或被擋時不會被呼叫) ----
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

// ---- Mock scoring (當外域尚未開通時使用) ----
function hashInt(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pseudo(s: string, maxInclusive: number): number {
  return hashInt(s) % (maxInclusive + 1);
}
function mockStarDelta(repo: string, week: string) {
  return Math.min(20, pseudo(`${repo}|${week}|stars`, 24)); // cap 20
}
function mockMergedPRs(repo: string, week: string) {
  return pseudo(`${repo}|${week}|pr`, 3); // 0..3 → *5
}
function mockClosedIssues(repo: string, week: string) {
  return pseudo(`${repo}|${week}|issue`, 4); // 0..4 → *2
}
function mockReleases(repo: string, week: string) {
  return pseudo(`${repo}|${week}|rel`, 1); // 0..1 → *8
}
function mockNpmDelta(repo: string, week: string) {
  return pseudo(`${repo}|${week}|npm`, 3); // 0..3 → /5k → +1 each
}

// ---- Score calculation (adapter: mock / real) ----
const POINTS = { release: 8, mergedPR: 5, closedIssue: 2, starDelta: 1, npmPer5k: 1 };
const CAP_PER_REPO = 20;

async function scoreEntry(entry: Entry, week: string): Promise<number> {
  const useMock = await getBoolSetting('mockScoring', 'MOCK_SCORING', true);

  if (useMock) {
    let s = 0;
    for (const r of entry.repos) {
      s += mockReleases(r, week) * POINTS.release;
      s += mockMergedPRs(r, week) * POINTS.mergedPR;
      s += mockClosedIssues(r, week) * POINTS.closedIssue;
      s += Math.min(CAP_PER_REPO, mockStarDelta(r, week)) * POINTS.starDelta;
      s += mockNpmDelta(r, week) * POINTS.npmPer5k;
    }
    return s;
  }

  // Real path（目前只做 Star Δ；其餘先留 0）
  const deltas = await Promise.all(entry.repos.map((r) => getWeeklyStarDelta(r, week).catch(() => 0)));
  const starScore = deltas.reduce((sum, d) => sum + Math.min(CAP_PER_REPO, d), 0) * POINTS.starDelta;
  return starScore; // TODO: releases / merged PR / closed issues / npm once allowlist passes
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

// ---- User helper（不用 context；用 reddit + header） ----
async function resolveCurrentUser(req?: Request): Promise<string> {
  const h = req?.headers?.['x-reddit-username'];
  if (typeof h === 'string' && h) return h;
  try {
    const username = await reddit.getCurrentUsername();
    if (username) return username;
  } catch {}
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

    // 清理/驗證 RepoSlug（owner/repo）
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
    const withScores = await Promise.all(entries.map(async e => ({ ...e, score: await scoreEntry(e, week) })));
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
    // 就算出錯也回週期，避免前端顯示 —
    const week = currentWeekISO();
    const payload: LeaderboardPayload = {
      updatedAt: new Date().toISOString(),
      week,
      weekStart: week,
      weekEnd: weekEndFromWeekISO(week),
      entries: [],
      error: e?.message ?? String(e),
    } as any;
    res.status(200).json(payload);
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const week = currentWeekISO();
    const key = leaderboardKey(week);
    const entries = await redis.hLen(key);

    const probeKey = `code-derby:health:${Date.now()}`;
    await redis.hSet(probeKey, { ok: '1' });
    await redis.expire(probeKey, 60);

    // 也回 mockScoring 狀態，方便前端 console 檢查
    const mockScoring = await getBoolSetting('mockScoring', 'MOCK_SCORING', true);

    res.json({ ok: true, week, entries, mockScoring });
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
