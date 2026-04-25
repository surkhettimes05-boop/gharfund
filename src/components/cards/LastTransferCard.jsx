function formatNpr(amount) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

function formatDate(dateInput) {
  return new Intl.DateTimeFormat('en-NP', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateInput}T00:00:00`))
}

export default function LastTransferCard({ transfer, hasTransferThisMonth }) {
  if (!transfer) {
    return (
      <section className="dashboard-card dashboard-card-empty" aria-labelledby="last-transfer-title">
        <p className="card-label" id="last-transfer-title">Last transfer</p>
        <p className="card-value">No confirmed transfers yet.</p>
        <p className="card-copy">Log your first transfer to start building your monthly record.</p>
      </section>
    )
  }

  if (!hasTransferThisMonth) {
    return (
      <section className="dashboard-card dashboard-card-amber" aria-labelledby="last-transfer-title">
        <p className="card-label" id="last-transfer-title">Last transfer</p>
        <p className="card-value">
          NPR {transfer.amount_npr.toLocaleString('en-NP')} on {formatDate(transfer.transfer_date)}
        </p>
        <p className="card-copy">No confirmed transfer recorded for this month yet.</p>
      </section>
    )
  }

  return (
    <section className="dashboard-card" aria-labelledby="last-transfer-title">
      <p className="card-label" id="last-transfer-title">Last transfer</p>
      <p className="card-value">Last transfer: {formatNpr(transfer.amount_npr)} on {formatDate(transfer.transfer_date)}</p>
    </section>
  )
}
