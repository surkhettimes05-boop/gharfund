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
    <section className={panelClassName}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="form-error">{message}</p>
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
