// Adapted from the kit's delivery/src/issueBody.ts. Report text is untrusted: no HTML, no mentions.
export interface Payload {
  comment: string;
  createdAt: string;
  target?: { selector: string; tagName: string; text?: string };
  context: {
    url: string;
    viewport?: { width: number; height: number };
    userAgent?: string;
    consoleErrors?: string[];
    failedRequests?: { method: string; url: string; status: number }[];
  };
}

export function neutralise(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/@/g, "@​");
}

const quote = (text: string) =>
  neutralise(text)
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");

/** GitHub rejects issue bodies over 65536 characters. */
export const MAX_BODY = 65_000;
const TRUNCATED = "\n> _(truncated)_";
const SLOT = "\u0000QUOTE\u0000";
const code = (text: string) => "`" + text.replace(/`/g, "'").replace(/\s*\n\s*/g, " ").replace(/@/g, "@​") + "`";

const FOOTER =
  "Add the label `approved` to let the coding agent work on this. Close it as *not planned* to reject it.";

export function renderIssue(ref: string, reporter: string, p: Payload) {
  const firstLine = p.comment.split("\n")[0].trim();
  const chars = Array.from(firstLine);
  const short = chars.length > 80 ? chars.slice(0, 79).join("") + "…" : firstLine;
  const title = `[FB-${ref}] ${short.replace(/@/g, "@​")}`;
  const lines = ["### Report", SLOT, "", `- **Reporter:** ${code(reporter)}`, `- **Page:** ${code(p.context.url)}`];
  if (p.target) {
    lines.push(
      `- **Element:** ${code(p.target.selector)} (${code(p.target.tagName)})${p.target.text ? ` — text ${code(p.target.text)}` : ""}`,
    );
  }
  if (p.context.viewport) lines.push(`- **Window:** ${p.context.viewport.width}×${p.context.viewport.height}`);
  if (p.context.userAgent) lines.push(`- **Browser:** ${code(p.context.userAgent)}`);
  lines.push("- **Screenshot:** stored in the app");
  if (p.context.consoleErrors?.length) {
    lines.push("", "### Console errors", ...p.context.consoleErrors.map((e) => `- ${code(e)}`));
  }
  if (p.context.failedRequests?.length) {
    lines.push(
      "",
      "### Failed requests",
      ...p.context.failedRequests.map((r) => `- ${code(`${r.method} ${r.url} → ${r.status || "network error"}`)}`),
    );
  }
  lines.push("", "---", FOOTER);
  const rest = lines.join("\n");
  const room = MAX_BODY - (rest.length - SLOT.length);
  let q = quote(p.comment);
  if (q.length > room) q = q.slice(0, room - TRUNCATED.length).replace(/[\ud800-\udbff]$/, "") + TRUNCATED;
  return { title, body: rest.replace(SLOT, () => q), labels: ["feedback"] };
}
