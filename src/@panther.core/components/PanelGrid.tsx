import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * The one layout for a row of panels.
 *
 * `auto-fit` on a minimum column width rather than a fixed column count, so
 * 320 px, a laptop and a 1400 px review screen all get a sensible density
 * without a media-query ladder. `min()` on the track keeps a wide minimum from
 * overflowing a narrow container. The gutter is tight on purpose: large empty
 * areas are a defect in this design, not breathing room.
 */
export interface PanelGridProps {
  children: ReactNode
  /** Narrowest a column may get before the grid drops to fewer columns. */
  minColumnWidth?: number
  gap?: 'tight' | 'normal'
  className?: string
}

export const PanelGrid = ({
  children,
  minColumnWidth = 320,
  gap = 'normal',
  className,
}: PanelGridProps) => {
  const track = `repeat(auto-fit, minmax(min(${minColumnWidth}px, 100%), 1fr))`

  return (
    <div
      className={clsx('grid', gap === 'tight' ? 'gap-1.5' : 'gap-gutter', className)}
      style={{ gridTemplateColumns: track }}
    >
      {children}
    </div>
  )
}
