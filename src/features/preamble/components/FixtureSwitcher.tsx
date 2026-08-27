import { Select } from '@mantine/core'
import { Provenance } from '@/@panther.core/components'
import {
  DEFAULT_FIXTURE_STATE_KEY,
  FIXTURE_STATES,
  FIXTURE_STATE_KEYS,
} from '@/features/build/fixtures'
import type { FixtureStateKey } from '@/features/build/fixtures'
import { useFixtureStateKey, useSelectFixtureState } from '@/features/build/hooks'

/**
 * Moves the reviewer between the captured report and the derived states.
 *
 * The grouping is the point. One option is a measurement of a real build; the other eleven are
 * deterministic transforms of it, and a reviewer who mistakes a transform for a measurement has
 * been misled by the dashboard. So the captured report sits in its own group, every derived state
 * is labelled as derived, and the current choice is always accompanied by a provenance marker -
 * the same marker the app uses to separate a generator warning from a dashboard inference.
 */
export const FixtureSwitcher = () => {
  const current = useFixtureStateKey()
  const select = useSelectFixtureState()
  const definition = FIXTURE_STATES[current]
  const isCaptured = current === DEFAULT_FIXTURE_STATE_KEY

  const derived = FIXTURE_STATE_KEYS.filter(key => key !== DEFAULT_FIXTURE_STATE_KEY)

  return (
    <div className="flex items-center gap-2" data-pb-chrome="">
      <label className="text-ink-muted text-2xs shrink-0" htmlFor="fixture-state">
        Report state
      </label>
      <Select
        id="fixture-state"
        size="xs"
        w={232}
        value={current}
        allowDeselect={false}
        onChange={value => {
          if (value !== null) select(value as FixtureStateKey)
        }}
        aria-label="Report state"
        comboboxProps={{ withinPortal: true, width: 320, position: 'bottom-end' }}
        data={[
          {
            group: 'Captured build report',
            items: [
              {
                value: DEFAULT_FIXTURE_STATE_KEY,
                label: `${FIXTURE_STATES[DEFAULT_FIXTURE_STATE_KEY].label} — captured`,
              },
            ],
          },
          {
            group: 'Derived demo states (not measurements)',
            items: derived.map(key => ({
              value: key,
              label: `${FIXTURE_STATES[key].label} — derived`,
            })),
          },
        ]}
      />
      <Provenance
        source={isCaptured ? 'generator' : 'derived'}
        detail={
          isCaptured
            ? 'Captured from a real PANTHER 20.0 build target.'
            : `Transform: ${definition.transforms.join(' → ')}`
        }
        variant="marker"
      />
    </div>
  )
}
