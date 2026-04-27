# gharfund – Deployment Guide

gharfund is a static Vite React PWA.  
All configuration is injected via `VITE_*` environment variables at **build time**.  
There are no server-side processes in the frontend bundle.

---

## Table of Contents

1. [Build](#build)
2. [Required Environment Variables](#required-environment-variables)
3. [Vercel – Step-by-step Setup](#vercel--step-by-step-setup)
4. [Railway – Alternative Hosting](#railway--alternative-hosting)
5. [Secrets Policy](#secrets-policy)
6. [Service Worker and Auth Safety](#service-worker-and-auth-safety)
7. [Deploy Checklist](#deploy-checklist)

---

## Build

```bash
npm run build
```

Output directory: `dist`

---

## Required Environment Variables

> **Why VITE_ prefix?**  
> Vite only exposes variables prefixed with `VITE_` to the browser bundle.  
> Any variable without this prefix is invisible to the frontend at runtime.

All variables below must be set in your hosting platform **before** deploying.

### Firebase (Phone OTP Auth) — all six are required

| Variable | Where to find it |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Your apps → SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | same as above |
| `VITE_FIREBASE_PROJECT_ID` | same as above |
| `VITE_FIREBASE_STORAGE_BUCKET` | same as above |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same as above |
| `VITE_FIREBASE_APP_ID` | same as above |

If **any** of these are missing the `/auth` page will display:

```
Firebase is not configured. Missing variables: VITE_FIREBASE_API_KEY, ...
```

The browser **console** will list every missing variable name (never their values).

### Supabase

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | same as above — use the `anon` / `public` key only |

### App

| Variable | Example |
|---|---|
| `VITE_APP_BASE_URL` | `https://gharfund.vercel.app` |
| `VITE_FOUNDER_WHATSAPP` | `+9779800000000` |

### Analytics (PostHog) — optional

| Variable | Default |
|---|---|
| `VITE_POSTHOG_KEY` | _(leave blank to disable)_ |
| `VITE_POSTHOG_HOST` | `https://app.posthog.com` |

---

## Vercel – Step-by-step Setup

### 1 — Import the repository

1. Go to **vercel.com** → **Add New Project**.
2. Import `surkhettimes05-boop/gharfund` from GitHub.
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### 2 — Add environment variables _(critical — do this before the first deploy)_

1. In the Vercel dashboard open your project.
2. Go to **Settings** → **Environment Variables**.
3. For each variable in the table above:
   - Click **Add New**.
   - Enter the **Name** exactly as shown (e.g. `VITE_FIREBASE_API_KEY`).
   - Paste the **Value** from Firebase Console / Supabase Dashboard.
   - Under **Environments** tick **Production**, **Preview**, and **Development**.
   - Click **Save**.
4. Repeat for all 12 variables.

> ⚠️ Variables added after a deployment is already live are **not** automatically picked up.  
> You must trigger a new deployment (step 3) after saving variables.

### 3 — Redeploy

After all variables are saved:

1. Open **Deployments** tab in your Vercel project.
2. Find the most recent deployment.
3. Click the **⋯** menu → **Redeploy**.
4. Wait for the build to complete (watch the build log for any `VITE_FIREBASE_*` errors).

### 4 — Verify

Open `https://gharfund.vercel.app/auth` in a **private/incognito** window.  
The error banner should be gone and the OTP input should be visible.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/auth` shows "Firebase is not configured" | One or more `VITE_FIREBASE_*` vars missing | Add all six in Vercel Settings → redeploy |
| Build log: `VITE_FIREBASE_API_KEY is not defined` | Variable not saved before build | Save → redeploy |
| OTP sends but Supabase write fails | `VITE_SUPABASE_*` wrong or RLS blocking | Verify anon key; check Supabase Firebase third-party auth |
| `/home` or `/family/<token>` returns 404 | SPA rewrite missing | Confirm `vercel.json` is present with the catch-all rewrite rule |

---

## Railway – Alternative Hosting

Railway supports config-as-code through `railway.json`.

Configured to:
- Build with `npm run build`
- Serve the built app with `npx serve -s dist -l $PORT`

The `-s` flag enables SPA fallback routing.  
Set all `VITE_*` variables in Railway **service settings** before deploying.

---

## Secrets Policy

- Do **not** commit `.env` or any file containing real secrets.
- Do **not** commit Firebase private/admin credentials.
- Do **not** expose Supabase `service_role` keys in `VITE_*` variables.
- Use `.env.example` as the template — it contains only placeholder names, never values.
- The `.gitignore` already excludes `.env` and `.env.*` (except `.env.example`).

---

## Service Worker and Auth Safety

- The frontend service worker caches only same-origin app shell and static assets.
- It does **not** cache Supabase auth-sensitive API responses.
- No Firebase Admin credentials are used in the frontend deployment configuration.

---

## Deploy Checklist

- [ ] Copy `.env.example` → `.env` locally and fill in values.
- [ ] Add all `VITE_*` variables in Vercel (Settings → Environment Variables).
- [ ] Tick Production + Preview + Development for each variable.
- [ ] Run `npm run build` locally to confirm no build errors.
- [ ] Trigger a Vercel redeploy after adding variables.
- [ ] Open `/auth` in a private window — confirm no Firebase error banner.
- [ ] Test phone OTP end-to-end.
- [ ] Verify direct routes (`/home`, `/family/<token>`) do not 404.
