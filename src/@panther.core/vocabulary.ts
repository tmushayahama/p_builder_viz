/**
 * The status vocabulary and the small shared prop unions the primitives take.
 *
 * The important design decision: one flat `StatusKey` vocabulary spanning every
 * status axis in the report, each key carrying a WORD, a SHAPE and a TONE. Hue
 * never carries meaning alone, so `failed`, `pending`, `hole`, `warning` and
 * `frontier` differ by glyph and by label as well as by colour - which is what
 * acceptance question 2 depends on.
 *
 * OWNERSHIP OF THE DOMAIN ENUMS. This library sits below the features, so it
 * cannot import from the build model. Only the unions a *primitive* actually
 * takes as a prop are declared here, and the model imports them from here so
 * each has exactly one definition. Everything else in the report's vocabulary -
 * `PhaseStatus`, `StepStatus`, `CheckState`, `FreshnessState`, `TimingProvenance`
 * - belongs to `src/features/build/model/types.ts` and is deliberately NOT
 * duplicated here: a primitive never needs the union itself, only the
 * `StatusKey` a view maps it onto.
 */

import type { StatusTone } from '@/@panther.core/theme/tokens'

/* -------------------------------------------------------------------------- */
/* The enums a primitive takes directly                                       */
/* -------------------------------------------------------------------------- */

/**
 * How much of a report section the generator was able to produce. Declared here
 * rather than in the model because `Panel` and `UnavailableNotice` branch on it
 * directly - it is the mechanism by which the whole app degrades gracefully.
 */
export type Availability = 'available' | 'partial' | 'absent' | 'error' | 'unknown'

/** Whether a finding was emitted by the report generator or derived by the dashboard. */
export type ProvenanceSource = 'generator' | 'derived'

/* -------------------------------------------------------------------------- */
/* Status keys, shapes and descriptors                                        */
/* -------------------------------------------------------------------------- */

/**
 * Icon shapes. Thirteen distinct silhouettes, so two states never rely on hue to
 * tell them apart - and a monochrome print still reads.
 */
export type StatusShape =
  | 'check'
  | 'caret'
  | 'ring-hatched'
  | 'question'
  | 'ring'
  | 'ring-slash'
  | 'cross'
  | 'triangle-warn'
  | 'dash'
  | 'half-disc'
  | 'square-solid'
  | 'square-dashed'
  | 'diamond'

export type StatusKey =
  // phase
  | 'complete'
  | 'active'
  | 'hole'
  | 'pending'
  | 'blocked'
  // step and attempt
  | 'done'
  | 'running'
  | 'failed'
  | 'skipped'
  // check
  | 'pass'
  | 'warn'
  | 'absent'
  // freshness
  | 'current'
  | 'potentially-stale'
  // timing provenance
  | 'measured'
  | 'inferred'
  | 'unavailable'
  // availability
  | 'available'
  | 'partial'
  | 'error'
  // emphasis
  | 'frontier'
  | 'changed'
  | 'unknown'

export interface StatusDescriptor {
  /** The word. Always rendered - a chip is never icon-only. */
  label: string
  shape: StatusShape
  tone: StatusTone
  /** One line explaining the state, for a tooltip or an export. */
  hint: string
}

/**
 * The single source of the status language. A view that wants different wording
 * passes a `label` override to `StatusChip`; it does not invent a new key.
 */
export const STATUS_DESCRIPTORS: Record<StatusKey, StatusDescriptor> = {
  complete: {
    label: 'Complete',
    shape: 'check',
    tone: 'pass',
    hint: 'Every step in this phase finished.',
  },
  active: {
    label: 'Active',
    shape: 'caret',
    tone: 'active',
    hint: 'Work in progress here; this is the current edge of the build.',
  },
  hole: {
    label: 'Hole',
    shape: 'ring-hatched',
    tone: 'hole',
    hint: 'Incomplete, but later phases finished - this is not where the build stopped.',
  },
  pending: {
    label: 'Pending',
    shape: 'ring',
    tone: 'neutral',
    hint: 'Not started yet.',
  },
  blocked: {
    label: 'Blocked',
    shape: 'ring-slash',
    tone: 'fail',
    hint: 'Cannot proceed: an earlier step it depends on failed.',
  },
  done: {
    label: 'Done',
    shape: 'check',
    tone: 'pass',
    hint: 'This step produced its artifact.',
  },
  running: {
    label: 'Running',
    shape: 'caret',
    tone: 'active',
    hint: 'Currently executing.',
  },
  failed: {
    label: 'Failed',
    shape: 'cross',
    tone: 'fail',
    hint: 'This step ran and did not succeed.',
  },
  skipped: {
    label: 'Skipped',
    shape: 'dash',
    tone: 'neutral',
    hint: 'Deliberately not run.',
  },
  pass: {
    label: 'Pass',
    shape: 'check',
    tone: 'pass',
    hint: 'The check was evaluated and held.',
  },
  warn: {
    label: 'Warning',
    shape: 'triangle-warn',
    tone: 'warn',
    hint: 'The check found something worth reviewing.',
  },
  absent: {
    label: 'Absent',
    shape: 'dash',
    tone: 'neutral',
    hint: 'The inputs this check needs are not in the report.',
  },
  current: {
    label: 'Current',
    shape: 'check',
    tone: 'pass',
    hint: 'The report was generated after the newest artifact it describes.',
  },
  'potentially-stale': {
    label: 'Potentially stale',
    shape: 'triangle-warn',
    tone: 'warn',
    hint: 'An artifact appears newer than the report.',
  },
  measured: {
    label: 'Measured',
    shape: 'square-solid',
    tone: 'pass',
    hint: 'Timing came from recorded execution, not from artifact timestamps.',
  },
  inferred: {
    label: 'Inferred',
    shape: 'square-dashed',
    tone: 'neutral',
    hint: 'Timing is inferred from artifact timestamps; it is elapsed activity, not runtime.',
  },
  unavailable: {
    label: 'Unavailable',
    shape: 'dash',
    tone: 'neutral',
    hint: 'No timing information of any kind.',
  },
  available: {
    label: 'Available',
    shape: 'check',
    tone: 'pass',
    hint: 'The generator produced this section in full.',
  },
  partial: {
    label: 'Partial',
    shape: 'half-disc',
    tone: 'warn',
    hint: 'Some inputs were present and some were not; what is shown is incomplete.',
  },
  error: {
    label: 'Error',
    shape: 'cross',
    tone: 'fail',
    hint: 'The generator failed while producing this section.',
  },
  frontier: {
    label: 'Frontier',
    shape: 'caret',
    tone: 'active',
    hint: 'How far the build has genuinely progressed.',
  },
  changed: {
    label: 'Changed',
    shape: 'diamond',
    tone: 'active',
    hint: 'Differs from the previous library.',
  },
  unknown: {
    label: 'Unknown',
    shape: 'question',
    tone: 'neutral',
    hint: 'The report used a value this dashboard does not recognise.',
  },
}

const STATUS_KEYS = Object.keys(STATUS_DESCRIPTORS) as StatusKey[]

/** True when the report's literal is one this dashboard understands. */
export const isStatusKey = (value: unknown): value is StatusKey =>
  typeof value === 'string' && (STATUS_KEYS as string[]).includes(value)

/* -------------------------------------------------------------------------- */
/* Truncation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * How much of a result set the report actually carries.
 *
 * `total: null` means the report did not say. That is treated as truncated, not
 * as complete: claiming completeness we cannot demonstrate is the exact
 * dishonesty the brief's truncation section forbids.
 */
export interface Completeness {
  /** Rows present in the report. */
  included: number
  /** Rows the full result set holds, or `null` when the report did not say. */
  total: number | null
  /** What the rows are, for the notice's wording. Defaults to `rows`. */
  noun?: string
}

export const isTruncated = (completeness?: Completeness): boolean => {
  if (!completeness) return false
  if (completeness.total === null) return true
  return completeness.included < completeness.total
}

/* -------------------------------------------------------------------------- */
/* Absence                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The one string every primitive renders where a measurement is missing.
 * Never a zero, never an empty cell - a blank reads as zero in a numeric column.
 */
export const ABSENT_MARK = '—'
