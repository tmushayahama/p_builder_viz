import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * One row of controls above the content they filter.
 *
 * Filters sit in a single row rather than in a sidebar or above each chart, so a
 * reader can see at a glance what the numbers below are conditioned on. The
 * result count is part of the row for the same reason: a filter that hides rows
 * without saying how many is how a partial view gets mistaken for a complete
 * one.
 */
export interface FilterRowProps {
  children: ReactNode
  /** `120 of 131 species` - always say what the filter left. */
  summary?: ReactNode
  /** Right-aligned controls: a view toggle, a copy button. */
  actions?: ReactNode
  className?: string
}

export const FilterRow = ({ children, summary, actions, className }: FilterRowProps) => (
  <div
    data-pb-print="hide"
    className={clsx('flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-1.5', className)}
  >
    {children}
    {summary !== undefined && <span className="pb-figures text-ink-muted text-2xs">{summary}</span>}
    {actions && <span className="ml-auto flex items-center gap-1">{actions}</span>}
  </div>
)
