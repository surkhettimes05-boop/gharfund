import { supabase } from '../lib/supabase.js'
import { getActiveSavingsGoalRecord } from './goalService.js'
import { getMonthStart } from '../utils/date.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  return supabase
}

function getMonthKey(dateInput) {
  return dateInput.slice(0, 7)
}

function shiftMonth(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function getSavingsEntriesForGoal(goalId) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('savings_entries')
    .select('id, amount_saved_npr, period_month, created_at')
    .eq('goal_id', goalId)
    .order('period_month', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

export async function createSavingsEntryForTransfer({
  userId,
  transferId,
  transferDate,
  amountSavedNpr,
}) {
  const client = getSupabaseRequired()
  const activeGoal = await getActiveSavingsGoalRecord(userId)

  if (!activeGoal) {
    return { status: 'no_goal' }
  }

  const { data: existingEntry, error: existingEntryError } = await client
    .from('savings_entries')
    .select('id')
    .eq('transfer_id', transferId)
    .limit(1)
    .maybeSingle()

  if (existingEntryError) {
    throw existingEntryError
  }

  if (existingEntry?.id) {
    return { status: 'duplicate', entryId: existingEntry.id, goalId: activeGoal.id }
  }

  const { data: entry, error: entryError } = await client
    .from('savings_entries')
    .insert({
      user_id: userId,
      goal_id: activeGoal.id,
      transfer_id: transferId,
      amount_saved_npr: amountSavedNpr,
      period_month: getMonthStart(transferDate),
    })
    .select('id, goal_id')
    .single()

  if (entryError) {
    throw entryError
  }

  return { status: 'saved', entryId: entry.id, goalId: entry.goal_id }
}

export function calculateSavingsDetail(goal, savingsEntries) {
  const totalSaved = savingsEntries.reduce(
    (sum, entry) => sum + entry.amount_saved_npr,
    0,
  )

  const progressPercent =
    goal.target_amount_npr > 0
      ? Math.min(100, Math.round((totalSaved / goal.target_amount_npr) * 100))
      : 0

  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const currentMonthActual = savingsEntries
    .filter((entry) => getMonthKey(entry.period_month) === currentMonthKey)
    .reduce((sum, entry) => sum + entry.amount_saved_npr, 0)

  const monthlyGroups = new Map()
  for (const entry of savingsEntries) {
    const monthKey = getMonthKey(entry.period_month)
    monthlyGroups.set(monthKey, (monthlyGroups.get(monthKey) || 0) + entry.amount_saved_npr)
  }

  const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
    const monthKey = shiftMonth(currentMonthKey, -(5 - index))
    return {
      monthKey,
      committed: goal.monthly_commitment_npr,
      actual: monthlyGroups.get(monthKey) || 0,
    }
  })

  const monthsWithSavings = Array.from(monthlyGroups.values()).filter((amount) => amount > 0)
  const averageActualMonthlyPace = monthsWithSavings.length
    ? Math.round(monthsWithSavings.reduce((sum, amount) => sum + amount, 0) / monthsWithSavings.length)
    : 0

  const remainingAmount = Math.max(goal.target_amount_npr - totalSaved, 0)
  const effectiveMonthlyPace =
    averageActualMonthlyPace > 0 ? averageActualMonthlyPace : goal.monthly_commitment_npr
  const monthsRemaining =
    effectiveMonthlyPace > 0 ? Math.ceil(remainingAmount / effectiveMonthlyPace) : null

  return {
    totalSaved,
    progressPercent,
    currentMonthCommitted: goal.monthly_commitment_npr,
    currentMonthActual,
    currentMonthDelta: currentMonthActual - goal.monthly_commitment_npr,
    averageActualMonthlyPace,
    monthsRemaining,
    sixMonthHistory: lastSixMonths,
  }
}
