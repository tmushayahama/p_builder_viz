import clsx from 'clsx'
import { Tooltip } from '@mantine/core'
import { StatusIcon } from '@/@panther.core/components/StatusIcon'
import type { StatusKey } from '@/@panther.core/vocabulary'
import { STATUS_DESCRIPTORS, isStatusKey } from '@/@panther.core/vocabulary'

/**
 * A phase, step, check, freshness, timing or availability state.
 *
 * ALWAYS icon + text label, and never a way to pass a colour: hue is the third
 * cue, never the first, so `failed`, `pending`, `hole`, `warning` and
 * `frontier` stay distinguishable by shape and by word for a colour-blind
 * reader and on a monochrome print.
 *
 * `quiet` is the one variant that drops the *visible* word, and it exists for a
 * measured reason. A phase's step list renders one chip per row; on the
 * captured report that is twelve identical green "Done" chips above the two
 * `pending` rows that are the only ones worth looking at. Repeating the
 * expected state on every row spends all the attention the table has on the
 * outcome nobody needs to check. `quiet` keeps the icon - so shape still
 * carries the state - and keeps the word in the accessible name via `sr-only`,
 * so a screen reader and a keyboard user lose nothing. Use it ONLY for the
 * unremarkable case in a repeated list, never for an exception.
 *
 * An unrecognised literal is not coerced into a known state. It renders as
 * `Unknown status: <value>` with the literal preserved, which is what the
 * schema contract asks for wherever the report meets an unfamiliar enum.
 */
export interface StatusChipProps {
  /** A known key, or any literal the report happened to contain. */
  status: StatusKey | string
  /** Override the word only when the domain wording differs; the shape is fixed. */
  label?: string
  size?: 'sm' | 'md'
  /**
   * `wash` draws the tinted chip; `plain` is icon + word inline in running
   * text; `quiet` is the icon alone with the word kept for assistive tech.
   */
  variant?: 'wash' | 'plain' | 'quiet'
  /** A secondary figure the state carries, e.g. an attempt count or `10/12`. */
  detail?: string
  /** Replaces the descriptor's own one-line explanation. */
  hint?: string
  className?: string
  id?: string
}

const toneClasses: Record<string, string> = {
  pass: 'text-status-pass bg-status-pass-wash',
  warn: 'text-status-warn bg-status-warn-wash',
  hole: 'text-status-hole bg-status-hole-wash',
  fail: 'text-status-fail bg-status-fail-wash',
  active: 'text-status-active bg-status-active-wash',
  neutral: 'text-status-neutral bg-status-neutral-wash',
}

const toneInk: Record<string, string> = {
  pass: 'text-status-pass',
  warn: 'text-status-warn',
  hole: 'text-status-hole',
  fail: 'text-status-fail',
  active: 'text-status-active',
  neutral: 'text-status-neutral',
}

export const StatusChip = ({
  status,
  label,
  size = 'sm',
  variant = 'wash',
  detail,
  hint,
  className,
  id,
}: StatusChipProps) => {
  const known = isStatusKey(status)
  const descriptor = known ? STATUS_DESCRIPTORS[status] : STATUS_DESCRIPTORS.unknown
  const word = label ?? (known ? descriptor.label : `Unknown status: ${status}`)
  const explanation = hint ?? descriptor.hint
  const iconSize = size === 'md' ? 14 : 12

  const chip = (
    <span
      id={id}
      className={clsx(
        'inline-flex max-w-full items-center gap-1 align-middle whitespace-nowrap',
        size === 'md' ? 'text-xs' : 'text-2xs',
        variant === 'wash'
          ? clsx('pb-hairline rounded-hair px-1.5 py-px', toneClasses[descriptor.tone])
          : variant === 'quiet'
            ? 'text-ink-faint'
            : toneInk[descriptor.tone],
        className
      )}
      data-status={status}
      data-status-tone={descriptor.tone}
    >
      <StatusIcon shape={descriptor.shape} size={iconSize} className="shrink-0" />
      <span className={variant === 'quiet' ? 'sr-only' : 'truncate'}>{word}</span>
      {detail !== undefined && <span className="pb-figures text-ink-muted">{detail}</span>}
    </span>
  )

  // The tooltip only enhances; every word above is already on screen.
  return (
    <Tooltip label={explanation} withArrow openDelay={250} multiline maw={280}>
      {chip}
    </Tooltip>
  )
}
