/**
 * Cross-section facts already joined, so a check does not have to re-join them.
 *
 * The derived-checks layer sits above the model and turns these into pass/warn findings. The model
 * only assembles the evidence: which numbers should agree, whether they do, and where each came
 * from. Positive evidence matters as much as failures - on this fixture the LEAF node total equals
 * the library sequence count exactly, and four independent family counts agree at 15,797.
 */

import type {
  AgreementFact,
  ConfigSummary,
  ConsistencyFacts,
  LibrarySummary,
  MappingSummary,
  MetricId,
  NodeTrackingSummary,
  OtherReportsSummary,
  TreeSummary,
} from './types'

function agreement(id: string, label: string, values: AgreementFact['values']): AgreementFact {
  const present = values.filter(entry => entry.value !== null).map(entry => entry.value as number)
  return {
    id,
    label,
    values,
    allEqual: present.length > 1 && present.every(value => value === present[0]),
    comparable: present.length > 1,
  }
}

export interface ConsistencyInput {
  mapping: MappingSummary
  library: LibrarySummary
  trees: TreeSummary
  nodeTracking: NodeTrackingSummary
  otherReports: OtherReportsSummary
  config: ConfigSummary
}

export function buildConsistencyFacts(input: ConsistencyInput): ConsistencyFacts {
  const { mapping, library, trees, nodeTracking, otherReports, config } = input

  const finalStage = mapping.stages[mapping.stages.length - 1] ?? null
  const leaf = nodeTracking.byType.find(entry => entry.nodeType === 'LEAF') ?? null

  const familyAgreement = agreement('family-count-agreement', 'Family count across major stages', [
    {
      label: 'Final mapping stage',
      value: finalStage?.families ?? null,
      source: `mapping.rows[stage=${finalStage?.stage ?? 'final'}].n_families`,
    },
    { label: 'Library', value: library.families, source: 'library.families' },
    { label: 'GIGA books', value: trees.booksTotal, source: 'giga.books_total' },
    { label: 'Trees succeeded', value: trees.treesSucceeded, source: 'giga.trees_succeeded' },
  ])

  const leafLibraryAgreement = agreement(
    'leaf-library-agreement',
    'LEAF node total against library sequences',
    [
      {
        label: 'LEAF nodes',
        value: leaf?.total ?? null,
        source: 'node_tracking.by_type[LEAF].total',
      },
      { label: 'Library sequences', value: library.sequences, source: 'library.sequences' },
    ]
  )

  const sequenceCounts: { metricId: MetricId; value: number | null; source: string }[] = [
    {
      metricId: 'prevLibSequences',
      value: otherReports.values.prev_lib_sequences ?? null,
      source: 'other_reports.prev_lib_sequences',
    },
    {
      metricId: 'inputReferenceSequences',
      value: mapping.inputSequences,
      source: 'mapping.rows[0].total_seqs',
    },
    {
      metricId: 'finalStageSequences',
      value: mapping.finalTotalSequences,
      source: `mapping.rows[stage=${finalStage?.stage ?? 'final'}].total_seqs`,
    },
    {
      metricId: 'assignedSequences',
      value: mapping.finalAssigned,
      source: `mapping.rows[stage=${finalStage?.stage ?? 'final'}].assigned`,
    },
    { metricId: 'librarySequences', value: library.sequences, source: 'library.sequences' },
    {
      metricId: 'leafNodesMapped',
      value: leaf?.mapped ?? null,
      source: 'node_tracking.by_type[LEAF].mapped',
    },
  ]

  const declaredRelease = config.qfoReleaseVersion
  const activeDataDir = config.qfoDataDir

  return {
    familyAgreement,
    leafLibraryAgreement,
    treeCompleteness: {
      booksTotal: trees.booksTotal,
      treesSucceeded: trees.treesSucceeded,
      emptyTrees: trees.emptyTrees,
      complete:
        trees.booksTotal !== null &&
        trees.treesSucceeded !== null &&
        trees.booksTotal === trees.treesSucceeded &&
        trees.emptyTrees === 0,
    },
    sequenceCounts,
    unresolvedVars: config.unresolvedVars,
    sourceDirty: config.sourceDirty,
    qfoDeclaredRelease: declaredRelease,
    qfoActiveDataDir: activeDataDir,
    qfoReleaseMatchesDataDir:
      declaredRelease === null || activeDataDir === null
        ? null
        : activeDataDir.includes(declaredRelease),
    // The commented-out QfO line in the captured config.mk is the evidence a mismatch rests on.
    qfoCommentedEvidence: config.commentedEntries.filter(entry =>
      entry.key.toUpperCase().includes('QFO')
    ),
  }
}
