# SansarPay MVP QA Checklist

Use this checklist on a real Android phone in Chrome if possible. If you also test on desktop, treat desktop as backup only. The main goal is to catch launch-blocking issues before first users see the app.

## Launch Scorecard

Fill this section first during the final launch test.

- Tester name:
- Test date:
- Device:
- Android version:
- Chrome version:
- Network used:

Mark each item `PASS`, `FAIL`, or `NOT TESTED`.

| Area | Result | Notes |
|---|---|---|
| Signup |  |  |
| OTP |  |  |
| Onboarding |  |  |
| Home dashboard |  |  |
| Log transfer |  |  |
| Savings entry |  |  |
| Transfer history |  |  |
| Create goal |  |  |
| Goal detail |  |  |
| Streak |  |  |
| Settings |  |  |
| Family link |  |  |
| Family acknowledge |  |  |
| WhatsApp links |  |  |
| Offline banner |  |  |
| Mobile layout |  |  |

Launch recommendation:

- `GO`
- `GO WITH P1 ISSUES`
- `NO GO`

## Before You Start

- Test on Android Chrome first.
- Keep one phone number ready for OTP testing.
- Keep WhatsApp installed on the test phone.
- Keep the phone connected to mobile data first, then test offline behavior later.
- If possible, test both:
  - a brand-new user
  - a returning user with at least one transfer and one goal

## Smoke Test Data Checklist

Prepare or confirm this data before testing:

- Test Nepal mobile number in the format `98XXXXXXXX`
- OTP can be received on that phone
- Worker first name to use: `Ramesh`
- Working location to use: `Qatar`
- Transfer amount to use: `45000`
- Transfer saved amount to use: `5000`
- Transfer recipient to use: `Wife`
- Transfer method to use: `IME Pay`
- Goal type to use: `House`
- Goal target amount to use: `500000`
- Goal monthly commitment to use: `15000`
- One valid family link from Settings
- Founder WhatsApp env var set so the feedback link can open

## Test Order

Follow the app in this order. Do not skip ahead unless a step is impossible to complete.

### 1. Signup / Phone Entry

Steps:
- Open the app from a clean session.
- Confirm you land on the login screen.
- Enter an invalid Nepal number first.
- Confirm the app blocks progress and shows a helpful error.
- Enter a valid Nepal mobile number.
- Tap `Send OTP`.

What to look for:
- Phone field should accept digits only.
- The app should not accept random text.
- Error text should be understandable, not technical.
- `Send OTP` should not freeze forever.

### 2. OTP

Steps:
- Enter a wrong OTP first if safe to do so.
- Confirm the app shows a wrong-code message.
- Enter the correct 6-digit OTP.
- Confirm login completes.

What to look for:
- OTP field should accept digits only.
- Wrong OTP should not crash the app.
- Correct OTP should move the user forward.
- If reCAPTCHA or Firebase fails, the error should still be readable.

### 3. Onboarding

Steps:
- Confirm first-time users go to onboarding automatically.
- Enter a valid first name.
- Select a working location.
- Tap `Continue`.

What to look for:
- Name should save.
- Working location should save.
- User should not be sent back to onboarding again after success.
- Errors should be plain English.

### 4. Home Dashboard

Steps:
- Confirm the app opens the home dashboard after onboarding or login.
- Check the greeting, streak badge, family link share button, and transfer / goal cards.

What to look for:
- Dashboard should load without blank white screens.
- If there is no data yet, the empty guidance should make sense.
- If there is data, the cards should show real values.
- The dashboard should not overflow horizontally on mobile.

### 5. Log Transfer

Steps:
- Go to `Log Transfer`.
- Try leaving one required field empty.
- Confirm validation blocks the save.
- Enter:
  - Amount: `45000`
  - Recipient: `Wife`
  - Method: `IME Pay`
  - Date: today or a real past date
- Continue to confirmation.
- Save the transfer.

What to look for:
- Future date should be blocked.
- Amount should accept digits only.
- Confirmation screen should match exactly what was entered.
- Success should not duplicate the transfer.

### 6. Savings Entry

Steps:
- After transfer save, enter a savings amount such as `5000`.
- Save the savings entry.
- If no goal exists yet, confirm the app offers to create a goal.
- If a goal exists, confirm it returns to home cleanly.

What to look for:
- Savings should not save twice for one transfer.
- No-goal path should be understandable.
- Success messages should mention what happened.

### 7. Transfer History

Steps:
- Open `Transfers`.
- Confirm the new transfer appears.
- Check monthly grouping and totals.

What to look for:
- Latest transfer should appear in the correct month.
- Amount, method, date, and status should look correct.
- Empty state should only appear when there really are no transfers.

### 8. Create Goal

Steps:
- If no goal exists, go to `Set savings goal`.
- Enter:
  - Goal type: `House`
  - Target amount: `500000`
  - Monthly commitment: `15000`
- Continue and confirm the commitment.

What to look for:
- Required fields should validate.
- Estimated months should update when valid amounts are entered.
- Goal should save without duplicate records.

### 9. Goal Detail

Steps:
- Open `Goals`.
- Confirm the goal detail page loads.
- Check progress, monthly commitment comparison, chart, and edit modal.
- Edit the goal amounts and save once.

What to look for:
- Goal values should be realistic and consistent.
- Edit modal should open and close properly.
- Save should update the goal without breaking the page.
- If there is no goal, the empty state should guide the user to create one.

### 10. Streak

Steps:
- Open `Streak`.
- Check current streak, monthly calendar, consistency score, and reminder toggle.
- Toggle the reminder on and off.

What to look for:
- Screen should load without errors.
- Transfer history by month should match the real transfer data.
- Reminder toggle should save and stay in the new state after reload.

### 11. Settings

Steps:
- Open `Settings`.
- Check name, phone, working location, language, family link, reminder, feedback link, and sign out.
- Change the name once and save.
- Change the language once and save.
- Copy the family link.

What to look for:
- Phone field should be read-only.
- Save should show success feedback.
- Language choice should persist after reload.
- Copy link should show a clear status message.

### 12. Family Link

Steps:
- Copy the family link from Settings.
- Open it in Chrome on the same phone or a second phone.
- Confirm the family page loads.

What to look for:
- Link should open a working family page, not a 404.
- Family view should show worker name, latest transfer, and goal progress when data exists.
- Invalid token should show a clean error state.

### 13. Family Acknowledge

Steps:
- From the family page, tap the acknowledge button for the latest transfer.
- Refresh the page.

What to look for:
- Acknowledge should not crash.
- After success, the button should not allow duplicate acknowledgment.
- Refresh should keep the acknowledged state.

### 14. WhatsApp Links

Test all visible WhatsApp entry points:

- Home: `Share family view link`
- Transfer success: `Notify on WhatsApp`
- Goal detail: milestone share when visible
- Settings: founder feedback link
- Settings: family share link

What to look for:
- Link should open WhatsApp or WhatsApp Web cleanly.
- Message text should include the expected app link or summary.
- Broken or empty WhatsApp links are a trust issue.

### 15. Offline Banner

Steps:
- While the app is open, switch the phone to airplane mode.
- Wait a few seconds.
- Confirm the offline banner appears.
- Turn network back on.

What to look for:
- Banner should appear quickly.
- Banner should disappear after connection returns.
- App should not freeze just because the banner appears.

### 16. Mobile Layout

Steps:
- Check all core screens on Android Chrome:
  - Auth
  - Onboarding
  - Home
  - Log Transfer
  - Transfers
  - Goals
  - Streak
  - Settings
  - Family pages
- Check portrait mode first, then rotate once to landscape if practical.

What to look for:
- No horizontal scrolling.
- Buttons should stay tappable.
- Text should not overlap.
- Bottom nav should stay visible and usable.
- Modal dialogs should fit on screen.

## Known Failure Signs

Treat these as warning signs even if the app does not fully crash:

- White screen or blank panel that never recovers
- Spinner or loading skeleton that never ends
- OTP accepted but user does not move forward
- Same transfer saved twice
- Goal or transfer values do not match what was entered
- WhatsApp button opens a blank or malformed message
- Family link opens a 404 or wrong worker page
- Offline banner never clears after connection returns
- Mobile screen can be dragged sideways
- Sign out does not return to login
- Refreshing a route shows a 404 in production
- Errors show raw technical text that a worker would not understand

## Fix Priority

### P0 Blocks Launch

Fix before any real user testing:

- User cannot sign up or verify OTP
- Onboarding cannot complete
- Transfer cannot be logged
- Goal cannot be created when expected
- Family link is broken
- Direct route refresh gives 404 in production
- App crashes or shows blank screen on core flows

### P1 Harms Trust

Fix before wider rollout if possible:

- Wrong amounts, dates, or goal progress shown
- Duplicate save behavior
- Family acknowledge does not persist
- WhatsApp links open wrong text or wrong destination
- Settings changes do not persist
- Offline state is confusing or misleading

### P2 Polish

Can ship if the app is otherwise stable:

- Minor layout spacing issues
- Small text wrapping issues
- Slow but still successful loading
- Cosmetic copy problems
- Minor language or emoji inconsistencies

## Build Result

Run this before launch:

```bash
npm run build
```

Record result:

- Status: PASS
- Command: `npm run build -- --emptyOutDir`
- Date: 2026-04-25
- Notes:
  - Vite production build completed successfully.
  - Output directory was generated at `dist`.
  - Core output included `dist/index.html`, `dist/assets/index-Cx50GTqf.js`, and `dist/assets/index-ssyFuf_I.css`.

## Local Preview Smoke Result

This is the maximum practical smoke test from the terminal. It does not replace real phone testing.

- Status: PASS
- Preview routes checked:
  - `/`
  - `/auth`
  - `/onboarding`
  - `/home`
  - `/transfers`
  - `/goals`
  - `/goals/create`
  - `/streak`
  - `/settings`
  - `/log-transfer`
  - `/family/testtoken`
  - `/family/testtoken/history`
  - `/family/testtoken/goal`
  - `/manifest.json`
  - `/sw.js`
- Result: all returned `200` from the local production preview

## Deeper Engineering Smoke Findings

These came from local build, preview, config inspection, and lint. They should be reviewed before launch.

### Current Status

- Production build: PASS
- Local production preview routes: PASS
- Lint: PASS
- Env template completeness: PASS

### Findings

1. `npm run lint` passes as of `2026-04-25` after:
   - removing unused catch bindings in `public/sw.js`
   - switching family-screen load effects to lint-safe async wrappers

2. `.env.example` and `DEPLOYMENT.md` now include all frontend variables read by runtime code.

3. Runtime env usage confirmed in code:
   - Supabase:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Firebase:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
   - App/share:
     - `VITE_APP_BASE_URL`
     - `VITE_FOUNDER_WHATSAPP`
   - Analytics:
     - `VITE_POSTHOG_KEY`
     - `VITE_POSTHOG_HOST`

### Launch Read On These Findings

- Build-passing status means the app can still be previewed and manually tested.
- Lint-passing status means the codebase is clean for launch handoff on the current repo snapshot.
- Complete env template coverage reduces setup risk for another machine or deployment environment.

## Engineering-Side Risks Still Requiring Real Phone Testing

- OTP cannot be fully verified from this terminal because it needs a real phone and a real SMS.
- WhatsApp links need a real-device open test.
- Family pages need a real valid token to confirm live data and acknowledge behavior.
- Offline banner still needs a real Android network toggle test.
- Touch targets, keyboard behavior, and layout comfort still need a real phone pass.
