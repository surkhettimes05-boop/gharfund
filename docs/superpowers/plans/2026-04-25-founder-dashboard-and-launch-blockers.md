# Founder Dashboard And Launch Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make family share links use one consistent token source and add a founder-only `/founder` dashboard with database-backed access control.

**Architecture:** Keep `users.family_token` as the single family link token, update the family RPCs to resolve by `users.family_token`, and keep `family_views` only for per-worker view metrics. Add `users.is_founder`, founder-only summary/recent-activity RPCs, and a protected frontend route that reads the founder flag from session/profile data and renders a narrow operational dashboard.

**Tech Stack:** Vite, React, React Router, Supabase SQL/RPCs, Firebase Auth, local session storage, PostHog (non-blocking)

---

## File Map

### Database

- Modify: `db/schema.sql`
  - Add `users.is_founder`
  - Add helper functions for founder authorization
  - Rework family RPC lookup to resolve by `users.family_token`
  - Ensure `family_views` is read/created by `worker_id`
  - Add founder-only dashboard RPCs

### Frontend session/profile flow

- Modify: `src/screens/Auth.jsx`
  - Return `is_founder` in user upsert select
  - Persist `isFounder` in stored session
- Modify: `src/screens/Onboarding.jsx`
  - Return `is_founder` in post-onboarding select
  - Persist `isFounder` in stored session
- Modify: `src/services/userService.js`
  - Include `is_founder` in profile reads/updates
- Modify: `src/screens/Settings.jsx`
  - Refresh `isFounder` when profile is updated

### Frontend founder route/UI

- Modify: `src/routes/index.jsx`
  - Add founder-only route guard
  - Register `/founder`
- Modify: `src/components/BottomNav.jsx`
  - Show founder nav entry only for founders
- Create: `src/services/founderService.js`
  - Founder-only RPC callers
- Create: `src/screens/FounderDashboard.jsx`
  - Founder metrics UI

### Validation/docs

- Modify: `README.md`
  - Add `/founder` route mention and founder access note
- Modify: `RELEASE_NOTES.md`
  - Add founder dashboard to shipped features after implementation
- Modify: `LAUNCH_AUDIT.md`
  - Update blocker status if family token issue is fixed

---

### Task 1: Add Founder Access Column And Helper Functions

**Files:**
- Modify: `db/schema.sql`

- [ ] **Step 1: Add `is_founder` to `public.users`**

Add the column near the existing user preference fields:

```sql
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null,
  phone text not null,
  name text not null,
  working_location text not null,
  language_preference text not null default 'ne',
  family_token uuid not null default gen_random_uuid(),
  is_founder boolean not null default false,
  reminder_enabled boolean default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz,
```

Then add a safe migration statement later in the file so existing databases get the column:

```sql
alter table public.users
add column if not exists is_founder boolean not null default false;
```

- [ ] **Step 2: Add founder authorization helpers**

Add these functions after `public.is_user_owner`:

```sql
create or replace function public.get_current_user_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select u.id
  from public.users u
  where u.firebase_uid = (select public.current_firebase_uid())
  limit 1
$$;

create or replace function public.is_current_user_founder()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.firebase_uid = (select public.current_firebase_uid())
      and u.is_founder = true
  )
$$;
```

- [ ] **Step 3: Extend user selects to expose `is_founder`**

Anywhere the SQL or app-facing selects read the worker profile, make sure `is_founder` is included. The frontend session flow depends on it later.

- [ ] **Step 4: Review the users RLS policies for compatibility**

No new founder-specific policy is needed for normal worker reads if the existing owner policies remain. Keep worker RLS narrow and let founder dashboard use dedicated founder-only RPCs instead of broad table grants.

- [ ] **Step 5: Validate schema syntax manually**

Run:

```bash
rg -n "is_founder|get_current_user_id|is_current_user_founder" db/schema.sql
```

Expected:

- all three additions appear exactly once in the intended sections

- [ ] **Step 6: Commit**

```bash
git add db/schema.sql
git commit -m "feat: add founder access helpers"
```

---

### Task 2: Make `users.family_token` The Single Family Link Source

**Files:**
- Modify: `db/schema.sql`

- [ ] **Step 1: Add a helper that resolves a worker from `users.family_token`**

Add this helper before the family RPCs:

```sql
create or replace function public.resolve_family_worker(target_token uuid)
returns table (
  worker_id uuid,
  family_token uuid
)
language sql
stable
set search_path = public
as $$
  select u.id, u.family_token
  from public.users u
  where u.family_token = target_token
  limit 1
$$;
```

- [ ] **Step 2: Add a helper that ensures `family_views` exists for a worker**

Add this helper before the family RPCs:

```sql
create or replace function public.ensure_family_view_row(target_worker_id uuid)
returns public.family_views
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_row public.family_views;
begin
  insert into public.family_views (worker_id, token, view_count, last_viewed_at)
  values (target_worker_id, gen_random_uuid(), 0, null)
  on conflict (worker_id) do nothing;

  select fv.*
  into resolved_row
  from public.family_views fv
  where fv.worker_id = target_worker_id;

  return resolved_row;
end;
$$;
```

Note: the legacy `token` column remains populated only to satisfy the current table shape. Live lookup logic must stop relying on it.

- [ ] **Step 3: Rewrite `get_family_dashboard` to resolve by `users.family_token`**

Replace the current `target_family` / `resolved_family` token-based flow with worker-based resolution:

```sql
create or replace function public.get_family_dashboard(target_token uuid)
returns table (
  worker_id uuid,
  worker_name text,
  family_token uuid,
  view_count integer,
  last_viewed_at timestamptz,
  last_transfer_id uuid,
  last_transfer_amount_npr integer,
  last_transfer_date date,
  last_transfer_method text,
  last_transfer_acknowledged boolean,
  last_transfer_acknowledged_at timestamptz,
  active_goal_id uuid,
  active_goal_name text,
  active_goal_target_amount_npr integer,
  active_goal_saved_amount_npr bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_worker_id uuid;
begin
  select rfw.worker_id
  into resolved_worker_id
  from public.resolve_family_worker(target_token) rfw;

  if resolved_worker_id is null then
    return;
  end if;

  perform public.ensure_family_view_row(resolved_worker_id);

  update public.family_views fv
  set
    view_count = fv.view_count + 1,
    last_viewed_at = now()
  where fv.worker_id = resolved_worker_id;

  return query
  with family_metrics as (
    select fv.worker_id, fv.view_count, fv.last_viewed_at
    from public.family_views fv
    where fv.worker_id = resolved_worker_id
  ),
  latest_transfer as (
    select t.*
    from public.transfers t
    where t.user_id = resolved_worker_id
      and t.confirmed = true
    order by t.transfer_date desc, t.created_at desc
    limit 1
  ),
  active_goal as (
    select sg.*
    from public.savings_goals sg
    where sg.user_id = resolved_worker_id
      and sg.is_active = true
    order by sg.created_at desc
    limit 1
  ),
  goal_progress as (
    select coalesce(sum(se.amount_saved_npr), 0) as saved_amount
    from public.savings_entries se
    join active_goal ag on ag.id = se.goal_id
  )
  select
    u.id,
    u.name,
    u.family_token,
    fm.view_count,
    fm.last_viewed_at,
    lt.id,
    lt.amount_npr,
    lt.transfer_date,
    lt.method,
    lt.acknowledged_by_family,
    lt.acknowledged_at,
    ag.id,
    ag.goal_name,
    ag.target_amount_npr,
    gp.saved_amount
  from public.users u
  join family_metrics fm on fm.worker_id = u.id
  left join latest_transfer lt on true
  left join active_goal ag on true
  left join goal_progress gp on true
  where u.id = resolved_worker_id;
end;
$$;
```

- [ ] **Step 4: Rewrite `get_family_history`, `get_family_goal_detail`, and `acknowledge_family_transfer`**

Each function must start by resolving the worker with `public.resolve_family_worker(target_token)` instead of reading `family_views.token`.

Use this pattern at the top of each function:

```sql
select rfw.worker_id
into resolved_worker_id
from public.resolve_family_worker(target_token) rfw;

if resolved_worker_id is null then
  return;
end if;
```

Then:

- history queries `public.transfers` by `resolved_worker_id`
- goal detail queries `public.savings_goals` and `public.savings_entries` by `resolved_worker_id`
- acknowledge updates the latest confirmed transfer for `resolved_worker_id`
- acknowledge updates `family_views` by `worker_id = resolved_worker_id`

- [ ] **Step 5: Leave `family_token_matches_worker` and legacy `family_views.token` out of the live path**

Do not remove the old column in this slice. Just ensure no family dashboard/history/goal/acknowledgment logic depends on it.

- [ ] **Step 6: Validate the new family-token lookup references**

Run:

```bash
rg -n "resolve_family_worker|ensure_family_view_row|where fv.token = target_token|where fv.worker_id = resolved_worker_id" db/schema.sql
```

Expected:

- new helper functions are present
- family RPCs use `resolved_worker_id`
- no family RPC still depends on `where fv.token = target_token`

- [ ] **Step 7: Commit**

```bash
git add db/schema.sql
git commit -m "fix: align family routes with user family tokens"
```

---

### Task 3: Add Founder Dashboard RPCs

**Files:**
- Modify: `db/schema.sql`

- [ ] **Step 1: Add founder summary RPC**

Add this function after the family RPCs:

```sql
create or replace function public.get_founder_dashboard_summary()
returns table (
  total_users bigint,
  total_confirmed_transfers bigint,
  total_active_goals bigint,
  total_family_link_opens bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.users),
    (select count(*) from public.transfers where confirmed = true),
    (select count(*) from public.savings_goals where is_active = true),
    (select coalesce(sum(view_count), 0) from public.family_views)
  where (select public.is_current_user_founder()) = true
$$;
```

- [ ] **Step 2: Add recent users RPC**

```sql
create or replace function public.get_founder_recent_users()
returns table (
  user_id uuid,
  name text,
  phone text,
  working_location text,
  created_at timestamptz,
  last_active_at timestamptz,
  is_founder boolean
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.name,
    u.phone,
    u.working_location,
    u.created_at,
    u.last_active_at,
    u.is_founder
  from public.users u
  where (select public.is_current_user_founder()) = true
  order by u.created_at desc
  limit 10
$$;
```

- [ ] **Step 3: Add recent confirmed transfers RPC**

```sql
create or replace function public.get_founder_recent_transfers()
returns table (
  transfer_id uuid,
  user_id uuid,
  worker_name text,
  amount_npr integer,
  transfer_date date,
  method text,
  acknowledged_by_family boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.user_id,
    u.name,
    t.amount_npr,
    t.transfer_date,
    t.method,
    t.acknowledged_by_family,
    t.created_at
  from public.transfers t
  join public.users u on u.id = t.user_id
  where (select public.is_current_user_founder()) = true
    and t.confirmed = true
  order by t.transfer_date desc, t.created_at desc
  limit 10
$$;
```

- [ ] **Step 4: Grant execution only to authenticated users**

Add grants:

```sql
grant execute on function public.get_founder_dashboard_summary() to authenticated;
grant execute on function public.get_founder_recent_users() to authenticated;
grant execute on function public.get_founder_recent_transfers() to authenticated;
```

Do not grant founder RPCs to `anon`.

- [ ] **Step 5: Validate founder RPC references**

Run:

```bash
rg -n "get_founder_dashboard_summary|get_founder_recent_users|get_founder_recent_transfers|is_current_user_founder" db/schema.sql
```

Expected:

- all founder RPCs and helper appear
- only authenticated execution grants exist for founder RPCs

- [ ] **Step 6: Commit**

```bash
git add db/schema.sql
git commit -m "feat: add founder dashboard rpc queries"
```

---

### Task 4: Persist `isFounder` In Frontend Session Flow

**Files:**
- Modify: `src/screens/Auth.jsx`
- Modify: `src/screens/Onboarding.jsx`
- Modify: `src/services/userService.js`
- Modify: `src/screens/Settings.jsx`

- [ ] **Step 1: Extend the auth profile upsert select**

In `src/screens/Auth.jsx`, change:

```js
.select(
  'id, firebase_uid, phone, name, working_location, language_preference, family_token',
)
```

to:

```js
.select(
  'id, firebase_uid, phone, name, working_location, language_preference, family_token, is_founder',
)
```

Then add `isFounder` to the stored session:

```js
const session = {
  firebaseUid: userProfile.firebase_uid,
  phone: userProfile.phone,
  supabaseUserId: userProfile.id,
  name: userProfile.name,
  workingLocation: userProfile.working_location,
  languagePreference: userProfile.language_preference,
  familyToken: userProfile.family_token,
  isFounder: userProfile.is_founder,
  needsOnboarding:
    userProfile.name === 'SansarPay User' || userProfile.working_location === 'Other',
  signedInAt: new Date().toISOString(),
}
```

- [ ] **Step 2: Extend the onboarding update select**

In `src/screens/Onboarding.jsx`, change:

```js
.select('id, firebase_uid, phone, name, working_location, language_preference, family_token')
```

to:

```js
.select('id, firebase_uid, phone, name, working_location, language_preference, family_token, is_founder')
```

Then add this field into the stored session:

```js
isFounder: data.is_founder,
```

- [ ] **Step 3: Extend profile reads and updates in `userService`**

In `src/services/userService.js`, change both select lists to:

```js
'id, name, phone, working_location, language_preference, family_token, reminder_enabled, is_founder'
```

- [ ] **Step 4: Refresh `isFounder` in Settings session updates**

In `src/screens/Settings.jsx`, when building `nextSession`, add:

```js
isFounder: updatedProfile.is_founder,
```

- [ ] **Step 5: Validate the session field is wired everywhere**

Run:

```bash
rg -n "isFounder|is_founder" src/screens/Auth.jsx src/screens/Onboarding.jsx src/services/userService.js src/screens/Settings.jsx
```

Expected:

- both SQL select lists include `is_founder`
- session objects include `isFounder`

- [ ] **Step 6: Commit**

```bash
git add src/screens/Auth.jsx src/screens/Onboarding.jsx src/services/userService.js src/screens/Settings.jsx
git commit -m "feat: persist founder access in frontend session"
```

---

### Task 5: Add Founder Data Service And Protected Route

**Files:**
- Create: `src/services/founderService.js`
- Modify: `src/routes/index.jsx`

- [ ] **Step 1: Create the founder service**

Create `src/services/founderService.js`:

```js
import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  return supabase
}

export async function getFounderDashboardSummary() {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_founder_dashboard_summary')

  if (error) {
    throw error
  }

  return Array.isArray(data) ? data[0] || null : data
}

export async function getFounderRecentUsers() {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_founder_recent_users')

  if (error) {
    throw error
  }

  return data || []
}

export async function getFounderRecentTransfers() {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_founder_recent_transfers')

  if (error) {
    throw error
  }

  return data || []
}
```

- [ ] **Step 2: Add a founder route guard**

In `src/routes/index.jsx`, add:

```js
function FounderRoute({ children }) {
  const session = getStoredSession()

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  if (!session.isFounder) {
    return <Navigate to="/home" replace />
  }

  return children
}
```

- [ ] **Step 3: Register the founder screen import and route**

At the top of `src/routes/index.jsx`, add:

```js
import FounderDashboard from '../screens/FounderDashboard.jsx'
```

Then add this route inside the `AppLayout` protected section:

```jsx
<Route
  path="/founder"
  element={
    <FounderRoute>
      <FounderDashboard />
    </FounderRoute>
  }
/>
```

- [ ] **Step 4: Validate founder route wiring**

Run:

```bash
rg -n "FounderRoute|FounderDashboard|/founder" src/routes/index.jsx src/services/founderService.js
```

Expected:

- founder guard exists
- service file exists
- `/founder` route exists

- [ ] **Step 5: Commit**

```bash
git add src/services/founderService.js src/routes/index.jsx
git commit -m "feat: add founder-only route and data service"
```

---

### Task 6: Build The Founder Dashboard Screen

**Files:**
- Create: `src/screens/FounderDashboard.jsx`

- [ ] **Step 1: Create a loading/error-safe founder dashboard**

Create `src/screens/FounderDashboard.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import {
  getFounderDashboardSummary,
  getFounderRecentTransfers,
  getFounderRecentUsers,
} from '../services/founderService.js'
import { formatTransferDate } from '../utils/date.js'
import { formatNpr } from '../utils/money.js'

export default function FounderDashboard() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [recentTransfers, setRecentTransfers] = useState([])

  const loadDashboard = useCallback(async () => {
    try {
      setStatus('loading')
      setError('')

      const [summaryData, usersData, transfersData] = await Promise.all([
        getFounderDashboardSummary(),
        getFounderRecentUsers(),
        getFounderRecentTransfers(),
      ])

      setSummary(summaryData)
      setRecentUsers(usersData)
      setRecentTransfers(transfersData)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'Could not load founder dashboard.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadDashboard])

  if (status === 'loading') {
    return <LoadingState eyebrow="Founder" title="Loading founder dashboard..." />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="Founder"
        title="Founder dashboard unavailable."
        message={error}
        onRetry={loadDashboard}
        retryLabel="Reload founder dashboard"
      />
    )
  }

  return (
    <section className="app-panel" aria-labelledby="founder-title">
      <p className="eyebrow">Founder</p>
      <h1 id="founder-title">Beta dashboard</h1>

      <div className="dashboard-grid">
        <div className="summary-card">
          <p className="summary-line">Signed-up users</p>
          <p className="summary-line"><strong>{summary?.total_users ?? 0}</strong></p>
        </div>
        <div className="summary-card">
          <p className="summary-line">Confirmed transfers</p>
          <p className="summary-line"><strong>{summary?.total_confirmed_transfers ?? 0}</strong></p>
        </div>
        <div className="summary-card">
          <p className="summary-line">Active goals</p>
          <p className="summary-line"><strong>{summary?.total_active_goals ?? 0}</strong></p>
        </div>
        <div className="summary-card">
          <p className="summary-line">Family link opens</p>
          <p className="summary-line"><strong>{summary?.total_family_link_opens ?? 0}</strong></p>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Recent users</h2>
        {recentUsers.length ? (
          recentUsers.map((user) => (
            <div key={user.user_id} className="summary-card">
              <p className="summary-line"><strong>{user.name}</strong> · {user.working_location}</p>
              <p className="summary-line">{user.phone}</p>
            </div>
          ))
        ) : (
          <p className="form-note">No recent users yet.</p>
        )}
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Recent confirmed transfers</h2>
        {recentTransfers.length ? (
          recentTransfers.map((transfer) => (
            <div key={transfer.transfer_id} className="summary-card">
              <p className="summary-line">
                <strong>{transfer.worker_name}</strong> · {formatNpr(transfer.amount_npr)}
              </p>
              <p className="summary-line">
                {formatTransferDate(transfer.transfer_date)} · {transfer.method}
              </p>
            </div>
          ))
        ) : (
          <p className="form-note">No confirmed transfers yet.</p>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Keep the screen narrow**

Do not add charts, filters, mutation controls, or new analytics hooks in this slice.

- [ ] **Step 3: Validate the new screen exists**

Run:

```bash
rg -n "Beta dashboard|Recent users|Recent confirmed transfers" src/screens/FounderDashboard.jsx
```

Expected:

- all three sections appear in the screen file

- [ ] **Step 4: Commit**

```bash
git add src/screens/FounderDashboard.jsx
git commit -m "feat: add founder dashboard screen"
```

---

### Task 7: Add Founder Navigation Entry

**Files:**
- Modify: `src/components/BottomNav.jsx`

- [ ] **Step 1: Inspect the current bottom nav structure**

Before editing, open the file and identify the existing nav item list and the current session source.

Run:

```bash
Get-Content src\components\BottomNav.jsx
```

Expected:

- see current nav items and how route highlighting works

- [ ] **Step 2: Add a founder-only nav item using the existing pattern**

Use `getStoredSession()` if the component does not already have session context. Add the founder entry only when `session?.isFounder` is true.

The intended nav object shape should match the existing file. The new item should use:

```js
{
  to: '/founder',
  label: 'Founder',
}
```

- [ ] **Step 3: Validate the nav file wiring**

Run:

```bash
rg -n "Founder|isFounder|/founder" src/components/BottomNav.jsx
```

Expected:

- founder item only appears behind the founder session condition

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav.jsx
git commit -m "feat: add founder nav entry"
```

---

### Task 8: Update Handoff Docs After Implementation

**Files:**
- Modify: `README.md`
- Modify: `RELEASE_NOTES.md`
- Modify: `LAUNCH_AUDIT.md`

- [ ] **Step 1: Update README**

Add:

- `/founder` to the route or capability description
- founder dashboard mention in overview
- note that founder access is controlled by `users.is_founder`

- [ ] **Step 2: Update release notes**

Add founder dashboard to shipped features only after the code is complete and verified.

- [ ] **Step 3: Update launch audit**

If family token flow is fixed and verified, move that issue out of blockers and replace it with actual remaining launch risks only.

- [ ] **Step 4: Validate documentation mentions**

Run:

```bash
rg -n "/founder|is_founder|family token" README.md RELEASE_NOTES.md LAUNCH_AUDIT.md
```

Expected:

- docs reflect the new founder route and corrected family-token status

- [ ] **Step 5: Commit**

```bash
git add README.md RELEASE_NOTES.md LAUNCH_AUDIT.md
git commit -m "docs: update founder dashboard and launch status"
```

---

### Task 9: Final Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run lint**

Run:

```bash
npm run lint
```

Expected:

- PASS with no ESLint errors

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected:

- PASS and `dist/` updated

- [ ] **Step 3: Manual worker/family verification**

Verify:

1. sign in as a worker
2. copy family link from Settings or Home
3. confirm format is `VITE_APP_BASE_URL/family/<token>`
4. open family home/history/goal
5. acknowledge latest transfer
6. confirm acknowledgment and view count still behave correctly

- [ ] **Step 4: Manual founder verification**

Verify:

1. mark one user as founder in `public.users.is_founder`
2. sign in as that user
3. open `/founder`
4. confirm summary cards and recent sections load
5. sign in as a non-founder
6. confirm `/founder` redirects to `/home`

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: ship founder dashboard and family token fix"
```

