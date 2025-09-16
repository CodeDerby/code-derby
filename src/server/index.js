// src/server/index.js
import { createServer as createNodeServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

function createApp() {
  const routes = [];

  const requestHandler = async (req, res) => {
    for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
      if (!res.headersSent) res.setHeader(key, value);
    }

    const method = (req.method || 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    const expressLikeRes = wrapResponse(res);
    const url = new URL(req.url || '/', 'http://localhost');
    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams.entries());

    try {
      const body = await parseBody(req);
      if (body !== undefined) req.body = body;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request payload';
      return expressLikeRes.status(400).json({ success: false, error: message });
    }

    const route = routes.find((r) => r.method === method && r.path === url.pathname);
    if (!route) {
      return expressLikeRes.status(404).json({ success: false, error: 'Not Found' });
    }

    try {
      await route.handler(req, expressLikeRes);
      if (!res.writableEnded) res.end();
    } catch (err) {
      if (res.headersSent) {
        if (!res.writableEnded) res.end();
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      expressLikeRes.status(500).json({ success: false, error: message });
    }
  };

  const app = function (req, res) {
    return requestHandler(req, res);
  };

  const register = (method, path, handler) => {
    routes.push({ method, path, handler });
    return app;
  };

  app.get = (path, handler) => register('GET', path, handler);
  app.post = (path, handler) => register('POST', path, handler);
  app.listen = (...args) => createNodeServer(requestHandler).listen(...args);
  app.handle = requestHandler;

  return app;
}

function wrapResponse(res) {
  if (typeof res.json === 'function') return res;
  res.status = function status(code) {
    res.statusCode = code;
    return res;
  };
  res.json = function json(payload) {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
    return res;
  };
  res.send = function send(payload) {
    if (payload && typeof payload === 'object' && !Buffer.isBuffer(payload)) {
      return res.json(payload);
    }
    res.end(payload);
    return res;
  };
  return res;
}

async function parseBody(req) {
  const method = (req.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return undefined;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString('utf8');
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    if (!raw.trim()) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON payload');
    }
  }

  return raw;
}

const app = createApp();

// Minimal in-memory Redis shim for local testing
const memory = (() => {
  const H = new Map(); const K = new Map();
  return {
    async hSet(key, obj) { const m = H.get(key) || new Map(); for (const [k, v] of Object.entries(obj)) m.set(k, String(v)); H.set(key, m); },
    async hGetAll(key) { const m = H.get(key) || new Map(); return Object.fromEntries(m.entries()); },
    async get(key) { return K.get(key) || null; },
    async set(key, val) { K.set(key, typeof val === 'string' ? val : JSON.stringify(val)); },
    async del(key) { H.delete(key); K.delete(key); }
  };
})();

const redis = globalThis.redis || memory;

function getISOWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
function todayUTC() { return new Date().toISOString().slice(0, 10); }

function currentUserName() {
  try {
    const u = globalThis?.context?.user;
    return (u?.username || u?.name || 'anonymous');
  } catch { return 'anonymous'; }
}

// --- Public API ---
app.get('/api/user', async (_req, res) => {
  const userName = currentUserName();           // ← 用 Devvit 的使用者
  const weekNo = getISOWeek(new Date());
  res.json({ userName, weekNo });
});

app.post('/api/roster/submit', async (req, res) => {
  const userName = currentUserName();           // ← 用 Devvit 的使用者
  const repos = (req.body?.repos ?? []).slice(0, 3);

  if (!Array.isArray(repos) || repos.length !== 3) {
    return res.status(400).json({ success: false, error: 'Exactly 3 repos required' });
  }
  for (const r of repos) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r)) {
      return res.status(400).json({ success: false, error: `Invalid repo: ${r}` });
    }
  }

  const weekNo = getISOWeek(new Date());
  await redis.hSet(`rosters:${weekNo}`, { [userName]: JSON.stringify(repos) });
  res.json({ success: true });
});

app.get('/api/leaderboard', async (_req, res) => {
  const weekNo = getISOWeek(new Date());
  const raw = await redis.hGetAll(`scores:${weekNo}`);
  const board = Object.fromEntries(Object.entries(raw || {}).map(([k, v]) => [k, Number(v)]));
  res.json({ leaderboard: board });
});

app.get('/api/highlights', async (_req, res) => {
  const weekNo = getISOWeek(new Date());
  const hi = await redis.get(`highlights:${weekNo}`);
  res.json({ highlights: hi ? JSON.parse(hi) : null });
});

// Daily settlement
app.post('/internal/cron/settle', async (_req, res) => {
  const weekNo = getISOWeek(new Date());
  const rosterKey = `rosters:${weekNo}`; const scoreKey = `scores:${weekNo}`;
  const rosters = (await redis.hGetAll(rosterKey)) || {};
  const lineups = Object.fromEntries(Object.entries(rosters).map(([u, raw]) => [u, JSON.parse(raw)]));
  const repos = Array.from(new Set(Object.values(lineups).flat()));

  const headers = { 'Accept': 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const metrics = {};
  for (const full of repos) {
    const [owner, repo] = full.split('/');
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      const j = r.ok ? await r.json() : {};
      metrics[full] = { issues: Number(j.open_issues_count || 0), stars: Number(j.stargazers_count || 0), forks: Number(j.forks_count || 0), mergedPRs: 0 };
    } catch { metrics[full] = { issues: 0, stars: 0, forks: 0, mergedPRs: 0 }; }
  }

  const prevRaw = await redis.get(`snapshot:${weekNo}:prev`);
  const prev = prevRaw ? JSON.parse(prevRaw) : {};

  const weights = { issues: 3, mergedPRs: 5, stars: 1, forks: 2 };
  function riskScoreForRepo(prev = {}, curr = {}, delta = {}) {
    let risk = 0;
    const starDelta = Math.max(0, (curr.stars || 0) - (prev.stars || 0));
    const forkDelta = Math.max(0, (curr.forks || 0) - (prev.forks || 0));
    const issueDelta = Math.max(0, (curr.issues || 0) - (prev.issues || 0));
    const prDelta = Math.max(0, (curr.mergedPRs || 0) - (prev.mergedPRs || 0));
    if (starDelta >= 50 && prDelta === 0 && issueDelta === 0) risk += 40;
    if (starDelta >= 100) risk += 30;
    if (forkDelta >= 20 && prDelta === 0) risk += 25;
    const combined = starDelta + forkDelta + issueDelta + prDelta * 5;
    if (combined >= 200) risk += 20;
    return Math.max(0, Math.min(100, risk));
  }

  const topList = [];
  const updates = {};
  for (const [user, rs] of Object.entries(lineups)) {
    let sum = 0;
    for (const full of rs) {
      const m = metrics[full] || {}; const p = prev[full] || {};
      const delta = {
        issues: Math.max(0, (m.issues || 0) - (p.issues || 0)),
        mergedPRs: Math.max(0, (m.mergedPRs || 0) - (p.mergedPRs || 0)),
        stars: Math.max(0, (m.stars || 0) - (p.stars || 0)),
        forks: Math.max(0, (m.forks || 0) - (p.forks || 0))
      };
      let score = delta.issues * weights.issues + delta.mergedPRs * weights.mergedPRs + delta.stars * weights.stars + delta.forks * weights.forks;
      const risk = riskScoreForRepo(p, m, delta);
      if (risk >= 70) { score = 0; await redis.hSet(`flags:${weekNo}`, { [full]: JSON.stringify({ risk, action: 'delay', date: todayUTC() }) }); }
      else if (risk >= 40) { score = Math.round(score * 0.5); await redis.hSet(`flags:${weekNo}`, { [full]: JSON.stringify({ risk, action: 'downweight', date: todayUTC() }) }); }
      sum += score; topList.push({ repo: full, delta: score, risk });
    }
    const cur = Number((await redis.hGet(scoreKey, user)) || '0');
    updates[user] = String(cur + sum);
  }
  if (Object.keys(updates).length) await redis.hSet(scoreKey, updates);
  topList.sort((a, b) => b.delta - a.delta);
  await redis.set(`highlights:${weekNo}`, JSON.stringify({ dateUTC: todayUTC(), topRepos: topList.slice(0, 5) }));
  await redis.set(`snapshot:${weekNo}:prev`, JSON.stringify(metrics));
  res.json({ success: true, usersUpdated: Object.keys(updates).length });
});

// Weekly round rollover
app.post('/internal/cron/new-round', async (_req, res) => {
  const now = new Date();
  const weekNo = getISOWeek(now);
  const prevWeek = getISOWeek(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7)));
  await redis.set(`round:${prevWeek}:status`, 'closed');
  await redis.set(`round:${weekNo}:status`, 'open');
  await redis.del(`snapshot:${weekNo}:prev`);
  res.json({ success: true, currentWeek: weekNo });
});

// Weekly autopost (Devvit-native with OAuth fallback)
app.post('/internal/cron/weekly-autopost', async (_req, res) => {
  const subreddit = process.env.AUTOPUBLISH_SUBREDDIT || 'CodeDerby';
  const weekNo = getISOWeek(new Date());
  const titlePrefix = process.env.AUTOPUBLISH_TITLE_PREFIX || 'Code Derby';
  const title = `${titlePrefix} — Week ${weekNo} Draft (closes Sun 23:00 UTC)`;
  const text = `Pick any three repos. We tally daily deltas (Issues/PRs/Stars/Forks).\n\nCreate a post → Launch App → select Code Derby to draft. Good luck!`;
  if (process.env.AUTOPUBLISH_ENABLED != 'true') return res.json({ success: false, message: 'AUTOPUBLISH_ENABLED is not true' });
  try {
    if (process.env.AUTOPUBLISH_FORCE_OAUTH === '1') {
      const ok = await redditSubmitTextPostOAuth({ subreddit, title, text });
      return res.json({ success: ok, method: 'oauth', subreddit, weekNo });
    }
    const ok = await redditSubmitTextPostNative({ subreddit, title, text });
    return res.json({ success: ok, method: 'devvit-native', subreddit, weekNo });
  } catch (_e) {
    try {
      const ok = await redditSubmitTextPostOAuth({ subreddit, title, text });
      return res.json({ success: ok, method: 'oauth-fallback', subreddit, weekNo });
    } catch (e2) {
      return res.status(500).json({ success: false, error: String(e2) });
    }
  }
});

async function redditSubmitTextPostNative({ subreddit, title, text }) {
  const ctx = globalThis.context;
  if (!ctx || !ctx.reddit) throw new Error('Devvit reddit API not available');
  const api = ctx.reddit;
  if (typeof api.submitPost === 'function') { await api.submitPost({ subredditName: subreddit, title, kind: 'self', text }); return true; }
  if (api.posts && typeof api.posts.submit === 'function') { await api.posts.submit({ sr: subreddit, kind: 'self', title, text }); return true; }
  if (typeof api.createPost === 'function') { await api.createPost({ subredditName: subreddit, title, body: text, kind: 'self' }); return true; }
  throw new Error('No compatible Devvit reddit submit method found');
}
async function redditSubmitTextPostOAuth({ subreddit, title, text }) {
  const cid = process.env.REDDIT_CLIENT_ID; const csec = process.env.REDDIT_CLIENT_SECRET;
  const user = process.env.REDDIT_USERNAME; const pass = process.env.REDDIT_PASSWORD;
  const ua = process.env.REDDIT_USER_AGENT || 'CodeDerbyAutoPost/1.0';
  if (!cid || !csec || !user || !pass) throw new Error('Missing Reddit OAuth env vars');
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${cid}:${csec}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': ua },
    body: new URLSearchParams({ grant_type: 'password', username: user, password: pass }).toString()
  });
  if (!tokenRes.ok) throw new Error('OAuth token request failed');
  const t = await tokenRes.json();
  const access = t.access_token;
  const submitRes = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access}`, 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ sr: subreddit, kind: 'self', title, text, resubmit: 'true', api_type: 'json' }).toString()
  });
  const j = await submitRes.json();
  if (j?.json?.errors?.length) throw new Error('Submit error: ' + JSON.stringify(j.json.errors));
  return true;
}

// Local dev server (optional)
if (process.env.LOCAL_SERVER === '1') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`[code-derby] local server listening on :${port}`));
}

export default app;
