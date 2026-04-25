-- SansarPay partner-ready SQL queries
-- These queries are read-only and use only the current public schema.

-- 1) IME Pay pitch:
-- Confirmed transfer usage and total confirmed NPR volume by transfer method.
select
  t.method,
  count(*) as confirmed_transfer_count,
  sum(t.amount_npr) as total_npr_amount
from public.transfers t
where t.confirmed = true
group by t.method
order by total_npr_amount desc, confirmed_transfer_count desc;


-- 2) MFI pitch:
-- For each user with an active goal, show monthly commitment, actual saved amount
-- for the current month, consistency score, and the current-month commitment gap.
with current_month as (
  select date_trunc('month', current_date)::date as period_month
),
current_month_savings as (
  select
    se.goal_id,
    sum(se.amount_saved_npr) as actual_saved_amount_npr
  from public.savings_entries se
  join current_month cm on cm.period_month = se.period_month
  group by se.goal_id
)
select
  sg.user_id,
  sg.monthly_commitment_npr,
  coalesce(cms.actual_saved_amount_npr, 0) as actual_saved_amount_npr,
  coalesce(st.consistency_score, 0) as consistency_score,
  sg.monthly_commitment_npr - coalesce(cms.actual_saved_amount_npr, 0) as commitment_gap_npr
from public.savings_goals sg
left join current_month_savings cms on cms.goal_id = sg.id
left join public.streaks st on st.user_id = sg.user_id
where sg.is_active = true
order by consistency_score desc, commitment_gap_npr asc, sg.user_id;


-- 3a) Retention:
-- Active users in the last 30 days based on users.last_active_at.
select
  count(*) as active_users_last_30_days
from public.users u
where u.last_active_at >= now() - interval '30 days';


-- 3b) Retention:
-- Users who logged a confirmed transfer in both week 1 and week 4 of the current month.
with month_window as (
  select
    date_trunc('month', current_date)::date as month_start,
    (date_trunc('month', current_date)::date + interval '6 days')::date as week_1_end,
    (date_trunc('month', current_date)::date + interval '21 days')::date as week_4_start,
    (date_trunc('month', current_date)::date + interval '1 month - 1 day')::date as month_end
),
week_flags as (
  select
    t.user_id,
    bool_or(t.transfer_date between mw.month_start and mw.week_1_end) as has_week_1_transfer,
    bool_or(t.transfer_date between mw.week_4_start and mw.month_end) as has_week_4_transfer
  from public.transfers t
  cross join month_window mw
  where t.confirmed = true
    and t.transfer_date between mw.month_start and mw.month_end
  group by t.user_id
)
select
  wf.user_id
from week_flags wf
where wf.has_week_1_transfer = true
  and wf.has_week_4_transfer = true
order by wf.user_id;


-- 3c) Retention:
-- Transfer repeat rate across all confirmed-transfer users.
-- Definition: users with 2+ confirmed transfers / users with 1+ confirmed transfers.
with user_transfer_counts as (
  select
    t.user_id,
    count(*) as confirmed_transfer_count
  from public.transfers t
  where t.confirmed = true
  group by t.user_id
)
select
  count(*) filter (where utc.confirmed_transfer_count >= 2) as repeat_transfer_users,
  count(*) as transfer_users,
  case
    when count(*) = 0 then 0
    else round(
      100.0 * count(*) filter (where utc.confirmed_transfer_count >= 2) / count(*),
      2
    )
  end as transfer_repeat_rate_pct
from user_transfer_counts utc;


-- 4) Family trust:
-- Per worker, show family view count, acknowledged confirmed transfer count,
-- and acknowledgment rate across confirmed transfers.
select
  fv.worker_id,
  fv.view_count as family_view_count,
  count(*) filter (where t.confirmed = true and t.acknowledged_by_family = true) as acknowledged_transfer_count,
  count(*) filter (where t.confirmed = true) as confirmed_transfer_count,
  case
    when count(*) filter (where t.confirmed = true) = 0 then 0
    else round(
      100.0
      * count(*) filter (where t.confirmed = true and t.acknowledged_by_family = true)
      / count(*) filter (where t.confirmed = true),
      2
    )
  end as acknowledgment_rate_pct
from public.family_views fv
left join public.transfers t on t.user_id = fv.worker_id
group by fv.worker_id, fv.view_count
order by acknowledgment_rate_pct desc, family_view_count desc, fv.worker_id;


-- 5) Corridor data:
-- Confirmed transfer volume by working location.
select
  u.working_location,
  count(*) as total_transfers,
  sum(t.amount_npr) as total_npr_volume,
  round(avg(t.amount_npr), 2) as average_transfer_amount_npr
from public.transfers t
join public.users u on u.id = t.user_id
where t.confirmed = true
group by u.working_location
order by total_npr_volume desc, total_transfers desc;
