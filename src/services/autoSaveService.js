import { supabase } from '../lib/supabase.js'

/**
 * Auto-save configuration and management
 */

/**
 * Get or create auto-save settings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Auto-save settings
 */
export async function getAutoSaveSettings(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { data, error } = await supabase
      .from('auto_save_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error?.code === 'PGRST116') {
      // No settings found, return defaults
      return {
        user_id: userId,
        enabled: false,
        percentage: 10,
        min_transfer_amount_npr: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error getting auto-save settings:', err)
    throw err
  }
}

/**
 * Update auto-save settings
 * @param {string} userId - User ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
export async function updateAutoSaveSettings(userId, settings) {
  try {
    if (!userId) throw new Error('User ID is required')

    const updateData = {
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    }

    // Try to update first
    let result = await supabase
      .from('auto_save_settings')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (result.error?.code === 'PGRST116') {
      // Settings don't exist, create them
      result = await supabase
        .from('auto_save_settings')
        .insert(updateData)
        .select()
        .single()
    }

    if (result.error) throw result.error
    return result.data
  } catch (err) {
    console.error('Error updating auto-save settings:', err)
    throw err
  }
}

/**
 * Process auto-save deposit when transfer completes
 * @param {string} userId - User ID
 * @param {number} transferAmount - Transfer amount in NPR
 * @returns {Promise<Object|null>} Vault transaction if saved, null if auto-save disabled
 */
export async function processAutoSave(userId, transferAmount) {
  try {
    if (!userId) throw new Error('User ID is required')

    // Get auto-save settings
    const settings = await getAutoSaveSettings(userId)

    if (!settings.enabled) {
      return null
    }

    // Check if transfer meets minimum threshold
    if (transferAmount < settings.min_transfer_amount_npr) {
      return null
    }

    // Calculate auto-save amount
    const autoSaveAmount = Math.floor((transferAmount * settings.percentage) / 100)

    if (autoSaveAmount <= 0) {
      return null
    }

    // Get or create vault for user
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (vaultError && vaultError.code !== 'PGRST116') throw vaultError

    let vaultId = vault?.id

    if (!vaultId) {
      // Create vault
      const { data: newVault, error: createError } = await supabase
        .from('vaults')
        .insert({
          user_id: userId,
          balance_npr: 0,
          locked_amount_npr: 0,
        })
        .select()
        .single()

      if (createError) throw createError
      vaultId = newVault.id
    }

    // Deposit to vault
    const { data: transaction, error: txnError } = await supabase
      .from('vault_transactions')
      .insert({
        vault_id: vaultId,
        user_id: userId,
        type: 'deposit',
        amount_npr: autoSaveAmount,
        description: `Auto-save deposit (${settings.percentage}% of transfer)`,
        source: 'auto_save',
      })
      .select()
      .single()

    if (txnError) throw txnError

    // Update vault balance
    await supabase
      .from('vaults')
      .update({
        balance_npr: supabase.rpc('increment_balance', {
          vault_id: vaultId,
          amount: autoSaveAmount,
        }),
      })
      .eq('id', vaultId)

    return transaction
  } catch (err) {
    console.error('Error processing auto-save:', err)
    // Don't throw - auto-save failure shouldn't block transfer
    return null
  }
}

/**
 * Disable auto-save for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function disableAutoSave(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { error } = await supabase
      .from('auto_save_settings')
      .update({ enabled: false })
      .eq('user_id', userId)

    if (error) throw error
  } catch (err) {
    console.error('Error disabling auto-save:', err)
    throw err
  }
}

/**
 * Enable auto-save for a user
 * @param {string} userId - User ID
 * @param {number} percentage - Percentage of each transfer to auto-save (1-100)
 * @param {number} minAmount - Minimum transfer amount to trigger auto-save (default: 1000)
 * @returns {Promise<Object>} Updated settings
 */
export async function enableAutoSave(userId, percentage = 10, minAmount = 1000) {
  try {
    if (!userId) throw new Error('User ID is required')
    if (percentage < 1 || percentage > 100) throw new Error('Percentage must be between 1 and 100')
    if (minAmount < 0) throw new Error('Minimum amount cannot be negative')

    return await updateAutoSaveSettings(userId, {
      enabled: true,
      percentage,
      min_transfer_amount_npr: minAmount,
    })
  } catch (err) {
    console.error('Error enabling auto-save:', err)
    throw err
  }
}
