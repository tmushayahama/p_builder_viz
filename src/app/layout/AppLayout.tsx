import { Outlet } from 'react-router-dom'
import { ActionIcon, Tooltip } from '@mantine/core'
import { LuMoon, LuSun } from 'react-icons/lu'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectColorScheme, toggleColorScheme } from '@/app/slices/uiSlice'

/** App frame: a header strip and the routed content beneath it. */
const AppLayout = () => {
  const dispatch = useAppDispatch()
  const colorScheme = useAppSelector(selectColorScheme)
  const nextScheme = colorScheme === 'dark' ? 'light' : 'dark'

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-3 dark:border-white/10">
        <div>
          <h1 className="text-base font-semibold">PANTHER Build Visualization</h1>
          <p className="text-2xs tracking-wide uppercase opacity-60">Project template</p>
        </div>
        <Tooltip label={`Switch to ${nextScheme} mode`}>
          <ActionIcon
            aria-label={`Switch to ${nextScheme} mode`}
            onClick={() => dispatch(toggleColorScheme())}
          >
            {colorScheme === 'dark' ? <LuSun size={16} /> : <LuMoon size={16} />}
          </ActionIcon>
        </Tooltip>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
