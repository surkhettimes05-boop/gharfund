import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

// Get or create vault for user
export async function getOrCreateVault(userId) {
  const client = getSupabaseRequired()
  
  // Try to get existing vault
  const { data: existing, error: fetchError } = await client
    .from('vaults')
    .select('id, balance, locked_amount')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (existing) {
    return existing
  }
  
  // Create new vault
  const { data: vault, error: createError } = await client
    .from('vaults')
    .insert({
      user_id: userId,
      balance: 0,
      locked_amount: 0,
    })
    .select('id, balance, locked_amount')
    .single()
  
  if (createError) throw createError
  return vault
}

// Add amount to vault (from transfer)
export async function depositToVault(userId, amountNpr, transferId) {
  const client = getSupabaseRequired()
  const vault = await getOrCreateVault(userId)
  
  const newBalance = vault.balance + amountNpr
  
  const { data, error } = await client
    .from('vaults')
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('id, balance, locked_amount')
    .single()
  
  if (error) throw error
  return data
}

// Lock amount in vault (e.g., for withdrawal request)
export async function lockVaultAmount(userId, amountNpr) {
  const client = getSupabaseRequired()
  const vault = await getOrCreateVault(userId)
  
  if (vault.balance < amountNpr) {
    throw new Error('Insufficient vault balance.')
  }
  
  const newBalance = vault.balance - amountNpr
  const newLockedAmount = vault.locked_amount + amountNpr
  
  const { data, error } = await client
    .from('vaults')
    .update({
      balance: newBalance,
      locked_amount: newLockedAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('id, balance, locked_amount')
    .single()
  
  if (error) throw error
  return data
}

// Unlock amount (rejection)
export async function unlockVaultAmount(userId, amountNpr) {
  const client = getSupabaseRequired()
  const vault = await getOrCreateVault(userId)
  
  if (vault.locked_amount < amountNpr) {
    throw new Error('Cannot unlock more than locked amount.')
  }
  
  const newBalance = vault.balance + amountNpr
  const newLockedAmount = vault.locked_amount - amountNpr
  
  const { data, error } = await client
    .from('vaults')
    .update({
      balance: newBalance,
      locked_amount: newLockedAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('id, balance, locked_amount')
    .single()
  
  if (error) throw error
  return data
}

// Create withdrawal request
export async function requestWithdrawal(userId, amountNpr, reason) {
  const client = getSupabaseRequired()
  
  // Lock the amount first
  await lockVaultAmount(userId, amountNpr)
  
  // Create withdrawal request
  const { data, error } = await client
    .from('withdrawal_requests')
    .insert({
      user_id: userId,
      amount_npr: amountNpr,
      reason,
      status: 'pending',
    })
    .select('id, amount_npr, reason, status, created_at')
    .single()
  
  if (error) {
    // Rollback lock on error
    await unlockVaultAmount(userId, amountNpr)
    throw error
  }
  
  return data
}

// Get withdrawal requests for user
export async function getUserWithdrawalRequests(userId) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('withdrawal_requests')
    .select('id, amount_npr, reason, status, created_at, approved_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Mock approval (worker approves withdrawal)
export async function approveWithdrawal(withdrawalId, workerId) {
  const client = getSupabaseRequired()
  
  // Get withdrawal request
  const { data: request, error: fetchError } = await client
    .from('withdrawal_requests')
    .select('user_id, amount_npr, status')
    .eq('id', withdrawalId)
    .single()
  
  if (fetchError) throw fetchError
  if (request.status !== 'pending') {
    throw new Error('Withdrawal request is not pending.')
  }
  
  // Update withdrawal status
  const { error: updateError } = await client
    .from('withdrawal_requests')
    .update({
      status: 'approved',
      approved_by: workerId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId)
  
  if (updateError) throw updateError
  
  return { success: true, withdrawalId }
}

// Reject withdrawal
export async function rejectWithdrawal(withdrawalId) {
  const client = getSupabaseRequired()
  
  // Get withdrawal request
  const { data: request, error: fetchError } = await client
    .from('withdrawal_requests')
    .select('user_id, amount_npr, status')
    .eq('id', withdrawalId)
    .single()
  
  if (fetchError) throw fetchError
  if (request.status !== 'pending') {
    throw new Error('Withdrawal request is not pending.')
  }
  
  // Unlock the amount
  await unlockVaultAmount(request.user_id, request.amount_npr)
  
  // Update withdrawal status
  const { error: updateError } = await client
    .from('withdrawal_requests')
    .update({
      status: 'rejected',
      approved_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId)
  
  if (updateError) throw updateError
  
  return { success: true, withdrawalId }
}
