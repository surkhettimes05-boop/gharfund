import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

/**
 * Calculate SansarScore based on user's transfer behavior
 * Score formula: (frequency_score + amount_score + duration_score + consistency_score) / 4
 * 
 * Components:
 * - frequency_score: months_active / 12 * 100 (up to 12 months = 100)
 * - amount_score: min(total_amount / 1000000, 1) * 100 (1M NPR = 100)
 * - duration_score: months_active / 12 * 100 (activity span)
 * - consistency_score: from streak calculation (0-100)
 */
export function calculateSansarScore(userData) {
  const {
    total_transfers = 0,
    total_amount_npr = 0,
    months_active = 0,
    consistency_score = 0,
    current_streak = 0,
  } = userData

  // Component 1: Transfer Frequency (0-100)
  // 5+ transfers per month = 100
  const transfersPerMonth = months_active > 0 ? total_transfers / months_active : 0
  const frequencyScore = Math.min((transfersPerMonth / 5) * 100, 100)

  // Component 2: Transfer Amount (0-100)
  // 1M NPR = 100
  const amountScore = Math.min((total_amount_npr / 1000000) * 100, 100)

  // Component 3: Duration (0-100)
  // 12 months of consistent activity = 100
  const durationScore = Math.min((months_active / 12) * 100, 100)

  // Component 4: Consistency (0-100)
  // Uses the streak calculation (already 0-100)
  const streakScore = consistency_score

  // Weighted average: equal weight on all components
  const baseScore = (frequencyScore + amountScore + durationScore + streakScore) / 4

  // Boost for active streaks (+15 points max for active streak)
  const streakBoost = Math.min(current_streak * 1.25, 15)

  // Final score capped at 100
  const finalScore = Math.min(baseScore + streakBoost, 100)

  return {
    score: Math.round(finalScore * 100) / 100,
    breakdown: {
      frequency: Math.round(frequencyScore * 100) / 100,
      amount: Math.round(amountScore * 100) / 100,
      duration: Math.round(durationScore * 100) / 100,
      consistency: Math.round(streakScore * 100) / 100,
      streakBoost: Math.round(streakBoost * 100) / 100,
    },
  }
}

/**
 * Get user stats for scoring
 */
export async function getUserStatsForScoring(userId) {
  const client = getSupabaseRequired()

  // Get all confirmed transfers
  const { data: transfers, error: transferError } = await client
    .from('transfers')
    .select('amount_npr, transfer_date, confirmed')
    .eq('user_id', userId)
    .eq('confirmed', true)

  if (transferError) throw transferError

  // Get streak data
  const { data: streak, error: streakError } = await client
    .from('streaks')
    .select('consistency_score, current_streak, last_transfer_month')
    .eq('user_id', userId)
    .single()

  if (streakError && streakError.code !== 'PGRST116') throw streakError

  // Calculate stats
  const totalTransfers = transfers?.length || 0
  const totalAmount = transfers?.reduce((sum, t) => sum + t.amount_npr, 0) || 0

  // Calculate months active
  let monthsActive = 0
  if (transfers && transfers.length > 0) {
    const sortedDates = transfers
      .map((t) => new Date(t.transfer_date).getTime())
      .sort((a, b) => a - b)
    const first = new Date(sortedDates[0])
    const last = new Date(sortedDates[sortedDates.length - 1])
    monthsActive = Math.max(
      1,
      Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    )
  }

  return {
    total_transfers: totalTransfers,
    total_amount_npr: totalAmount,
    months_active: monthsActive,
    consistency_score: streak?.consistency_score || 0,
    current_streak: streak?.current_streak || 0,
  }
}

/**
 * Update user's SansarScore
 */
export async function updateUserSansarScore(userId) {
  const client = getSupabaseRequired()

  // Get user stats
  const stats = await getUserStatsForScoring(userId)

  // Calculate score
  const result = calculateSansarScore(stats)

  // Update user record
  const { error } = await client
    .from('users')
    .update({ sansar_score: result.score })
    .eq('id', userId)

  if (error) throw error

  return result
}

/**
 * Get user's current score
 */
export async function getUserSansarScore(userId) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('users')
    .select('sansar_score')
    .eq('id', userId)
    .single()

  if (error) throw error

  return data.sansar_score
}

/**
 * Get score breakdown (for display)
 */
export async function getSansarScoreDetails(userId) {
  const stats = await getUserStatsForScoring(userId)
  return calculateSansarScore(stats)
}
