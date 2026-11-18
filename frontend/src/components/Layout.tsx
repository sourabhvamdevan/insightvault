import { Outlet } from 'react-router-dom'
import type { AppContext } from '../hooks/useAppContext'
import { useHealth } from '../hooks/useHealth'
import { DEMO_MODE } from '../services/api'
import { DemoBar } from './DemoBar'
import { Sidebar } from './Sidebar'
import { TourProvider } from './Tour'

export function Layout() {
  const health = useHealth()
  const context: AppContext = { health }
  return (
    <TourProvider>
      <div className="flex h-full min-w-[768px]">
        <Sidebar health={health} />
        <div className="flex min-w-0 flex-1 flex-col">
          {DEMO_MODE && <DemoBar />}
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Outlet context={context} />
          </main>
        </div>
      </div>
    </TourProvider>
  )
}
