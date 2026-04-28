import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

/**
 * Generate unique referral code for user
 */
export function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Assign or create referral code for user
 */
export async function assignReferralCode(userId) {
  const client = getSupabaseRequired()

  // Check if user already has a code
  const { data: existing } = await client
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single()

  if (existing?.referral_code) {
    return existing.referral_code
  }

  // Generate unique code
  let code = ''
  let isUnique = false
  let attempts = 0

  while (!isUnique && attempts < 10) {
    code = generateReferralCode()

    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('referral_code', code)
      .single()

    isUnique = !existing
    attempts++
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique referral code')
  }

  // Save code to user
  const { error } = await client.from('users').update({ referral_code: code }).eq('id', userId)

  if (error) {
    throw new Error(`Failed to save referral code: ${error.message}`)
  }

  return code
}

/**
 * Create referral when new user signs up with referral code
 */
export async function createReferral(referrerCode, newUserId) {
  const client = getSupabaseRequired()

  // Find referrer
  const { data: referrer, error: referrerError } = await client
    .from('users')
    .select('id')
    .eq('referral_code', referrerCode)
    .single()

  if (referrerError || !referrer) {
    throw new Error('Referral code not found')
  }

  if (referrer.id === newUserId) {
    throw new Error('Cannot refer yourself')
  }

  // Create referral record
  const { data: referral, error } = await client
    .from('referrals')
    .insert({
      referrer_user_id: referrer.id,
      referred_user_id: newUserId,
      status: 'pending',
      reward_amount_npr: 300, // Default reward
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create referral: ${error.message}`)
  }

  // Link new user to referrer
  const { error: linkError } = await client
    .from('users')
    .update({ referred_by: referrer.id })
    .eq('id', newUserId)

  if (linkError) {
    console.warn('Failed to link referrer:', linkError)
  }

  return referral
}

/**
 * Activate referral when referred user completes onboarding
 */
export async function activateReferral(userId) {
  const client = getSupabaseRequired()

  // Find referral record
  const { data: referral, error: fetchError } = await client
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !referral) {
    // No referral found, not an issue
    return null
  }

  // Update referral status
  const { data: updated, error } = await client
    .from('referrals')
    .update({ status: 'activated' })
    .eq('id', referral.id)
    .select()
    .single()

  if (error) {
    console.warn('Failed to activate referral:', error)
    return null
  }

  return updated
}

/**
 * Reward referrer when referred user makes first transfer
 */
export async function rewardReferrer(userId) {
  const client = getSupabaseRequired()

  // Find activated referral
  const { data: referral, error: fetchError } = await client
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .eq('status', 'activated')
    .single()

  if (fetchError || !referral) {
    // No referral to reward
    return null
  }

  // Update referral status to rewarded
  const { data: updated, error } = await client
    .from('referrals')
    .update({ status: 'rewarded' })
    .eq('id', referral.id)
    .select()
    .single()

  if (error) {
    console.warn('Failed to update referral reward status:', error)
    return null
  }

  // Add reward to referrer's vault
  const { data: vault, error: vaultError } = await client
    .from('vaults')
    .select('balance_npr')
    .eq('user_id', referral.referrer_user_id)
    .single()

  if (vaultError) {
    // Vault might not exist yet
    console.warn('Referrer vault not found for reward')
    return updated
  }

  // Add to vault balance
  const { error: updateError } = await client
    .from('vaults')
    .update({
      balance_npr: vault.balance_npr + referral.reward_amount_npr,
    })
    .eq('user_id', referral.referrer_user_id)

  if (updateError) {
    console.warn('Failed to add reward to vault:', updateError)
  }

  return updated
}

/**
 * Get user's referral stats
 */
export async function getUserReferralStats(userId) {
  const client = getSupabaseRequired()

  // Get referral code
  const { data: user } = await client
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single()

  // Get referrals made by user
  const { data: referrals, error } = await client
    .from('referrals')
    .select('*')
    .eq('referrer_user_id', userId)

  if (error) {
    throw new Error(`Failed to fetch referral stats: ${error.message}`)
  }

  const stats = {
    referral_code: user?.referral_code || null,
    total_referrals: referrals?.length || 0,
    pending: referrals?.filter((r) => r.status === 'pending').length || 0,
    activated: referrals?.filter((r) => r.status === 'activated').length || 0,
    rewarded: referrals?.filter((r) => r.status === 'rewarded').length || 0,
    total_rewards: referrals
      ?.filter((r) => r.status === 'rewarded')
      .reduce((sum, r) => sum + (r.reward_amount_npr || 0), 0) || 0,
  }

  return stats
}

/**
 * Get all referrals for a user (as referrer)
 */
export async function getUserReferrals(userId) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('referrals')
    .select('*, users!referred_user_id(id, name, phone, created_at)')
    .eq('referrer_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch referrals: ${error.message}`)
  }

  return data
}

/**
 * Get referral history (analytics)
 */
export async function getReferralAnalytics() {
  const client = getSupabaseRequired()

  const { data, error } = await client.from('referrals').select('status, reward_amount_npr')

  if (error) {
    throw new Error(`Failed to fetch referral analytics: ${error.message}`)
  }

  const analytics = {
    total_referrals: data?.length || 0,
    pending: data?.filter((r) => r.status === 'pending').length || 0,
    activated: data?.filter((r) => r.status === 'activated').length || 0,
    rewarded: data?.filter((r) => r.status === 'rewarded').length || 0,
    total_rewards_distributed: data
      ?.filter((r) => r.status === 'rewarded')
      .reduce((sum, r) => sum + (r.reward_amount_npr || 0), 0) || 0,
  }

  return analytics
}
