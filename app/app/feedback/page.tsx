import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readIssue } from "@/lib/feedback/github";
import { retryPending } from "@/lib/feedback/intake";
import { statusFromIssue } from "@/lib/feedback/status";

export const dynamic = "force-dynamic";

export default async function MyFeedbackPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await retryPending(supabase);
  const { data } = await supabase
    .from("feedback_reports")
    .select("id, payload, issue_number, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = await Promise.all(
    (data ?? []).map(async (r) => {
      const issue = r.issue_number ? await readIssue(r.issue_number) : null;
      return { ...r, status: issue ? statusFromIssue(issue).text : "Received" };
    }),
  );

  return (
    <main className="wrap">
      <header className="bar">
        <strong>My feedback</strong>
        <Link href="/app">Back to notes</Link>
      </header>
      {rows.length === 0 ? <p>You have not sent any reports yet.</p> : null}
      <ul className="notes">
        {rows.map((r) => (
          <li key={r.id}>
            <span>{String((r.payload as { comment?: string }).comment ?? "").slice(0, 140)}</span>
            <em>{r.status}</em>
          </li>
        ))}
      </ul>
    </main>
  );
}
