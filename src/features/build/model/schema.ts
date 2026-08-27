/**
 * The schema-version support contract.
 *
 * The supported set is declared here and nowhere else. A report the model does not fully
 * understand still renders: `evaluateSchema` returns a degradation signal that the preamble
 * shows, rather than throwing or silently proceeding as if the payload were understood.
 */

import { asNumber } from './primitives'
import type { SchemaSupport, SchemaSupportState } from './types'

/** Every schema version this model claims to read completely. */
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1]

/** The version the extractors were written against. */
export const CURRENT_SCHEMA_VERSION = 1

export function isSupportedSchemaVersion(version: number | null): boolean {
  return version !== null && SUPPORTED_SCHEMA_VERSIONS.includes(version)
}

function describe(state: SchemaSupportState, version: number | null, reported: unknown): string {
  const supported = SUPPORTED_SCHEMA_VERSIONS.join(', ')
  switch (state) {
    case 'supported':
      return `Report schema ${version} is fully supported.`
    case 'newer':
      return (
        `Report schema ${version} is newer than this dashboard understands ` +
        `(supported: ${supported}). Known sections are read as usual; anything this version ` +
        `added is shown through the generic renderer and may be incomplete.`
      )
    case 'older':
      return (
        `Report schema ${version} predates the versions this dashboard was written against ` +
        `(supported: ${supported}). Fields it expects may be missing.`
      )
    default:
      return (
        `Report schema version is missing or not a number (received ${JSON.stringify(reported)}). ` +
        `The report is read on a best-effort basis and every part of it should be treated as ` +
        `unverified.`
      )
  }
}

export function evaluateSchema(reported: unknown): SchemaSupport {
  const version = asNumber(reported)
  const highestSupported = SUPPORTED_SCHEMA_VERSIONS.reduce((a, b) => (b > a ? b : a), 0)
  const lowestSupported = SUPPORTED_SCHEMA_VERSIONS.reduce(
    (a, b) => (b < a ? b : a),
    highestSupported
  )

  let state: SchemaSupportState
  if (version === null) state = 'unknown'
  else if (isSupportedSchemaVersion(version)) state = 'supported'
  else if (version > highestSupported) state = 'newer'
  else if (version < lowestSupported) state = 'older'
  else state = 'unknown'

  const label =
    state === 'supported'
      ? `Schema ${version}`
      : state === 'unknown'
        ? 'Schema unknown'
        : `Schema ${version} (${state === 'newer' ? 'newer than supported' : 'older than supported'})`

  return {
    reported,
    version,
    state,
    supported: SUPPORTED_SCHEMA_VERSIONS,
    degraded: state !== 'supported',
    label,
    explanation: describe(state, version, reported),
  }
}
