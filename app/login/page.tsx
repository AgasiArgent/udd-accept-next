import { supabaseConfig } from "@/lib/supabase/config";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="wrap">
      <h1>Sign in</h1>
      {supabaseConfig() ? (
        <LoginForm />
      ) : (
        <p>Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
      )}
    </main>
  );
}
