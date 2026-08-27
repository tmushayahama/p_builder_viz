import clsx from 'clsx'
import { ABSENT_MARK } from '@/@panther.core/vocabulary'

/**
 * A signed change: a count, a percent, or a percentage point.
 *
 * Two rules are doing the work here.
 *
 * The sign is never carried by colour alone - there is always an explicit `+`
 * or `-` and a direction arrow, so the figure reads under protanopia and in a
 * monochrome print.
 *
 * And `sentiment` defaults to `none`, which keeps the figure in plain ink. In
 * this domain a rise is not automatically good: a species count that fell may
 * be a rename rather than a loss, and painting every decrease red would make
 * the release comparison lie. A view opts into good/bad colouring only where
 * the direction genuinely has a polarity, e.g. assignment percentage.
 */
export interface DeltaValueProps {
  /** The change itself, already signed. `null`/`undefined` renders as absent. */
  value: number | null | undefined
  kind?: 'count' | 'percent' | 'percentage-point' | 'ratio'
  /** Colour opt-in. `none` (the default) keeps the figure in ink. */
  sentiment?: 'none' | 'higher-is-better' | 'lower-is-better'
  /** Decimal places. Defaults: 0 for counts, 1 for the rest. */
  precision?: number
  /** Why the change is unknown, shown beside the absent mark. */
  absentReason?: string
  /** What the change is measured against, e.g. `vs PANTHER19.0`. */
  compareLabel?: string
  className?: string
}

const UNIT: Record<NonNullable<DeltaValueProps['kind']>, string> = {
  count: '',
  percent: ' %',
  'percentage-point': ' pp',
  ratio: '×',
}

export const DeltaValue = ({
  value,
  kind = 'count',
  sentiment = 'none',
  precision,
  absentReason,
  compareLabel,
  className,
}: DeltaValueProps) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return (
      <span className={clsx('text-ink-faint inline-flex items-baseline gap-1', className)}>
        <span className="pb-figures">{ABSENT_MARK}</span>
        {absentReason && <span className="text-2xs">{absentReason}</span>}
      </span>
    )
  }

  const digits = precision ?? (kind === 'count' ? 0 : 1)
  const magnitude = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '–'

  const good =
    sentiment === 'none' || value === 0
      ? null
      : sentiment === 'higher-is-better'
        ? value > 0
        : value < 0

  return (
    <span
      className={clsx(
        'pb-figures inline-flex items-baseline gap-1 whitespace-nowrap',
        good === null ? 'text-ink' : good ? 'text-status-pass' : 'text-status-warn',
        className
      )}
      data-delta-sign={value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero'}
    >
      <span aria-hidden="true" className="text-3xs leading-none">
        {arrow}
      </span>
      <span>
        {sign}
        {magnitude}
        {UNIT[kind]}
      </span>
      {compareLabel && <span className="text-ink-faint text-2xs">{compareLabel}</span>}
    </span>
  )
}
