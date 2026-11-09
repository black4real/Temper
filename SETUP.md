# Ghost Mode web — setup (local)

Full production/deploy instructions come at the end of the build. This covers running it locally.

## 1. Create a Supabase project (free tier)
1. Go to https://supabase.com, create a new project (free tier is fine for the beta).
2. In the project's **SQL Editor**, paste and run `supabase/migrations/0001_init.sql`.
   This creates the tables, row-level security policies, the auto-profile trigger, and the
   private `recordings` storage bucket.
3. (Auth) In **Authentication → Providers**, keep **Email** enabled. For the personal beta you
   can turn **off** "Confirm email" (Authentication → Sign In / Providers) so you can sign in
   immediately; turn it back on before inviting others.

## 2. Configure environment
```bash
cp .env.example .env.local
```
Fill `.env.local` from **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon / public key

`.env.local` is gitignored. The service-role key is not needed for the beta; never commit it or
prefix it with `NEXT_PUBLIC`.

## 3. Run
```bash
npm install
npm run dev
```
Open http://localhost:3000. Without env vars the app still builds and runs, but auth-gated
routes won't function until Supabase is configured.

## 4. Checks
```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Costs (personal beta vs. later)
- **Free now:** Vercel Hobby + Supabase Free (500MB DB, 1GB file storage, monthly-active-user cap).
- **Custom domain:** ~$10–15/yr from a registrar; Vercel attaches it free.
- **If it grows / becomes commercial:** Vercel Pro (~$20/mo), Supabase Pro (~$25/mo).
