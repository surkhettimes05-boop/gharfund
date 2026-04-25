import { formatTransferDate } from '../utils/date.js'
import { formatNpr } from '../utils/money.js'

function formatMethodLabel(method) {
  return method
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function TransferRow({ transfer }) {
  return (
    <article className="transfer-row">
      <div className="transfer-row-main">
        <div>
          <p className="transfer-row-date">{formatTransferDate(transfer.transfer_date)}</p>
          <p className="transfer-row-amount">{formatNpr(transfer.amount_npr)}</p>
        </div>
        <span className="transfer-method-badge">{formatMethodLabel(transfer.method)}</span>
      </div>

      <div className="transfer-row-meta">
        <span className="transfer-status">
          <span
            className={`status-dot${transfer.confirmed ? ' status-dot-confirmed' : ''}`}
            aria-hidden="true"
          />
          {transfer.confirmed ? 'Confirmed' : 'Pending'}
        </span>
        {transfer.acknowledged_by_family ? (
          <span className="transfer-acknowledged">Family acknowledged</span>
        ) : null}
      </div>
    </article>
  )
}
