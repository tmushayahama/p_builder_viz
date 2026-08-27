import { SegmentedControl } from '@mantine/core'
import type { ReactNode } from 'react'

/**
 * A two-to-four-way view switch: chart or table, all or failures, phases or
 * timeline.
 *
 * Wraps Mantine's control so no call site passes a colour prop, and so the
 * accessible name is required rather than optional - an unlabelled toggle in a
 * dense report is unusable with a screen reader.
 */
export interface SegmentedToggleOption<T extends string> {
  value: T
  label: ReactNode
}

export interface SegmentedToggleProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: readonly SegmentedToggleOption<T>[]
  /** Accessible name for the group. */
  ariaLabel: string
  size?: 'xs' | 'sm'
  fullWidth?: boolean
  className?: string
}

export const SegmentedToggle = <T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'xs',
  fullWidth = false,
  className,
}: SegmentedToggleProps<T>) => (
  <SegmentedControl
    value={value}
    onChange={next => onChange(next as T)}
    data={options.map(option => ({ value: option.value, label: option.label }))}
    size={size}
    fullWidth={fullWidth}
    aria-label={ariaLabel}
    className={className}
    data-pb-print="hide"
  />
)
