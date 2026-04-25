import { NavLink } from 'react-router-dom'

import { getStoredSession } from '../lib/session.js'

const BASE_NAV_ITEMS = [
  { to: '/home', label: 'Home' },
  { to: '/transfers', label: 'Transfers' },
  { to: '/goals', label: 'Goals' },
  { to: '/settings', label: 'Settings' },
]

export default function BottomNav() {
  const session = getStoredSession()
  const navItems = [...BASE_NAV_ITEMS]

  if (session?.isFounder) {
    navItems.splice(3, 0, { to: '/founder', label: 'Founder' })
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
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
