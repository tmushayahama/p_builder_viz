import clsx from 'clsx'
import { Tooltip } from '@mantine/core'
import type { ProvenanceSource } from '@/@panther.core/vocabulary'

/**
 * Whether a finding was emitted by the report generator or derived by the
 * dashboard.
 *
 * This matters more than it looks: the dashboard is meant to become part of the
 * permanent build record, and a permanent record must never make a dashboard
 * inference indistinguishable from a generator-authored warning. So the two get
 * two treatments that differ in GLYPH (filled square vs hollow diamond) and in
 * BORDER STYLE (solid vs dashed), not in colour - both survive a monochrome
 * print and a PDF export.
 *
 * A real border is used here instead of the usual inset hairline ring, because
 * `border-style: dashed` is the half of the distinction that prints; an inset
 * box-shadow cannot be dashed.
 */
export interface ProvenanceProps {
  source: ProvenanceSource
  /** What produced it: a section id, a check id, or a short sentence. */
  detail?: string
  /** `marker` is glyph-only for a dense table cell; the word stays in the tooltip. */
  variant?: 'chip' | 'inline' | 'marker'
  className?: string
}

const WORD: Record<ProvenanceSource, string> = {
  generator: 'Generator',
  derived: 'Derived',
}

const EXPLANATION: Record<ProvenanceSource, string> = {
  generator: 'Emitted by the report generator and stored in the build JSON.',
  derived: 'Computed by this dashboard from the report; not part of the generated JSON.',
}

const Glyph = ({ source }: { source: ProvenanceSource }) => (
  <svg viewBox="0 0 10 10" width={9} height={9} aria-hidden="true" focusable="false">
    {source === 'generator' ? (
      <rect x="1.5" y="1.5" width="7" height="7" fill="currentColor" />
    ) : (
      <path d="M5 1 9 5 5 9 1 5z" fill="none" stroke="currentColor" strokeWidth="1.4" />
    )}
  </svg>
)

export const Provenance = ({ source, detail, variant = 'chip', className }: ProvenanceProps) => {
  const word = WORD[source]
  const tooltip = detail ? `${EXPLANATION[source]} ${detail}` : EXPLANATION[source]

  const body = (
    <span
      className={clsx(
        'text-ink-muted text-2xs inline-flex max-w-full items-center gap-1 align-middle whitespace-nowrap',
        variant === 'chip' &&
          clsx(
            'border-hairline-strong rounded-hair border px-1.5 py-px',
            source === 'derived' ? 'border-dashed' : 'border-solid'
          ),
        className
      )}
      data-provenance={source}
      aria-label={variant === 'marker' ? `${word}: ${tooltip}` : undefined}
    >
      <Glyph source={source} />
      {variant !== 'marker' && <span className="uppercase">{word}</span>}
      {variant !== 'marker' && detail && (
        <span className="pb-ident text-ink-faint truncate normal-case">{detail}</span>
      )}
    </span>
  )

  return (
    <Tooltip label={tooltip} withArrow openDelay={250} multiline maw={280}>
      {body}
    </Tooltip>
  )
}
