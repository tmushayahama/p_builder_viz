/**
 * Reading a section out of the raw report.
 *
 * The section list can be anything - missing, a string, an array of non-objects - so this is the
 * one place that shape is interrogated. A section the report does not contain comes back as a
 * `SectionInput` with `present: false` rather than `undefined`, so extractors never branch on
 * nullish values.
 */

import { asArray, asNonEmptyString, asRecord, asString, isRecord } from '../primitives'
import { missingSectionStatus, parseSectionStatus } from '../status'
import type { NoteSink } from '../notes'
import type { RawSection, SectionStatus } from '../types'

export interface SectionInput {
  sectionId: string
  present: boolean
  raw: RawSection | null
  status: SectionStatus
  title: string | null
  message: string | null
  data: unknown
  /** `data` when it is an object, otherwise `null` - a string payload is not a record. */
  dataRecord: Record<string, unknown> | null
  /** Index in `sections[]`, or -1 when the section is absent. */
  index: number
}

export const SECTION_ENVELOPE_KEYS: readonly string[] = [
  'id',
  'title',
  'status',
  'message',
  'data',
  'phase',
  'phase_id',
]

/** Every section in the report, in the order it appears, ignoring entries that are not objects. */
export function readSections(raw: unknown): { sections: RawSection[]; skipped: number } {
  const record = asRecord(raw)
  const list = asArray(record?.sections)
  const sections: RawSection[] = []
  let skipped = 0
  for (const entry of list) {
    if (isRecord(entry)) sections.push(entry as RawSection)
    else skipped += 1
  }
  return { sections, skipped }
}

export function sectionIdOf(section: RawSection, index: number): string {
  return asNonEmptyString(section.id) ?? `section_${index + 1}`
}

export function toSectionInput(section: RawSection, index: number): SectionInput {
  const status = parseSectionStatus(section.status)
  return {
    sectionId: sectionIdOf(section, index),
    present: true,
    raw: section,
    status,
    title: asNonEmptyString(section.title),
    message: asString(section.message),
    data: section.data,
    dataRecord: asRecord(section.data),
    index,
  }
}

export function absentSectionInput(sectionId: string): SectionInput {
  return {
    sectionId,
    present: false,
    raw: null,
    status: missingSectionStatus(),
    title: null,
    message: null,
    data: undefined,
    dataRecord: null,
    index: -1,
  }
}

export function findSection(sections: readonly RawSection[], sectionId: string): SectionInput {
  for (let index = 0; index < sections.length; index += 1) {
    if (sectionIdOf(sections[index], index) === sectionId) {
      return toSectionInput(sections[index], index)
    }
  }
  return absentSectionInput(sectionId)
}

/**
 * Note text for a section whose `data` is present but not an object - a string payload, say.
 * The value is still preserved on `SectionInput.data` for the generic renderer.
 */
export function describeDataShape(data: unknown): string {
  if (data === null) return 'data is null'
  if (data === undefined) return 'data is missing'
  if (Array.isArray(data)) return 'data is an array, not an object'
  return `data is a ${typeof data}, not an object`
}

/**
 * The notes every extractor starts from.
 *
 * A section the generator itself reported as `absent` is not a parse failure - it is the generator
 * telling us its inputs were not there - so it produces an informational note, not an error. Only
 * an unreadable payload behind an `ok`-ish status counts as a failure.
 */
export function sectionBaseNotes(section: SectionInput, sink: NoteSink, label: string): string[] {
  const notes: string[] = []
  const scope = `section:${section.sectionId}`

  if (!section.present) {
    notes.push(`The report does not contain a ${label} section.`)
    return notes
  }

  const declaredAbsent = section.status.kind === 'absent' || section.status.kind === 'missing'
  if (declaredAbsent) {
    notes.push(
      section.message === null
        ? `The generator reported the ${label} section as absent without a reason.`
        : `The generator reported the ${label} section as absent: ${section.message}`
    )
  } else if (section.dataRecord === null) {
    const reason = describeDataShape(section.data)
    notes.push(`The ${label} payload could not be read: ${reason}.`)
    sink.add('error', scope, `The ${label} payload could not be read: ${reason}.`)
  }

  if (section.status.isUnknown && section.status.raw !== null) {
    notes.push(`Section status "${section.status.raw}" is not a value this model recognises.`)
  }
  return notes
}
