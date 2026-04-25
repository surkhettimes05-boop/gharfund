export function formatTransferDate(dateInput) {
  return new Intl.DateTimeFormat('en-NP', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateInput}T00:00:00`))
}

export function formatMonthLabel(dateInput) {
  return new Intl.DateTimeFormat('en-NP', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateInput}T00:00:00`))
}

export function getMonthStart(dateInput) {
  return `${dateInput.slice(0, 7)}-01`
}

export function getCurrentYear() {
  return new Date().getUTCFullYear()
}

export function formatTransferMethod(method) {
  if (!method) {
    return ''
  }

  return method
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function groupTransfersByMonth(transfers) {
  const monthMap = new Map()

  for (const transfer of transfers) {
    const monthKey = transfer.transfer_date.slice(0, 7)

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, [])
    }

    monthMap.get(monthKey).push(transfer)
  }

  return Array.from(monthMap.entries()).map(([monthKey, items]) => ({
    monthKey,
    label: formatMonthLabel(`${monthKey}-01`),
    items,
  }))
}
