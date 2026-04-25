import { NavLink } from 'react-router-dom'

import { getStoredSession } from '../lib/session.js'

const BASE_NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: '\u2302' },
  { to: '/transfers', label: 'Transfers', icon: '\u21C6' },
  { to: '/goals', label: 'Goals', icon: '\u2606' },
  { to: '/settings', label: 'Settings', icon: '\u2699' },
]

export default function BottomNav() {
  const session = getStoredSession()
  const navItems = [...BASE_NAV_ITEMS]

  if (session?.isFounder) {
    navItems.splice(3, 0, { to: '/founder', label: 'Founder', icon: '\u2726' })
  }

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav-link${isActive ? ' bottom-nav-link-active' : ''}`
          }
        >
          <span aria-hidden="true" style={{ fontSize: '1.15rem', lineHeight: 1 }}>
            {item.icon}
          </span>
          <span style={{ fontSize: '0.75rem' }}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
