import { useState, useEffect } from 'react'
import { LoadingState, ErrorState, EmptyState } from '../components'
import {
  getPendingWithdrawalRequests,
  getWithdrawalStats,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
} from '../services/adminWithdrawalService'
import { formatCurrency } from '../utils/money'
import { supabase } from '../lib/supabase'

export default function AdminWithdrawals() {
  const [stats, setStats] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [actionInProgress, setActionInProgress] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)

  useEffect(() => {
    loadWithdrawals()
  }, [filter])

  async function loadWithdrawals() {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user?.id) {
        throw new Error('No active session')
      }

      const [stats, requests] = await Promise.all([
        getWithdrawalStats(sessionData.session.user.id),
        getPendingWithdrawalRequests(sessionData.session.user.id, {
          status: filter,
          limit: 100,
        }),
      ])

      setStats(stats)
      setRequests(requests)
    } catch (err) {
      console.error('Error loading withdrawals:', err)
      setError(err?.message || 'Failed to load withdrawals')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(requestId) {
    try {
      setActionInProgress(requestId)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user?.id) {
        throw new Error('No active session')
      }

      await approveWithdrawalRequest(sessionData.session.user.id, requestId, {
        notes: 'Approved via admin dashboard',
      })

      // Refresh list
      await loadWithdrawals()
    } catch (err) {
      console.error('Error approving withdrawal:', err)
      setError(err?.message || 'Failed to approve withdrawal')
    } finally {
      setActionInProgress(null)
    }
  }

  async function handleReject(requestId, reason) {
    try {
      setActionInProgress(requestId)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user?.id) {
        throw new Error('No active session')
      }

      await rejectWithdrawalRequest(sessionData.session.user.id, requestId, reason)

      // Refresh list
      await loadWithdrawals()
    } catch (err) {
      console.error('Error rejecting withdrawal:', err)
      setError(err?.message || 'Failed to reject withdrawal')
    } finally {
      setActionInProgress(null)
    }
  }

  if (loading)
    return (
      <LoadingState
        eyebrow="Admin Dashboard"
        title="Loading withdrawal requests..."
      />
    )

  if (error && !requests.length)
    return (
      <ErrorState
        eyebrow="Admin Dashboard"
        error={error}
        onRetry={loadWithdrawals}
      />
    )

  if (!stats)
    return (
      <EmptyState
        eyebrow="Admin Dashboard"
        title="No data"
        copy="Unable to load withdrawal data"
      />
    )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-orange-600 text-white p-6 rounded-lg">
        <p className="text-sm font-semibold opacity-90">Admin Panel</p>
        <h1 className="text-3xl font-bold mt-2">Withdrawal Approvals</h1>
        <p className="text-sm mt-2 opacity-75">
          Review and approve pending withdrawal requests
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Pending"
          value={stats.pending}
          amount={stats.totalPending}
          color="yellow"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          amount={stats.totalApproved}
          color="green"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          amount={stats.totalRejected}
          color="red"
        />
        <StatCard
          label="Total"
          value={stats.total}
          amount={stats.totalPending + stats.totalApproved + stats.totalRejected}
          color="blue"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['pending', 'approved', 'rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              filter === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({
              tab === 'pending'
                ? stats.pending
                : tab === 'approved'
                  ? stats.approved
                  : stats.rejected
            })
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <EmptyState
          eyebrow={filter.charAt(0).toUpperCase() + filter.slice(1)}
          title="No requests"
          copy={`No ${filter} withdrawal requests at this time.`}
        />
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <WithdrawalRequestCard
              key={request.id}
              request={request}
              onApprove={() => handleApprove(request.id)}
              onReject={() => handleReject(request.id, 'Rejected by admin')}
              isProcessing={actionInProgress === request.id}
              showActions={filter === 'pending'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, amount, color }) {
  const colors = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
  }

  return (
    <div className={`border rounded-lg p-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-75">{formatCurrency(amount)}</p>
    </div>
  )
}

function WithdrawalRequestCard({
  request,
  onApprove,
  onReject,
  isProcessing,
  showActions,
}) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            {request.users?.name || request.users?.email || 'Unknown User'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{request.users?.email}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[request.status]}`}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </div>

      {/* Details */}
      <div className="bg-gray-50 rounded p-3 mb-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Amount</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(request.amount_npr)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Reason</span>
          <span className="text-sm text-gray-900">{request.reason || 'Not specified'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Requested</span>
          <span className="text-sm text-gray-900">
            {new Date(request.created_at).toLocaleDateString()}
          </span>
        </div>
        {request.vaults && (
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-600">Vault Balance</span>
            <span className="text-sm text-gray-900">
              {formatCurrency(request.vaults.balance_npr)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="space-y-2">
          {!showRejectForm ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onApprove}
                disabled={isProcessing}
                className="px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                className="px-3 py-2 border border-red-600 text-red-600 rounded text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onReject(rejectionReason)
                    setShowRejectForm(false)
                    setRejectionReason('')
                  }}
                  disabled={isProcessing}
                  className="px-3 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Reject'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false)
                    setRejectionReason('')
                  }}
                  className="px-3 py-2 border border-gray-300 text-gray-600 rounded text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Details */}
      {request.status === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          <p className="text-green-800">
            <strong>Approved</strong> on{' '}
            {new Date(request.approved_at).toLocaleDateString()}
          </p>
          {request.notes && <p className="text-green-700 mt-1">{request.notes}</p>}
        </div>
      )}

      {request.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
          <p className="text-red-800">
            <strong>Rejected</strong> on{' '}
            {new Date(request.rejected_at).toLocaleDateString()}
          </p>
          {request.rejection_reason && (
            <p className="text-red-700 mt-1">{request.rejection_reason}</p>
          )}
        </div>
      )}
    </div>
  )
}
