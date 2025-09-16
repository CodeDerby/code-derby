// src/server/index.js
// Minimal zero-dependency server for Devvit HTTP.
// IMPORTANT: export default a Node-style handler. No app.listen().

const memory = (() => {
  const H = new Map(), K = new Map();
  return {
    async hSet(k, obj) { const m = H.get(k) || new Map(); for (const [kk, vv] of Object.entries(obj)) m.set(kk, JSON.stringify(vv)); H.set(k, m); },
    async hGetAll(k) { const m = H.get(k) || new Map(); return Object.fromEntries([...m].map(([kk, vv]) => [kk, JSON.parse(vv)])); },
    async get(k) { return K.get(k) ?? null; },
    async set(k, v) { K.set(k, typeof v === 'string' ? v : JSON.stringify(v)); },
    async del(k) { H.delete(k); K.delete(k); },
  };
})();
const store = globalThis.redis || memory;

function getISOWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - start) / 86400000) + 1) / 7);
}
const todayUTC = () => new Date().toISOString().slice(0, 10);

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return {}; }
}
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.setHeader('content-length', Buffer.byteLength(body));
  res.end(body);
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://local');
    const { pathname } = url;

    // --- public API ---
    if (req.method === 'GET' && pathname === '/api/user') {
      const u = globalThis?.context?.user ?? {};
      const userName = u.username ?? u.name ?? 'anonymous';
      return json(res, 200, { userName, week: getISOWeek(), today: todayUTC() });
    }

    if (req.method === 'POST' && pathname === '/api/roster/submit') {
      const body = await readJson(req); // { repos: string[] }
      const u = globalThis?.context?.user ?? {};
      const user = u.username ?? u.name ?? 'anonymous';
      const key = `roster:${getISOWeek()}:${user}`;
      await store.set(key, { user, repos: Array.isArray(body.repos) ? body.repos.slice(0, 3) : [], at: todayUTC() });
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/leaderboard') {
      return json(res, 200, { week: getISOWeek(), entries: [] });
    }

    // --- internal cron stubs ---
    if (req.method === 'POST' && pathname === '/internal/cron/settle') return json(res, 200, { ok: true });
    if (req.method === 'POST' && pathname === '/internal/cron/new-round') return json(res, 200, { ok: true });
    if (req.method === 'POST' && pathname === '/internal/cron/weekly-autopost') return json(res, 200, { ok: true });

    json(res, 404, { error: 'not_found' });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'server_error' });
  }
}
