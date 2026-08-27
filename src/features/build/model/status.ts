/**
 * Status parsing for sections and steps.
 *
 * An unrecognised status is never coerced into a known state. It comes back with `kind: 'unknown'`,
 * the literal value on `raw`, and a label that reads `Unknown status: <value>` so the UI is honest
 * about what it does not understand. Aliases are only accepted where they are unambiguous
 * synonyms of a known state.
 */

import { asString } from './primitives'
import type {
  Availability,
  SectionStatus,
  SectionStatusKind,
  StepStatus,
  StepStatusKind,
} from './types'

export const KNOWN_SECTION_STATUS_KINDS: readonly SectionStatusKind[] = [
  'ok',
  'warn',
  'partial',
  'absent',
  'error',
]

export const KNOWN_STEP_STATUS_KINDS: readonly StepStatusKind[] = [
  'done',
  'pending',
  'running',
  'failed',
  'skipped',
]

const SECTION_ALIASES: Record<string, SectionStatusKind> = {
  ok: 'ok',
  success: 'ok',
  warn: 'warn',
  warning: 'warn',
  partial: 'partial',
  absent: 'absent',
  missing: 'absent',
  error: 'error',
  failed: 'error',
}

const STEP_ALIASES: Record<string, StepStatusKind> = {
  done: 'done',
  complete: 'done',
  completed: 'done',
  pending: 'pending',
  todo: 'pending',
  running: 'running',
  in_progress: 'running',
  failed: 'failed',
  fail: 'failed',
  error: 'failed',
  skipped: 'skipped',
}

const SECTION_LABELS: Record<SectionStatusKind, string> = {
  ok: 'OK',
  warn: 'Warning',
  partial: 'Partial',
  absent: 'Absent',
  error: 'Error',
  missing: 'Not in report',
  unknown: 'Unknown',
}

const STEP_LABELS: Record<StepStatusKind, string> = {
  done: 'Done',
  pending: 'Pending',
  running: 'Running',
  failed: 'Failed',
  skipped: 'Skipped',
  unknown: 'Unknown',
}

export function parseSectionStatus(raw: unknown): SectionStatus {
  const text = asString(raw)
  if (text === null) {
    return { kind: 'unknown', raw: null, label: 'Status not reported', isUnknown: true }
  }
  const kind = SECTION_ALIASES[text.trim().toLowerCase()]
  if (kind === undefined) {
    return { kind: 'unknown', raw: text, label: `Unknown status: ${text}`, isUnknown: true }
  }
  return { kind, raw: text, label: SECTION_LABELS[kind], isUnknown: false }
}

/** The status of a section the report does not contain at all. */
export function missingSectionStatus(): SectionStatus {
  return { kind: 'missing', raw: null, label: SECTION_LABELS.missing, isUnknown: false }
}

export function parseStepStatus(raw: unknown): StepStatus {
  const text = asString(raw)
  if (text === null) {
    return { kind: 'unknown', raw: null, label: 'Status not reported', isUnknown: true }
  }
  const kind = STEP_ALIASES[text.trim().toLowerCase()]
  if (kind === undefined) {
    return { kind: 'unknown', raw: text, label: `Unknown status: ${text}`, isUnknown: true }
  }
  return { kind, raw: text, label: STEP_LABELS[kind], isUnknown: false }
}

/**
 * Availability describes whether the data is usable, which is a different question from the
 * generator's status. A warned-but-populated section is `available`; a section whose status the
 * model cannot interpret is `unknown` even when its payload parses, so the degradation shows.
 */
export function availabilityFor(status: SectionStatus, hasData: boolean): Availability {
  switch (status.kind) {
    case 'ok':
    case 'warn':
      return hasData ? 'available' : 'absent'
    case 'partial':
      return hasData ? 'partial' : 'absent'
    case 'absent':
    case 'missing':
      return 'absent'
    case 'error':
      return 'error'
    default:
      return 'unknown'
  }
}
