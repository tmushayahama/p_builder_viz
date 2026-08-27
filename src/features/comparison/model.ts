/**
 * Presentation model for the previous-library comparison, and the truncation rules that govern it.
 *
 * Truncation honesty comes first here because it constrains everything else. All three tables in
 * `other_reports` are subsets - 50 of 147, 20 of 132, 20 of 813 - and the model already says so
 * through `allowClientSort` / `allowClientFilter`. This module turns those flags into the
 * `Completeness` the shared `DataTable` takes, which is what withholds sort and filter, and into
 * the scoping phrase every derived statement over a partial table has to carry. Sorting 50 of 147
 * rows by count and reading off the top row is exactly the wrong answer this prevents.
 *
 * The second rule is that renames must not dominate the rankings. `USTMA`/`MYCMD` and
 * `CRYNJ`/`CRYD1` are exact-count pairs: a drop of 6,788 and a matching addition of 6,788 is one
 * organism under a new oscode, not the release's largest loss followed by its largest gain. Those
 * four oscodes are excluded from the gain/loss rankings. The lower-confidence `DAPPU`/`DAPMA`
 * replacement is NOT excluded - the counts differ by 12 %, so part of that change is real - but it
 * is marked inline wherever it appears.
 *
 * The third is that every change is recomputed. The report's own `pct_change` column stores a
 * fraction (`-1.0` for a complete removal), so the model's `percentChange` is used everywhere and
 * `reportedPctChange` is carried only as provenance.
 */

import type { Completeness } from '@/@panther.core/vocabulary'
import type {
  Availability,
  BuildReport,
  ComparisonMetric,
  ComparisonSummary,
  DerivedTable,
  SpeciesLink,
  TableTruncation,
  UniprotMatchRow,
  UniRuleRow,
} from '@/features/build/model'
import { isAggregateOscode } from '@/features/build/model'

/* -- Truncation ---------------------------------------------------------------------------- */

/**
 * The `Completeness` a table's affordances are withheld by, or `undefined` when the report carries
 * the whole set. The decision follows the model's own flags rather than a second reading of the
 * row counts, so there is one place that decides what "complete" means.
 */
export function completenessOf(
  truncation: TableTruncation,
  noun = 'rows'
): Completeness | undefined {
  if (truncation.allowClientSort && truncation.allowClientFilter) return undefined
  return { included: truncation.includedRows, total: truncation.totalRows, noun }
}

/** The phrase a derived statement over a partial table must carry. */
export function scopePhrase(truncation: TableTruncation, noun = 'rows'): string {
  if (!truncation.truncated) return `across all ${truncation.includedRows.toLocaleString()} ${noun}`
  return `among the ${truncation.includedRows.toLocaleString()} ${noun} included in the report`
}

export type Ordering = 'ascending' | 'descending' | 'none'

/**
 * Whether the included rows are already ordered by a value.
 *
 * Worth stating: if the 50 species rows the report kept are its 50 largest changes, a ranking over
 * them is far more likely to be the release's real ranking. It is still only evidence about the
 * ORDER of the rows, never about the selection, so the wording stays hedged.
 */
export function orderingOf(values: readonly (number | null)[]): Ordering {
  const present = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  )
  if (present.length < 3) return 'none'
  let ascending = true
  let descending = true
  for (let index = 1; index < present.length; index += 1) {
    if (present[index] < present[index - 1]) ascending = false
    if (present[index] > present[index - 1]) descending = false
  }
  return ascending && !descending ? 'ascending' : descending && !ascending ? 'descending' : 'none'
}

/**
 * Columns a row does not carry.
 *
 * `ragged_rows` is a COUNT - 813 on the UniRules table - so a ragged table has to be shown as
 * "this row is missing `families`" rather than as a blank cell, which in a numeric column reads as
 * a measured zero.
 */
export function missingColumnsIn(rawRow: unknown, columns: readonly string[]): string[] {
  if (rawRow === null || typeof rawRow !== 'object') return [...columns]
  const record = rawRow as Record<string, unknown>
  return columns.filter(column => {
    const value = record[column]
    return value === undefined || value === null || value === ''
  })
}

export interface RaggedReading {
  /** The generator's own count, whatever the included rows look like. */
  reportedCount: number | null
  /** Rows in the included subset that are actually missing a declared column. */
  rowsMissingColumns: { rowKey: string; missingColumns: string[] }[]
  columns: string[]
}

export function readRagged<TRow>(
  table: DerivedTable<TRow>,
  rowKeyOf: (rawRow: unknown, index: number) => string
): RaggedReading {
  return {
    reportedCount: table.truncation.raggedRows,
    columns: table.columns,
    rowsMissingColumns: table.rawRows
      .map((rawRow, index) => ({
        rowKey: rowKeyOf(rawRow, index),
        missingColumns: missingColumnsIn(rawRow, table.columns),
      }))
      .filter(entry => entry.missingColumns.length > 0),
  }
}

/* -- Species changes ----------------------------------------------------------------------- */

export type LinkRole = 'removed' | 'added'

export interface SpeciesChangeRow {
  oscode: string
  previousCount: number | null
  currentCount: number | null
  countDiff: number | null
  /** Recomputed. `-100` for a complete removal, where the report stores `-1.0`. */
  percentChange: number | null
  /** The report's raw field, kept for provenance and never formatted as a percentage. */
  reportedPctChange: number | null
  isRemoval: boolean
  isAddition: boolean
  link: SpeciesLink | null
  linkRole: LinkRole | null
  /** True for an exact-count rename pair: it is not change, so it is out of the rankings. */
  excludedFromRankings: boolean
}

export interface ComparisonView {
  summary: ComparisonSummary
  /** Sections that fed the comparison, and the ones that did not. */
  presentSources: ComparisonSummary['contributors']
  missingSources: ComparisonSummary['contributors']
  metrics: ComparisonMetric[]
  metricsWithPrevious: number
  speciesRows: SpeciesChangeRow[]
  speciesTruncation: TableTruncation
  speciesCompleteness: Completeness | undefined
  speciesScope: string
  speciesOrdering: Ordering
  increases: SpeciesChangeRow[]
  decreases: SpeciesChangeRow[]
  /** Largest absolute change in the rankings, so both bar columns share one domain. */
  rankingMax: number
  renames: SpeciesLink[]
  replacements: SpeciesLink[]
  excludedOscodes: string[]
  addedRows: SpeciesChangeRow[]
  removedRows: SpeciesChangeRow[]
  uniprotRows: UniprotMatchRow[]
  uniprotTotals: UniprotMatchRow | null
  /** Proteomes the generator says it compared, which is not the number of rows it included. */
  uniprotProteomes: number | null
  uniprotTruncation: TableTruncation
  uniprotCompleteness: Completeness | undefined
  uniprotScope: string
  uniprotOrdering: Ordering
  /** Per-table availability, so a panel whose own table is missing degrades on its own. */
  speciesAvailability: Availability
  uniprotAvailability: Availability
  uniRuleAvailability: Availability
  uniRuleRows: UniRuleRow[]
  uniRuleTruncation: TableTruncation
  uniRuleCompleteness: Completeness | undefined
  uniRuleScope: string
  uniRuleRagged: RaggedReading
  /**
   * Species denominators that are NOT already shown as a release comparison above, so the same
   * label never appears twice on one page. `genomes` is the comparison row's own metric.
   */
  denominators: { metricId: 'speciesTotal' | 'speciesReported'; value: number | null }[]
  libraryGenomes: number | null
}

/**
 * Rows per ranking. Ten rather than a handful for one reason on this data: the `DAPPU` -> `DAPMA`
 * replacement sits ninth among the decreases, and it is the row that shows a large drop can be a
 * replacement rather than a loss.
 */
const RANKING_SIZE = 10

export function buildComparisonView(report: BuildReport): ComparisonView {
  const summary = report.comparison
  const speciesTable = summary.speciesCounts
  const uniprotTable = summary.uniprotAgreement
  const uniRuleTable = report.otherReports.uniRules

  const renames = summary.renames
  const replacements = summary.replacements
  const excludedOscodes = renames.flatMap(link => [link.removed, link.added])

  const linkFor = (oscode: string): { link: SpeciesLink; role: LinkRole } | null => {
    for (const link of [...renames, ...replacements]) {
      if (link.removed === oscode) return { link, role: 'removed' }
      if (link.added === oscode) return { link, role: 'added' }
    }
    return null
  }

  const speciesRows: SpeciesChangeRow[] = speciesTable.rows
    .filter(row => !isAggregateOscode(row.oscode))
    .map(row => {
      const matched = linkFor(row.oscode)
      return {
        oscode: row.oscode,
        previousCount: row.previousCount,
        currentCount: row.currentCount,
        countDiff: row.countDiff,
        percentChange: row.percentChange,
        reportedPctChange: row.reportedPctChange,
        isRemoval: row.isRemoval,
        isAddition: row.isAddition,
        link: matched?.link ?? null,
        linkRole: matched?.role ?? null,
        excludedFromRankings: excludedOscodes.includes(row.oscode),
      }
    })

  const rankable = speciesRows.filter(row => !row.excludedFromRankings && row.countDiff !== null)
  const increases = rankable
    .filter(row => (row.countDiff as number) > 0)
    .sort((a, b) => (b.countDiff as number) - (a.countDiff as number))
    .slice(0, RANKING_SIZE)
  const decreases = rankable
    .filter(row => (row.countDiff as number) < 0)
    .sort((a, b) => (a.countDiff as number) - (b.countDiff as number))
    .slice(0, RANKING_SIZE)

  const rankingMax = [...increases, ...decreases].reduce(
    (max, row) => Math.max(max, Math.abs(row.countDiff as number)),
    0
  )

  const uniprotRows = uniprotTable.rows.filter(row => !isAggregateOscode(row.oscode))

  return {
    summary,
    presentSources: summary.contributors.filter(entry => entry.present),
    missingSources: summary.contributors.filter(entry => !entry.present),
    metrics: summary.metrics,
    metricsWithPrevious: summary.metrics.filter(entry => entry.previous !== null).length,
    speciesRows,
    speciesTruncation: speciesTable.truncation,
    speciesCompleteness: completenessOf(speciesTable.truncation, 'species'),
    speciesScope: scopePhrase(speciesTable.truncation, 'species rows'),
    speciesOrdering: orderingOf(
      speciesRows.map(row => (row.countDiff === null ? null : Math.abs(row.countDiff)))
    ),
    increases,
    decreases,
    rankingMax,
    renames,
    replacements,
    excludedOscodes,
    addedRows: speciesRows.filter(row => row.isAddition),
    removedRows: speciesRows.filter(row => row.isRemoval),
    uniprotRows,
    uniprotTotals: summary.uniprotTotals,
    uniprotProteomes: report.otherReports.values.prev_uniprot_proteomes ?? null,
    uniprotTruncation: uniprotTable.truncation,
    uniprotCompleteness: completenessOf(uniprotTable.truncation, 'proteomes'),
    uniprotScope: scopePhrase(uniprotTable.truncation, 'proteome rows'),
    uniprotOrdering: orderingOf(uniprotRows.map(row => row.pctSameUniprot)),
    speciesAvailability: speciesTable.availability,
    uniprotAvailability: uniprotTable.availability,
    uniRuleAvailability: uniRuleTable.availability,
    uniRuleRows: uniRuleTable.rows,
    uniRuleTruncation: uniRuleTable.truncation,
    uniRuleCompleteness: completenessOf(uniRuleTable.truncation, 'UniRules'),
    uniRuleScope: scopePhrase(uniRuleTable.truncation, 'UniRule rows'),
    uniRuleRagged: readRagged(uniRuleTable, (rawRow, index) => {
      if (rawRow !== null && typeof rawRow === 'object') {
        const candidate = (rawRow as Record<string, unknown>).unirule
        if (typeof candidate === 'string' && candidate !== '') return candidate
      }
      return `row-${index + 1}`
    }),
    denominators: [
      { metricId: 'speciesTotal', value: report.otherReports.values.species_total ?? null },
      { metricId: 'speciesReported', value: report.nodeTracking.speciesReported },
    ],
    libraryGenomes: report.library.genomes,
  }
}
