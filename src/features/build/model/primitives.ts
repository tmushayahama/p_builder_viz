/**
 * Low-level coercion helpers shared by every section extractor.
 *
 * The build report comes from an external generator, so no incoming value can be trusted: the
 * `other_reports` tables store every number as a string, a whole section `data` payload may be a
 * string, and future generators may add fields. These helpers return `null` for "not a usable
 * measurement" so that absence stays distinguishable from a real zero — the model must never
 * present a 0 where nothing was measured.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** Returns the string as written, including `''` — an empty config value is a real observation. */
export function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function asNonEmptyString(value: unknown): string | null {
  const text = asString(value)
  if (text === null) return null
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Accepts a finite number or a numeric string. Booleans are rejected on purpose: `true` coercing
 * to 1 would silently invent a measurement.
 */
export function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function asInteger(value: unknown): number | null {
  const parsed = asNumber(value)
  if (parsed === null) return null
  return Number.isInteger(parsed) ? parsed : Math.round(parsed)
}

export function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (lowered === 'true') return true
    if (lowered === 'false') return false
  }
  return null
}

export function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map(entry => (typeof entry === 'string' ? entry : null))
    .filter((entry): entry is string => entry !== null)
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** Percent of `part` in `total`, or `null` when the denominator cannot support one. */
export function percentOf(part: number | null, total: number | null, digits = 1): number | null {
  if (part === null || total === null || total === 0) return null
  return roundTo((part / total) * 100, digits)
}

/** Signed change as a fraction of the previous value; `null` when there is no baseline. */
export function fractionChange(previous: number | null, current: number | null): number | null {
  if (previous === null || current === null || previous === 0) return null
  return (current - previous) / previous
}

export function difference(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null
  return a - b
}

export function unknownKeys(
  record: Record<string, unknown> | null,
  known: readonly string[]
): string[] {
  if (record === null) return []
  const knownSet = new Set(known)
  return Object.keys(record).filter(key => !knownSet.has(key))
}

export function pickUnknown(
  record: Record<string, unknown> | null,
  known: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (record === null) return out
  for (const key of unknownKeys(record, known)) out[key] = record[key]
  return out
}

/**
 * JSON-shaped structural clone. `structuredClone` is not guaranteed present in every test
 * environment, and the payload is by definition JSON, so a hand-rolled walk is both sufficient
 * and free of environment assumptions.
 */
export function cloneJson<T>(value: T): T {
  if (Array.isArray(value)) return value.map(entry => cloneJson(entry)) as unknown as T
  if (isRecord(value)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value)) out[key] = cloneJson(value[key])
    return out as unknown as T
  }
  return value
}

/** DOM/URL-safe slug. Used for every anchor id so links and element ids cannot drift apart. */
export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unnamed'
  )
}
