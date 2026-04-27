import { useEffect, useState } from 'react'

export default function CountdownTimer({ targetDateIso, onExpire }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const targetTime = new Date(targetDateIso).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const diff = targetTime - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeLeft('00:00')
        onExpire && onExpire()
        return
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [targetDateIso, onExpire])

  if (isExpired) {
    return <span style={{ color: 'var(--color-error)' }}>Expired</span>
  }

  return <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{timeLeft}</span>
}
