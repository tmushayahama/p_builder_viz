/**
 * Every deep-link anchor and DOM element id in the application.
 *
 * Nothing outside this module builds an anchor by hand. Links, `id` attributes, export targets
 * and scroll-into-view calls all read from here, so a route and the element it points at cannot
 * drift apart. Each entity exposes three forms: the bare element id, the `#`-prefixed anchor,
 * and the full route including the hash.
 */

import { slugify } from './primitives'

/** The route the build report lives at. Anchors are appended as a hash fragment. */
export const BUILD_ROUTE = '/build'

export type AnchorKind = 'phase' | 'step' | 'report' | 'check' | 'species' | 'config' | 'metric'

/** Element-id prefix per entity kind. Kept short because they end up in URLs. */
export const ANCHOR_PREFIX: Record<AnchorKind, string> = {
  phase: 'phase',
  step: 'step',
  report: 'report',
  check: 'check',
  species: 'species',
  config: 'config',
  metric: 'metric',
}

const SEPARATOR = '--'

function elementId(kind: AnchorKind, ...parts: string[]): string {
  return [ANCHOR_PREFIX[kind], ...parts.map(slugify)].join(SEPARATOR)
}

function anchorOf(id: string): string {
  return `#${id}`
}

function routeOf(id: string): string {
  return `${BUILD_ROUTE}#${id}`
}

/* -- Phase -------------------------------------------------------------------------------- */

export function phaseElementId(phaseId: string): string {
  return elementId('phase', phaseId)
}

export function phaseAnchor(phaseId: string): string {
  return anchorOf(phaseElementId(phaseId))
}

export function phaseRoute(phaseId: string): string {
  return routeOf(phaseElementId(phaseId))
}

/* -- Step --------------------------------------------------------------------------------- */

/**
 * The bare model id for a step. Goals contain `/` and `.`
 * (`ftp/PANTHER_HMM_Classification_files/...`), which break CSS selectors, so the goal is always
 * slugified and scoped by its phase.
 */
export function buildStepId(phaseId: string, goal: string): string {
  return `${slugify(phaseId)}${SEPARATOR}${slugify(goal)}`
}

export function stepElementId(stepId: string): string {
  return `${ANCHOR_PREFIX.step}${SEPARATOR}${stepId}`
}

export function stepAnchor(stepId: string): string {
  return anchorOf(stepElementId(stepId))
}

export function stepRoute(stepId: string): string {
  return routeOf(stepElementId(stepId))
}

/* -- Report section ----------------------------------------------------------------------- */

export function reportElementId(sectionId: string): string {
  return elementId('report', sectionId)
}

export function reportAnchor(sectionId: string): string {
  return anchorOf(reportElementId(sectionId))
}

export function reportRoute(sectionId: string): string {
  return routeOf(reportElementId(sectionId))
}

/* -- Check / warning ---------------------------------------------------------------------- */

export function checkElementId(checkId: string): string {
  return elementId('check', checkId)
}

export function checkAnchor(checkId: string): string {
  return anchorOf(checkElementId(checkId))
}

export function checkRoute(checkId: string): string {
  return routeOf(checkElementId(checkId))
}

/* -- Species ------------------------------------------------------------------------------ */

export function speciesElementId(oscode: string): string {
  return elementId('species', oscode)
}

export function speciesAnchor(oscode: string): string {
  return anchorOf(speciesElementId(oscode))
}

export function speciesRoute(oscode: string): string {
  return routeOf(speciesElementId(oscode))
}

/* -- Config key --------------------------------------------------------------------------- */

export function configElementId(key: string): string {
  return elementId('config', key)
}

export function configAnchor(key: string): string {
  return anchorOf(configElementId(key))
}

export function configRoute(key: string): string {
  return routeOf(configElementId(key))
}

/* -- Metric ------------------------------------------------------------------------------- */

export function metricElementId(metricId: string): string {
  return elementId('metric', metricId)
}

export function metricAnchor(metricId: string): string {
  return anchorOf(metricElementId(metricId))
}

export function metricRoute(metricId: string): string {
  return routeOf(metricElementId(metricId))
}

/* -- Reading an anchor back --------------------------------------------------------------- */

export interface ParsedAnchor {
  kind: AnchorKind
  /** Slugified id parts after the prefix. A step carries `[phaseId, goalSlug]`. */
  parts: string[]
  elementId: string
}

const KIND_BY_PREFIX = new Map<string, AnchorKind>(
  (Object.keys(ANCHOR_PREFIX) as AnchorKind[]).map(kind => [ANCHOR_PREFIX[kind], kind])
)

/**
 * Resolves an element id, `#anchor` or full route back to its entity. Returns `null` for
 * anything this module did not build, so an unrecognised deep link degrades to "not found"
 * rather than pointing at an arbitrary element.
 */
export function parseAnchor(value: string): ParsedAnchor | null {
  const hashIndex = value.indexOf('#')
  const id = (hashIndex >= 0 ? value.slice(hashIndex + 1) : value).trim()
  if (id === '') return null
  const segments = id.split(SEPARATOR)
  const kind = KIND_BY_PREFIX.get(segments[0])
  if (kind === undefined || segments.length < 2) return null
  return { kind, parts: segments.slice(1), elementId: id }
}
