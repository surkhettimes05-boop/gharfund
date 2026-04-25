# SansarPay MVP Release Notes

Release date: 2026-04-25

## Release Summary

SansarPay MVP is a mobile-first React PWA for Nepali workers who send money home and want a simple way to:

- sign in with phone OTP
- log transfers
- track a savings goal
- share a family view link
- send feedback to the founder on WhatsApp

This release package is intended for:

- developer handoff
- investor demo prep
- founder-run beta testing

## Build Status

Command run:

```bash
npm run build
```

Status:

- PASS

Build note:

- production build completed successfully and generated `dist/`

## Shipped Features

### Worker auth and onboarding

- Nepal phone OTP login with Firebase Auth
- onboarding flow for first name and working location
- guarded worker routes using stored session state

### Worker dashboard and money tracking

- home dashboard
- transfer logging flow with confirmation step
- transfer history screen
- streak screen
- savings goal creation
- savings goal detail and progress

### Family sharing

- public family routes:
  - `/family/:token`
  - `/family/:token/history`
  - `/family/:token/goal`
- family acknowledgment of latest transfer
- WhatsApp share links for family access

### Founder feedback and messaging

- founder feedback link in Settings
- founder dashboard at `/founder`
- feedback CTA after transfer logged
- feedback CTA after goal created
- feedback CTA after family acknowledgment
- WhatsApp prefilled founder feedback message

### Analytics and PWA

- optional PostHog analytics
- PWA manifest
- service worker
- social preview image and favicon

## Known Limitations

### Launch blockers

1. `VITE_APP_BASE_URL` must be changed from localhost to the real HTTPS deployment URL before beta release.
2. Family token lookup must be verified and fixed if needed because current audit found a likely mismatch between `users.family_token` and `family_views.token`.

### Product limitations

- PostHog is optional and may be disabled if `VITE_POSTHOG_KEY` is not set.
- WhatsApp previews are app-level, not token-specific per family route.
- OTP, WhatsApp open behavior, and family-link behavior still require real-device validation.
- This release does not include a backend feedback database or admin panel.

## Environment Variables

Use only frontend-safe `VITE_*` values.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_APP_BASE_URL=
VITE_FOUNDER_WHATSAPP=
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
```

Rules:

- do not commit real secrets
- do not expose Supabase `service_role`
- do not expose Firebase admin credentials
- do not ship a beta build with `VITE_APP_BASE_URL` set to localhost

## Deployment URL

Confirmed public beta URL: not recorded in this repo yet.

Release requirement:

- set `VITE_APP_BASE_URL` to the final HTTPS domain before shipping

Example:

```env
VITE_APP_BASE_URL=https://app.example.com
```

## Supabase Setup Checklist

1. Create the Supabase project.
2. Apply [db/schema.sql](./db/schema.sql).
3. Confirm tables exist:
   - `users`
   - `transfers`
   - `savings_goals`
   - `savings_entries`
   - `streaks`
   - `family_views`
   - `notifications_log`
4. Confirm the required RPCs exist:
   - `get_family_dashboard`
   - `get_family_history`
   - `get_family_goal_detail`
   - `acknowledge_family_transfer`
5. Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Confirm RLS behavior works with the Firebase token approach used by the frontend.
7. Confirm a real user can:
   - sign up
   - create a profile
   - log a transfer
   - create a goal
   - open a family route
8. Resolve the family token consistency issue before public beta.

## Firebase Setup Checklist

1. Create the Firebase project.
2. Enable Phone Authentication.
3. Add authorized domains for local and deployed app origins.
4. Set:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Test OTP send and verify on a real device.
6. If Supabase RLS depends on Firebase role claims, set the authenticated role for test users with:

```bash
npm run firebase:set-role -- --service-account="C:\path\service-account.json" --phone="+97798XXXXXXXX"
```

7. Re-test signup after role claim updates.

## PostHog Setup Checklist

1. Create a PostHog project.
2. Set:
   - `VITE_POSTHOG_KEY`
   - `VITE_POSTHOG_HOST`
3. Build and deploy the app.
4. Open the app and perform core actions.
5. Confirm events appear in PostHog.
6. Confirm analytics failures do not block product flows.

## Testing Checklist

Engineering checks:

- `npm run lint`
- `npm run build`

Manual checks:

- signup
- OTP
- onboarding
- home dashboard
- log transfer
- savings entry
- transfer history
- create goal
- goal detail
- streak
- settings
- feedback CTA
- family link
- family acknowledgment
- WhatsApp links
- offline banner
- mobile layout

Use:

- [QA_CHECKLIST.md](./QA_CHECKLIST.md)
- [DEBUG_LOOP.md](./DEBUG_LOOP.md)

## Release Recommendation

Current status:

- build-ready
- documentation-ready
- not yet safe for public beta

Ship beta only after:

1. `VITE_APP_BASE_URL` points to the final HTTPS domain
2. family token lookup is verified end to end
3. real-device OTP and WhatsApp checks pass
