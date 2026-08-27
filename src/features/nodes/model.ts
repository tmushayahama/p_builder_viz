/**
 * Node forward tracking, prepared for the view: the per-node-type rows and the two derived
 * statements the panel opens with.
 *
 * The by-type table is nominal, not ordinal: five kinds of node, no ordering between them. So they
 * all take ONE fill and the bars are never ramped by value - a colour ramp over nominal categories
 * invents a magnitude that the categories do not have. `UNKNOWN` at 0 of 362 is the row that
 * matters, and it is the row a bar chart cannot draw, so it is labelled explicitly rather than left
 * as an invisible zero-width bar.
 *
 * The coverage statement exists because the species rows and the headline count different things:
 * the 131 species rows sum to exactly the LEAF total, so the distribution below them is a LEAF
 * distribution, while the headline percentage spans all five node types. Without saying that, two
 * legitimate percentages in one panel look like a contradiction.
 */

import { formatCount, plural } from '@/app/format'
import type { NodeTrackingSummary, NodeTypeTracking } from '@/features/build/model'
import { formatPercent, formatPercentTerse } from '@/features/species/model/format'
import type { DistributionModel } from '@/features/species/model/distribution'

export interface NodeTypeRow {
  nodeType: string
  mapped: number | null
  total: number | null
  pct: number | null
  unmapped: number | null
  /** Measured zero, not absent: a bar of no length that still has to be readable. */
  isZero: boolean
  /** `0 % of 362 nodes` - drawn beside the mark, because the mark has no length. */
  markLabel: string
}

export interface NodeTypeModel {
  rows: readonly NodeTypeRow[]
  /** Node types given a direct label: the leader and every measured zero. */
  labelled: readonly string[]
  zeroRows: readonly NodeTypeRow[]
  /** Types the report listed without a readable percentage. */
  unreadable: readonly NodeTypeRow[]
}

function toRow(entry: NodeTypeTracking): NodeTypeRow {
  const pct = entry.pct ?? entry.recomputedPct ?? null
  const { mapped, total } = entry
  const unmapped =
    typeof mapped === 'number' && typeof total === 'number' ? Math.max(0, total - mapped) : null

  return {
    nodeType: entry.nodeType,
    mapped,
    total,
    pct,
    unmapped,
    isZero: pct === 0 || mapped === 0,
    markLabel: `${formatPercentTerse(pct)} of ${formatCount(total)} nodes`,
  }
}

export function buildNodeTypes(tracking: NodeTrackingSummary): NodeTypeModel {
  const rows = tracking.byType
    .map(toRow)
    .slice()
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || a.nodeType.localeCompare(b.nodeType))

  const readable = rows.filter(row => row.pct !== null)
  const zeroRows = rows.filter(row => row.pct === 0)
  const leader = readable.length > 0 ? [readable[0].nodeType] : []

  return {
    rows,
    labelled: [...new Set([...leader, ...zeroRows.map(row => row.nodeType)])],
    zeroRows,
    unreadable: rows.filter(row => row.pct === null),
  }
}

/* -- The two opening statements ------------------------------------------------------------ */

/** What the headline percentage covers, and how tight the species distribution around it is. */
export function trackingHeadlineSentence(
  tracking: NodeTrackingSummary,
  distribution: DistributionModel
): string {
  const pct = tracking.pctMapped ?? tracking.recomputedPctMapped
  const overall =
    `${formatPercentTerse(pct)} of ${formatCount(tracking.nodesTotal)} nodes tracked forward ` +
    `from the previous library.`

  if (distribution.speciesCount === 0) return overall

  const spread =
    distribution.medianPct === null
      ? `${formatCount(distribution.speciesCount)} species are reported individually.`
      : `Across the ${formatCount(distribution.speciesCount)} reported species the median is ` +
        `${formatPercentTerse(distribution.medianPct)} with a median absolute deviation of ` +
        `${formatPercentTerse(distribution.madPct, 1)}, and ` +
        `${formatCount(distribution.atOrAboveThreshold)} of them sit at or above ` +
        `${formatPercentTerse(distribution.threshold, 0)}: the distribution is tight and the ` +
        `interest is in the tail.`

  return `${overall} ${spread}`
}

export interface SpeciesCoverageFact {
  speciesNodeTotal: number | null
  leafTotal: number | null
  /** True when the species rows sum to exactly one node type's total. */
  matchedType: string | null
  sentence: string
}

/**
 * Which nodes the per-species rows actually cover.
 *
 * Derived by addition, not asserted: the species totals are summed and compared against each
 * node-type total, and the sentence only names a type when the sum matches one exactly.
 */
export function speciesCoverageFact(
  tracking: NodeTrackingSummary,
  distribution: DistributionModel
): SpeciesCoverageFact {
  const speciesNodeTotal = distribution.nodesInSpeciesRows
  const leaf = tracking.byType.find(entry => entry.nodeType === 'LEAF') ?? null
  const matched =
    speciesNodeTotal === null
      ? null
      : (tracking.byType.find(entry => entry.total === speciesNodeTotal) ?? null)
  const typeCount = tracking.byType.length

  const sentence =
    speciesNodeTotal === null
      ? 'The report does not give per-species node totals, so what the species rows cover cannot ' +
        'be established from this report.'
      : matched !== null
        ? `The ${formatCount(distribution.speciesCount)} species rows sum to ` +
          `${formatCount(speciesNodeTotal)} nodes - exactly the ${matched.nodeType} total - so ` +
          `this distribution is a ${matched.nodeType} distribution, while the headline ` +
          `percentage spans all ${formatCount(typeCount)} node ` +
          `${plural(typeCount, 'type')}. Two different denominators, not a contradiction.`
        : `The ${formatCount(distribution.speciesCount)} species rows sum to ` +
          `${formatCount(speciesNodeTotal)} nodes, which matches no single node-type total, so ` +
          'they cover a mixture this report does not break down.'

  return {
    speciesNodeTotal,
    leafTotal: leaf?.total ?? null,
    matchedType: matched?.nodeType ?? null,
    sentence,
  }
}

/** `0 of 362 nodes (0 %)` - the sentence a zero-length bar cannot carry on its own. */
export function zeroTypeSentence(row: NodeTypeRow): string {
  return (
    `${row.nodeType}: ${formatCount(row.mapped)} of ${formatCount(row.total)} nodes tracked ` +
    `forward (${formatPercent(row.pct)}). A measured zero, not a missing measurement.`
  )
}
