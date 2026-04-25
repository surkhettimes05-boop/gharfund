# SansarPay Debug Loop

This file is a repeatable bug triage and Codex debugging workflow for SansarPay.

Use it when:

- something breaks
- a user reports an error
- a page does not load
- WhatsApp links fail
- auth or Supabase behavior looks wrong

Goal:

- classify the bug first
- isolate the smallest broken area
- ask Codex for a controlled fix
- validate the fix before moving on

## Core Rule

Fix the **smallest broken area only**.

Do not rewrite working features.
Do not guess.
Do not stack random fixes.
Preserve working code.

## Priority System

### P0 Launch Blocker

Use `P0` when:

- users cannot sign in
- app does not build
- core routes do not load
- production deploy is broken
- Supabase or Firebase configuration prevents use

Effect:

- stop all non-critical work
- debug immediately

### P1 Trust Blocker

Use `P1` when:

- transfer data is wrong
- savings goal data is wrong
- family link shows wrong information
- family acknowledgment does not work
- user actions appear saved but are not actually saved

Effect:

- fix quickly before more users are onboarded

### P2 UX Issue

Use `P2` when:

- a screen is confusing
- a button works but is hard to use
- feedback CTA is missing
- copy is unclear
- mobile flow feels broken but data is safe

Effect:

- fix after P0 and P1 issues

### P3 Polish

Use `P3` when:

- spacing is off
- labels need cleanup
- low-risk visual improvements are needed
- analytics naming can be improved without user impact

Effect:

- batch these later

## Bug Classes

Pick one main class first.
If needed, add one secondary class.

### `auth`

Use when:

- OTP does not send
- OTP verify fails
- login flow breaks
- session is missing

Common areas:

- `src/lib/firebase.js`
- `src/screens/Auth.jsx`
- Firebase project settings

### `env`

Use when:

- required env value is missing
- wrong domain is used
- app uses localhost in production
- optional integrations silently do not run

Common areas:

- `.env`
- `.env.example`
- deployment platform env settings
- `import.meta.env` usage

### `DB`

Use when:

- insert/update/select fails from Supabase
- table or RPC behavior is wrong
- data shape does not match UI expectations

Common areas:

- `db/schema.sql`
- service files in `src/services/`

### `RLS`

Use when:

- Supabase rejects a write
- query returns no rows unexpectedly
- auth looks valid but data access fails

Common areas:

- `db/schema.sql`
- `users`, `transfers`, `savings_goals`, `family_views`
- Firebase claim setup

### `routes`

Use when:

- screen refresh gives 404
- family link route fails
- direct route open fails on deployed app

Common areas:

- `src/routes/index.jsx`
- `vercel.json`
- `railway.json`

### `UI`

Use when:

- button does not respond
- form state is wrong
- success state is missing
- mobile screen flow breaks

Common areas:

- files in `src/screens/`
- shared UI components

### `WhatsApp`

Use when:

- share link is wrong
- founder feedback link does not open
- family link copies wrong URL
- WhatsApp prefilled message is wrong

Common areas:

- `src/utils/whatsapp.js`
- any screen that builds share links

### `deploy`

Use when:

- build passes locally but fails on Vercel/Railway
- domain does not resolve
- HTTPS is missing
- service worker or asset path breaks after deploy

Common areas:

- `DEPLOYMENT.md`
- `DOMAIN_SETUP.md`
- `vercel.json`
- `railway.json`

### `analytics`

Use when:

- PostHog events do not fire
- event names are wrong
- optional analytics breaks a user flow

Common areas:

- `src/lib/posthog.js`
- `src/utils/analytics.js`

## Debug Report Format

Copy this block and fill it before asking Codex to fix anything.

```text
Priority:
Module:
Error:
Class:
Secondary class:
Where seen:
Steps to reproduce:
Expected result:
Actual result:
Top causes:
1.
2.
3.
Root cause:
Fix steps:
1.
2.
3.
Codex debug prompt:
Validation:
1.
2.
3.
```

## How To Fill The Report

### `Priority`

Choose one:

- `P0`
- `P1`
- `P2`
- `P3`

### `Module`

Name the smallest area first.

Good examples:

- `Auth / OTP verify`
- `Settings / feedback link`
- `FamilyHome / acknowledge action`
- `CreateGoal / success step`

### `Error`

Paste the real error message, bad behavior, or screenshot text.

Bad:

- app broken

Good:

- `Firebase is not configured. Check VITE_FIREBASE_* values.`
- `new row violates row-level security policy`
- `family link opens blank page`

### `Class`

Pick the main bug class from the list above.

### `Top causes`

List only the most likely causes.
Do not list 10 guesses.

Good examples:

1. Required env value missing
2. Wrong Supabase policy for authenticated user
3. Wrong route rewrite in deployment config

### `Root cause`

Write this only after inspection.
If unknown, leave it as:

```text
Root cause: Not confirmed yet
```

### `Fix steps`

List the smallest safe changes only.

Good:

1. Update one env variable
2. Patch one service function
3. Re-run build

Bad:

1. Refactor auth system
2. Rewrite routing
3. Replace Supabase integration

### `Validation`

Validation must prove the bug is fixed.

Good examples:

1. `npm run build`
2. Open `/family/<token>`
3. Confirm WhatsApp link opens with correct prefilled text

## Ready-Made Codex Debug Prompt

Copy this prompt and paste your filled report under it.

```text
You are debugging SansarPay.

Rules:
- classify the bug first
- inspect code before deciding
- do not guess
- fix the smallest broken area only
- preserve working code
- do not rewrite unrelated features
- after the fix, run the right validation command

Task:
1. Read the debug report below.
2. Confirm the most likely bug class.
3. Identify the smallest broken area.
4. Find the root cause from the codebase.
5. Apply the smallest safe fix only.
6. Validate the fix with the correct command or reproduction step.
7. Report:
   - what existed
   - what changed
   - root cause
   - validation result

Debug report:
[PASTE REPORT HERE]
```

## Fast Debug Loop

Use this sequence every time:

1. Reproduce the bug once.
2. Classify it.
3. Set priority.
4. Fill the debug report.
5. Paste the report into the Codex debug prompt.
6. Let Codex inspect code and fix only the smallest broken area.
7. Run validation.
8. Re-test the original bug.
9. Stop if fixed.
10. If not fixed, create a new report using the new evidence.

Important:

- do not keep retrying the same failed guess
- do not combine 3 bugs into 1 report
- debug one issue at a time

## SansarPay-Specific Examples

### Example 1: OTP Not Received

```text
Priority: P0
Module: Auth / OTP send
Error: OTP not received after entering phone number
Class: auth
Secondary class: env
Where seen: Login screen
Steps to reproduce:
1. Open /auth
2. Enter Nepal mobile number
3. Tap Send OTP
Expected result: OTP is sent
Actual result: OTP does not arrive
Top causes:
1. Firebase config is missing
2. reCAPTCHA setup failed
3. Wrong phone number format
Root cause: Not confirmed yet
Fix steps:
1. Check VITE_FIREBASE_* values
2. Inspect Auth and firebase helpers
3. Validate OTP flow again
Codex debug prompt: Use ready-made prompt below
Validation:
1. Send OTP with a valid Nepal number
2. Confirm no config error is shown
3. Confirm OTP arrives
```

### Example 2: Supabase RLS Write Failure

```text
Priority: P1
Module: Auth / profile upsert
Error: Phone verified, but Supabase rejected the profile write
Class: RLS
Secondary class: DB
Where seen: Signup after OTP verify
Steps to reproduce:
1. Sign in with phone
2. Verify OTP
3. Wait for profile creation
Expected result: User profile is created
Actual result: Signup stops on error
Top causes:
1. Firebase authenticated claim missing
2. RLS policy does not match Firebase UID
3. Supabase client token is wrong
Root cause: Not confirmed yet
Fix steps:
1. Inspect auth token flow
2. Inspect users table RLS policy
3. Fix smallest mismatch only
Codex debug prompt: Use ready-made prompt below
Validation:
1. Complete OTP verify flow
2. Confirm user row is created
3. Confirm onboarding loads
```

### Example 3: Family Link Opens Wrong URL

```text
Priority: P1
Module: Settings / family link share
Error: Shared family link opens localhost or does not open
Class: WhatsApp
Secondary class: env
Where seen: Settings and Home share actions
Steps to reproduce:
1. Copy family link
2. Open shared link
Expected result: Link opens real deployed family route
Actual result: Link opens localhost or broken route
Top causes:
1. VITE_APP_BASE_URL is wrong
2. Link builder is not normalizing base URL
3. Deployment domain is not configured
Root cause: Not confirmed yet
Fix steps:
1. Inspect whatsapp helper
2. Inspect env value
3. Rebuild and test shared link
Codex debug prompt: Use ready-made prompt below
Validation:
1. Build app
2. Copy family link again
3. Confirm link format is https://your-domain/family/<token>
```

## Founder Rule For Safe Debugging

Before asking Codex to fix anything, ask:

1. What is the exact broken area?
2. What is still working?
3. What is the smallest safe fix?

If you cannot answer those three questions, do not start patching yet.
