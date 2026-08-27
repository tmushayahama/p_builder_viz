/**
 * The ingest-note sink and the summary-metadata builder.
 *
 * `parseBuildState` must never throw, so every extractor runs inside a guard that records what
 * went wrong here instead of propagating. A note is the model's admission that a part of the
 * report could not be read; the report is still returned, with that part marked unavailable.
 */

import type { Availability, IngestNote, IngestSeverity, SectionStatus, SummaryMeta } from './types'

export interface NoteSink {
  readonly notes: IngestNote[]
  add(severity: IngestSeverity, scope: string, message: string, detail?: string | null): void
}

export function createNoteSink(): NoteSink {
  const notes: IngestNote[] = []
  return {
    notes,
    add(severity, scope, message, detail = null) {
      notes.push({ severity, scope, message, detail })
    },
  }
}

/** Turns an unknown thrown value into a note detail without assuming it is an `Error`. */
export function describeThrown(thrown: unknown): string {
  if (thrown instanceof Error) return `${thrown.name}: ${thrown.message}`
  try {
    return String(thrown)
  } catch {
    return 'unrepresentable thrown value'
  }
}

export interface MetaOptions {
  availability: Availability
  sectionId?: string | null
  message?: string | null
  status?: SectionStatus | null
  notes?: string[]
}

export function makeMeta(options: MetaOptions): SummaryMeta {
  return {
    availability: options.availability,
    message: options.message ?? null,
    reportedStatus: options.status?.raw ?? null,
    sectionId: options.sectionId ?? null,
    notes: options.notes ?? [],
  }
}

/** Meta for a part that could not be read at all, carrying the reason. */
export function errorMeta(sectionId: string | null, reason: string): SummaryMeta {
  return {
    availability: 'error',
    message: null,
    reportedStatus: null,
    sectionId,
    notes: [reason],
  }
}

/** Meta for a section the report does not contain. */
export function missingMeta(sectionId: string): SummaryMeta {
  return {
    availability: 'absent',
    message: null,
    reportedStatus: null,
    sectionId,
    notes: [`Section "${sectionId}" is not present in this report.`],
  }
}
