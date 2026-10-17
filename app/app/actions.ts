"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addNote(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const supabase = await createClient();
  await supabase?.from("notes").insert({ body });
  revalidatePath("/app");
}

export async function deleteNote(formData: FormData) {
  const supabase = await createClient();
  await supabase?.from("notes").delete().eq("id", String(formData.get("id")));
  revalidatePath("/app");
}
