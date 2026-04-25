import { Link } from 'react-router-dom'

export default function ErrorState({
  eyebrow = 'SansarPay',
  title = 'Something went wrong.',
  message = 'Please try again.',
  onRetry,
  retryLabel = 'Try again',
  linkTo,
  linkLabel,
  shell = false,
  panelClassName = 'app-panel',
}) {
  const content = (
    <section className={panelClassName} style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-danger-bg)',
          border: '1px solid rgba(185, 28, 28, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '1.4rem',
          color: 'var(--color-danger)',
        }}
        aria-hidden="true"
      >
        {'\u26A0'}
      </div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 style={{ fontSize: '1.5rem' }}>{title}</h1>
      <p className="form-error" style={{ textAlign: 'left' }}>{message}</p>
      <div className="stack-actions">
        {onRetry ? (
          <button className="primary-button" type="button" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
        {linkTo && linkLabel ? (
          <Link className="secondary-link secondary-link-block" to={linkTo}>
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </section>
  )

  if (shell) {
    return <main className="app-shell">{content}</main>
  }

  return content
}
