import Link from "next/link";

export default function Home() {
  return (
    <main className="wrap">
      <h1>Notes</h1>
      <p>A tiny notes app.</p>
      <p>
        <Link href="/app">Open my notes</Link> · <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
