/**
 * The `node_tracking` section: how much of the previous library mapped forward.
 *
 * The species distribution is extremely tight at the top, so the interesting content is the low
 * tail. Median and MAD are computed here rather than in a chart, and a species at 0 % is listed
 * separately because 0 % means nothing until it is joined with the species cross-section: a
 * species new in this build has no previous nodes to map forward, and 0 % is then expected.
 */

import {
  asArray,
  asInteger,
  asNonEmptyString,
  asNumber,
  asRecord,
  asStringArray,
  percentOf,
  roundTo,
} from '../primitives'
import { makeMeta } from '../notes'
import { availabilityFor } from '../status'
import type { NoteSink } from '../notes'
import type { NodeTrackingSummary, NodeTypeTracking, SpeciesTracking } from '../types'
import { sectionBaseNotes } from './input'
import type { SectionInput } from './input'

/** Species below this forward-tracking percentage are called out individually. */
export const LOW_OUTLIER_THRESHOLD = 90

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length / 2
  return sorted.length % 2 === 1
    ? sorted[Math.floor(middle)]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

export function extractNodeTracking(section: SectionInput, sink: NoteSink): NodeTrackingSummary {
  const scope = `section:${section.sectionId}`
  const hasData = section.dataRecord !== null
  const notes = sectionBaseNotes(section, sink, 'node forward tracking')

  const meta = makeMeta({
    availability: availabilityFor(section.status, hasData),
    sectionId: section.sectionId,
    message: section.message,
    status: section.status,
    notes,
  })

  const headline = asRecord(section.dataRecord?.headline)
  const nodesMapped = asInteger(headline?.nodes_mapped)
  const nodesTotal = asInteger(headline?.nodes_total)

  const byType: NodeTypeTracking[] = asArray(section.dataRecord?.by_type)
    .map(entry => asRecord(entry))
    .filter((record): record is Record<string, unknown> => {
      if (record === null) {
        sink.add('warning', scope, 'A by_type row is not an object; skipped.')
        return false
      }
      return true
    })
    .map(record => {
      const mapped = asInteger(record.mapped)
      const total = asInteger(record.total)
      return {
        nodeType: asNonEmptyString(record.node_type) ?? 'UNKNOWN',
        mapped,
        total,
        pct: asNumber(record.pct),
        recomputedPct: percentOf(mapped, total),
      }
    })

  const bySpecies: SpeciesTracking[] = asArray(section.dataRecord?.by_species)
    .map(entry => asRecord(entry))
    .filter((record): record is Record<string, unknown> => {
      if (record === null) {
        sink.add('warning', scope, 'A by_species row is not an object; skipped.')
        return false
      }
      return true
    })
    .map(record => {
      const mapped = asInteger(record.mapped)
      const total = asInteger(record.total)
      return {
        oscode: asNonEmptyString(record.oscode) ?? 'UNKNOWN',
        mapped,
        total,
        pct: asNumber(record.pct),
        recomputedPct: percentOf(mapped, total),
      }
    })

  const pcts = bySpecies
    .map(species => species.pct ?? species.recomputedPct)
    .filter((value): value is number => value !== null)
  const medianPct = median(pcts)
  const madPct = medianPct === null ? null : median(pcts.map(value => Math.abs(value - medianPct)))

  const lowOutliers = bySpecies
    .filter(species => {
      const value = species.pct ?? species.recomputedPct
      return value !== null && value < LOW_OUTLIER_THRESHOLD
    })
    .sort((a, b) => (a.pct ?? a.recomputedPct ?? 0) - (b.pct ?? b.recomputedPct ?? 0))

  return {
    ...meta,
    nodesMapped,
    nodesTotal,
    pctMapped: asNumber(headline?.pct_mapped),
    recomputedPctMapped: percentOf(nodesMapped, nodesTotal),
    speciesReported: asInteger(headline?.species_reported),
    byType,
    bySpecies,
    zeroPctOscodes: bySpecies
      .filter(species => (species.pct ?? species.recomputedPct) === 0)
      .map(species => species.oscode),
    lowOutliers,
    lowOutlierThreshold: LOW_OUTLIER_THRESHOLD,
    medianPct: medianPct === null ? null : roundTo(medianPct, 2),
    madPct: madPct === null ? null : roundTo(madPct, 2),
    atOrAbove90:
      pcts.length === 0 ? null : pcts.filter(value => value >= LOW_OUTLIER_THRESHOLD).length,
    warnings: asStringArray(section.dataRecord?.warnings),
  }
}
