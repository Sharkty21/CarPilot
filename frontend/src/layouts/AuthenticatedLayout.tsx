import { Outlet } from 'react-router-dom'
import carPilotLogo from '@/public/CarPilot.png'

import AccountMenu from '@/src/components/header/AccountMenu'
import VehicleSelector from '@/src/components/header/VehicleSelector'

const AuthenticatedLayout = () => {

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#f6f9fe]">
      <header className="flex h-16 min-w-0 flex-none items-center justify-between gap-3 border-b border-blue-100 bg-white px-3 md:px-6">
        <div className="flex shrink-0 items-center gap-1.5">
          <img src={carPilotLogo} alt="Car Pilot" className="size-9" />
          <span className="font-heading text-xl font-semibold tracking-tight">Car<span className="text-blue-500">Pilot</span></span>
        </div>
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <VehicleSelector />
          <AccountMenu />
        </div>
      </header>
      <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default AuthenticatedLayout
