import { Link } from 'react-router-dom'

export default function EmptyState({
  eyebrow = 'SansarPay',
  title,
  copy = '',
  actionTo,
  actionLabel,
  shell = false,
  panelClassName = 'app-panel',
}) {
  const content = (
    <section className={panelClassName}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {copy ? <p className="lede">{copy}</p> : null}
      {actionTo && actionLabel ? (
        <div className="stack-actions">
          <Link className="primary-link primary-link-block" to={actionTo}>
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </section>
  )

  if (shell) {
    return <main className="app-shell">{content}</main>
  }

  return content
}
