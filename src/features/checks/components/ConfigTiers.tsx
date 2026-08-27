import type { ReactNode } from 'react'
import { CodeBlock, DataTable, KeyValueList, Panel, Provenance } from '@/@panther.core/components'
import type { DataColumn, KeyValueItem } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { configElementId } from '@/features/build/model'
import type { ConfigLineageEntry } from '@/features/build/model'
import { useBuildReport } from '@/features/build/hooks'
import { useChecks } from '@/features/checks/hooks'
import { ConfigCheckMarker } from '@/features/checks/components/ConfigCheckMarker'

/**
 * The configuration read in three tiers, with the evidence attached.
 *
 * This panel exists because the naive reading of this config is wrong in a specific, expensive way.
 * Roughly a third of it legitimately points at previous releases: nineteen `PREV_*` variables at
 * PANTHER19.0, two `PREV_PREV_*` at 17.0, pathway and Protein Class inputs carried forward. A rule
 * that flagged every older-release reference produces about twenty-five findings, and the one that
 * matters - a declared QfO release that disagrees with the path actually in force - is then
 * indistinguishable from the noise.
 *
 * So the tiers are three different claims, in decreasing order of consequence:
 *
 *   Mismatch   the evidence supports a real discrepancy. Counted. Shown with the literal
 *              `config.mk` snapshot, including the commented-out line the finding rests on -
 *              paraphrasing that line would leave the reader unable to check the reasoning.
 *   Notable    inheritance worth explaining to someone reading this record years from now. Visible,
 *              not a warning, counted as nothing.
 *   Lineage    the expected release relationships, shown as a satisfied pattern. Positive evidence,
 *              display-only.
 *
 * The mismatch and notable rows own their `config--<key>` anchors, so a check that points at a
 * configuration value lands on the value itself. The lineage table deliberately does not: two of
 * its keys are also notable, and one DOM id per key is the rule.
 */

const lineageColumns: readonly DataColumn<ConfigLineageEntry>[] = [
  {
    id: 'key',
    header: 'Variable',
    kind: 'mono',
    render: entry => entry.key,
    sortValue: entry => entry.key,
  },
  {
    id: 'release',
    header: 'Release',
    kind: 'mono',
    align: 'right',
    width: 80,
    render: entry => (entry.release === null ? '—' : `PANTHER${entry.release}.0`),
    sortValue: entry => entry.release,
  },
  {
    id: 'value',
    header: 'Value',
    kind: 'mono',
    render: entry => entry.value,
    sortValue: entry => entry.value,
  },
]

const Tier = ({
  id,
  heading,
  claim,
  children,
}: {
  id: string
  heading: string
  claim: string
  children: ReactNode
}) => (
  <section data-config-tier={id} className="space-y-1">
    <div className="pb-hairline-b flex flex-wrap items-baseline gap-x-2 pb-0.5">
      <h4 className="text-ink text-2xs font-semibold tracking-wide uppercase">{heading}</h4>
      <span className="text-ink-faint text-2xs">{claim}</span>
    </div>
    {children}
  </section>
)

export const ConfigTiers = () => {
  const report = useBuildReport()
  const { config, consistency } = report
  const { byTier } = useChecks()

  const notableKeys = byTier.notable
    .map(finding => finding.configKey)
    .filter((key): key is string => key !== null)

  const mismatchItems: KeyValueItem[] = [
    {
      key: 'QFO_RELEASE_VERSION',
      anchorId: configElementId('QFO_RELEASE_VERSION'),
      label: 'QFO_RELEASE_VERSION',
      value: config.qfoReleaseVersion,
      absentReason: 'not declared',
      attention: consistency.qfoReleaseMatchesDataDir === false,
      aside: <ConfigCheckMarker configKey="QFO_RELEASE_VERSION" />,
    },
    {
      key: 'QFO_DATA_DIR',
      anchorId: configElementId('QFO_DATA_DIR'),
      label: 'QFO_DATA_DIR (in force)',
      value: config.qfoDataDir,
      absentReason: 'not resolved',
      attention: consistency.qfoReleaseMatchesDataDir === false,
      aside: <ConfigCheckMarker configKey="QFO_DATA_DIR" />,
    },
  ]

  const ledgerItems: KeyValueItem[] = [
    {
      key: 'panther_build_dirty',
      anchorId: configElementId('panther_build_dirty'),
      label: 'Source tree at build time',
      value:
        config.sourceDirty === null
          ? null
          : config.sourceDirty
            ? 'dirty — uncommitted changes'
            : 'clean',
      mono: false,
      attention: config.sourceDirty === true,
      absentReason: 'not reported',
      aside: <ConfigCheckMarker configKey="panther_build_dirty" />,
    },
    {
      key: 'unresolved_vars',
      anchorId: configElementId('unresolved_vars'),
      label: 'Unresolved variables',
      value: config.unresolvedVars.length === 0 ? 'none' : config.unresolvedVars.join(', '),
      mono: config.unresolvedVars.length > 0,
      attention: config.unresolvedVars.length > 0,
      aside: <ConfigCheckMarker configKey="unresolved_vars" />,
    },
  ]

  const notableItems: KeyValueItem[] = notableKeys.map(key => ({
    key,
    anchorId: configElementId(key),
    label: key,
    value: config.values[key] === '' ? '(declared empty)' : (config.values[key] ?? null),
    absentReason: 'not in the captured configuration',
    aside: <ConfigCheckMarker configKey={key} />,
  }))

  const lineageItems: KeyValueItem[] = [
    {
      key: 'PREV_RELEASE_DIR',
      anchorId: configElementId('PREV_RELEASE_DIR'),
      label: 'PREV_RELEASE_DIR',
      value: config.previousReleaseDir,
      absentReason: 'not resolved',
      aside: <ConfigCheckMarker configKey="PREV_RELEASE_DIR" />,
    },
  ]

  const commented = consistency.qfoCommentedEvidence[0] ?? null
  const snapshotNote =
    commented === null
      ? 'The captured snapshot, with the QfO lines marked.'
      : `The captured snapshot, with the QfO lines marked. Line ${commented.line} is the ` +
        `commented-out export for ${commented.key}: evidence that the path was switched ` +
        'deliberately and the declared release was not switched with it.'

  const lineageRows = [...config.previousLineage, ...config.previousPreviousLineage]
  const highlightLines = [
    ...consistency.qfoCommentedEvidence.map(entry => entry.line),
    ...config.fileEntries
      .filter(entry => entry.key === 'QFO_DATA_DIR' || entry.key === 'QFO_RELEASE_VERSION')
      .map(entry => entry.line),
  ].filter((line): line is number => line !== null)

  return (
    <Panel
      title="Configuration read in three tiers"
      subtitle={config.configFile ?? 'config.mk'}
      availability={config.availability}
      message={config.message ?? undefined}
      missingSubject="The configuration ledger"
      provenance="derived"
      density="tight"
      status={
        <span className="text-ink-faint text-2xs">
          {byTier.mismatch.length} mismatch · {byTier.notable.length} notable ·{' '}
          {config.previousLineage.length + config.previousPreviousLineage.length} lineage
        </span>
      }
    >
      <div className="space-y-3">
        <Tier
          id="mismatch"
          heading="Mismatch"
          claim="The evidence supports a real discrepancy. These count as issues."
        >
          <KeyValueList items={mismatchItems} labelWidth={24} />
          <KeyValueList items={ledgerItems} labelWidth={24} />
          {config.configFileContents !== null && (
            <CodeBlock
              code={config.configFileContents}
              filename={config.configFile ?? 'config.mk'}
              highlightLines={highlightLines}
              maxHeight={200}
              highlightNote={
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span>{snapshotNote}</span>
                  <Provenance source="generator" detail="config_file_contents" />
                </span>
              }
            />
          )}
        </Tier>

        {notableItems.length > 0 && (
          <Tier
            id="notable"
            heading="Notable"
            claim="Worth explaining, not known to be wrong. Visible, counted as nothing."
          >
            <KeyValueList items={notableItems} labelWidth={24} />
            <p className="text-ink-faint text-2xs max-w-prose">
              Each of these has a sentence in the checks list above. They are here so that a
              reviewer reading this record in five years does not have to reconstruct why a 20.0
              build read an 18.0 Protein Class file.
            </p>
          </Tier>
        )}

        <Tier
          id="lineage"
          heading="Lineage"
          claim="Expected release relationships, shown as a satisfied pattern. Display-only."
        >
          <KeyValueList items={lineageItems} labelWidth={24} />
          {lineageRows.length > 0 && (
            <DataTable
              columns={lineageColumns}
              rows={lineageRows}
              rowKey={entry => entry.key}
              caption={`${lineageRows.length} previous-release ${plural(
                lineageRows.length,
                'variable'
              )}`}
              captionVisible={false}
              pageSize={8}
              defaultSort={{ columnId: 'key', direction: 'asc' }}
            />
          )}
        </Tier>
      </div>
    </Panel>
  )
}
