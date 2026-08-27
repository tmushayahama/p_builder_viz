import { Panel, Provenance } from '@/@panther.core/components'
import { useHashTarget } from '@/@panther.core/hooks'
import { plural } from '@/app/format'
import { CheckList } from '@/features/checks/components/CheckList'
import { ChecksSummary } from '@/features/checks/components/ChecksSummary'
import { ConfigTiers } from '@/features/checks/components/ConfigTiers'
import { CheckRow } from '@/features/checks/components/CheckRow'
import { useChecks } from '@/features/checks/hooks'

/**
 * The derived checks, build-wide.
 *
 * This panel is the INDEX, not the primary experience. The brief is explicit that a disconnected
 * warning page must not be where investigation happens, so every row links to the phase, step,
 * configuration value or species it is about, and the small markers this feature exports put the
 * same findings next to those things. What the panel adds is the reading a scattered set of markers
 * cannot give: how many findings there are, how many the report itself raised versus how many this
 * dashboard derived, and what was verified.
 *
 * No panel-level `provenance` is set, deliberately: this panel holds both kinds and each row states
 * its own. A single header chip would be a claim about the whole list that is not true.
 */
const ChecksPanel = () => {
  const { checks, summary, suppressed } = useChecks()
  const target = useHashTarget()
  const highlightId = target.isRecent ? target.id : null

  return (
    <div className="space-y-gutter" data-checks-panel="">
      <Panel
        title="Checks"
        subtitle="derived from this report"
        density="tight"
        status={<ChecksSummary summary={summary} />}
        footer={
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>
              {summary.total} {plural(summary.total, 'finding')}: {summary.generatorIssues} emitted
              by the report generator, {summary.total - summary.generatorIssues} derived here.
            </span>
            <Provenance source="generator" detail="emitted by the report generator" />
            <Provenance source="derived" detail="computed by this dashboard" />
          </span>
        }
      >
        <div className="space-y-2">
          <p className="text-ink-muted max-w-prose text-xs">
            The report generator emits warnings; everything else here is this dashboard reading the
            report. Both are shown, each marked with where it came from, because a permanent build
            record must never make an inference look like something the generator wrote.
          </p>

          <CheckList checks={checks} highlightId={highlightId} />

          {suppressed.length > 0 && (
            <section data-check-group="suppressed" className="pt-1">
              <div className="pb-hairline-b flex flex-wrap items-baseline gap-x-2 pb-0.5">
                <h4 className="text-ink text-2xs font-semibold tracking-wide uppercase">
                  Suppressed as duplicates
                </h4>
                <span className="text-ink-faint text-2xs">
                  Derived findings a generator warning already describes. Kept visible: that the
                  dashboard reached the same conclusion independently is worth recording, and
                  reporting it twice would inflate the issue count.
                </span>
              </div>
              <ul className="list-none p-0">
                {suppressed.map(finding => (
                  <CheckRow key={finding.id} finding={finding} compact />
                ))}
              </ul>
            </section>
          )}
        </div>
      </Panel>

      <ConfigTiers />
    </div>
  )
}

export default ChecksPanel
