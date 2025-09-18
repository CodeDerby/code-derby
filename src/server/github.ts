// src/server/github.ts
import { settings } from '@devvit/web/server';

async function getToken(): Promise<string> {
  // Devvit secret 優先，沒有就退回本地 .env
  return (await settings.get('githubToken')) || process.env.GITHUB_TOKEN || '';
}

export async function gh(
  path: string,
  query: Record<string, string | number> = {}
): Promise<any> {
  const url = new URL(`https://api.github.com/${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

  const token = await getToken();

  const r = await fetch(url.toString(), {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'code-derby-app',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // 簡單的限流/錯誤處理
  if (!r.ok) {
    const text = await r.text().catch(() => `${r.status} ${r.statusText}`);
    throw new Error(`GitHub ${r.status}: ${text}`);
  }
  return r.json();
}

export async function getStars(owner: string, repo: string): Promise<number> {
  const data = await gh(`repos/${owner}/${repo}`);
  return Number(data.stargazers_count ?? 0);
}
