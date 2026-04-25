# SansarPay Mobile Performance Design

**Date:** 2026-04-25

**Goal**

Optimize SansarPay for low-end Android devices and slow mobile networks without changing the app's routing behavior or adding heavy dependencies.

**Current State**

- `npm run build` succeeds, but Vite emits a large-chunk warning.
- The production bundle is concentrated in one main JavaScript chunk, increasing parse and execution cost on low-end phones.
- Route modules for family screens and `Streak` are eagerly imported in `src/routes/index.jsx`.
- `src/components/LoadingState.jsx` renders a minimal generic skeleton and does not provide route-aware loading structure.
- `public/` does not include a PWA manifest or app icons.
- `index.html` does not link a manifest or preload the required fonts.
- `src/index.css` is mobile-first, but it lacks explicit overflow protection and font fallbacks for Nepali copy.

**Constraints**

- No unnecessary animation libraries.
- Do not add heavy packages.
- Keep the app usable on Android Chrome.
- Do not break existing routing or session guards.

**Recommended Approach**

Use targeted route-level code splitting, small loading skeletons, and a lightweight PWA shell. Keep critical authenticated routes eager, defer non-critical screens, and add only minimal offline support needed for app shell and static assets.

**Architecture**

**Routing and code splitting**

- Keep `Auth`, `Onboarding`, `Home`, `Transfers`, `LogTransfer`, `CreateGoal`, `Settings`, and `NotFoundScreen` eager-loaded.
- Lazy-load these non-critical routes with `React.lazy` and `Suspense`:
  - `Goals`
  - `Streak`
  - `FamilyHome`
  - `FamilyHistory`
  - `FamilyGoal`
- Add route-specific loading fallbacks so navigation shows immediate structure instead of a blank shell.

**Loading states**

- Expand `src/components/LoadingState.jsx` to support a few small variants:
  - default card skeleton
  - dashboard-style skeleton
  - family-page skeleton
  - detail-list skeleton
- Reuse the same component for both lazy route fallbacks and async screen fetch states.
- Keep animations CSS-only and subtle to avoid extra runtime cost.

**PWA and offline**

- Add `public/manifest.json` with app name, theme colors, display mode, scope, start URL, and icon references.
- Add icon assets under `public/icons/` for Android install surfaces.
- Add a small service worker registered from `src/main.jsx`.
- Cache:
  - app shell files
  - built JS and CSS assets
  - manifest and icons
- Use a network-first strategy for navigation requests with offline fallback to the cached app shell.
- Use a cache-first strategy for versioned static assets.
- Avoid trying to cache Supabase API responses in the service worker.

**Fonts**

- Ensure `Inter` and `Noto Sans Devanagari` are loaded from Google Fonts with `preconnect`.
- Update the CSS font stack so Latin and Nepali text render consistently.
- Keep font requests limited to the weights already used by the UI.

**Mobile layout hardening**

- Add viewport-safe overflow rules at the document and app-shell levels.
- Review fixed-width and grid components for horizontal overflow risk.
- Preserve the current `390px` centered frame pattern while ensuring narrow devices do not scroll horizontally.

**Asset optimization**

- Prefer simple PWA icons and existing CSS/UI text over adding image-heavy assets.
- Keep icon files small and use standard sizes required by install prompts.
- Avoid introducing new runtime icon libraries.

**Verification**

- Run `npm run build` after changes and confirm chunk output improves.
- Run a local preview and manually inspect the main routes on a narrow viewport.
- Confirm no horizontal overflow on the app shell and family pages.
- Confirm the manifest is linked and the service worker registers.
- Lighthouse mobile score remains a target, but only a real Lighthouse run can prove `>85`.

**Files Expected To Change**

- `src/App.jsx`
- `src/main.jsx`
- `src/routes/index.jsx`
- `src/components/LoadingState.jsx`
- `src/index.css`
- `index.html`
- `public/manifest.json`
- `public/icons/*`
- `public/sw.js`

**Risks and Guardrails**

- Lazy-loading must not interfere with route guards or redirects.
- Service worker updates must not trap users on stale bundles; versioned cache names are required.
- External font loading must degrade gracefully if the network is slow or unavailable.
