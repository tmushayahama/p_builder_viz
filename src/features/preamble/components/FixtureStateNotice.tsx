import { Provenance, StatusIcon } from '@/@panther.core/components'
import { DEFAULT_FIXTURE_STATE_KEY, FIXTURE_STATES } from '@/features/build/fixtures'
import { useFixtureStateKey } from '@/features/build/hooks'

/**
 * Says, inside the record itself, that this record is not a measurement.
 *
 * The switcher in the app chrome is not enough: chrome is dropped in print and ignored in a
 * screenshot, and every figure below this line would then read as a captured build. So the notice
 * lives in the preamble, prints, and names the transforms that produced the state.
 *
 * Renders nothing for the captured report - a banner on real data would train the reader to
 * ignore the banner.
 */
export const FixtureStateNotice = () => {
  const key = useFixtureStateKey()
  if (key === DEFAULT_FIXTURE_STATE_KEY) return null

  const definition = FIXTURE_STATES[key]

  return (
    <div
      role="note"
      data-pb-print="show"
      className="bg-accent-wash pb-hairline-accent flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-1.5"
    >
      <span className="text-accent inline-flex items-center gap-1.5 text-xs font-semibold">
        <StatusIcon shape="diamond" size={11} />
        Derived demo state — not a measurement
      </span>
      <span className="text-ink-muted text-2xs">
        {definition.label}: {definition.description}
      </span>
      <span className="ml-auto">
        <Provenance
          source="derived"
          detail={`${definition.transforms.join(' → ') || 'identity'} applied to the captured report`}
        />
      </span>
    </div>
  )
}
