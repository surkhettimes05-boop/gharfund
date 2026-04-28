import { supabase } from '../lib/supabase.js'

/**
 * Admin withdrawal approval service
 * Handles approval workflow for withdrawal requests
 */

/**
 * Get pending withdrawal requests (admin view)
 * @param {string} adminId - Admin user ID
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Pending withdrawal requests
 */
export async function getPendingWithdrawalRequests(adminId, options = {}) {
  try {
    const { limit = 50, offset = 0, status = 'pending' } = options

    // Verify admin role (would check more thoroughly in production)
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', adminId)
      .single()

    if (adminError || !admin) {
      throw new Error('Admin user not found')
    }

    // Get pending withdrawals with user info
    let query = supabase
      .from('withdrawal_requests')
      .select(
        `
        id,
        user_id,
        vault_id,
        amount_npr,
        reason,
        status,
        created_at,
        updated_at,
        users:user_id(id, email, name),
        vaults:vault_id(id, balance_npr, locked_amount_npr)
      `
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error getting pending withdrawals:', err)
    throw err
  }
}

/**
 * Get all withdrawal requests with filters
 * @param {string} adminId - Admin user ID
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Withdrawal requests
 */
export async function getWithdrawalRequests(
  adminId,
  filters = {}
) {
  try {
    const { status, userId, startDate, endDate, limit = 100, offset = 0 } = filters

    let query = supabase
      .from('withdrawal_requests')
      .select(
        `
        id,
        user_id,
        vault_id,
        amount_npr,
        reason,
        status,
        created_at,
        updated_at,
        users:user_id(id, email, name),
        vaults:vault_id(id, balance_npr)
      `
      )

    if (status) {
      query = query.eq('status', status)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error getting withdrawal requests:', err)
    throw err
  }
}

/**
 * Approve a withdrawal request
 * @param {string} adminId - Admin user ID
 * @param {string} requestId - Withdrawal request ID
 * @param {Object} approvalDetails - Details like notes, etc
 * @returns {Promise<Object>} Updated request
 */
export async function approveWithdrawalRequest(adminId, requestId, approvalDetails = {}) {
  try {
    if (!requestId) throw new Error('Request ID is required')

    // Get the withdrawal request
    const { data: request, error: requestError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      throw new Error('Withdrawal request not found')
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot approve request with status: ${request.status}`)
    }

    // Get vault to verify balance
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .select('*')
      .eq('id', request.vault_id)
      .single()

    if (vaultError || !vault) {
      throw new Error('Vault not found')
    }

    if (vault.locked_amount_npr < request.amount_npr) {
      throw new Error('Insufficient locked balance in vault')
    }

    // Begin transaction-like updates
    // 1. Update withdrawal request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        notes: approvalDetails.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) throw updateError

    // 2. Deduct from vault balance and locked amount
    const newBalance = vault.balance_npr - request.amount_npr
    const newLockedAmount = vault.locked_amount_npr - request.amount_npr

    const { error: vaultUpdateError } = await supabase
      .from('vaults')
      .update({
        balance_npr: newBalance,
        locked_amount_npr: newLockedAmount,
      })
      .eq('id', request.vault_id)

    if (vaultUpdateError) throw vaultUpdateError

    // 3. Create withdrawal transaction record
    const { error: txnError } = await supabase
      .from('vault_transactions')
      .insert({
        vault_id: request.vault_id,
        user_id: request.user_id,
        type: 'withdrawal',
        amount_npr: request.amount_npr,
        description: `Withdrawal approved by ${adminId}`,
        source: 'admin_approval',
      })

    if (txnError) console.warn('Failed to log withdrawal transaction:', txnError)

    return updatedRequest
  } catch (err) {
    console.error('Error approving withdrawal:', err)
    throw err
  }
}

/**
 * Reject a withdrawal request
 * @param {string} adminId - Admin user ID
 * @param {string} requestId - Withdrawal request ID
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Updated request
 */
export async function rejectWithdrawalRequest(adminId, requestId, reason = '') {
  try {
    if (!requestId) throw new Error('Request ID is required')

    // Get the withdrawal request
    const { data: request, error: requestError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      throw new Error('Withdrawal request not found')
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot reject request with status: ${request.status}`)
    }

    // Update request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        rejected_by: adminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) throw updateError

    // Unlock the vault amount
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .select('locked_amount_npr')
      .eq('id', request.vault_id)
      .single()

    if (!vaultError && vault) {
      const newLockedAmount = Math.max(0, vault.locked_amount_npr - request.amount_npr)

      await supabase
        .from('vaults')
        .update({ locked_amount_npr: newLockedAmount })
        .eq('id', request.vault_id)
    }

    return updatedRequest
  } catch (err) {
    console.error('Error rejecting withdrawal:', err)
    throw err
  }
}

/**
 * Get withdrawal statistics
 * @param {string} adminId - Admin user ID
 * @returns {Promise<Object>} Statistics
 */
export async function getWithdrawalStats(adminId) {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('status, amount_npr')

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      pending: data?.filter(r => r.status === 'pending').length || 0,
      approved: data?.filter(r => r.status === 'approved').length || 0,
      rejected: data?.filter(r => r.status === 'rejected').length || 0,
      totalPending: data
        ?.filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + (r.amount_npr || 0), 0) || 0,
      totalApproved: data
        ?.filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.amount_npr || 0), 0) || 0,
      totalRejected: data
        ?.filter(r => r.status === 'rejected')
        .reduce((sum, r) => sum + (r.amount_npr || 0), 0) || 0,
    }

    return stats
  } catch (err) {
    console.error('Error getting withdrawal stats:', err)
    throw err
  }
}

/**
 * Get withdrawal request details
 * @param {string} requestId - Withdrawal request ID
 * @returns {Promise<Object>} Request details with related data
 */
export async function getWithdrawalRequestDetails(requestId) {
  try {
    if (!requestId) throw new Error('Request ID is required')

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(
        `
        id,
        user_id,
        vault_id,
        amount_npr,
        reason,
        status,
        created_at,
        updated_at,
        approved_at,
        rejected_at,
        approved_by,
        rejected_by,
        rejection_reason,
        notes,
        users:user_id(id, email, name, kyc_status),
        vaults:vault_id(id, balance_npr, locked_amount_npr)
      `
      )
      .eq('id', requestId)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error getting withdrawal request details:', err)
    throw err
  }
}

/**
 * Bulk approve withdrawal requests
 * @param {string} adminId - Admin user ID
 * @param {Array} requestIds - Array of request IDs to approve
 * @returns {Promise<Object>} Results of bulk operation
 */
export async function bulkApproveWithdrawals(adminId, requestIds = []) {
  try {
    if (!requestIds || requestIds.length === 0) {
      throw new Error('No requests provided')
    }

    const results = {
      successful: [],
      failed: [],
    }

    for (const requestId of requestIds) {
      try {
        const result = await approveWithdrawalRequest(adminId, requestId)
        results.successful.push(result)
      } catch (err) {
        results.failed.push({
          requestId,
          error: err?.message,
        })
      }
    }

    return results
  } catch (err) {
    console.error('Error in bulk approval:', err)
    throw err
  }
}
