import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LoadingState, ErrorState, EmptyState } from '../components'
import ConsistencyScore from '../components/ConsistencyScore'
import { formatCurrency } from '../utils/money'

export default function Score() {
  const [score, setScore] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadScore()
  }, [])

  async function loadScore() {
    try {
      setLoading(true)
      setError(null)

      // Get user session
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user?.id) {
        throw new Error('No active session')
      }

      const userId = sessionData.session.user.id

      // Get current score and history
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('sansar_score, created_at')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      // Get consistency metrics (transfers and goals)
      const { data: transfers, error: transferError } = await supabase
        .from('transfers')
        .select('created_at, amount_npr')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (transferError) throw transferError

      // Get goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, target_amount_npr, completed_amount_npr')
        .eq('user_id', userId)

      if (goalsError) throw goalsError

      // Calculate score metrics
      const scoreMetrics = calculateScoreMetrics(transfers, goals)

      setScore({
        current: userData?.sansar_score || 0,
        consistency: scoreMetrics.consistency,
        commitment: scoreMetrics.commitment,
        totalTransfers: transfers?.length || 0,
        totalTransferred: transfers?.reduce((sum, t) => sum + (t.amount_npr || 0), 0) || 0,
        totalGoals: goals?.length || 0,
        completedGoals: goals?.filter(g => g.completed_amount_npr >= g.target_amount_npr).length || 0,
        joinDate: userData?.created_at
      })

      // Build history
      const scoreHistory = buildScoreHistory(transfers)
      setHistory(scoreHistory)
    } catch (err) {
      console.error('Error loading score:', err)
      setError(err?.message || 'Failed to load score')
    } finally {
      setLoading(false)
    }
  }

  function calculateScoreMetrics(transfers, goals) {
    // Consistency: frequency of transfers
    const consistency = Math.min(100, (transfers?.length || 0) * 5)

    // Commitment: goal completion rate
    const totalGoals = goals?.length || 1
    const completedGoals = goals?.filter(g => g.completed_amount_npr >= g.target_amount_npr).length || 0
    const commitment = Math.round((completedGoals / totalGoals) * 100)

    return { consistency, commitment }
  }

  function buildScoreHistory(transfers) {
    if (!transfers || transfers.length === 0) return []

    // Group transfers by week
    const weeks = {}
    transfers.forEach(transfer => {
      const date = new Date(transfer.created_at)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeks[weekKey]) {
        weeks[weekKey] = { date: weekStart, amount: 0, count: 0 }
      }
      weeks[weekKey].amount += transfer.amount_npr || 0
      weeks[weekKey].count += 1
    })

    return Object.values(weeks)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12)
  }

  if (loading) return <LoadingState eyebrow="Score" title="Loading your Sansar Score..." />

  if (error) return <ErrorState eyebrow="Score" error={error} onRetry={loadScore} />

  if (!score)
    return <EmptyState eyebrow="Score" title="No score data yet" copy="Start making transfers to build your score." />

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-lg">
        <p className="text-sm font-semibold opacity-90">Sansar Score</p>
        <h1 className="text-5xl font-bold mt-2">{score.current}</h1>
        <p className="text-sm mt-2 opacity-75">Your reliability and commitment rating</p>
      </div>

      {/* Score Components */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Consistency</p>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-2xl font-bold text-blue-600">{Math.round(score.consistency)}</p>
            <p className="text-xs text-gray-500">/ 100</p>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(100, score.consistency)}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Commitment</p>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-2xl font-bold text-green-600">{score.commitment}</p>
            <p className="text-xs text-gray-500">/ 100</p>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${score.commitment}%` }}
            />
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Activity</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Total Transfers</p>
            <p className="font-semibold text-gray-900">{score.totalTransfers}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Total Transferred</p>
            <p className="font-semibold text-gray-900">{formatCurrency(score.totalTransferred)}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Goals</p>
            <p className="font-semibold text-gray-900">
              {score.completedGoals} / {score.totalGoals}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Member Since</p>
            <p className="font-semibold text-gray-900">
              {new Date(score.joinDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Weekly Activity</h2>
          <div className="space-y-2">
            {history.map((week, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {new Date(week.date).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {week.count} transfers
                  </span>
                  <span className="text-sm font-semibold">{formatCurrency(week.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-3">How Your Score is Calculated</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• <strong>Consistency (40%):</strong> Frequency and regularity of transfers</li>
          <li>• <strong>Commitment (30%):</strong> Progress towards completing your savings goals</li>
          <li>• <strong>Reliability (20%):</strong> On-time transfer patterns</li>
          <li>• <strong>Volume (10%):</strong> Total amount transferred and saved</li>
        </ul>
      </div>
    </div>
  )
}
