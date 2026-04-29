# SansarPay Deployment

SansarPay is a static Vite React PWA.

## Build

Production build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Required Frontend Environment Variables

Use only public frontend-safe `VITE_*` variables.

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

## Secrets Policy

- Do not commit real secrets.
- Do not commit Firebase private credentials.
- Do not expose Supabase `service_role` keys.
- Do not put backend-only credentials into frontend `VITE_*` variables.
- Keep local `.env` files out of version control and use `.env.example` as the template.

## package.json Scripts

Confirmed scripts in `package.json`:

- `dev`: `vite`
- `build`: `vite build`
- `preview`: `vite preview`

## Vercel

Deploy this repo as a Vite static frontend.

Recommended Vercel settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

SPA fallback is configured in [vercel.json](./vercel.json) so browser-history routes resolve to `index.html` on refresh and direct entry.

Set the required `VITE_*` variables in the Vercel project settings before deploying.

## Railway

Railway supports config-as-code through `railway.json`.

This repo is configured to:

- Build with `npm run build`
- Serve the built app with `npx serve -s dist -l $PORT`

The `-s` flag enables SPA fallback routing to `index.html`, which is required for this React Router app.

Set the required `VITE_*` variables in Railway service settings before deploying.

## Fix Firebase on Vercel

1. Open Vercel.
2. Select the `gharfund` project.
3. Go to `Settings` -> `Environment Variables`.
4. Add all `VITE_FIREBASE_*` values:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
5. Apply each variable to `Production`, `Preview`, and `Development`.
6. Redeploy the latest production deployment.
7. Hard refresh the browser.

## Service Worker and Auth Safety

- The frontend service worker caches only same-origin app shell and static assets.
- It does not cache Supabase auth-sensitive API responses.
- No Firebase admin credentials are used in the frontend deployment configuration.

## Deploy Checklist

1. Copy `.env.example` values into platform environment variable settings.
2. Run `npm run build`.
3. Confirm `dist` is produced.
4. Deploy `dist` through Vercel or Railway using the included config.
5. Verify direct route loads such as `/home` and `/family/<token>` do not 404.
