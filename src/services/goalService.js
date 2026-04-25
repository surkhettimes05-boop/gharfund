import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  return supabase
}

export async function getActiveSavingsGoalRecord(userId) {
  const client = getSupabaseRequired()
  const { data: goal, error: goalError } = await client
    .from('savings_goals')
    .select(
      'id, goal_type, goal_name, target_amount_npr, monthly_commitment_npr, committed_at',
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (goalError) {
    throw goalError
  }

  return goal || null
}

export async function getActiveSavingsGoal(userId) {
  const client = getSupabaseRequired()
  const goal = await getActiveSavingsGoalRecord(userId)

  if (!goal) {
    return null
  }

  const { data: savingsEntries, error: savingsError } = await client
    .from('savings_entries')
    .select('amount_saved_npr')
    .eq('goal_id', goal.id)

  if (savingsError) {
    throw savingsError
  }

  const savedAmount = (savingsEntries || []).reduce(
    (total, entry) => total + entry.amount_saved_npr,
    0,
  )

  const progressPercent =
    goal.target_amount_npr > 0
      ? Math.min(100, Math.round((savedAmount / goal.target_amount_npr) * 100))
      : 0

  return {
    ...goal,
    saved_amount_npr: savedAmount,
    progress_percent: progressPercent,
  }
}

export async function createSavingsGoal(userId, goalInput) {
  const client = getSupabaseRequired()

  const { error: deactivateError } = await client
    .from('savings_goals')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (deactivateError) {
    throw deactivateError
  }

  const { data, error } = await client
    .from('savings_goals')
    .insert({
      user_id: userId,
      goal_type: goalInput.goal_type,
      goal_name: goalInput.goal_name,
      target_amount_npr: goalInput.target_amount_npr,
      monthly_commitment_npr: goalInput.monthly_commitment_npr,
      committed_at: new Date().toISOString(),
      is_active: true,
    })
    .select('id, goal_type, goal_name, target_amount_npr, monthly_commitment_npr, committed_at, is_active')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateSavingsGoal(goalId, updates) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('savings_goals')
    .update({
      target_amount_npr: updates.target_amount_npr,
      monthly_commitment_npr: updates.monthly_commitment_npr,
    })
    .eq('id', goalId)
    .select(
      'id, goal_type, goal_name, target_amount_npr, monthly_commitment_npr, committed_at',
    )
    .single()

  if (error) {
    throw error
  }

  return data
}
