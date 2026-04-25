# SansarPay Mobile Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce first-load cost and improve mobile resilience by code-splitting non-critical routes, adding better loading states, enabling installable offline PWA support, and hardening the layout for low-end Android devices.

**Architecture:** Keep the existing routing and session-guard structure intact, but move non-critical screens behind `React.lazy` and `Suspense` with route-aware skeleton fallbacks. Add a lightweight manifest and service worker without extra packages, update document/font loading, and tighten CSS to prevent horizontal overflow while preserving the current app-shell layout.

**Tech Stack:** React 19, React Router, Vite 8, CSS, native service worker APIs

---

## File Structure

- `src/routes/index.jsx`
  Owns route declarations, redirects, session guards, and route-level lazy loading boundaries.
- `src/components/LoadingState.jsx`
  Owns reusable skeleton fallbacks for lazy routes and async screen loading states.
- `src/index.css`
  Owns app-wide typography, loading skeleton styling, overflow guards, and route-shell layout refinements.
- `src/main.jsx`
  Owns app bootstrap and service worker registration.
- `src/App.jsx`
  Keeps the root app shell and error boundary; may only need a minimal update if preload or app-shell structure requires it.
- `index.html`
  Owns manifest linkage, theme metadata, font preconnect/preload, and PWA document hints.
- `public/manifest.json`
  Defines installability metadata.
- `public/sw.js`
  Owns offline shell/static asset caching.
- `public/icons/icon-192.png`
  Install icon asset.
- `public/icons/icon-512.png`
  Install icon asset.

### Task 1: Capture Build Baseline and Route Split Targets

**Files:**
- Modify: `docs/superpowers/plans/2026-04-25-mobile-performance.md`
- Inspect: `src/routes/index.jsx`
- Inspect: `src/screens/Goals.jsx`
- Inspect: `src/screens/Streak.jsx`
- Inspect: `src/screens/family/FamilyHome.jsx`
- Inspect: `src/screens/family/FamilyHistory.jsx`
- Inspect: `src/screens/family/FamilyGoal.jsx`

- [ ] **Step 1: Run the production build to record the current bundle baseline**

Run: `npm run build`
Expected: `vite build` succeeds and reports a large main chunk around `838 kB` minified with a chunk-size warning.

- [ ] **Step 2: Confirm the lazy-load candidates in the current router**

Read `src/routes/index.jsx` and verify these imports are currently eager:

```jsx
import FamilyGoal from '../screens/family/FamilyGoal.jsx'
import FamilyHistory from '../screens/family/FamilyHistory.jsx'
import FamilyHome from '../screens/family/FamilyHome.jsx'
import Goals from '../screens/Goals.jsx'
import Streak from '../screens/Streak.jsx'
```

Expected: all five targets are directly imported and rendered in routes today.

- [ ] **Step 3: Record the chosen split scope in the plan notes**

Document in the task log that only these routes will be lazy-loaded:

```text
/goals
/streak
/family/:token
/family/:token/history
/family/:token/goal
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-04-25-mobile-performance.md
git commit -m "docs: record mobile performance implementation plan"
```

### Task 2: Add Route-Level Lazy Loading With Safe Suspense Fallbacks

**Files:**
- Modify: `src/routes/index.jsx`
- Test: `src/routes/index.jsx`

- [ ] **Step 1: Write the failing test condition as a build-oriented route contract**

Use this target structure in `src/routes/index.jsx`:

```jsx
import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoadingState from '../components/LoadingState.jsx'
```

And define the lazy imports:

```jsx
const Goals = lazy(() => import('../screens/Goals.jsx'))
const Streak = lazy(() => import('../screens/Streak.jsx'))
const FamilyHome = lazy(() => import('../screens/family/FamilyHome.jsx'))
const FamilyHistory = lazy(() => import('../screens/family/FamilyHistory.jsx'))
const FamilyGoal = lazy(() => import('../screens/family/FamilyGoal.jsx'))
```

The failing condition is the absence of these boundaries in the current file.

- [ ] **Step 2: Run the build to verify the route-splitting contract is not implemented yet**

Run: `npm run build`
Expected: build still succeeds, but output still shows one oversized application chunk and no separate lazy route chunks for the target screens.

- [ ] **Step 3: Write the minimal implementation**

Wrap only the lazy route elements in `Suspense` with route-aware fallbacks:

```jsx
function DashboardRouteFallback({ eyebrow, title }) {
  return <LoadingState eyebrow={eyebrow} title={title} variant="dashboard" />
}

function FamilyRouteFallback() {
  return (
    <LoadingState
      eyebrow="परिवार"
      title="लोड हुँदैछ..."
      shell
      panelClassName="family-panel"
      variant="family"
    />
  )
}
```

Apply them like this:

```jsx
<Route
  path="/goals"
  element={
    <Suspense fallback={<DashboardRouteFallback eyebrow="Goals" title="Loading your goal..." />}>
      <Goals />
    </Suspense>
  }
/>
```

Use the same pattern for `Streak` and the three family routes. Keep the existing `SessionRoute`, `AuthRoute`, redirects, and non-target eager routes unchanged.

- [ ] **Step 4: Run the build to verify the route chunks are created**

Run: `npm run build`
Expected: build succeeds and Vite reports multiple route chunks instead of placing all screen code into the main application chunk.

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.jsx
git commit -m "perf: lazy load non-critical routes"
```

### Task 3: Upgrade LoadingState to Structured Skeleton Variants

**Files:**
- Modify: `src/components/LoadingState.jsx`
- Modify: `src/index.css`
- Test: `src/components/LoadingState.jsx`

- [ ] **Step 1: Write the failing component contract**

Update `LoadingState` to accept a `variant` prop:

```jsx
export default function LoadingState({
  eyebrow = 'SansarPay',
  title = 'Loading...',
  copy = '',
  shell = false,
  panelClassName = 'app-panel',
  variant = 'default',
}) {
```

The failing condition is that the current component only renders one generic `dashboard-skeleton` block and cannot represent route-specific loading structures.

- [ ] **Step 2: Run the build to verify the new API is not present yet**

Run: `npm run build`
Expected: build succeeds against the old component, confirming the new `variant` API still needs to be implemented.

- [ ] **Step 3: Write the minimal implementation**

Replace the single placeholder block with small structured skeleton layouts:

```jsx
function SkeletonBody({ variant }) {
  if (variant === 'family') {
    return (
      <div className="loading-stack" aria-hidden="true">
        <div className="loading-block loading-block-title" />
        <div className="loading-card loading-card-tall" />
        <div className="loading-card" />
        <div className="loading-actions">
          <div className="loading-pill" />
          <div className="loading-pill" />
        </div>
      </div>
    )
  }

  if (variant === 'detail-list') {
    return (
      <div className="loading-stack" aria-hidden="true">
        <div className="loading-block loading-block-title" />
        <div className="loading-card" />
        <div className="loading-card" />
        <div className="loading-card" />
      </div>
    )
  }

  return (
    <div className="loading-stack" aria-hidden="true">
      <div className="loading-block loading-block-title" />
      <div className="loading-grid">
        <div className="loading-card" />
        <div className="loading-card" />
        <div className="loading-card" />
      </div>
    </div>
  )
}
```

Render it from `LoadingState`:

```jsx
<SkeletonBody variant={variant} />
```

Add the matching CSS classes in `src/index.css` and keep the shimmer animation CSS-only.

- [ ] **Step 4: Run the build to verify the component compiles with the new fallback variants**

Run: `npm run build`
Expected: build succeeds and lazy route fallbacks can reference `variant="dashboard"`, `variant="family"`, and `variant="detail-list"`.

- [ ] **Step 5: Commit**

```bash
git add src/components/LoadingState.jsx src/index.css
git commit -m "feat: add structured loading skeletons"
```

### Task 4: Add Manifest, Icons, and Service Worker Registration

**Files:**
- Modify: `src/main.jsx`
- Modify: `index.html`
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Test: `src/main.jsx`

- [ ] **Step 1: Write the failing PWA contract**

The app should expose these document-level assets:

```html
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

And `src/main.jsx` should register the service worker only in production:

```jsx
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed', error)
    })
  })
}
```

The failing condition is that none of these files or links exist today.

- [ ] **Step 2: Run the build to verify the PWA contract is missing**

Run: `npm run build`
Expected: build succeeds, but there is still no `manifest.json` in `public`, no `sw.js`, and no service worker registration in the built app.

- [ ] **Step 3: Write the minimal implementation**

Create `public/manifest.json` with this shape:

```json
{
  "name": "SansarPay",
  "short_name": "SansarPay",
  "description": "Mobile-first remittance and savings tracker for migrant workers and families.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f7f8f4",
  "theme_color": "#1d6b4f",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Create `public/sw.js` with versioned caches and simple strategies:

```js
const STATIC_CACHE = 'sansarpay-static-v1'
const RUNTIME_CACHE = 'sansarpay-runtime-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']
```

Implement:
- install handler that precaches `APP_SHELL`
- activate handler that removes old `sansarpay-*` caches
- fetch handler with:
  - cache-first for requests under `/assets/`
  - network-first for navigation requests with cached shell fallback

Use small generated PNG icons rather than adding any package.

- [ ] **Step 4: Run the build to verify manifest and service worker assets are emitted**

Run: `npm run build`
Expected: build succeeds and `dist/` contains `manifest.json`, `sw.js`, and icon assets copied from `public/`.

- [ ] **Step 5: Commit**

```bash
git add src/main.jsx index.html public/manifest.json public/sw.js public/icons/icon-192.png public/icons/icon-512.png
git commit -m "feat: add offline-ready pwa shell"
```

### Task 5: Load Inter and Noto Sans Devanagari Correctly

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`
- Test: `index.html`

- [ ] **Step 1: Write the failing font contract**

The document head should include preconnects for Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap"
/>
```

The CSS root stack should prefer both fonts:

```css
font-family:
  "Inter",
  "Noto Sans Devanagari",
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

The failing condition is that the current document does not request either family explicitly.

- [ ] **Step 2: Run the build to verify the font-loading contract is still absent**

Run: `npm run build`
Expected: build succeeds with the existing HTML, confirming fonts still need explicit loading.

- [ ] **Step 3: Write the minimal implementation**

Add the font links to `index.html`, preserve existing metadata, and update `src/index.css` so global typography uses the combined stack above.

- [ ] **Step 4: Run the build to verify the font declarations compile cleanly**

Run: `npm run build`
Expected: build succeeds and the HTML head includes the new font links in `dist/index.html`.

- [ ] **Step 5: Commit**

```bash
git add index.html src/index.css
git commit -m "perf: load production fonts explicitly"
```

### Task 6: Harden the Layout Against Horizontal Overflow

**Files:**
- Modify: `src/index.css`
- Inspect: `src/components/AppLayout.jsx`
- Inspect: `src/components/BottomNav.jsx`
- Test: `src/index.css`

- [ ] **Step 1: Write the failing layout contract**

Add explicit document-level overflow protection:

```css
html,
body,
#root {
  width: 100%;
  overflow-x: clip;
}
```

And constrain layout children that can overflow:

```css
.app-layout-shell,
.app-layout-frame,
.app-layout-content,
.app-panel,
.hero-panel,
.auth-panel,
.family-panel {
  max-width: 100%;
}
```

The failing condition is that the current stylesheet relies on implicit width behavior and does not explicitly block horizontal scroll.

- [ ] **Step 2: Run the build to verify the current CSS still lacks overflow guardrails**

Run: `npm run build`
Expected: build succeeds, but the horizontal-overflow protection rules above are still absent.

- [ ] **Step 3: Write the minimal implementation**

Add the overflow rules above, then audit and patch any overflow-prone components with `min-width: 0` where needed, especially:

```css
.dashboard-header,
.transfer-row-main,
.toggle-row,
.goal-hero {
  min-width: 0;
}
```

Also ensure text-heavy content can wrap safely:

```css
.card-value,
.summary-line,
.lede {
  overflow-wrap: anywhere;
}
```

- [ ] **Step 4: Run the build to verify the CSS compiles and preview has no horizontal overflow**

Run: `npm run build`
Expected: build succeeds without CSS errors.

Run: `npm run preview -- --host 127.0.0.1 --port 4173`
Expected: local preview starts successfully so the implementer can manually verify no horizontal scroll on a narrow mobile viewport.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "fix: prevent mobile horizontal overflow"
```

### Task 7: Verify Bundle Improvement and Offline Shell Behavior

**Files:**
- Inspect: `dist/index.html`
- Inspect: `dist/assets/*`
- Inspect: `dist/manifest.json`
- Inspect: `dist/sw.js`

- [ ] **Step 1: Run the final production build**

Run: `npm run build`
Expected: build succeeds and the original single oversized chunk is reduced by route splitting.

- [ ] **Step 2: Check the emitted artifact list**

Run: `Get-ChildItem dist -Recurse | Select-Object FullName,Length`
Expected: output includes:
- `dist/index.html`
- `dist/manifest.json`
- `dist/sw.js`
- `dist/icons/icon-192.png`
- `dist/icons/icon-512.png`
- multiple `dist/assets/*.js` chunks

- [ ] **Step 3: Inspect the built HTML and service worker references**

Run: `Get-Content dist/index.html`
Expected: output contains:

```html
<link rel="manifest" href="/manifest.json">
```

And the built app still points to the compiled JS entry.

- [ ] **Step 4: Start preview and verify mobile-preview readiness**

Run: `npm run preview -- --host 127.0.0.1 --port 4173`
Expected: preview starts successfully for manual Android Chrome and DevTools mobile inspection.

- [ ] **Step 5: Record the outcome honestly**

Write a short verification note with:
- final chunk sizes from the build output
- whether offline shell files were emitted
- whether preview started
- that Lighthouse `>85` remains a target unless measured explicitly

- [ ] **Step 6: Commit**

```bash
git add src/routes/index.jsx src/components/LoadingState.jsx src/index.css src/main.jsx index.html public/manifest.json public/sw.js public/icons/icon-192.png public/icons/icon-512.png
git commit -m "perf: optimize mobile app shell and delivery"
```

## Self-Review

- Spec coverage:
  - lazy-loaded family screens, goal detail, and streak route: covered by Task 2
  - skeleton loading instead of blank loading: covered by Task 3
  - image/icon optimization: covered by Task 4
  - Inter and Noto Sans Devanagari loading: covered by Task 5
  - manifest and offline caching: covered by Task 4
  - horizontal overflow prevention: covered by Task 6
  - build pass, bundle audit, and mobile preview verification: covered by Tasks 1 and 7
- Placeholder scan:
  - no `TODO`, `TBD`, or unresolved placeholders remain
- Type consistency:
  - `variant` values used by the router match the values introduced in `LoadingState`
  - service worker file path and manifest file path match the document links and registration code
