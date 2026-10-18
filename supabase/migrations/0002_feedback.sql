-- User feedback loop (user-driven-development). Apply once, in the Supabase SQL editor.
-- The app writes with the signed-in user's session (no service-role key), so every
-- policy below is scoped to the row owner.

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  status text not null default 'received',
  payload jsonb not null,
  screenshot_path text,
  issue_number integer,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index feedback_reports_user_idx on public.feedback_reports (user_id, created_at desc);

alter table public.feedback_reports enable row level security;

create policy "owner can select" on public.feedback_reports
  for select to authenticated using (user_id = auth.uid());
create policy "owner can insert" on public.feedback_reports
  for insert to authenticated with check (user_id = auth.uid());
create policy "owner can update" on public.feedback_reports
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The route only ever changes these three columns after the insert.
revoke update on public.feedback_reports from authenticated;
grant update (status, issue_number, attempts) on public.feedback_reports to authenticated;

-- Private bucket for screenshots: files live under "<user id>/", only that user can read or write them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-screenshots', 'feedback-screenshots', false, 3145728, array['image/png'])
on conflict (id) do nothing;

create policy "owner can upload screenshots" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'feedback-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner can read screenshots" on storage.objects
  for select to authenticated
  using (bucket_id = 'feedback-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
