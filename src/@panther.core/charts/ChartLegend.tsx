import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Series identity, beside the swatch rather than in the text colour.
 *
 * Returns `null` for fewer than two items. That is the rule, not an
 * optimisation: a legend box for a single series is chrome with no information -
 * the chart's own title names it - while two or more series always need one,
 * because a direct label alone cannot cover an occluded or off-screen segment.
 *
 * When `onToggle` is given the entries become real buttons. Hiding a series must
 * not repaint the survivors, which is guaranteed upstream by
 * `createCategoricalScale` binding a slot to an entity for the scale's life.
 */
export interface LegendItem {
  /** Entity key - the same key the categorical scale was built from. */
  key: string
  label: ReactNode
  /** A token reference from `theme/tokens`. */
  swatch: string
  shape?: 'square' | 'line' | 'dot'
  /** A figure worth carrying in the legend, e.g. the series total. */
  value?: ReactNode
}

export interface ChartLegendProps {
  items: readonly LegendItem[]
  /** Keys currently hidden. */
  hidden?: readonly string[]
  onToggle?: (key: string) => void
  orientation?: 'horizontal' | 'vertical'
  /** A caveat that belongs with the legend, e.g. how a mechanism is booked. */
  note?: ReactNode
  className?: string
}

const Swatch = ({ swatch, shape }: { swatch: string; shape: LegendItem['shape'] }) => {
  if (shape === 'line') {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-0.5 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: swatch }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-block size-2 shrink-0',
        shape === 'dot' ? 'rounded-full' : 'rounded-hair'
      )}
      style={{ backgroundColor: swatch }}
    />
  )
}

export const ChartLegend = ({
  items,
  hidden,
  onToggle,
  orientation = 'horizontal',
  note,
  className,
}: ChartLegendProps) => {
  if (items.length < 2) return null

  const hiddenSet = new Set(hidden ?? [])

  return (
    <div className={clsx('space-y-0.5', className)}>
      <ul
        className={clsx(
          'flex list-none gap-x-3 gap-y-0.5 p-0',
          orientation === 'vertical' ? 'flex-col' : 'flex-wrap'
        )}
      >
        {items.map(item => {
          const isHidden = hiddenSet.has(item.key)
          const body = (
            <span
              className={clsx(
                'text-2xs inline-flex items-center gap-1.5',
                isHidden ? 'text-ink-faint' : 'text-ink-muted'
              )}
            >
              <Swatch swatch={item.swatch} shape={item.shape} />
              <span className={clsx('truncate', isHidden && 'line-through')}>{item.label}</span>
              {item.value !== undefined && (
                <span className="pb-figures text-ink">{item.value}</span>
              )}
            </span>
          )

          return (
            <li key={item.key}>
              {onToggle ? (
                <button
                  type="button"
                  onClick={() => onToggle(item.key)}
                  aria-pressed={!isHidden}
                  data-pb-print="hide"
                  className="hover:text-ink -mx-1 flex min-h-6 cursor-pointer items-center px-1"
                >
                  {body}
                </button>
              ) : (
                body
              )}
            </li>
          )
        })}
      </ul>
      {note && <p className="text-ink-faint text-3xs">{note}</p>}
    </div>
  )
}
