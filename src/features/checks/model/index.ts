/** Public surface of the derived-checks layer. Components import from here, never from a rule. */

export * from './types'
export { findingRoute, fromGenerator, noted, passing, unevaluated, warned } from './finding'
export type { FindingSeed } from './finding'
export { runChecks, runChecksCached } from './runChecks'
export { CHECK_RULES } from './rules'
export {
  activeConfigEntries,
  configTarget,
  currentMajorRelease,
  datedReleaseTokenOf,
  phaseIdForSection,
  phaseTarget,
  sectionTarget,
  stepTarget,
} from './context'
export type { ActiveConfigEntry, AnchorTarget } from './context'
export { indexPhaseFindings, resolveWarningAnchor } from './anchoring'
export type { WarningAnchor, WarningMatch } from './anchoring'
