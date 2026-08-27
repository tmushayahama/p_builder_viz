/**
 * Renames and replacements, prepared for display.
 *
 * The detection itself belongs to the derived model, which pairs a removal with an addition only
 * on an EXACT count match - a 10 % tolerance produces seven pairs on this report of which five are
 * nonsense. This module does not re-derive any of that. It formats the two categories so they can
 * never be read as one, and it carries the scope wording, which is the part that is easy to get
 * wrong: the inference runs over 50 of 147 rows, so "2 renames" is a statement about the rows the
 * report includes and not about the release.
 *
 * The two categories differ in kind, not in degree. A rename is the same organism under a new
 * oscode and the counts prove it. A replacement is a guess supported by a shared oscode prefix and
 * a similar size, and it stays labelled as a guess.
 */

import { formatCount } from '@/app/format'
import type { BuildReport, SpeciesLink } from '@/features/build/model'
import { formatPercentTerse } from './format'
import { readingContext } from './interpretation'
import type { SourceScope } from './interpretation'

export interface SpeciesLinkRow {
  key: string
  kind: 'rename' | 'replacement'
  removed: string
  added: string
  removedCount: number
  addedCount: number
  countDelta: number
  /** How far apart the two counts are, relative to the larger. 0 for a rename. */
  relativeDeltaPct: number | null
  confidence: 'exact' | 'likely'
  /** One line naming both sides and the counts. */
  headline: string
  evidence: readonly string[]
}

export interface SpeciesLinkModel {
  renames: readonly SpeciesLinkRow[]
  replacements: readonly SpeciesLinkRow[]
  scope: SourceScope
  /** Wording that stops "2 renames" being read as "2 renames in the release". */
  scopeNote: string
  /** Removals and additions among the included rows - the population the pairing searched. */
  removedOscodes: readonly string[]
  addedOscodes: readonly string[]
  /** Additions that are not the receiving side of a rename. */
  genuinelyNewOscodes: readonly string[]
}

function relativeDelta(link: SpeciesLink): number | null {
  const largest = Math.max(link.removedCount, link.addedCount)
  if (!Number.isFinite(largest) || largest <= 0) return null
  return (Math.abs(link.addedCount - link.removedCount) / largest) * 100
}

function toRow(link: SpeciesLink): SpeciesLinkRow {
  const relativeDeltaPct = relativeDelta(link)
  const headline =
    link.kind === 'rename'
      ? `${link.removed} → ${link.added}, ${formatCount(link.removedCount)} sequences on both sides.`
      : `${link.removed} → ${link.added}, ${formatCount(link.removedCount)} to ` +
        `${formatCount(link.addedCount)} - ${formatPercentTerse(relativeDeltaPct, 0)} apart, so a ` +
        'replacement rather than a rename.'

  return {
    key: `${link.kind}:${link.removed}:${link.added}`,
    kind: link.kind,
    removed: link.removed,
    added: link.added,
    removedCount: link.removedCount,
    addedCount: link.addedCount,
    countDelta: link.countDelta,
    relativeDeltaPct,
    confidence: link.confidence,
    headline,
    evidence: link.evidence,
  }
}

export function buildLinkModel(report: BuildReport): SpeciesLinkModel {
  const context = readingContext(report)
  const { species } = report
  const renamedInto = new Set(species.renames.map(link => link.added))

  return {
    renames: species.renames.map(toRow),
    replacements: species.replacements.map(toRow),
    scope: context.counts,
    scopeNote: context.counts.truncated
      ? `Inferred from the ${context.counts.label} of "${context.counts.tableName}" this report ` +
        'includes. A pair whose species both fall outside those rows cannot be seen here, so this ' +
        'is not a count of renames in the release.'
      : `Inferred from all ${context.counts.label} of "${context.counts.tableName}".`,
    removedOscodes: species.removedOscodes,
    addedOscodes: species.newOscodes,
    genuinelyNewOscodes: species.newOscodes.filter(oscode => !renamedInto.has(oscode)),
  }
}
