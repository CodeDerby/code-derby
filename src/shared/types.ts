export type RepoSlug = `${string}/${string}`;
export type UserId = string;

export interface Entry {
  user: UserId;
  repos: RepoSlug[];   // length up to 3 (starter)
  score: number;       // computed by server (stub 0 in starter)
}

export interface LeaderboardPayload {
  week: string;         // ISO date (UTC Monday)
  weekStart?: string;   // optional explicit start ISO (UTC)
  weekEnd?: string;     // optional explicit end ISO (UTC)
  entries: Entry[];
}

export interface UserPayload {
  userName: string;
  week: string;
  today: string;
}
