import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Provenance } from '@/@panther.core/components/Provenance'
import { UnavailableNotice } from '@/@panther.core/components/UnavailableNotice'
import type { Availability, ProvenanceSource } from '@/@panther.core/vocabulary'

/**
 * The one container.
 *
 * There is no second card component, no elevation scale and no coloured header
 * variant: a hairline ring on `surface-1`, a tight header on `surface-2`, and
 * the content. Chrome must not compete with data ink, and a page of these must
 * not look like a business analytics dashboard.
 *
 * Panel also owns how the whole app degrades, so it is worth getting right once:
 *
 *   available          children
 *   partial            UnavailableNotice ABOVE children - some sources were
 *                      present, so what is known is still shown
 *   unknown            UnavailableNotice ABOVE children when there are children,
 *                      alone when there are none - the values may be fine but
 *                      their status is not understood, so they are never shown
 *                      unqualified
 *   absent | error     UnavailableNotice INSTEAD of children - no zeros, no
 *                      empty charts, nothing inferred from absence
 *
 * A view therefore never writes an availability branch of its own.
 */
export interface PanelProps {
  title?: ReactNode
  /** A mono secondary identifier: a section id, a path, an oscode. */
  subtitle?: ReactNode
  /** Controls, usually a SegmentedToggle or a CopyButton. Dropped in print. */
  actions?: ReactNode
  /** A StatusChip slot in the header. */
  status?: ReactNode
  availability?: Availability
  /** The generator's own message, quoted verbatim by the notice. */
  message?: string
  /** What is missing, in the app's words. Defaults to the panel title. */
  missingSubject?: string
  /** Whether the panel's content came from the generator or was derived here. */
  provenance?: ProvenanceSource
  /** Stable anchor id, from the model's anchor builders - never hand-written. */
  anchorId?: string
  /** Raises the accent hairline: this panel holds changed or anomalous data. */
  tone?: 'default' | 'attention'
  density?: 'normal' | 'tight' | 'flush'
  headingLevel?: 2 | 3 | 4
  footer?: ReactNode
  /** Marks the panel as a print page-break boundary (a phase, a report). */
  breakBefore?: boolean
  children?: ReactNode
  className?: string
  bodyClassName?: string
}

const bodyPadding: Record<NonNullable<PanelProps['density']>, string> = {
  normal: 'px-3 py-2.5',
  tight: 'px-2 py-1.5',
  flush: 'p-0',
}

export const Panel = ({
  title,
  subtitle,
  actions,
  status,
  availability = 'available',
  message,
  missingSubject,
  provenance,
  anchorId,
  tone = 'default',
  density = 'normal',
  headingLevel = 3,
  footer,
  breakBefore = false,
  children,
  className,
  bodyClassName,
}: PanelProps) => {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'
  const replaced = availability === 'absent' || availability === 'error'
  const qualified = availability === 'partial' || availability === 'unknown'
  const hasHeader = Boolean(title || subtitle || status || actions || provenance)

  const notice =
    availability === 'available' ? null : (
      <UnavailableNotice
        availability={availability}
        subject={
          missingSubject ?? (typeof title === 'string' ? title : undefined) ?? 'This section'
        }
        message={message}
      />
    )

  return (
    <section
      id={anchorId}
      data-pb-panel=""
      data-pb-anchor={anchorId ? '' : undefined}
      data-pb-break={breakBefore ? 'before' : 'avoid'}
      data-availability={availability}
      className={clsx(
        'bg-surface-1 rounded-hair',
        tone === 'attention' ? 'pb-hairline-accent' : 'pb-hairline',
        className
      )}
    >
      {hasHeader && (
        <header className="bg-surface-2 pb-hairline-b flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-1.5">
          {title && (
            <Heading className="text-ink text-xs leading-4 font-semibold tracking-wide uppercase">
              {title}
            </Heading>
          )}
          {subtitle && <span className="pb-ident text-ink-faint text-2xs">{subtitle}</span>}
          <div className="ml-auto flex flex-wrap items-center gap-x-2 gap-y-1">
            {status}
            {provenance && <Provenance source={provenance} variant="marker" />}
            {actions && (
              <span data-pb-print="hide" className="flex items-center gap-1">
                {actions}
              </span>
            )}
          </div>
        </header>
      )}

      <div className={clsx(replaced ? 'px-3 py-2.5' : bodyPadding[density], bodyClassName)}>
        {notice && (
          <div className={clsx(qualified && children ? 'mb-2.5' : undefined)}>{notice}</div>
        )}
        {!replaced && children}
      </div>

      {footer && (
        <div className="bg-surface-2 pb-hairline-t text-ink-muted text-2xs px-3 py-1">{footer}</div>
      )}
    </section>
  )
}
