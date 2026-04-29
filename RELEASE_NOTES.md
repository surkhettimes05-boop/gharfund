# SansarPay Release Notes

## v2.0 Production Release

**Release Date:** 2026-04-29  
**Status:** LIVE on Vercel  
**Merge:** `develop` → `main` (commit: 4877981)

### Release Summary

SansarPay v2 is a **major expansion** of the MVP with advanced remittance flows, credit scoring, affiliate referrals, admin approvals, and enhanced payment processing.

### Build Status

```bash
npm run build
```

Result: **PASS** ✓  
Output: `dist/` generated with code-split routes and optimized gzip compression.

### Branches Shipped

- `develop` (integration branch) merged into `main` (production)
- `feature/remittance-transactions` merged into `develop`

### Commits in Release

- 7bdbdeb: feat: Add notification service and update routes for remittance transactions
- ac3b9f3: feat: add admin withdrawal approval dashboard with approval workflow
- 7b1fb15: feat: add auto-save integration with remittance transfers
- eb0fa63: feat: add score display and affiliate dashboard with analytics
- aad350d: feat: add remittance transactions, vault, withdrawal, and referral systems with UI screens
- 0478aab: feat(payment): add payment abstraction layer with IME Pay and PrabhuPay mock providers

### Shipped in v2

#### Remittance Transactions

- `/log-transfer` upgraded with real payment flow
- Transfer preview with fee and FX calculations
- Payment method selection (IME Pay, PrabhuPay mock providers)
- Pending transfer status tracking
- Confirmed transfer history

#### Vault System

- `/vault` savings vault for micro-deposits
- Deposit requests with approval workflow
- Withdrawal requests and approval
- Vault balance tracking
- Vault history view

#### Credit Scoring

- `/score` SansarScore engine
- Rule-based scoring from transfer history
- Credit tier display
- Score breakdown and drivers
- Dynamic score updates

#### Affiliate Referral System

- `/referrals` affiliate dashboard
- Referral link generation and tracking
- Referral performance metrics
- Referral rewards and commissions tracking

#### Admin Withdrawals

- `/admin-withdrawals` withdrawal approval workflow
- Batch withdrawal processing
- Admin approval actions
- Withdrawal status tracking

#### Auto-Save Integration

- `/settings/auto-save` auto-save configuration
- Percentage-based auto-save on transfers
- Auto-save deposit automation
- Auto-save analytics

#### Enhanced Notifications

- Notification service for all system events
- Transfer completion notifications
- Withdrawal approvals/rejections
- Referral and reward notifications
- KYC status updates
- Goal milestone notifications

#### Payment Abstraction Layer

- `paymentService.js` unified payment interface
- IME Pay provider mock
- PrabhuPay provider mock
- Extensible provider architecture for real payment processing

#### Component Improvements

- `src/components/index.js` barrel exports for cleaner imports

---

## v1.0 MVP Release (2026-04-25)

### Shipped Features

#### Worker auth and onboarding

- Nepal phone OTP login with Firebase Auth
- Onboarding flow for first name and working location
- Guarded worker routes using stored session state

#### Worker dashboard and money tracking

- Home dashboard with transfer summary
- Transfer logging with confirmation step
- Transfer history screen
- Streak tracking screen
- Savings goal creation
- Savings goal detail and progress

#### Family sharing

- Public family routes:
  - `/family/:token`
  - `/family/:token/history`
  - `/family/:token/goal`
- Family acknowledgment of latest transfer
- WhatsApp share links for family access

#### Founder feedback and messaging

- Founder feedback link in Settings
- Founder dashboard at `/founder`
- Feedback CTAs throughout user flows
- WhatsApp prefilled founder feedback message

#### Analytics and PWA

- Optional PostHog analytics
- PWA manifest and service worker
- Social preview image and favicon

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

---

## Vercel Production Deployment Checklist

After pushing `main` to GitHub:

1. **Vercel Auto-Deploy**
   - Check Vercel dashboard for new deployment
   - Monitor build logs for success
   - Expected duration: 2-3 minutes

2. **Environment Variables**
   - Set all `VITE_*` variables in Vercel project settings
   - Trigger new deployment after env updates
   - Verify deployment completes successfully

3. **Post-Deployment Validation**
   - Visit `/auth` → verify phone input loads
   - Visit `/home` → verify auth guard redirects
   - Sign up with test phone number
   - Log a transfer
   - Create a savings goal
   - View settings and family link
   - Check browser console for errors
   - Verify all routes load without 404s

4. **Deployment URLs to Test**
   - `/auth` - Authentication screen
   - `/home` - Worker dashboard
   - `/transfers` - Transfer history
   - `/log-transfer` - Log new transfer
   - `/goals` - Savings goals
   - `/settings` - User settings
   - `/vault` - Vault (if enabled)
   - `/score` - Credit score (if enabled)
   - `/referrals` - Referral dashboard (if enabled)
   - `/family/test-token` - (Test with valid token if available)

---

## Rollback Plan

If production deployment fails:

1. Identify last stable commit on `main`:
   ```bash
   git log --oneline main | head -10
   ```

2. Revert the merge commit:
   ```bash
   git revert -m 1 4877981  # Revert v2 merge commit
   git push origin main
   ```

3. Vercel will auto-deploy the reverted version (approximately 3 minutes)

4. **Previous stable main commit:** `08a334d` (v1.0.0 tag)
