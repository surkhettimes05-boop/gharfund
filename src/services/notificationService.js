import { supabase } from '../lib/supabase.js'

/**
 * Notification and activity feed service
 */

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  TRANSFER_COMPLETED: 'transfer_completed',
  TRANSFER_FAILED: 'transfer_failed',
  WITHDRAWAL_APPROVED: 'withdrawal_approved',
  WITHDRAWAL_REJECTED: 'withdrawal_rejected',
  WITHDRAWAL_REQUESTED: 'withdrawal_requested',
  REFERRAL_ACCEPTED: 'referral_accepted',
  REFERRAL_REWARDED: 'referral_rewarded',
  GOAL_COMPLETED: 'goal_completed',
  GOAL_MILESTONE: 'goal_milestone',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  AUTO_SAVE_DEPOSIT: 'auto_save_deposit',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
}

/**
 * Create a notification for a user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} metadata - Additional data
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification(userId, type, title, message, metadata = {}) {
  try {
    if (!userId) throw new Error('User ID is required')
    if (!type || !title || !message) throw new Error('Type, title, and message are required')

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata,
        read: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error creating notification:', err)
    throw err
  }
}

/**
 * Get user's notifications
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Notifications
 */
export async function getNotifications(userId, options = {}) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { unreadOnly = false, limit = 20, offset = 0 } = options

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error getting notifications:', err)
    throw err
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationAsRead(notificationId) {
  try {
    if (!notificationId) throw new Error('Notification ID is required')

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error marking notification as read:', err)
    throw err
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of updated notifications
 */
export async function markAllNotificationsAsRead(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
    return data?.length || 0
  } catch (err) {
    console.error('Error marking all notifications as read:', err)
    throw err
  }
}

/**
 * Get unread notification count
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
export async function getUnreadNotificationCount(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
    return count || 0
  } catch (err) {
    console.error('Error getting unread count:', err)
    return 0
  }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export async function deleteNotification(notificationId) {
  try {
    if (!notificationId) throw new Error('Notification ID is required')

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  } catch (err) {
    console.error('Error deleting notification:', err)
    throw err
  }
}

/**
 * Delete all notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of deleted notifications
 */
export async function deleteAllNotifications(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
    return data?.length || 0
  } catch (err) {
    console.error('Error deleting all notifications:', err)
    throw err
  }
}

/**
 * Create activity log entry
 * @param {string} userId - User ID
 * @param {string} action - Action type
 * @param {string} description - Description
 * @param {Object} metadata - Additional data
 * @returns {Promise<Object>} Created activity
 */
export async function logActivity(userId, action, description, metadata = {}) {
  try {
    if (!userId) throw new Error('User ID is required')
    if (!action || !description) throw new Error('Action and description are required')

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        description,
        metadata,
      })
      .select()
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  } catch (err) {
    console.error('Error logging activity:', err)
    // Don't throw - activity logging shouldn't block operations
    return null
  }
}

/**
 * Get user's activity log
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Activity entries
 */
export async function getActivityLog(userId, options = {}) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { limit = 50, offset = 0, action } = options

    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (action) {
      query = query.eq('action', action)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error && error.code !== 'PGRST116') throw error
    return data || []
  } catch (err) {
    console.error('Error getting activity log:', err)
    return []
  }
}

/**
 * Notification helper - transfer completed
 */
export function createTransferNotification(userId, transferDetails) {
  return createNotification(
    userId,
    NOTIFICATION_TYPES.TRANSFER_COMPLETED,
    'Transfer Completed ✓',
    `Your transfer of ${transferDetails.amount} NPR to ${transferDetails.recipientName} has been completed.`,
    transferDetails
  )
}

/**
 * Notification helper - withdrawal approved
 */
export function createWithdrawalApprovedNotification(userId, withdrawalDetails) {
  return createNotification(
    userId,
    NOTIFICATION_TYPES.WITHDRAWAL_APPROVED,
    'Withdrawal Approved ✓',
    `Your withdrawal request of ${withdrawalDetails.amount} NPR has been approved.`,
    withdrawalDetails
  )
}

/**
 * Notification helper - referral rewarded
 */
export function createReferralRewardedNotification(userId, referralDetails) {
  return createNotification(
    userId,
    NOTIFICATION_TYPES.REFERRAL_REWARDED,
    'Referral Reward Earned! 🎉',
    `You earned ${referralDetails.reward} NPR from a referral reward.`,
    referralDetails
  )
}

/**
 * Notification helper - goal completed
 */
export function createGoalCompletedNotification(userId, goalDetails) {
  return createNotification(
    userId,
    NOTIFICATION_TYPES.GOAL_COMPLETED,
    'Goal Completed! 🎯',
    `Congratulations! You've completed your goal: ${goalDetails.goalName}`,
    goalDetails
  )
}

/**
 * Notification helper - auto-save deposit
 */
export function createAutoSaveNotification(userId, saveDetails) {
  return createNotification(
    userId,
    NOTIFICATION_TYPES.AUTO_SAVE_DEPOSIT,
    'Auto-Save Deposit',
    `${saveDetails.amount} NPR has been automatically saved to your vault.`,
    saveDetails
  )
}
