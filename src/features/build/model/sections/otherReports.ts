/**
 * The `other_reports` section: loose metrics plus three tables.
 *
 * Everything here needs normalising before it can be shown.
 *
 * Every table cell is a STRING, so counts are parsed. `pct_change` is a FRACTION - `-1.0` for a
 * complete removal - so the change is recomputed from the counts; echoing the field renders -1 %
 * where -100 % belongs. All three tables are truncated (50 of 147, 20 of 132, 20 of 813) and that
 * metadata is carried through so the UI can refuse to offer sort or filter over partial data.
 *
 * The UniProt table also carries a `TOTAL` aggregate row, which is not a species and must not
 * enter the species join.
 */

import { asArray, asNonEmptyString, asNumber, asRecord, asString, roundTo } from '../primitives'
import { metricIdForReportKey } from '../definitions'
import { makeMeta } from '../notes'
import { availabilityFor } from '../status'
import { absentTable, makeDerivedTable, normaliseTable } from '../tables'
import type { NormalisedTable } from '../tables'
import type { NoteSink } from '../notes'
import type {
  DerivedTable,
  OtherReportsSummary,
  SpeciesCountChange,
  SummaryMeta,
  UniprotMatchRow,
  UniRuleRow,
} from '../types'
import { sectionBaseNotes } from './input'
import type { SectionInput } from './input'

/** Labels a table row can carry instead of a species code. They are aggregates, not species. */
export const AGGREGATE_OSCODES: readonly string[] = ['TOTAL', 'TOTALS', 'ALL', 'SUM']

export function isAggregateOscode(oscode: string): boolean {
  return AGGREGATE_OSCODES.includes(oscode.trim().toUpperCase())
}

export function toSpeciesCountChange(record: Record<string, unknown>): SpeciesCountChange {
  const previousCount = asNumber(record.prev_count)
  const currentCount = asNumber(record.new_count)
  const countDiff =
    previousCount === null || currentCount === null ? null : currentCount - previousCount
  // Recomputed, never echoed: the report stores a fraction and formatting it reads as -1 %.
  const fraction =
    previousCount === null || currentCount === null || previousCount === 0
      ? null
      : (currentCount - previousCount) / previousCount

  return {
    oscode: asNonEmptyString(record.species) ?? asNonEmptyString(record.oscode) ?? 'UNKNOWN',
    previousCount,
    currentCount,
    countDiff,
    fractionChange: fraction,
    percentChange: fraction === null ? null : roundTo(fraction * 100, 1),
    reportedPctChange: asNumber(record.pct_change),
    isRemoval: previousCount !== null && previousCount > 0 && currentCount === 0,
    isAddition: previousCount === 0 && currentCount !== null && currentCount > 0,
  }
}

export function toUniprotMatchRow(record: Record<string, unknown>): UniprotMatchRow {
  const totalSequences = asNumber(record.total_seqs)
  const noPreviousMatch = asNumber(record.no_prev_match)
  return {
    oscode: asNonEmptyString(record.oscode) ?? 'UNKNOWN',
    totalSequences,
    sameUniprot: asNumber(record.same_uniprot),
    pctSameUniprot: asNumber(record.pct_same_uniprot),
    diffUniprot: asNumber(record.diff_uniprot),
    noPreviousMatch,
    allUnmatched:
      totalSequences !== null &&
      totalSequences > 0 &&
      noPreviousMatch !== null &&
      noPreviousMatch === totalSequences,
  }
}

export function toUniRuleRow(record: Record<string, unknown>): UniRuleRow {
  const families = asString(record.families)
  return {
    uniRule: asNonEmptyString(record.unirule) ?? 'UNKNOWN',
    families:
      families === null
        ? []
        : families
            .split(',')
            .map(entry => entry.trim())
            .filter(entry => entry !== ''),
    familyCount: asNumber(record.family_count),
  }
}

type TableKind = 'species_counts' | 'uniprot_match' | 'unirules' | 'other'

/** Identified by column signature rather than by name, so a renamed table still binds. */
function classifyTable(table: NormalisedTable): TableKind {
  const columns = new Set(table.columns)
  if (columns.has('species') && columns.has('prev_count')) return 'species_counts'
  if (columns.has('oscode') && columns.has('no_prev_match')) return 'uniprot_match'
  if (columns.has('unirule')) return 'unirules'
  return 'other'
}

export function extractOtherReports(section: SectionInput, sink: NoteSink): OtherReportsSummary {
  const scope = `section:${section.sectionId}`
  const hasData = section.dataRecord !== null
  const notes = sectionBaseNotes(section, sink, 'other reports')

  const meta: SummaryMeta = makeMeta({
    availability: availabilityFor(section.status, hasData),
    sectionId: section.sectionId,
    message: section.message,
    status: section.status,
    notes,
  })

  const metrics = asArray(section.dataRecord?.rows)
    .map(entry => asRecord(entry))
    .filter((record): record is Record<string, unknown> => {
      if (record === null) {
        sink.add('warning', scope, 'An other-reports metric row is not an object; skipped.')
        return false
      }
      return true
    })
    .map(record => {
      const key = asNonEmptyString(record.metric) ?? 'unnamed'
      const metricId = metricIdForReportKey(key)
      if (metricId === null) {
        sink.add(
          'info',
          scope,
          `Metric "${key}" has no entry in the definitions registry; it renders with its raw key.`
        )
      }
      return { key, value: asNumber(record.value), rawValue: record.value, metricId }
    })

  const values: Record<string, number | null> = {}
  for (const metric of metrics) values[metric.key] = metric.value

  let speciesCounts: DerivedTable<SpeciesCountChange> = absentTable(
    'species_counts',
    'Sequence counts by species, previous vs new',
    section.sectionId,
    'This report contains no previous-versus-new species count table.'
  )
  let uniprotMatch: DerivedTable<UniprotMatchRow> = absentTable(
    'uniprot_match',
    'Previous-UniProt-ID match by proteome',
    section.sectionId,
    'This report contains no previous-UniProt match table.'
  )
  let uniRules: DerivedTable<UniRuleRow> = absentTable(
    'unirules',
    'UniRules gaining in more than one family',
    section.sectionId,
    'This report contains no UniRules table.'
  )
  const otherTables: DerivedTable<Record<string, unknown>>[] = []

  asArray(section.dataRecord?.tables).forEach((raw, index) => {
    const table = normaliseTable(raw, `table_${index + 1}`)
    if (table.truncation.truncated) {
      sink.add(
        'info',
        scope,
        `Table "${table.name}" is truncated; client-side sort and filter are withheld.`,
        table.truncation.label
      )
    }
    if (table.truncation.hasRaggedRows) {
      sink.add(
        'info',
        scope,
        `Table "${table.name}" reports ${table.truncation.raggedRows} ragged rows.`
      )
    }
    switch (classifyTable(table)) {
      case 'species_counts':
        speciesCounts = makeDerivedTable(
          'species_counts',
          table,
          table.records.map(toSpeciesCountChange),
          meta
        )
        break
      case 'uniprot_match':
        uniprotMatch = makeDerivedTable(
          'uniprot_match',
          table,
          table.records.map(toUniprotMatchRow),
          meta
        )
        break
      case 'unirules':
        uniRules = makeDerivedTable('unirules', table, table.records.map(toUniRuleRow), meta)
        break
      default:
        otherTables.push(makeDerivedTable(`table_${index + 1}`, table, table.records, meta))
        sink.add(
          'info',
          scope,
          `Table "${table.name}" has no specialised reading; it renders generically.`
        )
    }
  })

  return {
    ...meta,
    text: asString(section.dataRecord?.text),
    metrics,
    values,
    speciesCounts,
    uniprotMatch,
    uniRules,
    otherTables,
  }
}
