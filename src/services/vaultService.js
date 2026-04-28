import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

/**
 * Get or create user's vault
 */
export async function getOrCreateVault(userId) {
  const client = getSupabaseRequired()

  // Try to get existing vault
  const { data: existingVault, error: selectError } = await client
    .from('vaults')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existingVault) {
    return existingVault
  }

  if (selectError && selectError.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw new Error(`Failed to fetch vault: ${selectError.message}`)
  }

  // Create new vault
  const { data: newVault, error: createError } = await client
    .from('vaults')
    .insert({
      user_id: userId,
      balance_npr: 0,
      locked_amount_npr: 0,
      auto_save_amount_npr: 0,
      auto_save_enabled: false,
    })
    .select()
    .single()

  if (createError) {
    throw new Error(`Failed to create vault: ${createError.message}`)
  }

  return newVault
}

/**
 * Get vault balance
 */
export async function getVaultBalance(userId) {
  const client = getSupabaseRequired()

  const vault = await getOrCreateVault(userId)
  return {
    balance: vault.balance_npr,
    locked: vault.locked_amount_npr,
    available: vault.balance_npr - vault.locked_amount_npr,
  }
}

/**
 * Deposit to vault (auto-save or manual)
 */
export async function depositToVault(userId, amountNpr, sourceType = 'manual') {
  const client = getSupabaseRequired()

  const vault = await getOrCreateVault(userId)

  // Update vault balance
  const { error: updateError } = await client
    .from('vaults')
    .update({
      balance_npr: vault.balance_npr + amountNpr,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    throw new Error(`Failed to update vault: ${updateError.message}`)
  }

  // Log transaction
  const { data: transaction, error: txnError } = await client
    .from('vault_transactions')
    .insert({
      user_id: userId,
      vault_id: vault.id,
      type: 'deposit',
      amount_npr: amountNpr,
      status: 'completed',
    })
    .select()
    .single()

  if (txnError) {
    console.warn('Failed to log vault transaction:', txnError)
  }

  return {
    balance: vault.balance_npr + amountNpr,
    transaction: transaction || { amount_npr: amountNpr },
  }
}

/**
 * Lock vault amount for withdrawal request
 */
export async function lockVaultAmount(userId, amountNpr) {
  const client = getSupabaseRequired()

  const vault = await getOrCreateVault(userId)

  if (vault.balance_npr - vault.locked_amount_npr < amountNpr) {
    throw new Error('Insufficient available balance')
  }

  // Update locked amount
  const { error } = await client
    .from('vaults')
    .update({
      locked_amount_npr: vault.locked_amount_npr + amountNpr,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to lock amount: ${error.message}`)
  }

  // Log transaction
  await client.from('vault_transactions').insert({
    user_id: userId,
    vault_id: vault.id,
    type: 'lock',
    amount_npr: amountNpr,
    status: 'completed',
  })

  return {
    locked: vault.locked_amount_npr + amountNpr,
    available: vault.balance_npr - (vault.locked_amount_npr + amountNpr),
  }
}

/**
 * Unlock vault amount (when withdrawal is rejected)
 */
export async function unlockVaultAmount(userId, amountNpr) {
  const client = getSupabaseRequired()

  const vault = await getOrCreateVault(userId)

  if (vault.locked_amount_npr < amountNpr) {
    throw new Error('Cannot unlock more than locked amount')
  }

  // Update locked amount
  const { error } = await client
    .from('vaults')
    .update({
      locked_amount_npr: Math.max(0, vault.locked_amount_npr - amountNpr),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to unlock amount: ${error.message}`)
  }

  // Log transaction
  await client.from('vault_transactions').insert({
    user_id: userId,
    vault_id: vault.id,
    type: 'unlock',
    amount_npr: amountNpr,
    status: 'completed',
  })

  return {
    locked: Math.max(0, vault.locked_amount_npr - amountNpr),
    available: vault.balance_npr - Math.max(0, vault.locked_amount_npr - amountNpr),
  }
}

/**
 * Get vault transaction history
 */
export async function getVaultTransactionHistory(userId, limit = 50) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('vault_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch vault history: ${error.message}`)
  }

  return data
}

/**
 * Enable auto-save for user
 */
export async function enableAutoSave(userId, percentageAmount) {
  const client = getSupabaseRequired()

  // Validate percentage
  if (percentageAmount < 0 || percentageAmount > 100) {
    throw new Error('Auto-save percentage must be between 0 and 100')
  }

  const { error } = await client
    .from('vaults')
    .update({
      auto_save_amount_npr: percentageAmount,
      auto_save_enabled: percentageAmount > 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to enable auto-save: ${error.message}`)
  }

  return { auto_save_enabled: percentageAmount > 0, auto_save_percentage: percentageAmount }
}

/**
 * Disable auto-save
 */
export async function disableAutoSave(userId) {
  const client = getSupabaseRequired()

  const { error } = await client
    .from('vaults')
    .update({
      auto_save_amount_npr: 0,
      auto_save_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to disable auto-save: ${error.message}`)
  }

  return { auto_save_enabled: false }
}
