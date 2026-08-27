import type { ReactNode } from 'react'
import type { StatusShape } from '@/@panther.core/vocabulary'

/**
 * The shape half of the status language.
 *
 * Thirteen single-colour silhouettes drawn in `currentColor`, so a status reads
 * from its outline alone: in a monochrome print, under protanopia, and at 12 px
 * in a dense table row. `hole` is deliberately hatched and `pending` is a plain
 * hollow ring, because telling those two apart at a glance is acceptance
 * question 2 and the pair the brief is most worried about.
 *
 * Hand-rolled rather than taken from an icon set: the silhouettes have to be
 * chosen against each other, and an icon-set upgrade must not be able to make
 * two states look alike.
 */
export interface StatusIconProps {
  shape: StatusShape
  /** Edge length in px. 12 in a table row, 14 in a chip, 16 in a heading. */
  size?: number
  className?: string
}

const paths: Record<StatusShape, ReactNode> = {
  check: (
    <path
      d="M3 8.6 6.3 12 13 4.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  caret: <path d="M5 2.5 13 8l-8 5.5z" fill="currentColor" />,
  'ring-hatched': (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.2 10.4 10.4 4.2M5.9 12.1 12.1 5.9M2.9 7.6 7.6 2.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </>
  ),
  question: (
    <>
      <path
        d="M5.4 5.6a2.6 2.6 0 1 1 3.9 2.3c-.8.5-1.3 1-1.3 1.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="8" cy="12.6" r="1.2" fill="currentColor" />
    </>
  ),
  ring: <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />,
  'ring-slash': (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.8 12.2 12.2 3.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  cross: (
    <path
      d="M4 4l8 8M12 4l-8 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  ),
  'triangle-warn': <path d="M8 2.2 14.4 13.4H1.6z" fill="currentColor" />,
  dash: <path d="M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="2.2" />,
  'half-disc': (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor" />
    </>
  ),
  'square-solid': <rect x="3.5" y="3.5" width="9" height="9" fill="currentColor" />,
  'square-dashed': (
    <rect
      x="3.5"
      y="3.5"
      width="9"
      height="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeDasharray="2.6 2"
    />
  ),
  diamond: <path d="M8 1.8 14.2 8 8 14.2 1.8 8z" fill="currentColor" />,
}

export const StatusIcon = ({ shape, size = 14, className }: StatusIconProps) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {paths[shape]}
  </svg>
)
