import { ActionIcon, Tooltip } from '@mantine/core'
import { LuMoon, LuSun } from 'react-icons/lu'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectColorScheme, toggleColorScheme } from '@/app/slices/uiSlice'
import { FixtureSwitcher } from '@/features/preamble/components/FixtureSwitcher'
import { NavLink } from 'react-router-dom'
import { BUILD_ROUTE, RELEASE_ROUTE } from '@/features/build/model'
import { CommandPalette } from '@/features/search/components/CommandPalette'

/**
 * Application chrome, and only chrome: what report is loaded and how the app looks.
 *
 * Nothing about the build lives here. The record's own header is the preamble, which prints; this
 * strip is marked `data-pb-chrome` and is dropped on paper, so a printed build record does not
 * carry a theme toggle.
 *
 * There is deliberately no navigation in here. The pipeline is the navigation, and a top-level menu
 * mirroring the report's section ids is the information architecture this product is explicitly
 * not built on.
 */
const TopBar = () => {
  const dispatch = useAppDispatch()
  const colorScheme = useAppSelector(selectColorScheme)
  const nextScheme = colorScheme === 'dark' ? 'light' : 'dark'

  return (
    <header
      data-pb-chrome=""
      className="bg-surface-2 pb-hairline-b flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-1.5"
    >
      <span className="flex items-baseline gap-2">
        <span className="text-ink text-xs font-semibold tracking-wide uppercase">
          PANTHER build record
        </span>
        <span className="text-ink-faint text-2xs">viewer and diagnostic interface</span>
      </span>

      <span className="ml-auto flex flex-wrap items-center gap-3">
        <LensToggle />
        <CommandPalette />
        <FixtureSwitcher />
        <Tooltip label={`Switch to ${nextScheme} mode`} withArrow>
          <ActionIcon
            aria-label={`Switch to ${nextScheme} mode`}
            size="sm"
            onClick={() => dispatch(toggleColorScheme())}
          >
            {colorScheme === 'dark' ? <LuSun size={14} /> : <LuMoon size={14} />}
          </ActionIcon>
        </Tooltip>
      </span>
    </header>
  )
}

export default TopBar

/**
 * The two lenses over one report.
 *
 * Labelled by audience rather than by feature: a reader arriving here does not know that "spine"
 * or "frontier" are things, and the choice they are making is which question they want answered -
 * what is in this release, or how did the build get here.
 *
 * A lens switch belongs in the chrome, not in the navigation: the record's own navigation is the
 * phase spine, and putting these beside it would imply they are peers of a phase.
 */
const LensToggle = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'rounded-hair px-2 py-0.5 text-2xs',
      isActive ? 'bg-accent-wash text-accent' : 'text-ink-muted hover:text-ink',
    ].join(' ')

  return (
    <nav aria-label="View" className="pb-hairline rounded-hair flex items-center gap-0.5 p-0.5">
      <NavLink to={RELEASE_ROUTE} className={linkClass}>
        Release
      </NavLink>
      {/* `end` is off deliberately: the record owns `/` and `/build`, and a deep link carries a
          hash onto either, so the record's tab must stay active for all of them. */}
      <NavLink to={BUILD_ROUTE} className={linkClass}>
        Build record
      </NavLink>
    </nav>
  )
}
