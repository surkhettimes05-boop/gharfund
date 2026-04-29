import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../components/AppLayout.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { getStoredSession } from '../lib/session.js'
import Auth from '../screens/Auth.jsx'
import CreateGoal from '../screens/CreateGoal.jsx'
import FounderDashboard from '../screens/FounderDashboard.jsx'
import Home from '../screens/Home.jsx'
import LogTransfer from '../screens/LogTransfer.jsx'
import NotFoundScreen from '../screens/NotFoundScreen.jsx'
import Onboarding from '../screens/Onboarding.jsx'
import Settings from '../screens/Settings.jsx'
import Transfers from '../screens/Transfers.jsx'

const Goals = lazy(() => import('../screens/Goals.jsx'))
const Streak = lazy(() => import('../screens/Streak.jsx'))
const Score = lazy(() => import('../screens/Score.jsx'))
const Vault = lazy(() => import('../screens/Vault.jsx'))
const Referrals = lazy(() => import('../screens/Referrals.jsx'))
const AutoSaveSettings = lazy(() => import('../screens/AutoSaveSettings.jsx'))
const AffiliateDashboard = lazy(() => import('../screens/AffiliateDashboard.jsx'))
const AdminWithdrawals = lazy(() => import('../screens/AdminWithdrawals.jsx'))
const FamilyHome = lazy(() => import('../screens/family/FamilyHome.jsx'))
const FamilyHistory = lazy(() => import('../screens/family/FamilyHistory.jsx'))
const FamilyGoal = lazy(() => import('../screens/family/FamilyGoal.jsx'))

function DashboardRouteFallback({ eyebrow, title, copy = '' }) {
  return <LoadingState eyebrow={eyebrow} title={title} copy={copy} />
}

function FamilyRouteFallback({ eyebrow, title, copy = '' }) {
  return (
    <LoadingState
      variant="family"
      eyebrow={eyebrow}
      title={title}
      copy={copy}
      shell
      panelClassName="family-panel"
    />
  )
}

function FounderRoute({ children }) {
  const session = getStoredSession()

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  if (!session.isFounder) {
    return <Navigate to="/home" replace />
  }

  return children
}

function SessionRoute({ children, requireOnboarding = false }) {
  const session = getStoredSession()

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  if (requireOnboarding && !session.needsOnboarding) {
    return <Navigate to="/" replace />
  }

  if (!requireOnboarding && session.needsOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

function AuthRoute({ children }) {
  const session = getStoredSession()

  if (!session) {
    return children
  }

  return <Navigate to={session.needsOnboarding ? '/onboarding' : '/'} replace />
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <Auth />
            </AuthRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <SessionRoute requireOnboarding>
              <Onboarding />
            </SessionRoute>
          }
        />
        <Route
          path="/"
          element={
            <SessionRoute>
              <Navigate to="/home" replace />
            </SessionRoute>
          }
        />
        <Route
          path="/transfer/new"
          element={
            <SessionRoute>
              <Navigate to="/log-transfer" replace />
            </SessionRoute>
          }
        />
        <Route
          element={
            <SessionRoute>
              <AppLayout />
            </SessionRoute>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route
            path="/goals"
            element={
              <Suspense
                fallback={
                  <DashboardRouteFallback
                    eyebrow="Goals"
                    title="Loading your goal..."
                    copy="Preparing your savings progress and commitment view."
                  />
                }
              >
                <Goals />
              </Suspense>
            }
          />
          <Route path="/goals/create" element={<CreateGoal />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/founder" element={<FounderRoute><FounderDashboard /></FounderRoute>} />
          <Route
            path="/streak"
            element={
              <Suspense
                fallback={
                  <DashboardRouteFallback
                    eyebrow="Streak"
                    title="Loading streak data."
                    copy="Preparing your monthly consistency view."
                  />
                }
              >
                <Streak />
              </Suspense>
            }
          />
          <Route path="/log-transfer" element={<LogTransfer />} />
          <Route
            path="/score"
            element={
              <Suspense
                fallback={
                  <DashboardRouteFallback
                    eyebrow="Score"
                    title="Loading score..."
                    copy="Calculating your Sansar Score."
                  />
                }
              >
                <Score />
              </Suspense>
            }
          />
          <Route
            path="/vault"
            element={
              <Suspense
                fallback={
                  <DashboardRouteFallback
                    eyebrow="Vault"
                    title="Loading vault..."
                    copy="Preparing your savings account."
                  />
                }
              >
                <Vault />
              </Suspense>
            }
          />
          <Route
            path="/referrals"
            element={
              <Suspense
                fallback={
                  <DashboardRouteFallback
                    eyebrow="Referrals"
                    title="Loading referrals..."
                    copy="Preparing your referral program."
                  />
                }
              >
                <Referrals />
              </Suspense>
            }
          />
          <Route
            path="/affiliate"
            element={
              <Suspense
                fallback={
                  <DashboardRouteFallback
                    eyebrow="Affiliate Dashboard"
                    title="Loading dashboard..."
                    copy="Preparing your partner analytics."
                  />
                }
              >
                <AffiliateDashboard />
              </Suspense>
            }
          />
          <Route
            path="/auto-save"
            element={
              <Suspense
                fallback={
                  <DashboardRouteFallback
                    eyebrow="Auto-Save"
                    title="Loading settings..."
                    copy="Preparing auto-save configuration."
                  />
                }
              >
                <AutoSaveSettings />
              </Suspense>
            }
          />
          <Route
            path="/admin/withdrawals"
            element={
              <Suspense
                fallback={
                  <DashboardRouteFallback
                    eyebrow="Admin"
                    title="Loading..."
                    copy="Preparing withdrawal approval dashboard."
                  />
                }
              >
                <AdminWithdrawals />
              </Suspense>
            }
          />
        </Route>
        <Route
          path="/family/:token"
          element={
            <Suspense
              fallback={
                <FamilyRouteFallback
                  eyebrow="परिवार"
                  title="लोड हुँदैछ..."
                  copy="पारिवारिक अपडेट तयार गर्दैछौं।"
                />
              }
            >
              <FamilyHome />
            </Suspense>
          }
        />
        <Route
          path="/family/:token/history"
          element={
            <Suspense
              fallback={
                <FamilyRouteFallback
                  eyebrow="इतिहास"
                  title="लोड हुँदैछ..."
                  copy="रकम इतिहास तयार गर्दैछौं।"
                />
              }
            >
              <FamilyHistory />
            </Suspense>
          }
        />
        <Route
          path="/family/:token/goal"
          element={
            <Suspense
              fallback={
                <FamilyRouteFallback
                  eyebrow="लक्ष्य"
                  title="लोड हुँदैछ..."
                  copy="बचत लक्ष्यको प्रगति तयार गर्दैछौं।"
                />
              }
            >
              <FamilyGoal />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </BrowserRouter>
  )
}
