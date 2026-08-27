/**
 * The `config_ledger` section: resolved configuration, the captured `config.mk`, and provenance.
 *
 * The section carries two views of the same configuration - the generator's resolved values and
 * the literal file contents - and both matter. A finding such as "the declared QfO release
 * disagrees with the active data path" rests on the commented-out `#export QFO_DATA_DIR=...` line
 * in the captured file, so commented lines are parsed and kept as evidence rather than skipped.
 *
 * This section's `generated_at` is the config snapshot time, which equals the first step's artifact
 * mtime: the snapshot is taken at build start, not at report time.
 */

import {
  asArray,
  asBoolean,
  asInteger,
  asNonEmptyString,
  asRecord,
  asString,
  asStringArray,
} from '../primitives'
import { makeMeta } from '../notes'
import { availabilityFor } from '../status'
import { formatUnknownValue } from '../tables'
import { timePointFromIso } from '../timing'
import type { NoteSink } from '../notes'
import type { ConfigEntry, ConfigLineageEntry, ConfigSummary } from '../types'
import { sectionBaseNotes } from './input'
import type { SectionInput } from './input'

/** Keys on `current` that describe the snapshot itself rather than a build variable. */
const CURRENT_META_KEYS: readonly string[] = [
  'generated_at',
  'panther_build_git_rev',
  'panther_build_dirty',
  'config_file',
  'config_file_contents',
  'unresolved_vars',
]

const ACTIVE_EXPORT = /^\s*export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/
const COMMENTED_EXPORT = /^\s*#\s*export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/

/**
 * The plausible range for a two-digit PANTHER release, used to gate the generic fallback below.
 * Without it `BLAST_CPUS=64`, `PFAM_VERSION=36.0` and `QFO_RELEASE_VERSION=2026_02` all read as
 * release references, and a lineage check built on that would be describing a CPU count.
 */
const RELEASE_TOKEN_RANGE = { min: 10, max: 29 } as const

/**
 * The major release a value references, e.g. `19` for a `PANTHER19.0` path.
 *
 * A `PANTHER<n>` token wins because the paths in this config contain account directories such as
 * `huaiyumi_14` that would otherwise be read as a release. Only when there is no such token is the
 * basename scanned, which is where release-encoding filenames like `Protein_Class_18.0` and
 * `gene_node_19_no_XENTR.dat` live - and that scan is range-gated, because a bare two-digit number
 * in a filename is far more often a version of something else.
 */
export function releaseTokenOf(value: string): string | null {
  const panther = /PANTHER(\d{1,2})(?:\.\d+)?/i.exec(value)
  if (panther !== null) return panther[1]
  const basename = value.split('/').pop() ?? value
  const generic = /(?:^|[^0-9.])(\d{2})(?:\.\d)?(?![0-9])/.exec(basename)
  if (generic === null) return null
  const token = Number(generic[1])
  return token >= RELEASE_TOKEN_RANGE.min && token <= RELEASE_TOKEN_RANGE.max ? generic[1] : null
}

export interface ParsedConfigFile {
  active: ConfigEntry[]
  commented: ConfigEntry[]
}

export function parseConfigFile(contents: string | null): ParsedConfigFile {
  const active: ConfigEntry[] = []
  const commented: ConfigEntry[] = []
  if (contents === null) return { active, commented }

  contents.split('\n').forEach((rawLine, index) => {
    const line = rawLine.replace(/\r$/, '')
    const commentedMatch = COMMENTED_EXPORT.exec(line)
    if (commentedMatch !== null) {
      commented.push({
        key: commentedMatch[1],
        value: commentedMatch[2].trim(),
        origin: 'file',
        commentedOut: true,
        line: index + 1,
      })
      return
    }
    const activeMatch = ACTIVE_EXPORT.exec(line)
    if (activeMatch !== null) {
      active.push({
        key: activeMatch[1],
        // Not trimmed away to nothing: `MAFFT_BINARIES=` is a declared-but-empty value.
        value: activeMatch[2].trim(),
        origin: 'file',
        commentedOut: false,
        line: index + 1,
      })
    }
  })

  return { active, commented }
}

function lineageEntry(entry: ConfigEntry): ConfigLineageEntry {
  return { key: entry.key, value: entry.value, release: releaseTokenOf(entry.value) }
}

export function extractConfig(section: SectionInput, sink: NoteSink): ConfigSummary {
  const scope = `section:${section.sectionId}`
  const hasData = section.dataRecord !== null
  const notes = sectionBaseNotes(section, sink, 'configuration')

  const current = asRecord(section.dataRecord?.current)
  if (hasData && current === null) {
    notes.push('The configuration section carries no resolved values.')
    sink.add('warning', scope, 'The configuration section carries no `current` record.')
  }

  const configFileContents = asString(current?.config_file_contents)
  const parsed = parseConfigFile(configFileContents)

  const resolvedEntries: ConfigEntry[] = Object.keys(current ?? {})
    .filter(key => !CURRENT_META_KEYS.includes(key))
    .map(key => ({
      key,
      value: asString(current?.[key]) ?? formatUnknownValue(current?.[key]),
      origin: 'resolved' as const,
      commentedOut: false,
      line: null,
    }))

  const ledgerEntries: ConfigEntry[] = asArray(section.dataRecord?.rows)
    .map(entry => asRecord(entry))
    .filter((record): record is Record<string, unknown> => {
      if (record === null) {
        sink.add('warning', scope, 'A config ledger row is not an object; skipped.')
        return false
      }
      return true
    })
    .map(record => ({
      key: asNonEmptyString(record.key) ?? 'unnamed',
      value: asString(record.value) ?? formatUnknownValue(record.value),
      origin: 'ledger' as const,
      commentedOut: false,
      line: null,
    }))

  /* File values first, then the generator's resolved values, which win. */
  const values: Record<string, string> = {}
  for (const entry of parsed.active) values[entry.key] = entry.value
  for (const entry of resolvedEntries) values[entry.key] = entry.value

  const allActive = [...parsed.active, ...resolvedEntries]
  const seenLineageKeys = new Set<string>()
  const previousLineage: ConfigLineageEntry[] = []
  const previousPreviousLineage: ConfigLineageEntry[] = []
  const releaseReferences: ConfigLineageEntry[] = []

  for (const entry of allActive) {
    const lineage = lineageEntry(entry)
    if (lineage.release !== null && !releaseReferences.some(item => item.key === entry.key)) {
      releaseReferences.push(lineage)
    }
    if (seenLineageKeys.has(entry.key)) continue
    if (entry.key.startsWith('PREV_PREV_')) {
      seenLineageKeys.add(entry.key)
      previousPreviousLineage.push(lineage)
    } else if (entry.key.startsWith('PREV_')) {
      seenLineageKeys.add(entry.key)
      previousLineage.push(lineage)
    }
  }

  const unresolvedVars = asStringArray(current?.unresolved_vars)
  if (unresolvedVars.length > 0) {
    sink.add(
      'warning',
      scope,
      'The configuration ledger reports unresolved variables.',
      unresolvedVars.join(', ')
    )
  }

  return {
    ...makeMeta({
      availability: availabilityFor(section.status, hasData),
      sectionId: section.sectionId,
      message: section.message,
      status: section.status,
      notes,
    }),
    generatedAt: timePointFromIso(current?.generated_at),
    sourceRevision: asNonEmptyString(current?.panther_build_git_rev),
    sourceDirty: asBoolean(current?.panther_build_dirty),
    configFile: asNonEmptyString(current?.config_file),
    configFileContents,
    fileEntries: parsed.active,
    commentedEntries: parsed.commented,
    resolvedEntries,
    ledgerEntries,
    values,
    unresolvedVars,
    recordCount: asInteger(section.dataRecord?.record_count),
    text: asString(section.dataRecord?.text),
    warnings: asStringArray(section.dataRecord?.warnings),
    previousLineage,
    previousPreviousLineage,
    releaseReferences,
    pantherVersion: values.PTHR_VERSION ?? null,
    qfoDataDir: values.QFO_DATA_DIR ?? null,
    qfoReleaseVersion: values.QFO_RELEASE_VERSION ?? null,
    previousReleaseDir: values.PREV_RELEASE_DIR ?? null,
    emptyValueKeys: allActive.filter(entry => entry.value === '').map(entry => entry.key),
  }
}
