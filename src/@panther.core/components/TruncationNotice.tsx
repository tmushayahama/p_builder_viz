import clsx from 'clsx'
import type { ReactNode } from 'react'
import { StatusIcon } from '@/@panther.core/components/StatusIcon'
import type { Completeness } from '@/@panther.core/vocabulary'

/**
 * `50 of 147 rows included in report`.
 *
 * Every table in `other_reports` is truncated on the real fixture, so this is
 * the normal case here, not an edge case. It is its own primitive because the
 * same sentence has to appear identically above a table, in a chart footer and
 * in an export - and because any derived statement computed over a truncated
 * table has to be scoped in its wording, which `detail` is for.
 */
export interface TruncationNoticeProps {
  completeness: Completeness
  /** Scoping for a derived claim: `Renames are inferred from these rows only.` */
  detail?: ReactNode
  className?: string
}

export const TruncationNotice = ({ completeness, detail, className }: TruncationNoticeProps) => {
  const { included, total, noun = 'rows' } = completeness
  const sentence =
    total === null
      ? `${included.toLocaleString()} ${noun} included in report; the report does not say how many exist`
      : `${included.toLocaleString()} of ${total.toLocaleString()} ${noun} included in report`

  return (
    <p
      data-pb-truncation=""
      className={clsx(
        'text-status-warn text-2xs flex flex-wrap items-baseline gap-x-1.5',
        className
      )}
    >
      <StatusIcon shape="triangle-warn" size={11} className="translate-y-px" />
      <span className="pb-figures font-semibold">{sentence}</span>
      {detail && <span className="text-ink-muted">{detail}</span>}
    </p>
  )
}
