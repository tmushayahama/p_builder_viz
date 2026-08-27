import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

/**
 * The seam between the metric definitions registry and every component that
 * shows a number.
 *
 * The registry itself belongs to the derived model (it is the thing that has to
 * disambiguate the fixture's six different sequence counts). This module only
 * carries it, so `MetricValue`, a chart axis, a table header and an export all
 * read the same label and the same one-line explanation. Fixing terminology on
 * one screen and leaving another ambiguous is the failure mode this prevents.
 *
 * There is no default registry on purpose: an empty one makes a missing
 * definition visible rather than letting a plausible fallback label hide it.
 */
export interface MetricDefinition {
  id: string
  /** The user-facing label. Never just "Sequences". */
  label: string
  /** One line a reviewer can act on: what exactly this number counts. */
  description: string
  /** `sequences`, `families`, `%`, `pp` - appended after the figure. */
  unit?: string
  /** Which report section the figure comes from, for provenance. */
  source?: string
}

export type MetricDefinitionRegistry = Readonly<Record<string, MetricDefinition>>

const MetricDefinitionsContext = createContext<MetricDefinitionRegistry>({})

export interface MetricDefinitionsProviderProps {
  registry: MetricDefinitionRegistry
  children: ReactNode
}

export const MetricDefinitionsProvider = ({
  registry,
  children,
}: MetricDefinitionsProviderProps) => {
  const value = useMemo(() => registry, [registry])
  return (
    <MetricDefinitionsContext.Provider value={value}>{children}</MetricDefinitionsContext.Provider>
  )
}

export const useMetricDefinitions = (): MetricDefinitionRegistry =>
  useContext(MetricDefinitionsContext)

/** `null` when the registry has no entry - the caller must show that, not hide it. */
export const useMetricDefinition = (metricId: string): MetricDefinition | null =>
  useMetricDefinitions()[metricId] ?? null
