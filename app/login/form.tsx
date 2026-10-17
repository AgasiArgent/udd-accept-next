"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="stack">
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <button disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  );
}
