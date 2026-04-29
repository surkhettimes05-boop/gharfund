# SansarPay

SansarPay is a mobile-first React PWA for Nepali workers who send money home and want a simple way to track transfers, savings goals, and family trust updates.

The app is designed for a WhatsApp-first workflow:

- workers sign in with Nepal phone OTP
- log completed remittance transfers
- set a savings goal and monthly commitment
- share a family view link
- collect family acknowledgment and founder feedback on WhatsApp

## Project Overview

Current MVP scope:

- phone OTP sign-in with Firebase Auth
- Supabase-backed user profile, transfers, goals, savings entries, streaks, and family views
- mobile dashboard for workers
- public family routes for shared family updates
- optional PostHog analytics
- PWA manifest and service worker

This repo is the frontend app plus the main SQL schema used by the MVP.

Important current release note:

- the frontend builds and can be deployed
- beta launch is still blocked until the deployment base URL is set correctly and family token lookup is made consistent in the database flow

See:

- [LAUNCH_AUDIT.md](./LAUNCH_AUDIT.md)
- [RELEASE_NOTES.md](./RELEASE_NOTES.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)

## Tech Stack

- Vite
- React 19
- React Router
- Supabase JavaScript client
- Firebase Auth
- PostHog JS
- i18next / react-i18next
- ESLint

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create local environment file

Copy `.env.example` to `.env` and fill only safe frontend values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_APP_BASE_URL=
VITE_FOUNDER_WHATSAPP=
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
```

Rules:

- do not commit `.env`
- do not put Supabase `service_role` or Firebase admin secrets into frontend env vars
- set `VITE_APP_BASE_URL` to the final HTTPS domain for beta or production builds

### 3. Start the app

```bash
npm run dev
```

### 4. Create a production build locally

```bash
npm run build
```

### 5. Preview the production build

```bash
npm run preview
```

## Environment Variables

### Required

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_APP_BASE_URL`
- `VITE_FOUNDER_WHATSAPP`

### Optional

- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`

Behavior:

- Supabase client initialization is skipped if Supabase env vars are missing
- Firebase Auth initialization is skipped if Firebase env vars are missing
- PostHog stays disabled if `VITE_POSTHOG_KEY` is not set

## Deployment

SansarPay is a static Vite app.

### Vercel

- framework preset: `Vite`
- build command: `npm run build`
- output directory: `dist`
- SPA rewrites are defined in `vercel.json`

### Railway

- build command: `npm run build`
- start command: `npx serve -s dist -l $PORT`
- SPA fallback is handled by `serve -s`

### Deployment URL

There is no confirmed public beta URL stored in this repo.

For beta or production:

- set `VITE_APP_BASE_URL` to the final HTTPS domain
- rebuild and redeploy after changing it

Do not use:

```text
http://localhost:5173
```

for a release build.

More detail:

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)

## Supabase Setup

Use the SQL in [db/schema.sql](./db/schema.sql) as the base schema.

Checklist:

1. Create a Supabase project.
2. Apply `db/schema.sql`.
3. Confirm the public tables and RPCs exist.
4. Set frontend env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Confirm RLS policies match the Firebase token strategy used by this app.
6. Verify a real authenticated user can:
   - create a profile
   - log a transfer
   - create a goal
   - open family routes

Important:

- current launch audit found a family token mismatch risk between `users.family_token` and `family_views.token`
- resolve that before public beta

## Firebase Setup

Checklist:

1. Create a Firebase project.
2. Enable Phone Authentication.
3. Configure authorized domains for the app origin.
4. Fill these env vars:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
5. Test OTP send and verify on a real phone.
6. If using custom claims for Supabase role alignment, use:

```bash
npm run firebase:set-role -- --service-account="C:\path\service-account.json" --phone="+97798XXXXXXXX"
```

Do not expose Firebase admin credentials to the frontend.

## PostHog Setup

Checklist:

1. Create a PostHog project.
2. Set:
   - `VITE_POSTHOG_KEY`
   - `VITE_POSTHOG_HOST`
3. Build and run the app.
4. Confirm events appear without blocking user flows.

If PostHog is not configured, the app should still work.

## Testing

### Engineering checks

```bash
npm run lint
npm run build
```

### Manual QA

Use:

- [QA_CHECKLIST.md](./QA_CHECKLIST.md)
- [DEBUG_LOOP.md](./DEBUG_LOOP.md)

### Core routes to verify

- `/auth`
- `/onboarding`
- `/home`
- `/transfers`
- `/goals`
- `/goals/create`
- `/streak`
- `/settings`
- `/log-transfer`
- `/founder`
- `/family/:token`
- `/family/:token/history`
- `/family/:token/goal`

## Folder Structure

```text
src/
  components/        Reusable UI building blocks
  i18n/              Localization bootstrap
  lib/               External service clients and session helpers
  routes/            Route definitions and guards
  screens/           Route-level screens
  services/          Supabase-facing app data access
  utils/             Formatting, WhatsApp, analytics, and helper utilities

public/
  icons/             PWA icons
  manifest.json      PWA manifest
  sw.js              Service worker
  og-image.png       Social preview image
  favicon.ico        Favicon

db/
  schema.sql         Main Supabase schema and policies
  partner_queries.sql

scripts/
  set-firebase-role.mjs
```

## Common Errors

### `Missing Firebase config: VITE_FIREBASE_API_KEY, ...`

Cause:

- one or more Firebase env vars are missing

Check:

- `.env`
- deployment env settings
- in development, the browser console warns with the exact missing `VITE_FIREBASE_*` names

### `Supabase is not configured. Check VITE_SUPABASE_* values.`

Cause:

- `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing

Check:

- `.env`
- deployment env settings

### `Phone verified, but Supabase rejected the profile write`

Likely cause:

- RLS or authenticated role mismatch between Firebase token usage and Supabase policies

Check:

- `db/schema.sql`
- Firebase custom claims
- Supabase auth token flow

### Family link opens localhost or wrong URL

Likely cause:

- `VITE_APP_BASE_URL` is still set to localhost or not set correctly

Check:

- `.env`
- deployment env settings
- [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)

### Family link opens but shows no data

Likely cause:

- current schema/app mismatch between `users.family_token` and `family_views.token`

Check:

- [LAUNCH_AUDIT.md](./LAUNCH_AUDIT.md)
- `db/schema.sql`
- `src/utils/whatsapp.js`

## Founder / Developer Handoff

For beta handoff, use these docs together:

- [RELEASE_NOTES.md](./RELEASE_NOTES.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)
- [QA_CHECKLIST.md](./QA_CHECKLIST.md)
- [LAUNCH_AUDIT.md](./LAUNCH_AUDIT.md)
- [DEBUG_LOOP.md](./DEBUG_LOOP.md)
- [BETA_LAUNCH.md](./BETA_LAUNCH.md)
- [FIRST_10_USERS.md](./FIRST_10_USERS.md)
