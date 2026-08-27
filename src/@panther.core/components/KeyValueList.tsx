import clsx from 'clsx'
import type { ReactNode } from 'react'
import { ABSENT_MARK } from '@/@panther.core/vocabulary'

/**
 * Tight label / value rows: the build preamble, a provenance block, a config
 * detail, a species fact sheet.
 *
 * A definition list rather than a table, because these are attributes of one
 * thing rather than a grid. Values default to mono because most of what appears
 * here is an identifier, a path, a revision or a configuration value; a caller
 * passes `mono: false` for prose.
 *
 * `value: null | undefined` renders the absent mark and an optional reason -
 * never a blank, which in a dense column reads as zero.
 */
export interface KeyValueItem {
  /** Stable key for React and for a deep-link anchor. */
  key: string
  label: ReactNode
  value: ReactNode
  /** Mono treatment for the value. Defaults to true. */
  mono?: boolean
  /** Why the value is missing, when it is. */
  absentReason?: string
  /** Raises the accent: this row is the changed or anomalous one. */
  attention?: boolean
  /** Deep-link anchor id for this row. */
  anchorId?: string
  /** Trailing slot: a StatusChip, a Provenance marker, a CopyButton. */
  aside?: ReactNode
}

export interface KeyValueListProps {
  items: readonly KeyValueItem[]
  /** `columns` lays the rows out in two columns on wide containers. */
  columns?: 1 | 2
  /** Fixed label column width in ch, so labels and values line up. */
  labelWidth?: number
  /** Highlight this anchor id, for a hash-target flash. */
  highlightId?: string | null
  className?: string
}

export const KeyValueList = ({
  items,
  columns = 1,
  labelWidth = 22,
  highlightId,
  className,
}: KeyValueListProps) => (
  <dl
    className={clsx(
      'text-xs',
      columns === 2 ? 'grid grid-cols-1 gap-x-6 sm:grid-cols-2' : 'block',
      className
    )}
  >
    {items.map(item => {
      const missing = item.value === null || item.value === undefined
      return (
        <div
          key={item.key}
          id={item.anchorId}
          data-pb-anchor={item.anchorId ? '' : undefined}
          className={clsx(
            'flex items-baseline gap-2 py-0.5',
            item.attention && 'bg-accent-wash -mx-1 px-1',
            highlightId && item.anchorId === highlightId && 'pb-hairline-accent -mx-1 px-1'
          )}
        >
          <dt
            className="text-ink-muted text-2xs shrink-0"
            style={{ width: `${labelWidth}ch`, maxWidth: '48%' }}
          >
            {item.label}
          </dt>
          <dd
            className={clsx(
              'min-w-0 flex-1',
              missing ? 'text-ink-faint' : 'text-ink',
              (item.mono ?? true) && !missing && 'pb-ident',
              'pb-figures'
            )}
          >
            {missing ? (
              <span className="inline-flex items-baseline gap-1">
                <span>{ABSENT_MARK}</span>
                {item.absentReason && <span className="text-2xs">{item.absentReason}</span>}
              </span>
            ) : (
              item.value
            )}
          </dd>
          {item.aside && <div className="shrink-0">{item.aside}</div>}
        </div>
      )
    })}
  </dl>
)
