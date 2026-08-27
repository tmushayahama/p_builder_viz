/**
 * The global jump index: everything in a build report that a reviewer might go looking for.
 *
 * Scope is the design decision here, and it is deliberately inclusive. Indexing the 14 phases and
 * 61 steps makes this a navigation box; indexing the 131 tracked species, the ~60 configuration
 * variables and the findings as well is what makes it an investigative tool - the fastest route to
 * almost any fact in the build. The whole index is a few hundred entries built from the derived
 * model, so it is built eagerly and matched by substring. No dependency, no fuzzy scoring library.
 *
 * Every entry carries the anchor of the thing itself, from the model's anchor module, so a hit
 * lands on the element rather than on the page that contains it. Where an anchor cannot be live -
 * a configuration variable that appears only inside the captured `config.mk`, a section this report
 * does not carry - the entry falls back to the anchor of the section that does carry the evidence
 * rather than pointing at nothing.
 */

import type { ProvenanceSource } from '@/@panther.core/vocabulary'
import {
  configElementId,
  configRoute,
  phaseElementId,
  phaseRoute,
  reportElementId,
  reportRoute,
  speciesElementId,
  speciesRoute,
  stepElementId,
  stepRoute,
} from '@/features/build/model'
import type {
  AgreementFact,
  BuildReport,
  ReportRegistryEntry,
  SpeciesRecord,
} from '@/features/build/model'
import { attributeWarningsToPhases, primaryReportsFor } from '@/features/pipeline/model'
import { isNamedVariableKey } from '@/features/reports/model/genericView'

export type SearchEntryKind = 'phase' | 'step' | 'report' | 'species' | 'config' | 'check'

export interface SearchEntry {
  /** Unique across the index, and the React key. */
  id: string
  kind: SearchEntryKind
  /** What the thing is called: a step goal, an oscode, a variable name, a section title. */
  title: string
  /** The one line of context that makes the hit identifiable. */
  detail: string | null
  /** Matched but not displayed: ids, statuses, values. */
  keywords: string
  /** `/build#anchor`, for the router. */
  route: string
  /** The DOM id the route points at. */
  elementId: string
  /** Set for a species, which is opened by selection as well as by anchor. */
  oscode: string | null
  /** Generator-emitted or dashboard-derived, for a finding. */
  origin: ProvenanceSource | null
  /** Lowercased `title + detail + keywords + kind`. Precomputed; matching is per keystroke. */
  haystack: string
}

export interface SearchIndex {
  entries: SearchEntry[]
  countsByKind: Record<SearchEntryKind, number>
}

export const SEARCH_KIND_LABELS: Record<SearchEntryKind, string> = {
  phase: 'Phase',
  step: 'Step',
  report: 'Report',
  species: 'Species',
  config: 'Config',
  check: 'Finding',
}

/** Plural nouns for the index-composition line, where English pluralisation is not automatic. */
export const SEARCH_KIND_PLURALS: Record<SearchEntryKind, string> = {
  phase: 'phases',
  step: 'steps',
  report: 'reports',
  species: 'species',
  config: 'config variables',
  check: 'findings',
}

/** Display order, and the tiebreak order when two entries score the same. */
export const SEARCH_KIND_ORDER: readonly SearchEntryKind[] = [
  'phase',
  'step',
  'report',
  'check',
  'species',
  'config',
]

interface EntryInput {
  id: string
  kind: SearchEntryKind
  title: string
  detail?: string | null
  keywords?: string
  route: string
  elementId: string
  oscode?: string | null
  origin?: ProvenanceSource | null
}

function makeEntry(input: EntryInput): SearchEntry {
  const detail = input.detail ?? null
  const keywords = input.keywords ?? ''
  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    detail,
    keywords,
    route: input.route,
    elementId: input.elementId,
    oscode: input.oscode ?? null,
    origin: input.origin ?? null,
    haystack: `${input.title} ${detail ?? ''} ${keywords} ${SEARCH_KIND_LABELS[input.kind]}`
      .toLowerCase()
      .replace(/\s+/g, ' '),
  }
}

const count = (value: number | null): string => (value === null ? '—' : value.toLocaleString())

const pct = (value: number | null): string => (value === null ? '—' : `${value.toFixed(1)}%`)

/** Trimmed so a long path or a captured line does not dominate a result row. */
function clip(value: string, limit = 96): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`
}

/* -- Species ------------------------------------------------------------------------------- */

/**
 * The species line reads its facts from the joined record rather than from one table, which is why
 * `DAPMA` can say "new in this build" next to its 0 % - the context that makes the 0 % expected.
 *
 * Note the wording of the count pair: these are the previous-versus-new per-species counts from
 * the comparison table, and calling them simply "sequences" would put a sixth ambiguous label into
 * the product.
 */
function describeSpecies(record: SpeciesRecord): string {
  const parts: string[] = []
  const tracking = record.nodeTracking.value
  if (tracking !== null) parts.push(`${pct(tracking.pct)} node forward tracking`)

  const counts = record.counts.value
  if (counts !== null) {
    parts.push(`counts ${count(counts.previousCount)} → ${count(counts.currentCount)} prev vs new`)
  }

  if (record.isNewInBuild) parts.push('new in this build')
  if (record.isRemoved) parts.push('not in the new library')
  if (record.renamedTo !== null) parts.push(`renamed to ${record.renamedTo}`)
  if (record.renameOf !== null) parts.push(`renamed from ${record.renameOf}`)
  if (record.replacedBy !== null) parts.push(`likely replaced by ${record.replacedBy}`)
  if (record.replacementOf !== null) parts.push(`likely replacement of ${record.replacementOf}`)

  return parts.length === 0 ? 'no joined facts in this report' : parts.join(' · ')
}

/* -- Findings ------------------------------------------------------------------------------ */

function describeAgreement(fact: AgreementFact): string {
  if (!fact.comparable) return 'not comparable: fewer than two values present in this report'
  const values = fact.values.filter(value => value.value !== null).map(value => count(value.value))
  const distinct = [...new Set(values)]
  return fact.allEqual
    ? `${values.length} sources agree at ${distinct[0] ?? '—'}`
    : `${values.length} sources compared, values differ: ${distinct.join(', ')}`
}

interface DerivedFactSpec {
  id: string
  title: string
  detail: string
  /** The section whose anchor carries the evidence. */
  sectionId: string
}

/**
 * The joined facts the model already computed, offered as searchable findings.
 *
 * These are FACTS, not verdicts. Whether four family counts agreeing is a passing check is the
 * derived-checks layer's call, so nothing here says pass or warn - it says what the numbers are
 * and where to look.
 */
function derivedFactSpecs(report: BuildReport): DerivedFactSpec[] {
  const { consistency, config } = report
  const trees = consistency.treeCompleteness

  return [
    {
      id: 'family-agreement',
      title: consistency.familyAgreement.label,
      detail: describeAgreement(consistency.familyAgreement),
      sectionId: 'mapping',
    },
    {
      id: 'leaf-library-agreement',
      title: consistency.leafLibraryAgreement.label,
      detail: describeAgreement(consistency.leafLibraryAgreement),
      sectionId: 'node_tracking',
    },
    {
      id: 'tree-completeness',
      title: 'Books with a usable tree',
      detail: `${count(trees.treesSucceeded)} of ${count(trees.booksTotal)} books · ${count(
        trees.emptyTrees
      )} empty trees`,
      sectionId: 'giga',
    },
    {
      id: 'unresolved-vars',
      title: 'Unresolved configuration variables',
      detail:
        config.unresolvedVars.length === 0
          ? 'none reported by the config ledger'
          : config.unresolvedVars.join(', '),
      sectionId: 'config_ledger',
    },
    {
      id: 'source-tree-state',
      title: 'Source tree state at build time',
      detail:
        consistency.sourceDirty === null
          ? 'not reported'
          : consistency.sourceDirty
            ? 'dirty: uncommitted changes at build time'
            : 'clean',
      sectionId: 'config_ledger',
    },
    {
      id: 'qfo-release-vs-path',
      title: 'Declared QfO release versus the active data path',
      detail: `declared ${consistency.qfoDeclaredRelease ?? '—'} · active ${clip(
        consistency.qfoActiveDataDir ?? '—'
      )}`,
      sectionId: 'config_ledger',
    },
  ]
}

/* -- Where an entry can actually land ------------------------------------------------------ */

export interface AnchorTarget {
  route: string
  elementId: string
}

/**
 * The sections that are actually mounted somewhere, by the same rule the spine mounts them.
 *
 * Two sections in this report are never mounted under their own id: `progress` IS the spine rather
 * than a report hanging from it, and `other_reports` shares a renderer with `prev_lib`, which the
 * spine de-duplicates so one view is not mounted twice on one phase. A search hit on either has to
 * land somewhere real, so knowing the difference is this module's job and not the reader's.
 */
function mountedSectionIds(report: BuildReport): Set<string> {
  const mounted = new Set<string>()
  for (const entry of report.reports) {
    if (entry.placement === 'preamble' || entry.placement === 'unattached') {
      mounted.add(entry.sectionId)
    }
  }
  for (const phase of report.pipeline.phases) {
    for (const entry of primaryReportsFor(report, phase.id)) mounted.add(entry.sectionId)
  }
  return mounted
}

/** A mounted section anchors on itself; anything else anchors on the phase that carries it. */
function sectionTarget(
  report: BuildReport,
  sectionId: string,
  mounted: ReadonlySet<string>
): AnchorTarget {
  if (mounted.has(sectionId)) {
    return { route: reportRoute(sectionId), elementId: reportElementId(sectionId) }
  }
  const entry = report.reports.find(candidate => candidate.sectionId === sectionId) ?? null
  const phaseId =
    entry?.primaryPhaseId ??
    report.pipeline.frontierPhaseId ??
    report.pipeline.phases[0]?.id ??
    null
  if (phaseId !== null) {
    return { route: phaseRoute(phaseId), elementId: phaseElementId(phaseId) }
  }
  return { route: reportRoute(sectionId), elementId: reportElementId(sectionId) }
}

/* -- The index ----------------------------------------------------------------------------- */

function reportTitle(entry: ReportRegistryEntry): string {
  return entry.title ?? entry.sectionId
}

export function buildSearchIndex(report: BuildReport): SearchIndex {
  const entries: SearchEntry[] = []
  const sectionIds = new Set(report.reports.map(entry => entry.sectionId))
  const mounted = mountedSectionIds(report)

  for (const phase of report.pipeline.phases) {
    entries.push(
      makeEntry({
        id: `phase:${phase.id}`,
        kind: 'phase',
        title: phase.name,
        detail: `phase ${phase.index + 1} of ${report.pipeline.phases.length} · ${
          phase.completedSteps
        }/${phase.totalSteps} steps · ${phase.isFrontier ? 'frontier' : phase.status}`,
        keywords: phase.id,
        route: phaseRoute(phase.id),
        elementId: phaseElementId(phase.id),
      })
    )
  }

  for (const step of report.pipeline.steps) {
    entries.push(
      makeEntry({
        id: `step:${step.id}`,
        kind: 'step',
        title: step.goal,
        detail: `${report.pipeline.phases[step.phaseIndex]?.name ?? 'unknown phase'} · ${
          step.status.label
        }`,
        keywords: `${step.id} ${step.status.raw ?? ''}`,
        route: stepRoute(step.id),
        elementId: stepElementId(step.id),
      })
    )
  }

  for (const entry of report.reports) {
    const target = sectionTarget(report, entry.sectionId, mounted)
    const shown = mounted.has(entry.sectionId)
    entries.push(
      makeEntry({
        id: `report:${entry.sectionId}`,
        kind: 'report',
        title: reportTitle(entry),
        detail: `${entry.sectionId} · ${entry.status.label}${
          entry.known ? '' : ' · unrecognised section'
        }${shown ? '' : ' · shown with the phase that carries it'}`,
        keywords: `${entry.sectionId} ${entry.placement} ${entry.message ?? ''}`,
        route: target.route,
        elementId: target.elementId,
      })
    )
  }

  for (const record of report.species.records) {
    entries.push(
      makeEntry({
        id: `species:${record.oscode}`,
        kind: 'species',
        title: record.oscode,
        detail: describeSpecies(record),
        keywords: `${record.renameOf ?? ''} ${record.renamedTo ?? ''} ${
          record.replacedBy ?? ''
        } ${record.replacementOf ?? ''} ${record.isNewInBuild ? 'new species' : ''}`,
        route: speciesRoute(record.oscode),
        elementId: speciesElementId(record.oscode),
        oscode: record.oscode,
      })
    )
  }

  // A variable the generic renderer shows as a row has its own anchor; one that exists only inside
  // the captured config.mk falls back to the section that carries the file.
  const anchoredKeys = new Set(
    [...report.config.resolvedEntries, ...report.config.ledgerEntries]
      .filter(entry => isNamedVariableKey(entry.key))
      .map(entry => entry.key)
  )
  const configSectionPresent = sectionIds.has('config_ledger')
  const configFallback = sectionTarget(report, 'config_ledger', mounted)

  for (const key of Object.keys(report.config.values).sort()) {
    const value = report.config.values[key]
    const anchored = anchoredKeys.has(key) && configSectionPresent
    entries.push(
      makeEntry({
        id: `config:${key}`,
        kind: 'config',
        title: key,
        detail: `${value === '' ? 'declared with an empty value' : clip(value)}${
          anchored ? '' : ' · shown in the captured config.mk'
        }`,
        keywords: value,
        route: anchored ? configRoute(key) : configFallback.route,
        elementId: anchored ? configElementId(key) : configFallback.elementId,
      })
    )
  }

  // A warning that names a step goal lands on the step, which is where a reviewer looks for it.
  // The spine already does this attribution, so it is reused rather than re-derived - otherwise a
  // spine marker and a search result could point at two different phases.
  const stepByWarning = new Map<string, string>()
  for (const findings of attributeWarningsToPhases(report).values()) {
    for (const finding of findings) {
      if (finding.stepId !== null && !stepByWarning.has(finding.warning.id)) {
        stepByWarning.set(finding.warning.id, finding.stepId)
      }
    }
  }

  for (const warning of report.generatorWarnings) {
    const stepId = stepByWarning.get(warning.id) ?? null
    const target =
      stepId === null
        ? sectionTarget(report, warning.sectionId, mounted)
        : { route: stepRoute(stepId), elementId: stepElementId(stepId) }
    entries.push(
      makeEntry({
        id: `check:${warning.id}`,
        kind: 'check',
        title: warning.message,
        detail: `emitted by the report generator · ${warning.sectionId}`,
        keywords: `warning finding check ${warning.sectionId} ${stepId ?? ''}`,
        route: target.route,
        elementId: target.elementId,
        origin: 'generator',
      })
    )
  }

  for (const fact of derivedFactSpecs(report)) {
    if (!sectionIds.has(fact.sectionId)) continue
    const target = sectionTarget(report, fact.sectionId, mounted)
    entries.push(
      makeEntry({
        id: `check:derived-${fact.id}`,
        kind: 'check',
        title: fact.title,
        detail: `derived by the dashboard · ${fact.detail}`,
        keywords: `check finding consistency ${fact.sectionId}`,
        route: target.route,
        elementId: target.elementId,
        origin: 'derived',
      })
    )
  }

  const countsByKind = SEARCH_KIND_ORDER.reduce(
    (acc, kind) => {
      acc[kind] = entries.filter(entry => entry.kind === kind).length
      return acc
    },
    {} as Record<SearchEntryKind, number>
  )

  return { entries, countsByKind }
}

/* -- Matching ------------------------------------------------------------------------------ */

export interface SearchHit {
  entry: SearchEntry
  score: number
}

const KIND_RANK = new Map<SearchEntryKind, number>(
  SEARCH_KIND_ORDER.map((kind, index) => [kind, index])
)

/**
 * All query tokens must appear somewhere in the entry. Ranking prefers a match on the thing's own
 * name over a match on its context, so typing `DAPMA` puts the species above the four findings
 * that merely mention it.
 */
function scoreOf(entry: SearchEntry, tokens: readonly string[]): number | null {
  const title = entry.title.toLowerCase()
  for (const token of tokens) {
    if (!entry.haystack.includes(token)) return null
  }
  const first = tokens[0]
  const titleScore =
    title === first ? 0 : title.startsWith(first) ? 1 : title.includes(first) ? 2 : 3
  return titleScore * 10 + (KIND_RANK.get(entry.kind) ?? 9)
}

export function tokenise(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

export function searchEntries(
  index: SearchIndex,
  query: string,
  limit = 40
): { hits: SearchHit[]; total: number } {
  const tokens = tokenise(query)
  if (tokens.length === 0) return { hits: [], total: 0 }

  const hits: SearchHit[] = []
  for (const entry of index.entries) {
    const score = scoreOf(entry, tokens)
    if (score !== null) hits.push({ entry, score })
  }
  hits.sort((a, b) => a.score - b.score || a.entry.title.length - b.entry.title.length)
  return { hits: hits.slice(0, limit), total: hits.length }
}
