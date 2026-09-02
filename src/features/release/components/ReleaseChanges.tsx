import { useMemo } from 'react'
import { Tooltip } from '@mantine/core'
import {
  DeltaValue,
  MetricValue,
  Panel,
  PanelGrid,
  StatusChip,
  TruncationNotice,
} from '@/@panther.core/components'
import { formatCount } from '@/app/format'
import { useBuildReport } from '@/features/build/hooks'
import { buildComparisonView } from '@/features/comparison/model'
import type { SpeciesChangeRow } from '@/features/comparison/model'
import { LINK_WORDING, readComparisonGap } from '@/features/release/vocabulary'

/**
 * What moved since the previous library. The reason this view exists.
 *
 * A lens over `buildComparisonView`, not a second derivation of it: the rankings, the
 * rename/replacement split, the recomputed percentages and the truncation bookkeeping are all
 * already computed for the build record, and re-deriving them here would eventually give the two
 * views two different accounts of the same release.
 *
 * Three of the readings shown are the dashboard's own, and all three say so:
 *
 *   A RENAME is taxonomy. `USTMA -> MYCMD` is Ustilago maydis becoming Mycosarcoma maydis, and
 *   `CRYNJ -> CRYD1` is a Cryptococcus strain redesignation. Both are inferred from an EXACT match
 *   between sequences removed and added, and both are held out of the rankings, because a
 *   reclassification is not biological change and would otherwise top the list of losses.
 *
 *   A REPLACEMENT is a different genome taking a departed one's place - `DAPPU -> DAPMA`, twelve
 *   per cent apart. Shown separately and counted as both a loss and a gain, because conflating it
 *   with a rename would misreport the release.
 *
 *   The COMPARISON ITSELF is assembled from whatever figures the report happens to carry, because
 *   the pipeline defines its dedicated previous-library artifact but no build path produces it. The
 *   page says so rather than presenting a partial comparison as a complete one.
 */
export const ReleaseChanges = () => {
  const report = useBuildReport()
  const view = useMemo(() => buildComparisonView(report), [report])
  const gap = readComparisonGap(report)
  const previousLabel = report.identity.previousLibraryLabel ?? 'the previous library'

  return (
    <div className="space-y-gutter">
      <Panel
        title="Library totals"
        subtitle={`against ${previousLabel}`}
        availability={view.summary.availability}
        message={view.summary.message ?? undefined}
        missingSubject="The previous-library comparison"
        density="tight"
        provenance="derived"
        footer={gap ?? undefined}
      >
        {view.metricsWithPrevious === 0 ? (
          <p className="text-ink-muted max-w-prose text-xs">
            No figure in this report can be compared against {previousLabel}.
          </p>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-x-6 gap-y-2 p-0 sm:grid-cols-2">
            {view.metrics.map(metric => (
              <li
                key={metric.metricId}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
              >
                <MetricValue metricId={metric.metricId} value={metric.current} />
                <span className="flex items-baseline gap-2">
                  <span className="pb-figures text-ink-faint text-2xs">
                    {metric.previous === null ? 'not reported' : formatCount(metric.previous)} →
                  </span>
                  <DeltaValue
                    value={metric.delta}
                    kind="count"
                    compareLabel={`vs ${previousLabel}`}
                    absentReason="the previous figure is not in this report"
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {(view.renames.length > 0 || view.replacements.length > 0) && (
        <Panel
          title="Renamed and replaced genomes"
          subtitle="read these before the gains and losses below"
          density="tight"
          provenance="derived"
          footer="Inferred by this dashboard from the sequence counts. The report does not state it."
        >
          <ul className="list-none space-y-1.5 p-0">
            {view.renames.map(link => (
              <li key={`${link.removed}-${link.added}`}>
                <LinkRow
                  wording={LINK_WORDING.rename}
                  status="pass"
                  removed={link.removed}
                  added={link.added}
                  detail={`${formatCount(link.addedCount)} sequences, an exact match — the same genome under a new code, so neither a gain nor a loss.`}
                />
              </li>
            ))}
            {view.replacements.map(link => (
              <li key={`${link.removed}-${link.added}`}>
                <LinkRow
                  wording={LINK_WORDING.replacement}
                  status="warn"
                  removed={link.removed}
                  added={link.added}
                  detail={`${formatCount(link.removedCount)} → ${formatCount(link.addedCount)} sequences. Close but not equal, so read it as one genome leaving and another arriving.`}
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <PanelGrid minColumnWidth={380}>
        <RankingPanel
          title="Largest decreases"
          subtitle="genomes with fewer sequences than before"
          rows={view.decreases}
          view={view}
          previousLabel={previousLabel}
        />
        <RankingPanel
          title="Largest increases"
          subtitle="genomes with more sequences than before"
          rows={view.increases}
          view={view}
          previousLabel={previousLabel}
        />
      </PanelGrid>
    </div>
  )
}

interface LinkRowProps {
  wording: { label: string; hint: string }
  status: 'pass' | 'warn'
  removed: string
  added: string
  detail: string
}

const LinkRow = ({ wording, status, removed, added, detail }: LinkRowProps) => (
  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
    <Tooltip label={wording.hint} withArrow multiline maw={320} openDelay={200}>
      <span>
        <StatusChip status={status} label={wording.label} />
      </span>
    </Tooltip>
    <span className="pb-ident text-ink text-xs">
      {removed} → {added}
    </span>
    <span className="text-ink-muted text-2xs">{detail}</span>
  </span>
)

interface RankingPanelProps {
  title: string
  subtitle: string
  rows: readonly SpeciesChangeRow[]
  view: ReturnType<typeof buildComparisonView>
  previousLabel: string
}

const RankingPanel = ({ title, subtitle, rows, view, previousLabel }: RankingPanelProps) => (
  <Panel
    title={title}
    subtitle={subtitle}
    availability={view.speciesAvailability}
    message={view.summary.speciesCounts.message ?? undefined}
    missingSubject="Per-genome sequence counts"
    density="tight"
    provenance="derived"
    footer={
      view.speciesCompleteness === undefined ? undefined : (
        // The scoping matters more here than in the build record. A reader who quotes "the
        // largest decrease in the release" from a partial table would be wrong, and this is the
        // audience most likely to quote it.
        <TruncationNotice
          completeness={view.speciesCompleteness}
          detail="These rankings cover only the genomes the report included."
        />
      )
    }
  >
    {rows.length === 0 ? (
      <p className="text-ink-muted text-xs">
        Nothing in this direction among the genomes the report included.
      </p>
    ) : (
      <ul className="list-none space-y-1 p-0">
        {rows.map(row => (
          <li key={row.oscode} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="pb-ident text-ink text-xs">{row.oscode}</span>
            <span className="flex items-baseline gap-2">
              <span className="pb-figures text-ink-faint text-2xs">
                {row.previousCount === null ? '—' : formatCount(row.previousCount)} →{' '}
                {row.currentCount === null ? '—' : formatCount(row.currentCount)}
              </span>
              <DeltaValue value={row.countDiff} kind="count" compareLabel={`vs ${previousLabel}`} />
            </span>
          </li>
        ))}
      </ul>
    )}
  </Panel>
)

export default ReleaseChanges
