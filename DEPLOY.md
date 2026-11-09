# Ghost Mode — deploy guide (Vercel + Supabase)

This deploys the free personal beta. Nothing here publishes automatically — you run the final
step. Secrets stay server-side; only the public anon key and site URL reach the browser.

## Environment variables

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Public (RLS-protected). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Public anon key only. |
| `NEXT_PUBLIC_SITE_URL` | Your deployment | e.g. `https://ghost-mode.vercel.app` or a custom domain. Drives metadata, OG image, sitemap and the email-confirm redirect. |
| `ACCESS_CODE` | Your choice (server-only) | The invite code required on the signup form. **Server-only — never prefix with `NEXT_PUBLIC`.** If unset, all signups are blocked. Not committed to the repo. |

Never set a `service_role` key here — it is not needed, and it must never be exposed to the
browser or committed. `.env.local` is gitignored.

## 1. Supabase (one-time)
1. Create a project at https://supabase.com (Free tier).
2. SQL Editor → run `supabase/migrations/0001_init.sql` (tables, RLS, profile trigger, the
   private `recordings` bucket), then run `supabase/migrations/0002_custom_habits.sql` (the
   per-user `habits` table, RLS, default-commitments seed, and signup seeding). Run them in order.
3. **Authentication → URL Configuration:**
   - Site URL: your production URL (`NEXT_PUBLIC_SITE_URL`).
   - Redirect URLs: add `https://YOUR-DOMAIN/auth/confirm` (and `http://localhost:3000/auth/confirm`
     for local dev).
4. **Authentication → Providers → Email:** for a solo beta you may turn **off** "Confirm email"
   so you can sign in immediately. Turn it back on before inviting anyone else.

## 2. Vercel
1. Push this repo to GitHub (see "Git" below) and import it at https://vercel.com/new, **or** use
   the CLI: `npm i -g vercel && vercel` (then `vercel --prod` for production).
2. Framework preset: **Next.js** (auto-detected). Build command `next build`, output auto.
3. Project → Settings → Environment Variables: add the variables above for the
   **Production** (and Preview) environments, including `ACCESS_CODE` (signups are blocked until
   it's set). Set `NEXT_PUBLIC_SITE_URL` to the Vercel URL first;
   if you later add a custom domain, update it and redeploy.
4. Deploy. Vercel serves over HTTPS, which the PWA/service worker requires.

## 3. Verify after deploy
- Sign up / sign in works; refresh keeps you signed in; a second device syncs.
- Today toggles persist; Speaking records + saves (Chrome/Edge for live transcription);
  Analysis reflects changes.
- Installable: browser shows an install prompt (manifest + service worker + HTTPS).
- OG image renders at `/opengraph-image`.

## Local production build (optional sanity check)
```bash
npm run build
npm start
```

## Custom domain & costs
- **Free now:** Vercel Hobby + Supabase Free (500 MB DB, 1 GB storage, monthly-active-user cap).
  Hobby is for non-commercial use.
- **Custom domain:** ~$10–15/yr from a registrar; add it in Vercel (free) and point DNS. Then
  update `NEXT_PUBLIC_SITE_URL` and the Supabase Site/Redirect URLs, and redeploy.
- **If it grows / goes commercial:** Vercel Pro (~$20/mo), Supabase Pro (~$25/mo).

## Git
This folder is a git repo but nothing has been committed for you. When you're ready:
```bash
git add -A
git commit -m "Ghost Mode web app"
```
Then create a GitHub repo and push. `.env.local` and secrets are gitignored.

## Making it public later
The beta is set to **noindex**. To open it up: in `src/app/layout.tsx` set
`robots: { index: true, follow: true }`, and in `src/app/robots.ts` allow `/` (disallow
`/auth` and `/import`). Keep email confirmation **on** once others can sign up.
