import { Tooltip } from '@mantine/core'
import { Panel, PanelGrid, SectionHeading, StatusChip } from '@/@panther.core/components'
import { formatUtc } from '@/app/format'
import { useBuildReport } from '@/features/build/hooks'
import { ReleaseChanges } from '@/features/release/components/ReleaseChanges'
import { ReleaseContents } from '@/features/release/components/ReleaseContents'
import { ReleaseCoverage } from '@/features/release/components/ReleaseCoverage'
import { readCurrency, readRelease } from '@/features/release/vocabulary'

/**
 * The release, for a reader who does not run the pipeline.
 *
 * A second lens on the same `BuildReport`, not a second application: nothing here parses anything,
 * and every figure is the one the build record shows. What changes is the question being answered.
 * The record asks *how far did the build get and what is wrong with it*; this asks *what is in this
 * library and what moved since the last one*.
 *
 * The order is the reader's order, not the pipeline's: what this release is, whether it is finished,
 * what it contains, what changed, and how much of the previous library's annotation survived. The
 * phase spine, Make goals, artifact timestamps, the config ledger and the schema version are all
 * absent by design - they are in the build record, one click away, for whoever needs them.
 */
export const ReleaseView = () => {
  const report = useBuildReport()
  const { identity, comparison, consistency } = report
  const readiness = readRelease(report.pipeline)
  const currency = readCurrency(report)

  const readinessStatus =
    readiness.tone === 'complete' ? 'complete' : readiness.tone === 'attention' ? 'warn' : 'active'

  return (
    <div className="space-y-gutter">
      <header
        className="bg-surface-raised rounded-panel pb-raised pb-hairline px-4 py-3"
        aria-label="Release header"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-ink text-lede font-semibold">
            {identity.libraryLabel ?? 'PANTHER library'}
          </h1>
          <StatusChip status={readinessStatus} label={readiness.headline} size="md" />
        </div>

        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-ink-faint text-2xs">Succeeds</dt>
            <dd className="text-ink pb-ident text-2xs">
              {identity.previousLibraryLabel ?? 'no previous library recorded'}
            </dd>
          </div>
          {/* The ACTIVE data directory, never the declared release version. On the captured
              report those disagree - the build declares QfO 2026_02 and reads
              ref_prot_2026_01 - and showing the declared value here would tell a reader the
              library was built from proteomes it never saw. This is the audience most likely to
              cite that number in a release note, so it shows what was used and flags the
              disagreement rather than quietly picking one. */}
          <div className="flex items-baseline gap-1.5">
            <dt className="text-ink-faint text-2xs">Reference proteomes used</dt>
            <dd className="text-ink pb-ident text-2xs">
              {consistency.qfoActiveDataDir ?? identity.qfoDataDir ?? 'not recorded'}
            </dd>
            {consistency.qfoReleaseMatchesDataDir === false && (
              <dd>
                <Tooltip
                  label={`The build declares reference-proteome release ${
                    consistency.qfoDeclaredRelease ?? 'unknown'
                  }, but read its data from the path above. The path is what the library was built from.`}
                  withArrow
                  multiline
                  maw={320}
                >
                  <span>
                    <StatusChip
                      status="warn"
                      label={`declared ${consistency.qfoDeclaredRelease ?? 'a different release'}`}
                    />
                  </span>
                </Tooltip>
              </dd>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-ink-faint text-2xs">Page written</dt>
            <dd className="text-ink pb-figures text-2xs">{formatUtc(identity.generatedAt)}</dd>
          </div>
        </dl>

        {(readiness.outstanding !== null || readiness.skipped !== null || currency !== null) && (
          <div className="text-ink-muted mt-2 space-y-1 text-xs">
            {readiness.outstanding !== null && (
              <p className="max-w-prose">{readiness.outstanding}</p>
            )}
            {/* A skipped validation step is a build fact with release consequences, so it is
                translated rather than dropped: the figures below were produced without it. */}
            {readiness.skipped !== null && (
              <p className="flex max-w-prose flex-wrap items-baseline gap-x-1.5">
                <StatusChip status="warn" label="Not fully validated" />
                <span>{readiness.skipped}</span>
              </p>
            )}
            {currency !== null && <p className="max-w-prose">{currency}</p>}
          </div>
        )}
      </header>

      <ReleaseContents />

      <SectionHeading level={2} description="Against the library this one succeeds.">
        What changed
      </SectionHeading>
      <ReleaseChanges />

      <SectionHeading
        level={2}
        description="How much of the previous library's annotation was matched into this one."
      >
        Annotation carried forward
      </SectionHeading>
      <ReleaseCoverage />

      <PanelGrid minColumnWidth={420}>
        <Panel
          title="Where this came from"
          subtitle="the build behind this release"
          density="tight"
        >
          <p className="text-ink-muted max-w-prose text-xs">
            Every figure on this page comes from a report generated against the build target{' '}
            <span className="pb-ident text-ink">{identity.target ?? 'unknown'}</span>. The build
            record shows the pipeline that produced it — the phases, the individual steps, the
            configuration it ran with, and the checks this dashboard derived.
          </p>
          <p className="text-ink-faint text-2xs mt-1.5">
            {comparison.contributors.length} report{' '}
            {comparison.contributors.length === 1 ? 'section' : 'sections'} fed the comparison
            above.
          </p>
        </Panel>
      </PanelGrid>
    </div>
  )
}

export default ReleaseView
