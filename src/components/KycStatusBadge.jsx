import { KYC_STATUS } from '../services/kycService.js'

const BADGE_CONFIG = {
  [KYC_STATUS.UNVERIFIED]: {
    label: 'ID Not Submitted',
    color: 'var(--color-text-muted)',
    bg: 'var(--color-bg-subtle)',
    border: 'var(--color-border)',
    icon: '○',
  },
  [KYC_STATUS.PENDING]: {
    label: 'Under Review',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
    icon: '◐',
  },
  [KYC_STATUS.VERIFIED]: {
    label: 'Verified',
    color: '#065f46',
    bg: '#d1fae5',
    border: '#6ee7b7',
    icon: '✓',
  },
  [KYC_STATUS.REJECTED]: {
    label: 'Rejected',
    color: '#991b1b',
    bg: '#fee2e2',
    border: '#fca5a5',
    icon: '✕',
  },
}

/**
 * @param {{ status: string, className?: string }} props
 */
export default function KycStatusBadge({ status, className = '' }) {
  const config = BADGE_CONFIG[status] ?? BADGE_CONFIG[KYC_STATUS.UNVERIFIED]

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
      }}
      aria-label={`KYC status: ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  )
}
