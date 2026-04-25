import { Link } from 'react-router-dom'

export default function EmptyState({
  eyebrow,
  title,
  copy,
  actionTo,
  actionLabel,
  secondaryActionTo,
  secondaryActionLabel,
  shell = false,
  panelClassName = 'app-panel',
}) {
  const content = (
    <section className={panelClassName} aria-labelledby="empty-title" style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '1.6rem',
        }}
        aria-hidden="true"
      >
        {'\u25CB'}
      </div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 id="empty-title" style={{ fontSize: '1.5rem' }}>{title}</h1>
      {copy ? <p className="lede">{copy}</p> : null}
      <div className="stack-actions">
        {actionTo ? (
          <Link className="primary-link primary-link-block" to={actionTo}>
            {actionLabel || 'Get started'}
          </Link>
        ) : null}
        {secondaryActionTo ? (
          <Link className="secondary-link secondary-link-block" to={secondaryActionTo}>
            {secondaryActionLabel || 'Back'}
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
