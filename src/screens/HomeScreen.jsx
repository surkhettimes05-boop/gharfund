import { Link, useLocation } from 'react-router-dom'
import { signOutFirebaseSession } from '../lib/firebase.js'
import { clearStoredSession, getStoredSession } from '../lib/session.js'

export default function HomeScreen() {
  const session = getStoredSession()
  const location = useLocation()
  const transferMessage = location.state?.transferMessage || ''
  const streak = location.state?.streak

  async function handleSignOut() {
    clearStoredSession()

    try {
      await signOutFirebaseSession()
    } catch {
      // Ignore Firebase logout failures and force the local route reset.
    }
  }

  return (
    <section className="app-panel" aria-labelledby="home-title">
      <p className="eyebrow">SansarPay</p>
      <h1 id="home-title">Mobile-first payments for global families.</h1>
      <p className="lede">
        Logged in as {session?.name || 'worker'} on {session?.phone}. Your family
        token is ready for the dashboard flows that come next.
      </p>
      {transferMessage ? <p className="form-note">{transferMessage}</p> : null}
      {streak ? (
        <p className="form-note">
          Streak: {streak.current_streak} current, {streak.longest_streak} longest,
          consistency {streak.consistency_score}/100.
        </p>
      ) : null}
      <div className="stack-actions">
        <Link className="primary-link primary-link-block" to="/log-transfer">
          Log transfer
        </Link>
        <Link className="secondary-link secondary-link-block" to="/transfers">
          Open transfers
        </Link>
        <Link className="secondary-link secondary-link-block" to="/auth" onClick={handleSignOut}>
          Sign out
        </Link>
      </div>
    </section>
  )
}
