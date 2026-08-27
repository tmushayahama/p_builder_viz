import clsx from 'clsx'
import type { StatusKey } from '@/@panther.core/vocabulary'

/**
 * The glyph on the spine's rail.
 *
 * It is the SHAPE half of the frontier/hole distinction, and it is the half that survives a
 * monochrome print and protanopia. Five silhouettes, chosen against each other:
 *
 *   complete  a solid square      - done, settled, no further reading needed
 *   frontier  a solid caret       - directional: this is the edge, work points forward from here
 *   hole      a HATCHED square    - filled but not solid; visibly a different condition, and the
 *                                   texture channel is ink-based so it prints
 *   pending   a hollow ring       - nothing here yet
 *   blocked   a ring with a slash - cannot proceed
 *
 * The chip beside it always carries the word as well, so the glyph never has to be learned.
 */
export interface PhaseMarkerProps {
  statusKey: StatusKey
  className?: string
}

const toneClass: Partial<Record<StatusKey, string>> = {
  complete: 'text-status-pass',
  frontier: 'text-status-active',
  active: 'text-status-active',
  hole: 'text-status-hole',
  pending: 'text-status-neutral',
  blocked: 'text-status-fail',
  unknown: 'text-status-neutral',
}

const Glyph = ({ statusKey }: { statusKey: StatusKey }) => {
  switch (statusKey) {
    case 'complete':
      return <rect x="2" y="2" width="8" height="8" fill="currentColor" />
    case 'frontier':
    case 'active':
      return <path d="M3 1.4 10.6 6 3 10.6z" fill="currentColor" />
    case 'blocked':
      return (
        <>
          <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 9 9 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </>
      )
    case 'pending':
      return <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    default:
      return (
        <path d="M6 1.4 10.6 6 6 10.6 1.4 6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )
  }
}

export const PhaseMarker = ({ statusKey, className }: PhaseMarkerProps) => {
  const tone = toneClass[statusKey] ?? 'text-status-neutral'

  /* The hole is texture, not a path: `pb-hatch` paints ink-based stripes, which is the one cue
     that reads with no colour at all. */
  if (statusKey === 'hole') {
    return (
      <span
        aria-hidden="true"
        data-phase-marker="hole"
        className={clsx('pb-hatch pb-hairline-strong rounded-hair block size-3', className)}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 12 12"
      width={12}
      height={12}
      aria-hidden="true"
      focusable="false"
      data-phase-marker={statusKey}
      className={clsx('block', tone, className)}
    >
      <Glyph statusKey={statusKey} />
    </svg>
  )
}
