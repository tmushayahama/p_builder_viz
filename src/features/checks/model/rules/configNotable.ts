/**
 * Configuration worth explaining to someone reading this build record years from now.
 *
 * The middle tier, and the one that needs the most care. Every finding here is VISIBLE and counts
 * as nothing: these are not warnings, they are inheritances and oddities that are not known to be
 * wrong but would cost a reviewer an afternoon to reconstruct from the config alone.
 *
 * Detection is evidence-driven rather than a hand-written list of keys, so the rule stops firing
 * when the data changes. Four patterns, each with a curated sentence where a generic one would be
 * useless:
 *
 *   older-than-previous   a non-PREV_* key pointing at a release older than this build's previous
 *                         release, e.g. Protein Class inherited from 18.0 by a 20.0 build
 *   filename-release      a release encoded in a FILENAME rather than a `PANTHER<n>` directory,
 *                         which is how an annotation input ends up dated one release back
 *   dropped-proteome      a value naming a five-letter oscode as dropped, e.g. `_no_XENTR`
 *   declared-empty        a key declared in `config.mk` with no value, which is an observation and
 *                         not a missing capture
 */

import { noted } from '../finding'
import { activeConfigEntries, configTarget, currentMajorRelease } from '../context'
import type { ActiveConfigEntry } from '../context'
import type { CheckFinding, CheckRule } from '../types'

const RULE_ID = 'config.notable'

/** `gene_node_19_no_XENTR.dat` and `sfToSeq_19_XENTR_dropped`: a proteome removed by name. */
const DROPPED_PROTEOME = /(?:^|[^A-Za-z0-9])(?:no_([A-Z]{5})|([A-Z]{5})_dropped)(?![A-Za-z])/

/**
 * Sentences a generated one cannot replace, keyed by config variable. The detection above still
 * has to fire: an annotation here is wording, never a reason to report something.
 */
const CURATED: Record<string, string> = {
  PC_CLASS:
    'Protein Class definitions are inherited from an earlier release than this build has as its ' +
    'previous library. Protein Class is curated infrequently, so a build normally reuses the last ' +
    'curated set rather than regenerating it - but it means this library carries that release ' +
    'curation of Protein Class, not the previous one.',
  PC_RELATIONSHIP:
    'The Protein Class relationship hierarchy comes from the same earlier release as PC_CLASS. ' +
    'The two belong together, so both being from that release is internally consistent - a build ' +
    'where only one of them moved forward would be the thing to worry about.',
  PTHR_FULLGO_ANNOT_TSV:
    'The full-GO annotation input sits in a directory dated for this build, but its filename ' +
    'encodes an earlier release. The release token describes the library the annotations were ' +
    'derived from rather than the build consuming them; worth confirming that a file derived from ' +
    'the current library was not expected here.',
}

function basename(value: string): string {
  return value.split('/').pop() ?? value
}

function seedFor(entry: ActiveConfigEntry, discriminator: string) {
  return {
    id: `${RULE_ID}:${entry.key}`,
    ruleId: RULE_ID,
    category: 'config' as const,
    tier: 'notable' as const,
    label: entry.key,
    source: entry.line === null ? `config_ledger.current.${entry.key}` : `config.mk:${entry.line}`,
    evidence: [`${entry.key}=${entry.value === '' ? '(empty)' : entry.value}`, discriminator],
    ...configTarget(entry.key),
  }
}

export const configNotableRule: CheckRule = {
  id: RULE_ID,
  label: 'Notable configuration inheritance',
  category: 'config',
  run: report => {
    const config = report.config
    const entries = activeConfigEntries(config)
    const current = currentMajorRelease(config)
    const lineageReleases = new Set(
      config.previousLineage
        .map(entry => entry.release)
        .filter((token): token is string => token !== null)
    )
    const previous =
      lineageReleases.size === 1
        ? Number.parseInt([...lineageReleases][0], 10)
        : current === null
          ? null
          : current - 1

    const findings: CheckFinding[] = []
    const claimed = new Set<string>()
    const claim = (key: string) => {
      if (claimed.has(key)) return false
      claimed.add(key)
      return true
    }

    /* Older than the previous library, and not part of the PREV_* lineage pattern. */
    for (const entry of entries) {
      if (entry.release === null || previous === null) continue
      if (entry.key.startsWith('PREV_')) continue
      const release = Number.parseInt(entry.release, 10)
      if (!Number.isFinite(release) || release >= previous) continue
      if (!claim(entry.key)) continue
      findings.push(
        noted({
          ...seedFor(entry, `References PANTHER${entry.release}.0.`),
          label: `${entry.key} is inherited from PANTHER${entry.release}.0`,
          explanation:
            CURATED[entry.key] ??
            `${entry.key} points at a PANTHER${entry.release}.0 input, an older release than the ` +
              `previous library of this build (PANTHER${previous}.0). Inputs are often carried ` +
              'forward for several releases, so this is not necessarily wrong - it is recorded ' +
              'so nobody has to work out later which release this part of the build came from.',
        })
      )
    }

    /* A release encoded in the filename rather than in a PANTHER<n> directory. */
    for (const entry of entries) {
      if (entry.release === null || entry.releaseInPath) continue
      if (entry.key.startsWith('PREV_')) continue
      if (current !== null && Number.parseInt(entry.release, 10) === current) continue
      if (!claim(entry.key)) continue
      findings.push(
        noted({
          ...seedFor(entry, `Filename encodes release ${entry.release}: ${basename(entry.value)}.`),
          label: `${entry.key} names release ${entry.release} in its filename`,
          explanation:
            CURATED[entry.key] ??
            `The value is not a PANTHER${entry.release}.0 path: the release appears in the ` +
              `filename ${basename(entry.value)}. That normally means the file was derived from ` +
              'that release rather than stored with it, which is worth knowing but is not a ' +
              'mismatch on its own.',
        })
      )
    }

    /* A previous-library input with a proteome removed by name. */
    const dropped = new Map<string, string[]>()
    for (const entry of entries) {
      const match = DROPPED_PROTEOME.exec(entry.value)
      const oscode = match === null ? null : (match[1] ?? match[2])
      if (oscode === null) continue
      dropped.set(oscode, [...(dropped.get(oscode) ?? []), entry.key])
    }
    for (const entry of entries) {
      const match = DROPPED_PROTEOME.exec(entry.value)
      const oscode = match === null ? null : (match[1] ?? match[2])
      if (oscode === null || !claim(entry.key)) continue
      const siblings = (dropped.get(oscode) ?? []).filter(key => key !== entry.key)
      findings.push(
        noted({
          ...seedFor(entry, `Names ${oscode} explicitly.`),
          label: `${entry.key} excludes ${oscode}`,
          explanation:
            `The value names ${oscode} explicitly, so this is the previous-library file with that ` +
            `proteome removed rather than the plain previous-release input. ${oscode} was dropped ` +
            'from the previous library, and the deviation from the usual path is deliberate.' +
            (siblings.length === 0
              ? ''
              : ` ${siblings.join(', ')} ${siblings.length === 1 ? 'names' : 'name'} the same ` +
                'oscode, so the drop was applied consistently.'),
          oscode,
        })
      )
    }

    /* Declared with no value. Not the same as unset, and not a gap in the capture. */
    for (const key of config.emptyValueKeys) {
      const entry = entries.find(candidate => candidate.key === key)
      if (entry === undefined || !claim(key)) continue
      const family = key.split('_')[0]
      const siblings = entries.filter(
        candidate =>
          candidate.key !== key && candidate.key.startsWith(`${family}_`) && candidate.value !== ''
      )
      findings.push(
        noted({
          ...seedFor(entry, 'Declared with an empty value.'),
          label: `${key} is declared but empty`,
          explanation:
            `${key} appears in config.mk with no value. An empty declaration is not the same as ` +
            'an unset variable - the build read it as empty deliberately - and it is not a gap in ' +
            'the captured configuration.' +
            (siblings.length === 0
              ? ''
              : ` ${siblings.map(sibling => sibling.key).join(', ')} ` +
                `${siblings.length === 1 ? 'does' : 'do'} carry a value, so the ` +
                `${family} tooling was configured elsewhere.`),
        })
      )
    }

    return findings
  },
}
