import { supabase } from '../lib/supabase'

/**
 * Partner affiliate dashboard service
 * Provides data for partners to view their aggregated data, transfers, and earnings
 */

const PARTNER_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
let partnerDataCache = {}
let lastCacheUpdate = 0

/**
 * Get aggregated transfer data for a partner
 * @param {string} partnerId - Partner user ID
 * @returns {Promise<Object>} Transfer statistics
 */
export async function getPartnerTransferStats(partnerId) {
  try {
    if (!partnerId) throw new Error('Partner ID is required')

    // Check cache
    const now = Date.now()
    if (
      partnerDataCache.transfers &&
      now - lastCacheUpdate < PARTNER_CACHE_DURATION
    ) {
      return partnerDataCache.transfers
    }

    // Get current user (must be authenticated partner)
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session?.user?.id) {
      throw new Error('No active session')
    }

    // Get partner record
    const { data: partner, error: partnerError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', partnerId)
      .single()

    if (partnerError) throw partnerError

    // Get aggregated transfers (if partner owns transfers table)
    const { data: transfers, error: transferError } = await supabase
      .from('transfers')
      .select('id, amount_npr, created_at, status')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })

    if (transferError && transferError.code !== 'PGRST116') throw transferError

    const stats = {
      totalTransfers: transfers?.length || 0,
      totalVolume: transfers?.reduce((sum, t) => sum + (t.amount_npr || 0), 0) || 0,
      averageTransfer:
        transfers && transfers.length > 0
          ? Math.round(transfers.reduce((sum, t) => sum + (t.amount_npr || 0), 0) / transfers.length)
          : 0,
      successfulTransfers:
        transfers?.filter(t => t.status === 'completed').length || 0,
      partnerSince: partner?.created_at,
      lastActivity:
        transfers && transfers.length > 0
          ? transfers[0].created_at
          : null,
    }

    // Update cache
    partnerDataCache.transfers = stats
    lastCacheUpdate = now

    return stats
  } catch (err) {
    console.error('Error getting partner transfer stats:', err)
    throw err
  }
}

/**
 * Get partner earnings data (referral rewards, commissions, etc.)
 * @param {string} partnerId - Partner user ID
 * @returns {Promise<Object>} Earnings summary
 */
export async function getPartnerEarnings(partnerId) {
  try {
    if (!partnerId) throw new Error('Partner ID is required')

    // Check cache
    const now = Date.now()
    if (
      partnerDataCache.earnings &&
      now - lastCacheUpdate < PARTNER_CACHE_DURATION
    ) {
      return partnerDataCache.earnings
    }

    // Get referral rewards
    const { data: referrals, error: referralError } = await supabase
      .from('referrals')
      .select('id, status, reward_amount_npr, created_at, activated_at')
      .eq('referrer_id', partnerId)

    if (referralError && referralError.code !== 'PGRST116')
      throw referralError

    // Calculate earnings
    const totalReferrals = referrals?.length || 0
    const activatedReferrals = referrals?.filter(r => r.status === 'activated').length || 0
    const totalRewards = referrals?.reduce((sum, r) => sum + (r.reward_amount_npr || 0), 0) || 0

    const earnings = {
      totalReferrals,
      activatedReferrals,
      pendingReferrals: totalReferrals - activatedReferrals,
      totalRewards,
      rewardRate: 300, // NPR per successful referral
      lastReward:
        referrals && referrals.length > 0
          ? referrals.reduce((latest, r) =>
              new Date(r.activated_at || r.created_at) >
              new Date(latest.activated_at || latest.created_at)
                ? r
                : latest
            ).activated_at || referrals[0].created_at
          : null,
    }

    // Update cache
    partnerDataCache.earnings = earnings
    lastCacheUpdate = now

    return earnings
  } catch (err) {
    console.error('Error getting partner earnings:', err)
    throw err
  }
}

/**
 * Get partner user base data (active users, new users, etc.)
 * @param {string} partnerId - Partner user ID
 * @returns {Promise<Object>} User statistics
 */
export async function getPartnerUserStats(partnerId) {
  try {
    if (!partnerId) throw new Error('Partner ID is required')

    // Check cache
    const now = Date.now()
    if (partnerDataCache.users && now - lastCacheUpdate < PARTNER_CACHE_DURATION) {
      return partnerDataCache.users
    }

    // Get users referred by this partner
    const { data: referredUsers, error: userError } = await supabase
      .from('users')
      .select('id, created_at, kyc_status')
      .eq('referred_by', partnerId)

    if (userError && userError.code !== 'PGRST116') throw userError

    // Calculate new users (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const newUsersThisMonth = referredUsers?.filter(
      u => new Date(u.created_at) > thirtyDaysAgo
    ).length || 0

    // Calculate KYC users
    const verifiedUsers =
      referredUsers?.filter(u => u.kyc_status === 'verified').length || 0

    const stats = {
      totalUsers: referredUsers?.length || 0,
      newUsersThisMonth,
      verifiedUsers,
      kycRate:
        referredUsers && referredUsers.length > 0
          ? Math.round((verifiedUsers / referredUsers.length) * 100)
          : 0,
    }

    // Update cache
    partnerDataCache.users = stats
    lastCacheUpdate = now

    return stats
  } catch (err) {
    console.error('Error getting partner user stats:', err)
    throw err
  }
}

/**
 * Get monthly trends for partner dashboard
 * @param {string} partnerId - Partner user ID
 * @param {number} months - Number of months to retrieve
 * @returns {Promise<Array>} Monthly statistics
 */
export async function getPartnerMonthlyTrends(partnerId, months = 12) {
  try {
    if (!partnerId) throw new Error('Partner ID is required')

    // Get transfers for the period
    const { data: transfers, error: transferError } = await supabase
      .from('transfers')
      .select('amount_npr, created_at')
      .eq('partner_id', partnerId)
      .gte('created_at', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })

    if (transferError && transferError.code !== 'PGRST116')
      throw transferError

    // Get referrals for the period
    const { data: referrals, error: referralError } = await supabase
      .from('referrals')
      .select('created_at, status')
      .eq('referrer_id', partnerId)
      .gte('created_at', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })

    if (referralError && referralError.code !== 'PGRST116')
      throw referralError

    // Aggregate by month
    const monthData = {}
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now)
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const monthKey = monthStart.toISOString().split('T')[0]

      const monthTransfers = transfers?.filter(t => {
        const tDate = new Date(t.created_at)
        return tDate >= monthStart && tDate < monthEnd
      }) || []

      const monthReferrals = referrals?.filter(r => {
        const rDate = new Date(r.created_at)
        return rDate >= monthStart && rDate < monthEnd
      }) || []

      monthData[monthKey] = {
        month: monthStart.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        }),
        transferVolume: monthTransfers.reduce(
          (sum, t) => sum + (t.amount_npr || 0),
          0
        ),
        transferCount: monthTransfers.length,
        referralCount: monthReferrals.length,
        activatedReferrals: monthReferrals.filter(r => r.status === 'activated').length,
      }
    }

    return Object.values(monthData)
  } catch (err) {
    console.error('Error getting partner monthly trends:', err)
    throw err
  }
}

/**
 * Clear partner data cache
 */
export function clearPartnerCache() {
  partnerDataCache = {}
  lastCacheUpdate = 0
}
