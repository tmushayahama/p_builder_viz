/**
 * What a species' numbers MEAN, in words, from the joined record.
 *
 * This module is acceptance question 3. A species at 0 % node forward tracking looks catastrophic
 * in isolation; joined with a previous count of 0 and a UniProt table reporting that every one of
 * its sequences has no previous match, 0 % is exactly what should happen. The dashboard has to say
 * that out loud rather than leave a reviewer to infer it from three tables.
 *
 * Three rules keep it honest, and each of them is a thing this panel could easily get wrong:
 *
 *   It does not explain everything away. `FELCA` tracked 65 % forward while carrying an
 *   established previous proteome, and the reading says so - that nothing in this report accounts
 *   for it. A panel that produced a soothing sentence for every species would be worth nothing on
 *   the one species that matters.
 *
 *   Absence is never evidence. The two tables that could say whether a species is new hold 50 of
 *   147 and 20 of 132 rows. A species missing from both gets "this report cannot say", not "new"
 *   and not "not new".
 *
 *   A rename is not an addition. `MYCMD` has a previous count of 0, which reads as a new species,
 *   yet it tracked 99.8 % of its nodes forward - which a species with no previous nodes could not.
 *   The exact-count pairing with `USTMA` is what reconciles the two, so the rename is checked
 *   before the new-species reading.
 *
 * Every sentence produced here is the dashboard's reading, not the generator's, and the view marks
 * it as derived.
 */

import { formatCount } from '@/app/format'
import type { BuildReport, SpeciesRecord } from '@/features/build/model'
import { formatPercentTerse } from './format'

/** How far the report's own coverage extends for one source. */
export interface SourceScope {
  sectionId: string
  tableName: string
  /** The table itself is in the report, whatever it does or does not contain. */
  present: boolean
  truncated: boolean
  includedRows: number
  totalRows: number | null
  /** `50 of 147 rows`, or `50 rows` when the report did not say how many exist. */
  label: string
}

export interface ReadingContext {
  trackingAvailable: boolean
  threshold: number
  medianPct: number | null
  speciesReported: number | null
  counts: SourceScope
  uniprot: SourceScope
}

export type SpeciesVerdict = 'expected' | 'unexplained' | 'insufficient-evidence' | 'nominal'

export type SpeciesReadingKind =
  | 'removed'
  | 'tracking-absent'
  | 'tracking-unreadable'
  | 'renamed-in'
  | 'zero-new'
  | 'zero-unknown'
  | 'zero-unexplained'
  | 'low-new'
  | 'low-established'
  | 'low-unknown'
  | 'low-unexplained'
  | 'complete'
  | 'in-cluster'

export interface EvidenceLine {
  /** The fact, in one sentence. */
  text: string
  sectionId: string
  tableName: string | null
  /** The source is a subset of its own result set, so its silence means nothing. */
  truncated: boolean
}

export interface SpeciesReading {
  oscode: string
  kind: SpeciesReadingKind
  verdict: SpeciesVerdict
  /** The word on the chip. */
  verdictLabel: string
  /** The reading itself. Always a complete sentence naming the species. */
  headline: string
  /** The same reading compressed to a table cell. Never the only place it appears. */
  short: string
  /** A second sentence where the report supports one. */
  caveat: string | null
  evidence: readonly EvidenceLine[]
  confidence: 'confirmed' | 'reported' | 'none'
  /** True when the reading rests on a table only partly included in the report. */
  scopedByTruncation: boolean
}

const VERDICT_LABEL: Record<SpeciesVerdict, string> = {
  expected: 'Explained',
  unexplained: 'Not explained',
  'insufficient-evidence': 'No evidence either way',
  nominal: 'Nominal',
}

/** The StatusChip key each verdict wears. The word is overridden; the shape is not. */
export const VERDICT_STATUS: Record<SpeciesVerdict, string> = {
  expected: 'pass',
  unexplained: 'warn',
  'insufficient-evidence': 'absent',
  nominal: 'complete',
}

function scopeLabel(included: number, total: number | null): string {
  return total === null
    ? `${formatCount(included)} rows`
    : `${formatCount(included)} of ${formatCount(total)} rows`
}

export function readingContext(report: BuildReport): ReadingContext {
  const counts = report.otherReports.speciesCounts
  const uniprot = report.otherReports.uniprotMatch

  return {
    trackingAvailable: report.nodeTracking.availability !== 'absent',
    threshold: report.nodeTracking.lowOutlierThreshold,
    medianPct: report.nodeTracking.medianPct,
    speciesReported: report.nodeTracking.speciesReported ?? report.nodeTracking.bySpecies.length,
    counts: {
      sectionId: counts.sectionId ?? 'other_reports',
      tableName: counts.name,
      present: counts.availability !== 'absent',
      truncated: counts.truncation.truncated,
      includedRows: counts.truncation.includedRows,
      totalRows: counts.truncation.totalRows,
      label: scopeLabel(counts.truncation.includedRows, counts.truncation.totalRows),
    },
    uniprot: {
      sectionId: uniprot.sectionId ?? 'other_reports',
      tableName: uniprot.name,
      present: uniprot.availability !== 'absent',
      truncated: uniprot.truncation.truncated,
      includedRows: uniprot.truncation.includedRows,
      totalRows: uniprot.truncation.totalRows,
      label: scopeLabel(uniprot.truncation.includedRows, uniprot.truncation.totalRows),
    },
  }
}

/* -- Evidence ----------------------------------------------------------------------------- */

function trackingEvidence(record: SpeciesRecord): EvidenceLine | null {
  const tracking = record.nodeTracking.value
  if (!record.nodeTracking.present || tracking === null) return null
  const pct = tracking.pct ?? tracking.recomputedPct
  return {
    text:
      `${formatCount(tracking.mapped)} of ${formatCount(tracking.total)} nodes mapped forward ` +
      `(${formatPercentTerse(pct)}).`,
    sectionId: record.nodeTracking.origin.sectionId,
    tableName: record.nodeTracking.origin.tableName,
    truncated: record.nodeTracking.origin.truncated,
  }
}

function countsEvidence(record: SpeciesRecord): EvidenceLine | null {
  const counts = record.counts.value
  if (!record.counts.present || counts === null) return null
  return {
    text:
      `Previous count ${formatCount(counts.previousCount)}, current count ` +
      `${formatCount(counts.currentCount)}.`,
    sectionId: record.counts.origin.sectionId,
    tableName: record.counts.origin.tableName,
    truncated: record.counts.origin.truncated,
  }
}

function uniprotEvidence(record: SpeciesRecord): EvidenceLine | null {
  const uniprot = record.uniprot.value
  if (!record.uniprot.present || uniprot === null) return null
  return {
    text:
      `${formatCount(uniprot.sameUniprot)} of ${formatCount(uniprot.totalSequences)} sequences ` +
      `kept their previous UniProt id (${formatPercentTerse(uniprot.pctSameUniprot)}); ` +
      `${formatCount(uniprot.noPreviousMatch)} had no previous match at all.`,
    sectionId: record.uniprot.origin.sectionId,
    tableName: record.uniprot.origin.tableName,
    truncated: record.uniprot.origin.truncated,
  }
}

function linkEvidence(record: SpeciesRecord): EvidenceLine[] {
  return record.links.map(link => ({
    text:
      link.kind === 'rename'
        ? `Exact-count pairing: ${link.removed} drops ${formatCount(link.removedCount)} to 0 and ` +
          `${link.added} appears with exactly ${formatCount(link.addedCount)}.`
        : `Candidate replacement, not a rename: ${link.removed} drops ` +
          `${formatCount(link.removedCount)} to 0 while ${link.added} appears with ` +
          `${formatCount(link.addedCount)} - the counts differ, so the pairing is weaker.`,
    sectionId: record.counts.origin.sectionId,
    tableName: record.counts.origin.tableName,
    truncated: record.counts.origin.truncated,
  }))
}

function evidenceFor(record: SpeciesRecord): EvidenceLine[] {
  return [
    trackingEvidence(record),
    countsEvidence(record),
    uniprotEvidence(record),
    ...linkEvidence(record),
  ].filter((line): line is EvidenceLine => line !== null)
}

/* -- The reading -------------------------------------------------------------------------- */

interface Draft {
  kind: SpeciesReadingKind
  verdict: SpeciesVerdict
  headline: string
  short: string
  caveat?: string | null
}

function newnessPhrase(record: SpeciesRecord): string {
  return record.newInBuildConfidence === 'confirmed'
    ? 'two independent sources in this report say it is new in this build'
    : 'one source in this report says it is new in this build'
}

function draftFor(record: SpeciesRecord, context: ReadingContext): Draft {
  const { oscode } = record
  const tracking = record.nodeTracking.value
  const counts = record.counts.value
  const pct = tracking === null ? null : (tracking.pct ?? tracking.recomputedPct ?? null)
  const total = tracking?.total ?? null
  const mapped = tracking?.mapped ?? null
  const unmapped =
    typeof total === 'number' && typeof mapped === 'number' ? Math.max(0, total - mapped) : null

  if (record.isRemoved) {
    const previous = formatCount(counts?.previousCount ?? null)
    if (record.renamedTo !== null) {
      return {
        kind: 'removed',
        verdict: 'expected',
        short: `Renamed to ${record.renamedTo} — not a loss`,
        headline:
          `${oscode} carries ${previous} sequences previously and 0 now, and an exact count ` +
          `match pairs it with ${record.renamedTo}. This is a rename rather than a loss of ` +
          `${previous} sequences.`,
        caveat: `${record.renamedTo} therefore appears as an addition of the same size.`,
      }
    }
    if (record.replacedBy !== null) {
      return {
        kind: 'removed',
        verdict: 'nominal',
        short: `Candidate replacement by ${record.replacedBy} — weaker than a rename`,
        headline:
          `${oscode} carries ${previous} sequences previously and 0 now. ${record.replacedBy} ` +
          'appears in this build at a similar but not identical size, which makes it a candidate ' +
          'replacement rather than a rename.',
        caveat:
          'A replacement is a weaker reading than a rename: the counts do not match, so the two ' +
          'may be unrelated.',
      }
    }
    return {
      kind: 'removed',
      verdict: 'nominal',
      short: 'Removed; no count match in the included rows',
      headline:
        `${oscode} carries ${previous} sequences previously and 0 now, and no species in the ` +
        'included rows matches it by count. Nothing in this report suggests a rename.',
      caveat: context.counts.truncated
        ? `Only ${context.counts.label} of that table are in the report, so a matching species ` +
          'outside those rows would not be visible here.'
        : null,
    }
  }

  if (!record.nodeTracking.present) {
    return {
      kind: 'tracking-absent',
      verdict: 'insufficient-evidence',
      short: 'No forward-tracking row',
      headline: context.trackingAvailable
        ? `Node forward tracking does not report ${oscode}, so there is no forward-tracking rate ` +
          'to read for it. Everything below comes from the other sources.'
        : `This report carries no node forward tracking section, so ${oscode} has no ` +
          'forward-tracking rate. Everything below comes from the other sources.',
    }
  }

  if (pct === null) {
    return {
      kind: 'tracking-unreadable',
      verdict: 'insufficient-evidence',
      short: 'Rate unknown, not zero',
      headline:
        `Node forward tracking carries a row for ${oscode} but no readable percentage, so the ` +
        'rate is unknown rather than zero.',
    }
  }

  if (record.renameOf !== null) {
    return {
      kind: 'renamed-in',
      verdict: 'expected',
      short: `Renamed from ${record.renameOf} — not an addition`,
      headline:
        `${oscode} has a previous count of 0, which reads as a new species, but it tracked ` +
        `${formatPercentTerse(pct)} of its ${formatCount(total)} nodes forward - which a species ` +
        `with no previous nodes could not. An exact count match pairs it with ${record.renameOf}, ` +
        'so this is a rename rather than an addition.',
      caveat:
        'Treating it as a new species would also make its previous counterpart look like a loss ' +
        'of the same size.',
    }
  }

  const zero = mapped === 0 || pct === 0

  if (zero) {
    if (record.isNewInBuild) {
      return {
        kind: 'zero-new',
        verdict: 'expected',
        short: 'New in this build — no previous nodes to track',
        headline:
          `0 % node forward tracking is expected for ${oscode}: ${newnessPhrase(record)}, so ` +
          'there are no previous nodes to track forward. The 0 % is the absence of a previous ' +
          `library entry, not a failure to map its ${formatCount(total)} nodes.`,
        caveat:
          record.newInBuildConfidence === 'confirmed'
            ? null
            : 'Only one source supports the reading, so it is weaker than a two-source agreement.',
      }
    }
    if (!record.counts.present && !record.uniprot.present) {
      return {
        kind: 'zero-unknown',
        verdict: 'insufficient-evidence',
        short: 'Absent from both context tables — cannot say',
        headline:
          `${oscode} tracked 0 of ${formatCount(total)} nodes forward. Neither table that could ` +
          `say whether it is new to this build includes it: "${context.counts.tableName}" holds ` +
          `${context.counts.label} and "${context.uniprot.tableName}" holds ` +
          `${context.uniprot.label}. This report cannot say whether 0 % is expected.`,
        caveat: 'Absence from a truncated table is unknown, not zero and not new.',
      }
    }
    return {
      kind: 'zero-unexplained',
      verdict: 'unexplained',
      short: 'Not reported new — nothing explains 0 %',
      headline:
        `${oscode} tracked 0 of ${formatCount(total)} nodes forward and no source in this report ` +
        'reports it as new in this build, so nothing here explains the 0 %.',
    }
  }

  if (pct < context.threshold) {
    if (record.isNewInBuild) {
      return {
        kind: 'low-new',
        verdict: 'expected',
        short: 'Reported new in this build',
        headline:
          `${oscode} tracked ${formatPercentTerse(pct)} of its ${formatCount(total)} nodes ` +
          `forward, below the ${formatPercentTerse(context.threshold, 0)} mark, and ` +
          `${newnessPhrase(record)} - which would account for a low rate.`,
      }
    }
    const established =
      counts !== null &&
      typeof counts.previousCount === 'number' &&
      counts.previousCount > 0 &&
      typeof counts.currentCount === 'number' &&
      counts.currentCount > 0
    if (established && counts !== null) {
      return {
        kind: 'low-established',
        verdict: 'unexplained',
        short: 'Established previous proteome — not explained',
        headline:
          `${oscode} tracked ${formatPercentTerse(pct)} of its ${formatCount(total)} nodes ` +
          `forward, leaving ${formatCount(unmapped)} nodes untracked, and it carried an ` +
          `established previous proteome (${formatCount(counts.previousCount)} sequences ` +
          `previously, ${formatCount(counts.currentCount)} now). Newness does not explain this ` +
          'one, and nothing else in this report does either.',
        caveat: 'This is the case where cross-report context does not rescue the number.',
      }
    }
    if (!record.counts.present) {
      return {
        kind: 'low-unknown',
        verdict: 'insufficient-evidence',
        short: 'Previous size unknown — absent from a truncated table',
        headline:
          `${oscode} tracked ${formatPercentTerse(pct)} of its ${formatCount(total)} nodes ` +
          `forward, below the ${formatPercentTerse(context.threshold, 0)} mark. ` +
          `"${context.counts.tableName}" holds ${context.counts.label} and does not include it, ` +
          'so its previous size is unknown and the rate cannot be put in context.',
        caveat: 'Absence from a truncated table is unknown, not zero.',
      }
    }
    return {
      kind: 'low-unexplained',
      verdict: 'unexplained',
      short: 'Not explained by this report',
      headline:
        `${oscode} tracked ${formatPercentTerse(pct)} of its ${formatCount(total)} nodes ` +
        `forward, leaving ${formatCount(unmapped)} nodes untracked, and nothing in this report ` +
        'explains the shortfall.',
    }
  }

  if (pct >= 100) {
    return {
      kind: 'complete',
      verdict: 'nominal',
      short: 'Every node tracked forward',
      headline: `${oscode} tracked all ${formatCount(total)} of its nodes forward.`,
    }
  }

  return {
    kind: 'in-cluster',
    verdict: 'nominal',
    short: 'Inside the main cluster',
    headline:
      `${oscode} tracked ${formatCount(mapped)} of ${formatCount(total)} nodes forward ` +
      `(${formatPercentTerse(pct)}), inside the main cluster - the median across the ` +
      `${formatCount(context.speciesReported)} reported species is ` +
      `${formatPercentTerse(context.medianPct)}.`,
  }
}

export function readSpecies(record: SpeciesRecord, context: ReadingContext): SpeciesReading {
  const draft = draftFor(record, context)
  const evidence = evidenceFor(record)

  return {
    oscode: record.oscode,
    kind: draft.kind,
    verdict: draft.verdict,
    verdictLabel: VERDICT_LABEL[draft.verdict],
    headline: draft.headline,
    short: draft.short,
    caveat: draft.caveat ?? null,
    evidence,
    confidence: record.newInBuildConfidence === 'unknown' ? 'none' : record.newInBuildConfidence,
    scopedByTruncation:
      evidence.some(line => line.truncated) ||
      ((draft.kind === 'zero-unknown' || draft.kind === 'low-unknown') && context.counts.truncated),
  }
}

/**
 * Why the two totals a reviewer sees for one species are allowed to differ.
 *
 * Node forward tracking counts NODES and the other two tables count SEQUENCES, so `DAPMA` reading
 * 10,504 in one place and 26,600 in another is two quantities, not a contradiction - the same trap
 * the six sequence counts set elsewhere in this report.
 */
export const COUNT_CONCEPT_NOTE =
  'Node counts and sequence counts are different quantities: a sequence with no family has no ' +
  'node, so the two totals for one species are not expected to match and a difference between ' +
  'them is not a contradiction.'
