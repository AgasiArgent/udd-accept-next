create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  body text not null,
  created_at timestamptz default now()
);

alter table public.notes enable row level security;

create policy "owner can select" on public.notes
  for select to authenticated using (user_id = auth.uid());
create policy "owner can insert" on public.notes
  for insert to authenticated with check (user_id = auth.uid());
create policy "owner can delete" on public.notes
  for delete to authenticated using (user_id = auth.uid());
