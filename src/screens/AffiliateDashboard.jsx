import { useState, useEffect } from 'react'
import { LoadingState, ErrorState, EmptyState } from '../components'
import {
  getPartnerTransferStats,
  getPartnerEarnings,
  getPartnerUserStats,
  getPartnerMonthlyTrends,
} from '../services/affiliateService'
import { formatCurrency } from '../utils/money'
import { supabase } from '../lib/supabase'

export default function AffiliateDashboard() {
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [partnerId, setPartnerId] = useState(null)

  useEffect(() => {
    loadAffiliateDashboard()
  }, [])

  async function loadAffiliateDashboard() {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user?.id) {
        throw new Error('No active session')
      }

      const userId = sessionData.session.user.id
      setPartnerId(userId)

      // Load all stats in parallel
      const [transfers, earnings, users, monthlyTrends] = await Promise.all([
        getPartnerTransferStats(userId),
        getPartnerEarnings(userId),
        getPartnerUserStats(userId),
        getPartnerMonthlyTrends(userId),
      ])

      setStats({
        transfers,
        earnings,
        users,
      })
      setTrends(monthlyTrends)
    } catch (err) {
      console.error('Error loading affiliate dashboard:', err)
      setError(err?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading)
    return (
      <LoadingState
        eyebrow="Affiliate Dashboard"
        title="Loading your dashboard..."
      />
    )

  if (error)
    return (
      <ErrorState
        eyebrow="Affiliate Dashboard"
        error={error}
        onRetry={loadAffiliateDashboard}
      />
    )

  if (!stats)
    return (
      <EmptyState
        eyebrow="Affiliate Dashboard"
        title="No data yet"
        copy="Start referring users to build your affiliate earnings."
      />
    )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6 rounded-lg">
        <p className="text-sm font-semibold opacity-90">Partner Dashboard</p>
        <h1 className="text-3xl font-bold mt-2">Earnings</h1>
        <p className="text-lg mt-1">{formatCurrency(stats.earnings.totalRewards)}</p>
        <p className="text-sm mt-2 opacity-75">
          Total rewards from {stats.earnings.totalReferrals} referrals
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Total Referrals"
          value={stats.earnings.totalReferrals}
          icon="👥"
        />
        <MetricCard
          label="Activated"
          value={stats.earnings.activatedReferrals}
          icon="✓"
          color="green"
        />
        <MetricCard
          label="Pending"
          value={stats.earnings.pendingReferrals}
          icon="⏳"
          color="yellow"
        />
        <MetricCard
          label="Reward Per Referral"
          value={formatCurrency(stats.earnings.rewardRate)}
          icon="💰"
          color="blue"
        />
      </div>

      {/* User Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">User Base</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Total Users Referred</p>
            <p className="font-semibold text-gray-900">{stats.users.totalUsers}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">New This Month</p>
            <p className="font-semibold text-gray-900">{stats.users.newUsersThisMonth}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">KYC Verified</p>
            <p className="font-semibold text-gray-900">
              {stats.users.verifiedUsers} ({stats.users.kycRate}%)
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Transfer Activity</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Total Transfers</p>
            <p className="font-semibold text-gray-900">{stats.transfers.totalTransfers}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Total Volume</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(stats.transfers.totalVolume)}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Average Transfer</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(stats.transfers.averageTransfer)}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Success Rate</p>
            <p className="font-semibold text-gray-900">
              {stats.transfers.totalTransfers > 0
                ? Math.round(
                    (stats.transfers.successfulTransfers /
                      stats.transfers.totalTransfers) *
                      100
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      {trends.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Monthly Trends</h2>
          <div className="space-y-3">
            {trends.slice(-6).reverse().map((month, idx) => (
              <div key={idx} className="pb-3 border-b border-gray-100 last:border-b-0">
                <p className="text-xs font-semibold text-gray-600 mb-2">{month.month}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Transfers</p>
                    <p className="font-semibold text-gray-900">{month.transferCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Volume</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(month.transferVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Referrals</p>
                    <p className="font-semibold text-gray-900">{month.referralCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Activated</p>
                    <p className="font-semibold text-gray-900">
                      {month.activatedReferrals}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earning Breakdown */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-purple-900 mb-3">How You Earn</h3>
        <ul className="text-sm text-purple-800 space-y-2">
          <li>
            • <strong>Referral Rewards:</strong> {formatCurrency(stats.earnings.rewardRate)} per
            activated referral
          </li>
          <li>
            • <strong>Commission:</strong> Percentage of transfer fees from your network
          </li>
          <li>
            • <strong>Bonus:</strong> Earn extra when users complete KYC verification
          </li>
          <li>
            • <strong>Tier Rewards:</strong> Higher earnings at higher referral tiers
          </li>
        </ul>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-2">Grow Your Earnings</h3>
        <p className="text-sm text-blue-800 mb-4">
          Share your referral code with friends and family to earn rewards.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700">
            Share Code
          </button>
          <button className="px-3 py-2 border border-blue-600 text-blue-600 rounded text-sm font-semibold hover:bg-blue-50">
            View Reports
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, color = 'gray' }) {
  const colorClasses = {
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
  }

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="text-lg font-bold mt-1">{value}</p>
        </div>
        <span className="text-xl">{icon}</span>
      </div>
    </div>
  )
}
