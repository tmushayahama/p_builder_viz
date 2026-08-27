import clsx from 'clsx'
import { StatusIcon } from '@/@panther.core/components/StatusIcon'

/**
 * Where the schema contract meets an unfamiliar enum.
 *
 * Renders `Unknown status: <value>` with the literal preserved in mono, because
 * coercing an unrecognised value into a known state is how a dashboard starts
 * lying about a build. The literal is what a maintainer needs years later when
 * asking what the generator actually emitted.
 */
export interface UnknownValueProps {
  /** The literal the report contained. Non-strings are JSON-stringified. */
  value: unknown
  /** What it was meant to be: `status`, `availability`, `schema version`. */
  kind?: string
  /** Where it came from, e.g. `sections[3].status`. */
  source?: string
  className?: string
}

const literalOf = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value === undefined) return 'undefined'
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export const UnknownValue = ({ value, kind = 'status', source, className }: UnknownValueProps) => (
  <span
    className={clsx(
      'text-status-neutral text-2xs inline-flex max-w-full items-baseline gap-1 align-middle',
      className
    )}
    data-unknown-kind={kind}
  >
    <StatusIcon shape="question" size={12} className="shrink-0 translate-y-px" />
    <span>
      {`Unknown ${kind}: `}
      <code className="pb-ident text-ink">{literalOf(value)}</code>
      {source && <span className="text-ink-faint">{` (${source})`}</span>}
    </span>
  </span>
)
