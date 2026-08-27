import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * A heading between panels: the report's own structure, not a page title.
 *
 * Deliberately quiet - small caps, a hairline rule, a count - because hierarchy
 * in a build report comes from grouping and rules, not from large type. A big
 * heading is the first step towards a hero section.
 */
export interface SectionHeadingProps {
  children: ReactNode
  level?: 2 | 3 | 4
  /** Stable anchor id, from the model's anchor builders. */
  anchorId?: string
  /** A figure the section summarises, e.g. `14 phases`. */
  count?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Starts a new page in print: use on a phase or a report boundary. */
  breakBefore?: boolean
  className?: string
}

export const SectionHeading = ({
  children,
  level = 2,
  anchorId,
  count,
  description,
  actions,
  breakBefore = false,
  className,
}: SectionHeadingProps) => {
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4'

  return (
    <div
      id={anchorId}
      data-pb-anchor={anchorId ? '' : undefined}
      data-pb-break={breakBefore ? 'before' : undefined}
      className={clsx(
        'pb-hairline-b flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-1',
        className
      )}
    >
      <Heading className="text-ink text-xs font-semibold tracking-wide uppercase">
        {children}
      </Heading>
      {count !== undefined && <span className="pb-figures text-ink-muted text-2xs">{count}</span>}
      {actions && (
        <span data-pb-print="hide" className="ml-auto flex items-center gap-1">
          {actions}
        </span>
      )}
      {description && (
        <p className="text-ink-muted text-2xs max-w-prose basis-full">{description}</p>
      )}
    </div>
  )
}
