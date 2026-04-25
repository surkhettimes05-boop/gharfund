import React from 'react'
import ErrorState from './components/ErrorState.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import AppRoutes from './routes/index.jsx'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          eyebrow="SansarPay"
          title="App unavailable."
          message="Something unexpected happened. Refresh and try again."
          onRetry={() => window.location.reload()}
          retryLabel="Refresh app"
          shell
          panelClassName="auth-panel"
        />
      )
    }

    return this.props.children
  }
}

function App() {
  return (
    <RootErrorBoundary>
      <OfflineBanner />
      <AppRoutes />
    </RootErrorBoundary>
  )
}

export default App
