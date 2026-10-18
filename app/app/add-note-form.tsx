"use client";

import { useActionState } from "react";
import { addNote, type AddNoteState } from "./actions";

export function AddNoteForm() {
  const [state, action] = useActionState<AddNoteState, FormData>(addNote, { error: null });
  return (
    <>
      <form action={action} className="row">
        <input name="body" placeholder="New note" required />
        <button>Add</button>
      </form>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
    </>
  );
}
