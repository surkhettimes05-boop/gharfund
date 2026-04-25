import { useEffect, useState } from 'react'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import {
  getFounderDashboardSummary,
  getFounderRecentTransfers,
  getFounderRecentUsers,
} from '../services/founderService.js'

function formatCount(value) {
  return value != null ? value.toLocaleString('en-US') : '0'
}

export default function FounderDashboard() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [recentTransfers, setRecentTransfers] = useState([])

  useEffect(() => {
    let active = true

    async function loadFounderData() {
      try {
        setStatus('loading')
        setError('')

        const [summaryData, users, transfers] = await Promise.all([
          getFounderDashboardSummary(),
          getFounderRecentUsers(),
          getFounderRecentTransfers(),
        ])

        if (!active) {
          return
        }

        setSummary(summaryData)
        setRecentUsers(users)
        setRecentTransfers(transfers)
        setStatus('ready')
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError.message || 'Could not load founder dashboard.')
        setStatus('error')
      }
    }

    void loadFounderData()

    return () => {
      active = false
    }
  }, [])

  async function reloadFounderData() {
    setStatus('loading')
    setError('')

    try {
      const [summaryData, users, transfers] = await Promise.all([
        getFounderDashboardSummary(),
        getFounderRecentUsers(),
        getFounderRecentTransfers(),
      ])

      setSummary(summaryData)
      setRecentUsers(users)
      setRecentTransfers(transfers)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'Could not load founder dashboard.')
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <LoadingState
        eyebrow="Founder Dashboard"
        title="Loading founder metrics..."
        copy="Preparing launch readiness data for the founder."
      />
    )
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="Founder Dashboard"
        title="Founder dashboard unavailable."
        message={error}
        onRetry={reloadFounderData}
      />
    )
  }

  return (
    <section className="app-panel" aria-labelledby="founder-dashboard-title">
      <p className="eyebrow">Founder</p>
      <h1 id="founder-dashboard-title">Operational dashboard</h1>
      <div className="dashboard-grid">
        <section className="dashboard-card">
          <p className="dashboard-card-title">Workers</p>
          <p className="dashboard-card-value">{formatCount(summary?.total_users)}</p>
        </section>
        <section className="dashboard-card">
          <p className="dashboard-card-title">Confirmed transfers</p>
          <p className="dashboard-card-value">{formatCount(summary?.total_confirmed_transfers)}</p>
        </section>
        <section className="dashboard-card">
          <p className="dashboard-card-title">Active goals</p>
          <p className="dashboard-card-value">{formatCount(summary?.total_active_goals)}</p>
        </section>
        <section className="dashboard-card">
          <p className="dashboard-card-title">Family link opens</p>
          <p className="dashboard-card-value">{formatCount(summary?.total_family_link_opens)}</p>
        </section>
      </div>

      <section className="settings-section">
        <h2 className="settings-section-title">Recent workers</h2>
        <div className="summary-card">
          {recentUsers.length ? (
            <div className="table-scroll">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Location</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td>{user.name}</td>
                      <td>{user.phone}</td>
                      <td>{user.working_location}</td>
                      <td>{new Date(user.created_at).toLocaleDateString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No recent workers found.</p>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Recent transfers</h2>
        <div className="summary-card">
          {recentTransfers.length ? (
            <div className="table-scroll">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Ack</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransfers.map((transfer) => (
                    <tr key={transfer.transfer_id}> 
                      <td>{transfer.worker_name}</td>
                      <td>{transfer.amount_npr?.toLocaleString('en-US')}</td>
                      <td>{new Date(transfer.transfer_date).toLocaleDateString('en-US')}</td>
                      <td>{transfer.method}</td>
                      <td>{transfer.acknowledged_by_family ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No recent transfers found.</p>
          )}
        </div>
      </section>
    </section>
  )
}
