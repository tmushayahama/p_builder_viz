import clsx from 'clsx'
import type { ReactNode } from 'react'
import { StatusChip } from '@/@panther.core/components/StatusChip'
import type { Availability } from '@/@panther.core/vocabulary'

/**
 * Says plainly what is missing and why, quoting the generator verbatim.
 *
 * This is the app's one voice for absence. It never renders a zero, an empty
 * chart or a blank cell in place of a measurement that does not exist, and it
 * always distinguishes "the generator could not produce this" from "the
 * generator produced nothing because there was nothing to produce" - which on
 * the real fixture is the difference between an error and `prev_lib`'s
 * `inputs not present yet`.
 */
export interface UnavailableNoticeProps {
  availability: Exclude<Availability, 'available'>
  /** What is missing, in the app's own words: `Previous-library comparison`. */
  subject?: string
  /** The generator's own message, quoted verbatim and never paraphrased. */
  message?: string
  /** Where the reader can look instead, or what is still known. */
  children?: ReactNode
  /** A single dense line rather than a block, for use inside a table cell. */
  compact?: boolean
  className?: string
}

const headline: Record<Exclude<Availability, 'available'>, string> = {
  partial: 'Partially available',
  absent: 'Not in this report',
  error: 'The generator failed here',
  unknown: 'Availability not understood',
}

const detail: Record<Exclude<Availability, 'available'>, string> = {
  partial: 'Some sources were present and some were not, so what follows is incomplete.',
  absent: 'The report does not carry this section. Nothing below is inferred from its absence.',
  error: 'The report records a failure producing this section, so no values are shown.',
  unknown: 'The report used an availability value this dashboard does not recognise.',
}

export const UnavailableNotice = ({
  availability,
  subject,
  message,
  children,
  compact = false,
  className,
}: UnavailableNoticeProps) => (
  <div
    className={clsx(
      'bg-surface-2 pb-hairline rounded-hair',
      compact ? 'flex flex-wrap items-baseline gap-x-2 px-2 py-1' : 'space-y-1.5 px-3 py-2.5',
      className
    )}
    role="note"
    data-availability={availability}
  >
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <StatusChip status={availability} variant="plain" size="md" />
      <span className="text-ink text-xs font-semibold">
        {subject ? `${subject} — ${headline[availability]}` : headline[availability]}
      </span>
    </div>

    {!compact && <p className="text-ink-muted text-2xs max-w-prose">{detail[availability]}</p>}

    {message && (
      <p className="text-2xs">
        <span className="text-ink-faint">Generator message: </span>
        <q className="pb-ident text-ink">{message}</q>
      </p>
    )}

    {children && <div className="text-ink-muted text-2xs">{children}</div>}
  </div>
)
