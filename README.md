# udd-accept-next

Small notes app: Next.js (App Router) + Supabase auth.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Apply `supabase/migrations/0001_notes.sql` to your Supabase project.
Without the variables the app builds and shows a configuration message.
