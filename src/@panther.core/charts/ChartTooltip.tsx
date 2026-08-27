import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { PlotRect } from '@/@panther.core/charts/ChartFrame'
import { num } from '@/@panther.core/charts/geometry'

/**
 * The hover/focus readout for a mark.
 *
 * An HTML layer above the SVG rather than SVG text, so values wrap, inherit the
 * app's fonts and get tabular figures for free.
 *
 * It enhances, never carries: every value in here is also reachable from the
 * chart's table twin, so a keyboard-only or touch reader is not locked out. Row
 * labels wear ink tokens and identity comes from the swatch beside them - a
 * series colour never colours text.
 */
export interface ChartTooltipRow {
  label: ReactNode
  value: ReactNode
  /** A token reference; renders a small square beside the label. */
  swatch?: string
  /** The row the pointer is actually on. */
  emphasis?: boolean
}

export interface ChartTooltipProps {
  /** Anchor position in container space (the same space as the SVG). */
  x: number
  y: number
  /** Plot rect, used to flip the panel so it never leaves the frame. */
  bounds: PlotRect
  visible: boolean
  title?: ReactNode
  rows: readonly ChartTooltipRow[]
  footer?: ReactNode
  className?: string
}

/** Enough to decide which side to open on without measuring the DOM. */
const ESTIMATED_WIDTH = 190

export const ChartTooltip = ({
  x,
  y,
  bounds,
  visible,
  title,
  rows,
  footer,
  className,
}: ChartTooltipProps) => {
  if (!visible) return null

  const anchorX = num(x)
  const anchorY = num(y)
  const flipX = anchorX + ESTIMATED_WIDTH > bounds.x + bounds.width
  const flipY = anchorY < bounds.y + 48

  return (
    <div
      role="tooltip"
      className={clsx(
        'bg-surface-1 pb-hairline-strong rounded-hair pointer-events-none absolute z-20 px-2 py-1.5',
        'max-w-56 min-w-32 space-y-1',
        className
      )}
      style={{
        left: anchorX,
        top: anchorY,
        transform: `translate(${flipX ? 'calc(-100% - 10px)' : '10px'}, ${flipY ? '4px' : '-100%'})`,
      }}
    >
      {title && <p className="text-ink text-2xs font-semibold">{title}</p>}
      <dl className="space-y-px">
        {rows.map((row, index) => (
          <div
            key={index}
            className={clsx(
              'text-2xs flex items-baseline gap-2',
              row.emphasis ? 'text-ink' : 'text-ink-muted'
            )}
          >
            <dt className="flex min-w-0 flex-1 items-center gap-1.5">
              {row.swatch && (
                <span
                  aria-hidden="true"
                  className="rounded-hair inline-block size-2 shrink-0"
                  style={{ backgroundColor: row.swatch }}
                />
              )}
              <span className="truncate">{row.label}</span>
            </dt>
            <dd className="pb-figures text-ink shrink-0 font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <p className="text-ink-faint text-3xs">{footer}</p>}
    </div>
  )
}
