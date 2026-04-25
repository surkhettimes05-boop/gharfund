export function formatNpr(amount) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function getGoalEmoji(goalType) {
  switch (goalType) {
    case 'house':
      return '🏠'
    case 'education':
      return '🎓'
    case 'emergency':
      return '🛟'
    default:
      return '🎯'
  }
}

export function calculateTransferStats(transfers) {
  const currentYear = new Date().getUTCFullYear()

  const totalSent = transfers.reduce((sum, transfer) => sum + transfer.amount_npr, 0)
  const sentThisYear = transfers.reduce((sum, transfer) => {
    const transferYear = new Date(`${transfer.transfer_date}T00:00:00`).getUTCFullYear()
    return transferYear === currentYear ? sum + transfer.amount_npr : sum
  }, 0)

  return {
    totalSent,
    sentThisYear,
    transferCount: transfers.length,
  }
}

export function parsePositiveInteger(value) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}

export function sumAmounts(items, key) {
  return (items || []).reduce((total, item) => total + (item?.[key] || 0), 0)
}
