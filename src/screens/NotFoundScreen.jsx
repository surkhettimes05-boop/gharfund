import { Link } from 'react-router-dom'

export default function NotFoundScreen() {
  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="not-found-title">Page not found.</h1>
        <p className="lede">The requested SansarPay screen is not available.</p>
        <Link className="primary-link" to="/">
          Return home
        </Link>
      </section>
    </main>
  )
}
