import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { addNote, deleteNote } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <main className="wrap">
        <h1>Notes</h1>
        <p>Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
      </main>
    );
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notes } = await supabase
    .from("notes")
    .select("id, body, created_at")
    .order("created_at", { ascending: false });
  const list = notes ?? [];

  return (
    <main className="wrap">
      <header className="bar">
        <strong>You have {list.length} notes</strong>
        <Link href="/app/feedback">My feedback</Link>
        <form action={signOut}>
          <button>Sign out</button>
        </form>
      </header>
      <form action={addNote} className="row">
        <input name="body" placeholder="New note" required />
        <button>Add</button>
      </form>
      <ul className="notes">
        {list.map((n) => (
          <li key={n.id}>
            <span>{n.body}</span>
            <form action={deleteNote}>
              <input type="hidden" name="id" value={n.id} />
              <button>Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
