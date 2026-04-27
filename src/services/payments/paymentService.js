export async function getQuote(amountNpr, method) {
  // Mock API delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Fake FX rate to a base currency, e.g., AUD to NPR
  const fxRate = 88.5

  // Calculate fee (e.g., flat + percentage)
  const feeRate = 0.01 // 1%
  const feeNpr = amountNpr * feeRate + 200 // base fee

  const now = new Date()
  const lockedUntil = new Date(now.getTime() + 15 * 60000).toISOString() // 15 mins lock

  let deliveryEstimate = 'Within 2 hours'
  if (method === 'bank_transfer') {
    deliveryEstimate = '1-2 business days'
  } else if (method === 'agent_cash_pickup') {
    deliveryEstimate = 'Available immediately'
  }

  return {
    quoteId: `mock-quote-${Date.now()}`,
    amountNpr,
    feeNpr,
    feeRate,
    fxRate,
    provider: 'MockRemitPartner',
    deliveryEstimate,
    lockedUntil,
  }
}
