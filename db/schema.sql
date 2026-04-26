-- SansarPay Supabase schema
-- Source: SansarPay_Execution.docx, Part 2: Database Schema

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_firebase_uid()
returns text
language sql
stable
set search_path = public
as $$
  select auth.jwt() ->> 'sub'
$$;

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
  sansar_score numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  last_active_at timestamptz,

  constraint users_phone_e164_check
    check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint users_name_length_check
    check (char_length(name) between 1 and 30),
  constraint users_working_location_check
    check (working_location in ('Qatar', 'UAE', 'Malaysia', 'Saudi Arabia', 'Other')),
  constraint users_language_preference_check
    check (language_preference in ('en', 'ne')),
  constraint users_firebase_uid_unique unique (firebase_uid),
  constraint users_phone_unique unique (phone),
  constraint users_family_token_unique unique (family_token)
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount_npr integer not null,
  transfer_date date not null,
  method text not null,
  recipient_type text not null,
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  receipt_url text,
  acknowledged_by_family boolean not null default false,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),

  constraint transfers_amount_npr_positive_check
    check (amount_npr > 0),
  constraint transfers_transfer_date_not_future_check
    check (transfer_date <= current_date),
  constraint transfers_method_check
    check (method in ('western_union', 'ime_pay', 'prabhu_pay', 'other')),
  constraint transfers_recipient_type_check
    check (recipient_type in ('wife', 'mother', 'father', 'other')),
  constraint transfers_confirmed_at_check
    check ((confirmed = false and confirmed_at is null) or (confirmed = true and confirmed_at is not null)),
  constraint transfers_acknowledged_at_check
    check (
      (acknowledged_by_family = false and acknowledged_at is null)
      or (acknowledged_by_family = true and acknowledged_at is not null)
    )
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_type text not null,
  goal_name text not null,
  target_amount_npr integer not null,
  monthly_commitment_npr integer not null,
  committed_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint savings_goals_goal_type_check
    check (goal_type in ('house', 'education', 'emergency', 'custom')),
  constraint savings_goals_goal_name_length_check
    check (char_length(goal_name) between 1 and 30),
  constraint savings_goals_target_amount_positive_check
    check (target_amount_npr > 0),
  constraint savings_goals_monthly_commitment_positive_check
    check (monthly_commitment_npr > 0)
);

create table if not exists public.savings_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  transfer_id uuid references public.transfers(id) on delete set null,
  amount_saved_npr integer not null,
  period_month date not null,
  created_at timestamptz not null default now(),

  constraint savings_entries_amount_saved_positive_check
    check (amount_saved_npr > 0),
  constraint savings_entries_period_month_first_day_check
    check (period_month = date_trunc('month', period_month)::date)
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  consistency_score numeric(5,2) not null default 0,
  last_transfer_month date,
  updated_at timestamptz not null default now(),

  constraint streaks_user_id_unique unique (user_id),
  constraint streaks_current_streak_nonnegative_check
    check (current_streak >= 0),
  constraint streaks_longest_streak_nonnegative_check
    check (longest_streak >= 0),
  constraint streaks_consistency_score_range_check
    check (consistency_score between 0 and 100),
  constraint streaks_last_transfer_month_first_day_check
    check (last_transfer_month is null or last_transfer_month = date_trunc('month', last_transfer_month)::date)
);

create table if not exists public.family_views (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete cascade,
  token uuid not null,
  view_count integer not null default 0,
  last_viewed_at timestamptz,

  constraint family_views_worker_id_unique unique (worker_id),
  constraint family_views_token_unique unique (token),
  constraint family_views_view_count_nonnegative_check
    check (view_count >= 0)
);

create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  channel text not null,
  sent_at timestamptz not null default now(),

  constraint notifications_log_type_check
    check (type in ('transfer_reminder', 'family_acknowledged', 'milestone_reached', 'streak_broken')),
  constraint notifications_log_channel_check
    check (channel in ('whatsapp_link', 'in_app'))
);

alter table public.users
add column if not exists is_founder boolean not null default false;

create unique index if not exists users_phone_idx
  on public.users(phone);

create unique index if not exists users_firebase_uid_idx
  on public.users(firebase_uid);

create unique index if not exists users_family_token_idx
  on public.users(family_token);

create index if not exists users_last_active_at_idx
  on public.users(last_active_at);

create index if not exists transfers_user_id_transfer_date_idx
  on public.transfers(user_id, transfer_date desc);

create index if not exists transfers_user_id_confirmed_transfer_date_idx
  on public.transfers(user_id, confirmed, transfer_date desc);

create index if not exists transfers_method_idx
  on public.transfers(method);

create index if not exists transfers_created_at_idx
  on public.transfers(created_at desc);

create index if not exists savings_goals_user_id_idx
  on public.savings_goals(user_id);

create unique index if not exists savings_goals_one_active_per_user_idx
  on public.savings_goals(user_id)
  where is_active = true;

create index if not exists savings_entries_user_id_period_month_idx
  on public.savings_entries(user_id, period_month desc);

create index if not exists savings_entries_goal_id_period_month_idx
  on public.savings_entries(goal_id, period_month desc);

create index if not exists savings_entries_transfer_id_idx
  on public.savings_entries(transfer_id);

create unique index if not exists streaks_user_id_idx
  on public.streaks(user_id);

create unique index if not exists family_views_worker_id_idx
  on public.family_views(worker_id);

create unique index if not exists family_views_token_idx
  on public.family_views(token);

create index if not exists notifications_log_user_id_sent_at_idx
  on public.notifications_log(user_id, sent_at desc);

create or replace function public.is_user_owner(target_user_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target_user_id
      and u.firebase_uid = (select public.current_firebase_uid())
  )
$$;

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
    where u.id = (select public.get_current_user_id())
      and u.is_founder = true
  )
$$;

create or replace function public.family_token_matches_worker(target_worker_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target_worker_id
      and u.family_token::text = coalesce(current_setting('request.jwt.claims', true)::json ->> 'family_token', '')
  )
$$;

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
  select u.id, u.family_token, 0, null
  from public.users u
  where u.id = target_worker_id
  on conflict (worker_id) do update
  set token = excluded.token;

  select fv.*
  into resolved_row
  from public.family_views fv
  where fv.worker_id = target_worker_id;

  return resolved_row;
end;
$$;

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

create or replace function public.get_family_history(target_token uuid)
returns table (
  worker_name text,
  transfer_id uuid,
  amount_npr integer,
  transfer_date date,
  method text,
  acknowledged_by_family boolean,
  acknowledged_at timestamptz
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

  return query
  select
    u.name as worker_name,
    t.id as transfer_id,
    t.amount_npr,
    t.transfer_date,
    t.method,
    t.acknowledged_by_family,
    t.acknowledged_at
  from public.users u
  join public.transfers t on t.user_id = u.id
  where u.id = resolved_worker_id
    and t.confirmed = true
  order by t.transfer_date desc, t.created_at desc;
end;
$$;

create or replace function public.get_family_goal_detail(target_token uuid)
returns table (
  worker_name text,
  goal_id uuid,
  goal_name text,
  goal_type text,
  target_amount_npr integer,
  monthly_commitment_npr integer,
  saved_amount_npr bigint,
  months_remaining integer
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

  return query
  with active_goal as (
    select sg.*
    from public.savings_goals sg
    where sg.user_id = resolved_worker_id
      and sg.is_active = true
    order by sg.created_at desc
    limit 1
  ),
  savings_totals as (
    select
      coalesce(sum(se.amount_saved_npr), 0) as saved_amount_npr
    from public.savings_entries se
    join active_goal ag on ag.id = se.goal_id
  ),
  monthly_savings as (
    select
      se.period_month,
      sum(se.amount_saved_npr) as monthly_saved
    from public.savings_entries se
    join active_goal ag on ag.id = se.goal_id
    group by se.period_month
  ),
  savings_pace as (
    select
      coalesce(round(avg(ms.monthly_saved))::integer, 0) as average_monthly_saved
    from monthly_savings ms
  )
  select
    u.name as worker_name,
    ag.id as goal_id,
    ag.goal_name,
    ag.goal_type,
    ag.target_amount_npr,
    ag.monthly_commitment_npr,
    st.saved_amount_npr,
    case
      when ag.id is null then null
      when greatest(coalesce(sp.average_monthly_saved, 0), ag.monthly_commitment_npr) <= 0 then null
      else ceil(
        greatest(ag.target_amount_npr - st.saved_amount_npr, 0)::numeric
        / greatest(coalesce(sp.average_monthly_saved, 0), ag.monthly_commitment_npr)
      )::integer
    end as months_remaining
  from public.users u
  left join active_goal ag on true
  left join savings_totals st on true
  left join savings_pace sp on true
  where u.id = resolved_worker_id;
end;
$$;

create or replace function public.acknowledge_family_transfer(target_token uuid)
returns table (
  transfer_id uuid,
  acknowledged_at timestamptz,
  view_count integer,
  last_viewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_worker_id uuid;
  resolved_transfer_id uuid;
  resolved_acknowledged_at timestamptz;
  updated_view_count integer;
  updated_last_viewed_at timestamptz;
begin
  select rfw.worker_id
  into resolved_worker_id
  from public.resolve_family_worker(target_token) rfw;

  if resolved_worker_id is null then
    return;
  end if;

  perform public.ensure_family_view_row(resolved_worker_id);

  update public.transfers t
  set
    acknowledged_by_family = true,
    acknowledged_at = now()
  where t.id = (
    select t2.id
    from public.transfers t2
    where t2.user_id = resolved_worker_id
      and t2.confirmed = true
    order by t2.transfer_date desc, t2.created_at desc
    limit 1
  )
  returning t.id, t.acknowledged_at
  into resolved_transfer_id, resolved_acknowledged_at;

  update public.family_views fv
  set
    view_count = fv.view_count + 1,
    last_viewed_at = now()
  where fv.worker_id = resolved_worker_id
  returning fv.view_count, fv.last_viewed_at
  into updated_view_count, updated_last_viewed_at;

  if resolved_transfer_id is null then
    return;
  end if;

  return query
  select
    resolved_transfer_id,
    resolved_acknowledged_at,
    updated_view_count,
    updated_last_viewed_at;
end;
$$;

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

drop trigger if exists set_streaks_updated_at on public.streaks;
create trigger set_streaks_updated_at
before update on public.streaks
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.transfers enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_entries enable row level security;
alter table public.streaks enable row level security;
alter table public.family_views enable row level security;
alter table public.notifications_log enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.transfers to authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
grant select, insert, update, delete on public.savings_entries to authenticated;
grant select, insert, update, delete on public.streaks to authenticated;
grant select, insert, update, delete on public.family_views to authenticated;
grant select, insert, update, delete on public.notifications_log to authenticated;
revoke execute on function public.get_founder_dashboard_summary() from PUBLIC;
revoke execute on function public.get_founder_dashboard_summary() from anon;
revoke execute on function public.get_founder_recent_users() from PUBLIC;
revoke execute on function public.get_founder_recent_users() from anon;
revoke execute on function public.get_founder_recent_transfers() from PUBLIC;
revoke execute on function public.get_founder_recent_transfers() from anon;
grant execute on function public.get_founder_dashboard_summary() to authenticated;
grant execute on function public.get_founder_recent_users() to authenticated;
grant execute on function public.get_founder_recent_transfers() to authenticated;
grant execute on function public.get_family_dashboard(uuid) to anon;
grant execute on function public.get_family_history(uuid) to anon;
grant execute on function public.get_family_goal_detail(uuid) to anon;
grant execute on function public.acknowledge_family_transfer(uuid) to anon;

drop policy if exists "Users can select own user row" on public.users;
create policy "Users can select own user row"
on public.users
for select
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and firebase_uid = (select public.current_firebase_uid())
);


drop policy if exists "Users can insert own user row" on public.users;
create policy "Users can insert own user row"
on public.users
for insert
to authenticated
with check (
  (select public.current_firebase_uid()) is not null
  and firebase_uid = (select public.current_firebase_uid())
);

drop policy if exists "Users can update own user row" on public.users;
create policy "Users can update own user row"
on public.users
for update
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and firebase_uid = (select public.current_firebase_uid())
)
with check (
  (select public.current_firebase_uid()) is not null
  and firebase_uid = (select public.current_firebase_uid())
);

drop policy if exists "Users can delete own user row" on public.users;
create policy "Users can delete own user row"
on public.users
for delete
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and firebase_uid = (select public.current_firebase_uid())
);

drop policy if exists "Users can select own transfers" on public.transfers;
create policy "Users can select own transfers"
on public.transfers
for select
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);


drop policy if exists "Users can insert own transfers" on public.transfers;
create policy "Users can insert own transfers"
on public.transfers
for insert
to authenticated
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can update own transfers" on public.transfers;
create policy "Users can update own transfers"
on public.transfers
for update
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
)
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);


drop policy if exists "Users can delete own transfers" on public.transfers;
create policy "Users can delete own transfers"
on public.transfers
for delete
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can select own savings goals" on public.savings_goals;
create policy "Users can select own savings goals"
on public.savings_goals
for select
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);


drop policy if exists "Users can insert own savings goals" on public.savings_goals;
create policy "Users can insert own savings goals"
on public.savings_goals
for insert
to authenticated
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can update own savings goals" on public.savings_goals;
create policy "Users can update own savings goals"
on public.savings_goals
for update
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
)
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can delete own savings goals" on public.savings_goals;
create policy "Users can delete own savings goals"
on public.savings_goals
for delete
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can select own savings entries" on public.savings_entries;
create policy "Users can select own savings entries"
on public.savings_entries
for select
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can insert own savings entries" on public.savings_entries;
create policy "Users can insert own savings entries"
on public.savings_entries
for insert
to authenticated
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can update own savings entries" on public.savings_entries;
create policy "Users can update own savings entries"
on public.savings_entries
for update
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
)
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can delete own savings entries" on public.savings_entries;
create policy "Users can delete own savings entries"
on public.savings_entries
for delete
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can select own streaks" on public.streaks;
create policy "Users can select own streaks"
on public.streaks
for select
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can insert own streaks" on public.streaks;
create policy "Users can insert own streaks"
on public.streaks
for insert
to authenticated
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can update own streaks" on public.streaks;
create policy "Users can update own streaks"
on public.streaks
for update
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
)
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can delete own streaks" on public.streaks;
create policy "Users can delete own streaks"
on public.streaks
for delete
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can select own family views" on public.family_views;
create policy "Users can select own family views"
on public.family_views
for select
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(worker_id)) is true
);


drop policy if exists "Users can insert own family views" on public.family_views;
create policy "Users can insert own family views"
on public.family_views
for insert
to authenticated
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(worker_id)) is true
);

drop policy if exists "Users can update own family views" on public.family_views;
create policy "Users can update own family views"
on public.family_views
for update
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(worker_id)) is true
)
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(worker_id)) is true
);


drop policy if exists "Users can delete own family views" on public.family_views;
create policy "Users can delete own family views"
on public.family_views
for delete
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(worker_id)) is true
);

drop policy if exists "Users can select own notifications" on public.notifications_log;
create policy "Users can select own notifications"
on public.notifications_log
for select
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can insert own notifications" on public.notifications_log;
create policy "Users can insert own notifications"
on public.notifications_log
for insert
to authenticated
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can update own notifications" on public.notifications_log;
create policy "Users can update own notifications"
on public.notifications_log
for update
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
)
with check (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

drop policy if exists "Users can delete own notifications" on public.notifications_log;
create policy "Users can delete own notifications"
on public.notifications_log
for delete
to authenticated
using (
  (select public.current_firebase_uid()) is not null
  and (select public.is_user_owner(user_id)) is true
);

do $$
begin
  alter publication supabase_realtime add table public.transfers;
exception
  when duplicate_object then null;
end;
$$;


