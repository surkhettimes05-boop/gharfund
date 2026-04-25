export default function MilestoneBanner({ milestone, shareLink, onShare }) {
  if (!milestone) {
    return null
  }

  return (
    <section className="dashboard-card dashboard-card-amber" aria-labelledby="milestone-title">
      <p className="card-label" id="milestone-title">Milestone reached</p>
      <p className="card-value">{milestone}% complete</p>
      <p className="card-copy">Share this progress moment with your family on WhatsApp.</p>
      <a
        className="secondary-link secondary-link-block"
        href={shareLink}
        target="_blank"
        rel="noreferrer"
        onClick={onShare}
      >
        Share milestone
      </a>
    </section>
  )
}
