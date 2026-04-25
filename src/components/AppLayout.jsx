import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'

export default function AppLayout() {
  return (
    <main className="app-layout-shell">
      <div className="app-layout-frame">
        <div className="app-layout-content">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </main>
  )
}
