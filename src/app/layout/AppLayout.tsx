import { Outlet } from 'react-router-dom'
import TopBar from '@/app/layout/TopBar'

/**
 * The application frame: a chrome strip, then the routed record.
 *
 * Wide by design. A dense build report earns its width - columns of figures and a fourteen-row
 * timeline are easier to read at 1600 px than in a centred 1024 px measure - and a large empty
 * margin is a defect in this design rather than breathing room.
 */
const AppLayout = () => (
  <div className="bg-plane flex min-h-full flex-col">
    <TopBar />
    <main className="mx-auto w-full max-w-[1800px] flex-1 px-3 py-3">
      <Outlet />
    </main>
  </div>
)

export default AppLayout
