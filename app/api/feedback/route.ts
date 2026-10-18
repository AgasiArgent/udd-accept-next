import { createClient } from "@/lib/supabase/server";
import {
  MAX_BODY_BYTES,
  RATE_LIMIT,
  cleanStrings,
  deliver,
  parseReport,
  readLimited,
  retryPending,
  storeScreenshot,
} from "@/lib/feedback/intake";

export const dynamic = "force-dynamic";

const json = (status: number, body: unknown) => Response.json(body, { status });

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return json(503, { error: "Not configured." });
  // The user comes from the server-side session cookie, never from the request body.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, { error: "Sign in to send a report." });

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("feedback_reports")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT) return json(429, { error: "Too many reports. Try again later." });

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return json(413, { error: "Report is larger than 3 MB." });
  const raw = await readLimited(req, MAX_BODY_BYTES);
  if (raw === null) return json(413, { error: "Report is larger than 3 MB." });
  let body: unknown;
  try {
    body = JSON.parse(raw, cleanStrings);
  } catch {
    return json(400, { error: "Body is not valid JSON." });
  }
  const parsed = parseReport(body);
  if (typeof parsed === "string") return json(400, { error: parsed });

  const screenshot_path = parsed.screenshot ? await storeScreenshot(supabase, user.id, parsed.screenshot) : null;
  const { data: row, error } = await supabase
    .from("feedback_reports")
    .insert({ payload: parsed.payload, screenshot_path })
    .select("id, user_id, payload, attempts")
    .single();
  if (error || !row) {
    console.error("feedback: insert failed", error?.message);
    return json(503, { error: "Feedback could not be saved right now. Please try again." });
  }

  // The report is saved: answer 201 whatever GitHub does. A row without an issue is retried later.
  // shortcut: issue creation runs inline (adds ~1s); move to after() if it gets slow.
  await deliver(supabase, row);
  await retryPending(supabase, row.id);
  return json(201, { id: row.id });
}
