# SansarPay Founder Dashboard And Launch Blockers Design

## Goal

Ship the remaining beta-critical product work in the right order:

1. remove the family-link token mismatch that blocks safe public beta
2. add a real founder-only dashboard inside the app

This spec covers the first implementation slice only. Real deployment/domain setup and real-device validation remain separate operational tracks after code changes are complete.

## Scope

In scope:

- make family link generation and family RPC lookup use one consistent token source
- preserve existing worker and family flows where possible
- add founder-only access in both app logic and database access
- add an in-app founder dashboard at `/founder`
- show narrow beta metrics and recent activity only

Out of scope:

- a full admin system
- write-heavy founder tools
- user impersonation
- CSV export
- notification systems
- deployment platform configuration
- live-device OTP and WhatsApp validation

## Current State

### Family link problem

The frontend currently shares `users.family_token`, but the public family RPCs resolve against `family_views.token` in `db/schema.sql`. There is no confirmed sync path in the repo that guarantees both values stay aligned for every user.

This creates a beta risk:

- the app can generate a link using one token source
- the public family pages can query a different token source

### Founder dashboard problem

There is no founder/admin screen in the app today. Founder operations are currently document-driven only.

## Design Summary

### Family token design

Use `users.family_token` as the single source of truth for family share links.

Reasoning:

- the frontend already reads and shares `users.family_token`
- removing duplicated token ownership is safer than trying to keep two token columns synchronized
- it reduces launch risk and simplifies reasoning

Implementation direction:

- update family-facing RPCs in `db/schema.sql` to resolve by `users.family_token`
- keep `family_views` as the analytics/state table for view counts and last-viewed timestamps, keyed by worker identity instead of owning the share token
- ensure family-view lookup can still update `family_views.view_count` and `family_views.last_viewed_at`
- ensure a `family_views` row exists per worker when needed, either by lazy creation inside the relevant function or by a safe trigger path

### Founder access design

Use a real founder role model, not a frontend-only hidden route.

Reasoning:

- founder data should not rely on route secrecy
- beta metrics are operationally sensitive enough to justify database-backed access control
- this keeps the app extensible if founder tooling grows later

Implementation direction:

- add a founder flag in app-readable user data
- restrict founder dashboard reads to founder users only
- prevent non-founder users from accessing founder metrics, even if they know the route

Recommended model:

- extend `public.users` with `is_founder boolean not null default false`
- founder-only RPCs check the current authenticated Firebase-backed user by existing ownership/auth functions and confirm `is_founder = true`
- no founder data is granted to `anon`

This is intentionally narrow and easy to audit.

## Founder Dashboard Scope

The first founder dashboard is operational, not analytical-heavy.

It should show:

- total signed-up users
- total confirmed transfers
- total active goals
- total family links opened
- recent users
- recent confirmed transfers

It should not show:

- detailed financial rollups beyond basic counts
- editing controls
- destructive actions
- anything requiring new backend services

## Data Flow

### Worker/family link flow

1. worker signs in
2. worker profile contains `users.family_token`
3. frontend builds `[VITE_APP_BASE_URL]/family/[token]`
4. public family route calls family RPC with the token
5. RPC resolves worker by `users.family_token`
6. RPC reads or creates the matching `family_views` row for metrics
7. RPC returns family dashboard/history/goal payload

### Founder dashboard flow

1. signed-in founder opens `/founder`
2. route guard confirms session exists
3. founder screen requests founder summary data from founder-only RPCs
4. RPC validates current user is founder
5. summary data returns to dashboard UI
6. non-founder users are redirected away and cannot read founder data

## Frontend Design

### Route

Add a new protected route:

- `/founder`

Behavior:

- no session: redirect to `/auth`
- non-founder session: redirect to `/home`
- founder session: render founder dashboard

### Session model

Current session storage already keeps core profile attributes. Extend it with:

- `isFounder`

This value must be populated during:

- signup/profile upsert return handling
- onboarding update return handling
- settings/profile refresh handling

### UI structure

Create one screen-level component for the founder dashboard with:

- summary cards row
- recent users section
- recent transfers section
- loading state
- error state

Keep styling consistent with the current app shell and panel patterns.

## Database Design

### Users table

Add:

- `is_founder boolean not null default false`

Purpose:

- single simple source for founder access

### Family views table

Keep:

- `worker_id`
- `view_count`
- `last_viewed_at`

Remove token ownership from the app contract.

The implementation may either:

- stop relying on `family_views.token` entirely in queries
- or leave the column in place temporarily but make all live lookup logic use `users.family_token`

Preferred direction:

- minimize schema churn that is unnecessary for beta
- switch live lookup logic first
- optionally keep the old token column unused until a later cleanup migration

### Founder data access

Add founder-only SQL functions, likely:

- one summary RPC for counts
- one recent users RPC
- one recent transfers RPC

Each function must:

- verify current user is founder
- run with controlled access
- return only the fields needed by the founder dashboard

## Error Handling

### Family routes

- invalid token returns clean empty/error behavior, not a crash
- missing family metrics row should be handled automatically
- family view count updates should not expose internal DB errors to the user more than necessary

### Founder dashboard

- non-founder users should be redirected rather than shown raw permission failures
- founder data request failures should show a clean retryable error state
- analytics must never block dashboard rendering

## Testing Strategy

### Code-level verification

- `npm run lint`
- `npm run build`

### Manual verification after code changes

#### Family token path

1. sign in as a worker
2. copy the family link from the app
3. confirm link format uses `VITE_APP_BASE_URL/family/<token>`
4. open family home
5. open family history
6. open family goal
7. acknowledge latest transfer
8. confirm view count and acknowledgment still behave correctly

#### Founder path

1. mark one user as founder
2. sign in as that founder
3. open `/founder`
4. confirm summary cards load
5. confirm recent users and transfers load
6. sign in as a non-founder
7. confirm `/founder` redirects away

## Risks And Tradeoffs

### Choosing `users.family_token` as source of truth

Upside:

- aligns with current frontend behavior
- simplest mental model

Tradeoff:

- requires careful RPC updates in `db/schema.sql`

### Choosing `is_founder` on `users`

Upside:

- simplest founder access model for beta
- easy to inspect and update

Tradeoff:

- not as flexible as a future multi-role permission system

This tradeoff is acceptable for MVP beta.

## Acceptance Criteria

This spec is complete when:

- family share links and family RPCs use one consistent token source
- family routes work end to end with that token source
- founder-only access exists in both app behavior and database reads
- `/founder` renders founder metrics for founder users
- non-founder users cannot access founder data
- lint passes
- build passes
