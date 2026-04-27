import { supabase } from '../lib/supabase.js'

/**
 * Partner API Routes
 * Read-only, aggregated, anonymized data endpoints
 * 
 * All endpoints return:
 * - Aggregated statistics
 * - Zero personal information
 * - Timestamp of data refresh
 */

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

/**
 * Verify partner API key
 * In production, validate against an authorized_partners table
 */
function verifyPartnerApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('API key required.')
  }
  // TODO: In production, query authorized_partners table
  // For now, accept any key starting with 'partner_'
  if (!apiKey.startsWith('partner_')) {
    throw new Error('Invalid API key.')
  }
  return true
}

/**
 * GET /api/partners/transfers
 * Returns aggregated transfer statistics
 */
export async function getAggregatedTransfers(apiKey) {
  verifyPartnerApiKey(apiKey)

  const client = getSupabaseRequired()

  // Get confirmed transfers only
  const { data: transfers, error } = await client
    .from('transfers')
    .select('amount_npr, transfer_date, method, recipient_type', { count: 'exact' })
    .eq('confirmed', true)

  if (error) throw error

  if (!transfers || transfers.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      stats: {
        total_transfers: 0,
        total_amount_npr: 0,
        average_amount_npr: 0,
        median_amount_npr: 0,
        transfers_last_30_days: 0,
        transfers_last_90_days: 0,
      },
      methods: {},
      recipients: {},
      daily_volume: [],
    }
  }

  // Calculate stats
  const totalTransfers = transfers.length
  const amounts = transfers.map((t) => t.amount_npr).sort((a, b) => a - b)
  const totalAmount = amounts.reduce((sum, a) => sum + a, 0)
  const averageAmount = Math.round(totalAmount / totalTransfers)
  const medianAmount = amounts[Math.floor(amounts.length / 2)]

  // Transfers in time windows
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const last30 = transfers.filter(
    (t) => new Date(t.transfer_date) >= thirtyDaysAgo,
  ).length
  const last90 = transfers.filter(
    (t) => new Date(t.transfer_date) >= ninetyDaysAgo,
  ).length

  // Aggregate by method
  const methodStats = {}
  transfers.forEach((t) => {
    if (!methodStats[t.method]) {
      methodStats[t.method] = { count: 0, total_npr: 0 }
    }
    methodStats[t.method].count++
    methodStats[t.method].total_npr += t.amount_npr
  })

  // Aggregate by recipient type
  const recipientStats = {}
  transfers.forEach((t) => {
    if (!recipientStats[t.recipient_type]) {
      recipientStats[t.recipient_type] = { count: 0, total_npr: 0 }
    }
    recipientStats[t.recipient_type].count++
    recipientStats[t.recipient_type].total_npr += t.amount_npr
  })

  // Daily volume (last 30 days)
  const dailyVolume = {}
  transfers
    .filter((t) => new Date(t.transfer_date) >= thirtyDaysAgo)
    .forEach((t) => {
      const date = t.transfer_date
      if (!dailyVolume[date]) {
        dailyVolume[date] = { count: 0, total_npr: 0 }
      }
      dailyVolume[date].count++
      dailyVolume[date].total_npr += t.amount_npr
    })

  return {
    timestamp: new Date().toISOString(),
    stats: {
      total_transfers: totalTransfers,
      total_amount_npr: totalAmount,
      average_amount_npr: averageAmount,
      median_amount_npr: medianAmount,
      transfers_last_30_days: last30,
      transfers_last_90_days: last90,
    },
    methods: methodStats,
    recipients: recipientStats,
    daily_volume: dailyVolume,
  }
}

/**
 * GET /api/partners/scores
 * Returns aggregated SansarScore distribution
 */
export async function getAggregatedScores(apiKey) {
  verifyPartnerApiKey(apiKey)

  const client = getSupabaseRequired()

  // Get all scores
  const { data: users, error } = await client
    .from('users')
    .select('sansar_score', { count: 'exact' })

  if (error) throw error

  if (!users || users.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      stats: {
        total_users: 0,
        average_score: 0,
        median_score: 0,
        min_score: 0,
        max_score: 0,
      },
      distribution: {
        excellent: 0, // 80-100
        good: 0, // 60-79
        fair: 0, // 40-59
        low: 0, // 0-39
      },
      percentiles: {},
    }
  }

  const scores = users.map((u) => u.sansar_score).sort((a, b) => a - b)
  const totalUsers = scores.length
  const averageScore = Math.round(
    (scores.reduce((sum, s) => sum + s, 0) / totalUsers) * 100,
  ) / 100
  const medianScore = scores[Math.floor(scores.length / 2)]
  const minScore = scores[0]
  const maxScore = scores[scores.length - 1]

  // Distribution buckets
  const distribution = {
    excellent: scores.filter((s) => s >= 80).length,
    good: scores.filter((s) => s >= 60 && s < 80).length,
    fair: scores.filter((s) => s >= 40 && s < 60).length,
    low: scores.filter((s) => s < 40).length,
  }

  // Percentiles
  const percentiles = {
    p10: scores[Math.floor(scores.length * 0.1)],
    p25: scores[Math.floor(scores.length * 0.25)],
    p50: scores[Math.floor(scores.length * 0.5)],
    p75: scores[Math.floor(scores.length * 0.75)],
    p90: scores[Math.floor(scores.length * 0.9)],
  }

  return {
    timestamp: new Date().toISOString(),
    stats: {
      total_users: totalUsers,
      average_score: averageScore,
      median_score: medianScore,
      min_score: minScore,
      max_score: maxScore,
    },
    distribution,
    percentiles,
  }
}

/**
 * GET /api/partners/vaults
 * Returns aggregated vault statistics
 */
export async function getAggregatedVaults(apiKey) {
  verifyPartnerApiKey(apiKey)

  const client = getSupabaseRequired()

  // Get all vaults
  const { data: vaults, error: vaultError } = await client
    .from('vaults')
    .select('balance, locked_amount', { count: 'exact' })

  if (vaultError) throw vaultError

  // Get pending withdrawal requests
  const { data: withdrawals, error: withdrawalError } = await client
    .from('withdrawal_requests')
    .select('amount_npr, status', { count: 'exact' })

  if (withdrawalError) throw withdrawalError

  if (!vaults || vaults.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      vault_stats: {
        total_vaults: 0,
        total_balance_npr: 0,
        average_balance_npr: 0,
        total_locked_npr: 0,
        average_locked_npr: 0,
      },
      withdrawal_stats: {
        total_pending: 0,
        pending_amount_npr: 0,
        total_approved: 0,
        approved_amount_npr: 0,
        total_rejected: 0,
        total_completed: 0,
      },
    }
  }

  // Vault stats
  const totalBalance = vaults.reduce((sum, v) => sum + v.balance, 0)
  const totalLocked = vaults.reduce((sum, v) => sum + v.locked_amount, 0)
  const averageBalance = Math.round(totalBalance / vaults.length)
  const averageLocked = Math.round(totalLocked / vaults.length)

  // Withdrawal stats
  const withdrawalStats = {
    total_pending: withdrawals?.filter((w) => w.status === 'pending').length || 0,
    pending_amount_npr:
      withdrawals
        ?.filter((w) => w.status === 'pending')
        .reduce((sum, w) => sum + w.amount_npr, 0) || 0,
    total_approved: withdrawals?.filter((w) => w.status === 'approved').length || 0,
    approved_amount_npr:
      withdrawals
        ?.filter((w) => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount_npr, 0) || 0,
    total_rejected: withdrawals?.filter((w) => w.status === 'rejected').length || 0,
    total_completed: withdrawals?.filter((w) => w.status === 'completed').length || 0,
  }

  return {
    timestamp: new Date().toISOString(),
    vault_stats: {
      total_vaults: vaults.length,
      total_balance_npr: totalBalance,
      average_balance_npr: averageBalance,
      total_locked_npr: totalLocked,
      average_locked_npr: averageLocked,
    },
    withdrawal_stats: withdrawalStats,
  }
}

/**
 * GET /api/partners/health
 * System health check endpoint
 */
export async function getPartnerHealthCheck(apiKey) {
  verifyPartnerApiKey(apiKey)

  try {
    const client = getSupabaseRequired()
    // Simple test query
    const { error } = await client
      .from('users')
      .select('id', { count: 'exact' })
      .limit(1)

    if (error) throw error

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }
  } catch (e) {
    return {
      status: 'unhealthy',
      error: e.message,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Export all partner API functions as a module
 */
export const partnerApi = {
  getAggregatedTransfers,
  getAggregatedScores,
  getAggregatedVaults,
  getPartnerHealthCheck,
}

export default partnerApi
