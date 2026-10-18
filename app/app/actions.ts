"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AddNoteState = { error: string | null };

export async function addNote(_prev: AddNoteState, formData: FormData): Promise<AddNoteState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Please type a note before pressing Add." };
  const supabase = await createClient();
  if (!supabase) return { error: "Notes are not available right now." };
  const { error } = await supabase.from("notes").insert({ body });
  if (error) return { error: "Your note could not be saved. Please try again." };
  revalidatePath("/app");
  return { error: null };
}

export async function deleteNote(formData: FormData) {
  const supabase = await createClient();
  await supabase?.from("notes").delete().eq("id", String(formData.get("id")));
  revalidatePath("/app");
}
