import { useId } from 'react'

const DEFAULT_VARIANT = 'default'

function resolveVariant(variant) {
  switch (variant) {
    case 'family':
    case DEFAULT_VARIANT:
      return variant
    default:
      return DEFAULT_VARIANT
  }
}

export default function LoadingState({
  eyebrow = 'SansarPay',
  title = 'Loading...',
  copy = '',
  shell = false,
  panelClassName = 'app-panel',
  variant = DEFAULT_VARIANT,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const skeletonVariant = resolveVariant(variant)

  const skeleton = (
    <div className="loading-skeleton" aria-hidden="true">
      {skeletonVariant === 'family' ? (
        <>
          <div className="loading-skeleton-block loading-skeleton-card loading-skeleton-tall">
            <div className="loading-skeleton-line loading-skeleton-line-short" />
            <div className="loading-skeleton-line loading-skeleton-line-medium" />
            <div className="loading-skeleton-progress" />
          </div>
          <div className="loading-skeleton-actions">
            <div className="loading-skeleton-block loading-skeleton-button" />
            <div className="loading-skeleton-block loading-skeleton-button" />
          </div>
          <div className="loading-skeleton-line loading-skeleton-line-medium" />
        </>
      ) : (
        <>
          <div className="loading-skeleton-header">
            <div className="loading-skeleton-block loading-skeleton-badge" />
            <div className="loading-skeleton-block loading-skeleton-badge loading-skeleton-badge-pill" />
          </div>
          <div className="loading-skeleton-grid">
            <div className="loading-skeleton-block loading-skeleton-card" />
            <div className="loading-skeleton-block loading-skeleton-card" />
          </div>
          <div className="loading-skeleton-actions">
            <div className="loading-skeleton-block loading-skeleton-button" />
            <div className="loading-skeleton-block loading-skeleton-button" />
          </div>
        </>
      )}
    </div>
  )

  const content = (
    <section
      className={panelClassName}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={copy ? descriptionId : undefined}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={titleId}>{title}</h1>
      {copy ? <p id={descriptionId} className="lede">{copy}</p> : null}
      {skeleton}
    </section>
  )

  if (shell) {
    return <main className="app-shell">{content}</main>
  }

  return content
}
