/**
 * The `library` and `giga` sections, and the absent `prev_lib` section.
 *
 * All three are small headline-plus-rows payloads, so they share a file. `prev_lib` is `absent` on
 * this fixture with the message "inputs not present yet"; it still returns a summary object
 * carrying that message, because the comparison view has to explain why the direct comparison is
 * missing rather than render an empty panel.
 */

import { asArray, asInteger, asNonEmptyString, asRecord, asString, percentOf } from '../primitives'
import { makeMeta } from '../notes'
import { availabilityFor } from '../status'
import type { NoteSink } from '../notes'
import type { LibrarySummary, PreviousLibrarySummary, TreeSummary } from '../types'
import { sectionBaseNotes } from './input'
import type { SectionInput } from './input'

export function extractLibrary(section: SectionInput, sink: NoteSink): LibrarySummary {
  const notes = sectionBaseNotes(section, sink, 'library')
  const headline = asRecord(section.dataRecord?.headline)
  const meta = makeMeta({
    availability: availabilityFor(section.status, section.dataRecord !== null),
    sectionId: section.sectionId,
    message: section.message,
    status: section.status,
    notes,
  })

  const rows = asArray(section.dataRecord?.rows)
    .map(entry => asRecord(entry))
    .filter((record): record is Record<string, unknown> => record !== null)
    .map(record => ({
      metric: asNonEmptyString(record.metric) ?? 'unnamed',
      value: asInteger(record.value),
      rawValue: record.value,
    }))

  return {
    ...meta,
    genomes: asInteger(headline?.genomes),
    sequences: asInteger(headline?.sequences),
    families: asInteger(headline?.families),
    subfamilies: asInteger(headline?.subfamilies),
    rows,
  }
}

export function extractTrees(section: SectionInput, sink: NoteSink): TreeSummary {
  const notes = sectionBaseNotes(section, sink, 'tree building')
  const headline = asRecord(section.dataRecord?.headline)
  const booksTotal = asInteger(headline?.books_total)
  const treesSucceeded = asInteger(headline?.trees_succeeded)

  return {
    ...makeMeta({
      availability: availabilityFor(section.status, section.dataRecord !== null),
      sectionId: section.sectionId,
      message: section.message,
      status: section.status,
      notes,
    }),
    booksTotal,
    treesBuilt: asInteger(headline?.trees_built),
    treesSucceeded,
    emptyTrees: asInteger(headline?.empty_trees),
    usableTreePct: percentOf(treesSucceeded, booksTotal),
    text: asString(section.dataRecord?.text),
  }
}

export function extractPreviousLibrary(
  section: SectionInput,
  sink: NoteSink
): PreviousLibrarySummary {
  const notes = sectionBaseNotes(section, sink, 'previous library')
  const headline = asRecord(section.dataRecord?.headline)

  return {
    ...makeMeta({
      availability: availabilityFor(section.status, section.dataRecord !== null),
      sectionId: section.sectionId,
      message: section.message,
      status: section.status,
      notes,
    }),
    genomes: asInteger(headline?.genomes),
    sequences: asInteger(headline?.sequences),
    families: asInteger(headline?.families),
    subfamilies: asInteger(headline?.subfamilies),
  }
}
