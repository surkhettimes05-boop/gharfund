import { supabase } from '../lib/supabase.js'
import { getCurrentUserProfile, getCurrentUserStreak, updateReminderPreference } from './userService.js'
import { getConfirmedTransfersForYear } from './transferService.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  return supabase
}

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

function getCurrentYearMonths() {
  const currentYear = new Date().getUTCFullYear()

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(currentYear, index, 1))
    return {
      monthKey: `${currentYear}-${String(index + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('en-NP', { month: 'short' }).format(date),
      fullLabel: new Intl.DateTimeFormat('en-NP', { month: 'long', year: 'numeric' }).format(date),
      isCurrentMonth: index === new Date().getUTCMonth(),
    }
  })
}

function getMotivationalCopy(currentStreak) {
  if (currentStreak >= 12) {
    return 'One year — you are building something real.'
  }

  if (currentStreak >= 6) {
    return 'Half a year strong! 💪'
  }

  if (currentStreak >= 3) {
    return 'Building momentum'
  }

  if (currentStreak >= 1) {
    return 'Great start!'
  }

  return 'Start today'
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

export async function recalculateUserStreak(userId) {
  const client = getSupabaseRequired()
  const { data: transfers, error: transferError } = await client
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

  const { data: streakRow, error: streakError } = await client
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

export async function getStreakScreenData(userId) {
  const [profile, streakRow, confirmedTransfers] = await Promise.all([
    getCurrentUserProfile(userId),
    getCurrentUserStreak(userId),
    getConfirmedTransfersForYear(userId, new Date().getUTCFullYear()),
  ])

  const monthTransferMap = new Map()
  for (const transfer of confirmedTransfers) {
    const monthKey = transfer.transfer_date.slice(0, 7)

    if (!monthTransferMap.has(monthKey)) {
      monthTransferMap.set(monthKey, [])
    }

    monthTransferMap.get(monthKey).push(transfer)
  }

  const months = getCurrentYearMonths().map((month) => {
    const transfers = monthTransferMap.get(month.monthKey) || []

    let status = 'empty'
    if (transfers.length > 0) {
      status = 'confirmed'
    } else if (month.isCurrentMonth) {
      status = 'pending'
    }

    return {
      ...month,
      status,
      transfers,
    }
  })

  return {
    profile,
    streak: {
      currentStreak: streakRow?.current_streak || 0,
      consistencyScore: streakRow?.consistency_score || 0,
      longestStreak: streakRow?.longest_streak || 0,
      lastTransferMonth: streakRow?.last_transfer_month || null,
    },
    months,
    motivationalCopy: getMotivationalCopy(streakRow?.current_streak || 0),
  }
}

export async function setTransferReminder(userId, reminderEnabled) {
  return updateReminderPreference(userId, reminderEnabled)
}
