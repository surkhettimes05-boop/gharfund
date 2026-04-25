# SansarPay Launch Audit

Audit date: 2026-04-25

## Commands Run

```bash
npm install
npm run build
npm run lint
```

Results:
- `npm install`: passed
- `npm run build`: passed
- `npm run lint`: passed

## Launch Verdict

Public beta launch is **not safe yet**. The frontend builds successfully, but there are two blocking launch issues in the current runtime/config contract.

## Ready Items

- Build pipeline is healthy: `npm run build` completes successfully and outputs `dist/`.
- Lint passes with the current source tree.
- SPA routing is configured for deployment:
  - `vercel.json` rewrites browser routes to `index.html`
  - `railway.json` serves the app with `serve -s dist`
- App routing exists for:
  - `/auth`
  - `/onboarding`
  - `/home`
  - `/transfers`
  - `/goals`
  - `/goals/create`
  - `/settings`
  - `/streak`
  - `/log-transfer`
  - `/family/:token`
  - `/family/:token/history`
  - `/family/:token/goal`
- Supabase client initialization is fail-closed:
  - `src/lib/supabase.js` only creates a client when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
- Firebase auth initialization is fail-closed:
  - `src/lib/firebase.js` only initializes when Firebase env values are present.
- PostHog is optional by design:
  - `src/lib/posthog.js` no-ops when `VITE_POSTHOG_KEY` is missing.
- PWA essentials are present:
  - `public/manifest.json`
  - `public/sw.js`
  - app icons in `public/icons/`
- Frontend source scan did not reveal hardcoded secrets in tracked app code.
- Frontend source scan did not reveal tracked localhost URLs in shipped source code.

## Blocking Issues

### 1. `VITE_APP_BASE_URL` is currently set to localhost

Evidence:
- Local `.env` inspection shows `VITE_APP_BASE_URL` is set.
- Local `.env` inspection also shows that value matches `localhost` or `127.0.0.1`.
- Family-share and WhatsApp links are built from `VITE_APP_BASE_URL` in `src/utils/whatsapp.js`.

Impact:
- Public family links and WhatsApp share links will point users to a local machine URL instead of the real deployed domain.
- This breaks a core public-beta flow.

Exact fix:
- Set `VITE_APP_BASE_URL` in the deployment platform to the real public origin, for example:

```env
VITE_APP_BASE_URL=https://your-public-domain.example
```

- Rebuild after updating the environment variable.

### 2. Family share tokens are inconsistent between app code and database RPCs

Evidence:
- The app shares `users.family_token` from:
  - `src/screens/Auth.jsx`
  - `src/screens/Onboarding.jsx`
  - `src/screens/Home.jsx`
  - `src/screens/Settings.jsx`
  - `src/services/userService.js`
- Public family RPCs resolve by `public.family_views.token` in `db/schema.sql`:
  - `get_family_dashboard`
  - `get_family_history`
  - `get_family_goal_detail`
  - `acknowledge_family_transfer`
- I did not find any SQL trigger, seed, or app code that creates or syncs a `public.family_views` row from `users.family_token`.

Impact:
- The app can generate and share a family URL using `users.family_token`, while the public family pages query a different token source.
- On a clean deployment from `db/schema.sql`, shared family links are likely to fail or return empty results unless `family_views` is populated separately.

Exact fix:
- Make the token source consistent. Use one of these approaches:

Option A:
- Remove the separate `family_views.token` source.
- Update the family RPCs in `db/schema.sql` to resolve family access directly from `users.family_token`.

Option B:
- Keep `family_views.token`, but add a database trigger or explicit write path that guarantees every user has exactly one matching `family_views` row whose `token` equals `users.family_token`.
- Ensure that user creation and any token rotation keep both tables synchronized.

Minimum acceptance before launch:
- Create a new user in a clean environment.
- Copy the generated family link from Settings or Home.
- Open `/family/<token>` and confirm dashboard, history, and goal pages all resolve correctly.

## Non-Blocking Issues

- `VITE_POSTHOG_KEY` is currently missing in local `.env`. This does not break the app because analytics are optional, but beta analytics will be disabled unless you set it.
- `npm install` reports `10 vulnerabilities (2 low, 8 moderate)`. This did not block install/build, but it should be reviewed before wider rollout.
- `README.md` is still the default Vite template and does not describe the actual product or deployment flow.

## Search Notes

- Hardcoded secrets:
  - No hardcoded secrets found in tracked frontend/source files.
  - `.env` is gitignored, and this audit does not reproduce secret values.
- Fake/demo data:
  - No obvious fake demo dataset found in shipped source.
  - Default onboarding placeholder values such as `SansarPay User` are product placeholders, not seeded demo content.
- Localhost URLs:
  - No tracked shipped source files use localhost URLs.
  - The active local `.env` value for `VITE_APP_BASE_URL` is localhost and must not be used for public beta.
- Broken imports:
  - No broken imports detected; both build and lint pass.

## Beta Safety Summary

Current code quality is good enough to build and deploy, but **beta launch should wait** until:

1. `VITE_APP_BASE_URL` points to the real public domain.
