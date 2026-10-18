import type { SupabaseClient } from "@supabase/supabase-js";
import { createIssue } from "./github";
import { renderIssue, type Payload } from "./issueBody";

export const MAX_BODY_BYTES = 3 * 1024 * 1024;
export const RATE_LIMIT = 10; // reports per user per hour
const BUCKET = "feedback-screenshots";

/** Reads the body as text, or null as soon as it passes `max` bytes (works without Content-Length). */
export async function readLimited(req: Request, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** NUL and lone surrogates are valid JSON but Postgres jsonb rejects them. */
export function cleanStrings(_key: string, value: unknown): unknown {
  return typeof value === "string"
    ? value
        .replace(/\u0000/g, "")
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�")
    : value;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;

/**
 * Checks the shape of contracts/feedback-report.schema.json that the route relies on, and returns
 * only known fields (the user field and anything unknown is dropped).
 * shortcut: hand-written check instead of ajv to avoid a new dependency — move to ajv if the schema grows.
 */
export function parseReport(body: unknown): { payload: Payload; screenshot: string | null } | string {
  if (!isObj(body)) return "body must be an object";
  const { comment, createdAt, target, screenshot, context } = body;
  if (!str(comment, 4000) || !comment.trim()) return "comment is required (1-4000 characters)";
  if (!str(createdAt, 40)) return "createdAt is required";
  if (!isObj(context) || !str(context.url, 2000)) return "context.url is required";
  const payload: Payload = { comment, createdAt, context: { url: context.url } };
  if (isObj(context.viewport) && typeof context.viewport.width === "number" && typeof context.viewport.height === "number") {
    payload.context.viewport = { width: context.viewport.width, height: context.viewport.height };
  }
  if (str(context.userAgent, 500)) payload.context.userAgent = context.userAgent as string;
  if (Array.isArray(context.consoleErrors)) {
    payload.context.consoleErrors = context.consoleErrors.filter((e): e is string => str(e, 500)).slice(0, 20);
  }
  if (Array.isArray(context.failedRequests)) {
    payload.context.failedRequests = context.failedRequests
      .filter(
        (r): r is { method: string; url: string; status: number } =>
          isObj(r) && str(r.method, 20) && str(r.url, 2000) && typeof r.status === "number",
      )
      .slice(0, 20);
  }
  if (target !== undefined) {
    if (!isObj(target) || !str(target.selector, 2000) || !str(target.tagName, 50)) return "target is malformed";
    payload.target = { selector: target.selector as string, tagName: target.tagName as string };
    if (str(target.text, 200)) payload.target.text = target.text as string;
  }
  let png: string | null = null;
  if (screenshot !== undefined) {
    if (!str(screenshot, 2_900_000) || !screenshot.startsWith("data:image/png;base64,")) return "screenshot must be a PNG data URL";
    png = screenshot;
  }
  return { payload, screenshot: png };
}

/** Creates the GitHub issue for one stored row and records its number. Never throws. */
export async function deliver(
  supabase: SupabaseClient,
  row: { id: string; user_id: string; payload: Payload; attempts: number },
): Promise<number | null> {
  const issue = renderIssue(row.id.slice(0, 8), row.user_id, row.payload);
  const number = await createIssue(issue);
  await supabase
    .from("feedback_reports")
    .update(number ? { issue_number: number, attempts: row.attempts + 1 } : { attempts: row.attempts + 1 })
    .eq("id", row.id)
    .is("issue_number", null);
  return number;
}

/** Retries rows of this user that still have no issue. shortcut: sequential, max 5 per call; two parallel retries can file a duplicate issue — add a claim column if that shows up. */
export async function retryPending(supabase: SupabaseClient, skipId?: string) {
  const { data } = await supabase
    .from("feedback_reports")
    .select("id, user_id, payload, attempts")
    .is("issue_number", null)
    .order("created_at", { ascending: true })
    .limit(5);
  for (const row of data ?? []) {
    if (row.id !== skipId) await deliver(supabase, row);
  }
}

export async function storeScreenshot(supabase: SupabaseClient, userId: string, dataUrl: string): Promise<string | null> {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  const path = `${userId}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "image/png" });
  if (error) {
    console.error("feedback: screenshot upload failed", error.message);
    return null;
  }
  return path;
}
