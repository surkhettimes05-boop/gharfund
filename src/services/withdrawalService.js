import { supabase } from '../lib/supabase.js'
import { lockVaultAmount, unlockVaultAmount } from './vaultService.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

/**
 * Request a withdrawal from vault
 */
export async function requestWithdrawal(userId, amountNpr, reason = '') {
  const client = getSupabaseRequired()

  if (amountNpr <= 0) {
    throw new Error('Withdrawal amount must be positive')
  }

  // Lock the amount in vault first
  await lockVaultAmount(userId, amountNpr)

  // Get user's vault
  const { data: vault, error: vaultError } = await client
    .from('vaults')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (vaultError || !vault) {
    // Unlock the amount if vault not found
    await unlockVaultAmount(userId, amountNpr)
    throw new Error('Vault not found')
  }

  // Create withdrawal request
  const { data: request, error } = await client
    .from('withdrawal_requests')
    .insert({
      user_id: userId,
      vault_id: vault.id,
      amount_npr: amountNpr,
      reason,
      status: 'pending',
      requested_by: 'user',
    })
    .select()
    .single()

  if (error) {
    // Unlock the amount if request creation fails
    await unlockVaultAmount(userId, amountNpr)
    throw new Error(`Failed to create withdrawal request: ${error.message}`)
  }

  return request
}

/**
 * Get user's withdrawal requests
 */
export async function getUserWithdrawalRequests(userId, limit = 20) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch withdrawal requests: ${error.message}`)
  }

  return data
}

/**
 * Get pending withdrawal requests (admin view)
 */
export async function getPendingWithdrawalRequests(limit = 50) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('withdrawal_requests')
    .select('*, vaults(user_id), users(name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch pending requests: ${error.message}`)
  }

  return data
}

/**
 * Approve a withdrawal request
 */
export async function approveWithdrawal(requestId, workerId = 'admin') {
  const client = getSupabaseRequired()

  // Get the withdrawal request
  const { data: request, error: fetchError } = await client
    .from('withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    throw new Error('Withdrawal request not found')
  }

  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be approved')
  }

  // Get user's vault to deduct balance
  const { data: vault, error: vaultError } = await client
    .from('vaults')
    .select('*')
    .eq('id', request.vault_id)
    .single()

  if (vaultError || !vault) {
    throw new Error('Vault not found')
  }

  // Deduct from balance and locked amount
  const { error: updateVaultError } = await client
    .from('vaults')
    .update({
      balance_npr: Math.max(0, vault.balance_npr - request.amount_npr),
      locked_amount_npr: Math.max(0, vault.locked_amount_npr - request.amount_npr),
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.vault_id)

  if (updateVaultError) {
    throw new Error(`Failed to update vault: ${updateVaultError.message}`)
  }

  // Update withdrawal request
  const { data: updatedRequest, error: updateError } = await client
    .from('withdrawal_requests')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to approve withdrawal: ${updateError.message}`)
  }

  // Log transaction
  await client.from('vault_transactions').insert({
    user_id: request.user_id,
    vault_id: request.vault_id,
    type: 'withdrawal',
    amount_npr: request.amount_npr,
    status: 'completed',
  })

  return updatedRequest
}

/**
 * Reject a withdrawal request
 */
export async function rejectWithdrawal(requestId) {
  const client = getSupabaseRequired()

  // Get the withdrawal request
  const { data: request, error: fetchError } = await client
    .from('withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    throw new Error('Withdrawal request not found')
  }

  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be rejected')
  }

  // Unlock the amount
  await unlockVaultAmount(request.user_id, request.amount_npr)

  // Update withdrawal request
  const { data: updatedRequest, error: updateError } = await client
    .from('withdrawal_requests')
    .update({
      status: 'rejected',
    })
    .eq('id', requestId)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to reject withdrawal: ${updateError.message}`)
  }

  return updatedRequest
}

/**
 * Get withdrawal request statistics
 */
export async function getWithdrawalStats() {
  const client = getSupabaseRequired()

  // Get all requests by status
  const { data: allRequests, error } = await client
    .from('withdrawal_requests')
    .select('status, amount_npr')

  if (error) {
    throw new Error(`Failed to fetch withdrawal stats: ${error.message}`)
  }

  const stats = {
    total_pending: 0,
    total_pending_amount: 0,
    total_approved: 0,
    total_approved_amount: 0,
    total_rejected: 0,
  }

  allRequests.forEach((req) => {
    if (req.status === 'pending') {
      stats.total_pending++
      stats.total_pending_amount += req.amount_npr
    } else if (req.status === 'approved') {
      stats.total_approved++
      stats.total_approved_amount += req.amount_npr
    } else if (req.status === 'rejected') {
      stats.total_rejected++
    }
  })

  return stats
}
