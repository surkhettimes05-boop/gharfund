import { supabase } from '../lib/supabase.js'

function toMonthStart(dateInput) {
  const date = new Date(`${dateInput}T00:00:00`)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function formatMonthStart(date) {
  return date.toISOString().slice(0, 10)
}

function getMonthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function getMonthDiff(start, end) {
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
}

export function calculateStreakMetrics(confirmedTransferDates) {
  if (!confirmedTransferDates.length) {
    return {
      current_streak: 0,
      longest_streak: 0,
      consistency_score: 0,
      last_transfer_month: null,
    }
  }

  const uniqueMonthStarts = Array.from(
    new Set(confirmedTransferDates.map((date) => getMonthKey(toMonthStart(date)))),
  )
    .map((monthKey) => {
      const [year, month] = monthKey.split('-').map(Number)
      return new Date(Date.UTC(year, month - 1, 1))
    })
    .sort((left, right) => left.getTime() - right.getTime())

  let longestStreak = 1
  let runningStreak = 1

  for (let index = 1; index < uniqueMonthStarts.length; index += 1) {
    const previousMonth = uniqueMonthStarts[index - 1]
    const currentMonth = uniqueMonthStarts[index]

    if (getMonthDiff(previousMonth, currentMonth) === 1) {
      runningStreak += 1
    } else {
      runningStreak = 1
    }

    longestStreak = Math.max(longestStreak, runningStreak)
  }

  let currentStreak = 1

  for (let index = uniqueMonthStarts.length - 1; index > 0; index -= 1) {
    const currentMonth = uniqueMonthStarts[index]
    const previousMonth = uniqueMonthStarts[index - 1]

    if (getMonthDiff(previousMonth, currentMonth) === 1) {
      currentStreak += 1
    } else {
      break
    }
  }

  const firstMonth = uniqueMonthStarts[0]
  const lastMonth = uniqueMonthStarts[uniqueMonthStarts.length - 1]
  const totalMonths = getMonthDiff(firstMonth, lastMonth) + 1
  const consistencyScore = Number(((uniqueMonthStarts.length / totalMonths) * 100).toFixed(2))

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    consistency_score: consistencyScore,
    last_transfer_month: formatMonthStart(lastMonth),
  }
}

export async function refreshUserStreak(userId) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  const { data: transfers, error: transferError } = await supabase
    .from('transfers')
    .select('transfer_date')
    .eq('user_id', userId)
    .eq('confirmed', true)
    .order('transfer_date', { ascending: true })

  if (transferError) {
    throw transferError
  }

  const metrics = calculateStreakMetrics(
    (transfers || []).map((transfer) => transfer.transfer_date),
  )

  const { data: streakRow, error: streakError } = await supabase
    .from('streaks')
    .upsert(
      {
        user_id: userId,
        current_streak: metrics.current_streak,
        longest_streak: metrics.longest_streak,
        consistency_score: metrics.consistency_score,
        last_transfer_month: metrics.last_transfer_month,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('current_streak, longest_streak, consistency_score, last_transfer_month')
    .single()

  if (streakError) {
    throw streakError
  }

  return streakRow
}
