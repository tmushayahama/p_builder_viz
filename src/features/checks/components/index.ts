/**
 * What the rest of the app can embed.
 *
 * `ChecksPanel` is the build-wide index the shell mounts, and it is a default export because the
 * shared contract says so. Everything else here exists so a check can appear IN CONTEXT: a marker
 * on a phase node, a marker beside a configuration value, a row inside another view's panel.
 */

export { default as ChecksPanel } from '@/features/checks/components/ChecksPanel'
export { CheckList } from '@/features/checks/components/CheckList'
export type { CheckListProps } from '@/features/checks/components/CheckList'
export { CheckMark } from '@/features/checks/components/CheckMark'
export type { CheckMarkProps } from '@/features/checks/components/CheckMark'
export { CheckRow } from '@/features/checks/components/CheckRow'
export type { CheckRowProps } from '@/features/checks/components/CheckRow'
export { ChecksSummary } from '@/features/checks/components/ChecksSummary'
export type { ChecksSummaryProps } from '@/features/checks/components/ChecksSummary'
export { ConfigCheckMarker } from '@/features/checks/components/ConfigCheckMarker'
export type { ConfigCheckMarkerProps } from '@/features/checks/components/ConfigCheckMarker'
export { ConfigTiers } from '@/features/checks/components/ConfigTiers'
export { InlineCheckMarker, strongestFinding } from '@/features/checks/components/InlineCheckMarker'
export type { InlineCheckMarkerProps } from '@/features/checks/components/InlineCheckMarker'
export { MetricCheckMarker } from '@/features/checks/components/MetricCheckMarker'
export type { MetricCheckMarkerProps } from '@/features/checks/components/MetricCheckMarker'
export { PhaseCheckMarker } from '@/features/checks/components/PhaseCheckMarker'
export type { PhaseCheckMarkerProps } from '@/features/checks/components/PhaseCheckMarker'
