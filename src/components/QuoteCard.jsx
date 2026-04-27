import { formatNpr } from '../utils/money.js'
import CountdownTimer from './CountdownTimer.jsx'

export default function QuoteCard({ quote, onExpire }) {
  if (!quote) return null

  return (
    <div className="summary-card" style={{ marginBottom: 20 }}>
      <p className="summary-line">
        Send Amount: <strong>{formatNpr(quote.amountNpr)}</strong>
      </p>
      <p className="summary-line">
        Fee: <strong>{formatNpr(quote.feeNpr)}</strong> (
        {(quote.feeRate * 100).toFixed(1)}%)
      </p>
      <p className="summary-line">
        FX Rate: <strong>1 AUD = {quote.fxRate} NPR</strong>
      </p>
      <p className="summary-line">
        Provider: <strong>{quote.provider}</strong>
      </p>
      <p className="summary-line">
        Delivery: <strong>{quote.deliveryEstimate}</strong>
      </p>
      <p
        className="summary-line"
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px dashed var(--color-border)',
        }}
      >
        Rate locked for:{' '}
        <CountdownTimer targetDateIso={quote.lockedUntil} onExpire={onExpire} />
      </p>
    </div>
  )
}
