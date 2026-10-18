const API = "https://api.github.com";
const repo = () => process.env.UDD_GITHUB_REPO ?? "AgasiArgent/udd-accept-next";

function headers() {
  const token = process.env.UDD_GITHUB_TOKEN;
  if (!token) return null;
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "content-type": "application/json",
  };
}

/** Creates the issue; returns its number, or null when GitHub (or the token) is unavailable. */
export async function createIssue(issue: { title: string; body: string; labels: string[] }): Promise<number | null> {
  const h = headers();
  if (!h) return null;
  try {
    const res = await fetch(`${API}/repos/${repo()}/issues`, {
      method: "POST",
      headers: h,
      body: JSON.stringify(issue),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status !== 201) {
      console.error("feedback: GitHub refused the issue", res.status);
      return null;
    }
    const json = (await res.json()) as { number?: number };
    return typeof json.number === "number" ? json.number : null;
  } catch (err) {
    console.error("feedback: GitHub request failed", err);
    return null;
  }
}

export interface IssueState {
  labels: string[];
  state: string;
  stateReason: string | null;
}

/** Reads labels and state of one issue, cached for a minute. Null when unreadable. */
export async function readIssue(number: number): Promise<IssueState | null> {
  const h = headers();
  if (!h) return null;
  try {
    const res = await fetch(`${API}/repos/${repo()}/issues/${number}`, {
      headers: h,
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      labels: (string | { name?: string })[];
      state: string;
      state_reason: string | null;
    };
    return {
      labels: j.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))),
      state: j.state,
      stateReason: j.state_reason,
    };
  } catch {
    return null;
  }
}
