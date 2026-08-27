import { METRIC_DEFINITIONS } from '@/features/build/model'
import type { MetricDefinitionRegistry } from '@/@panther.core/components'

/**
 * Adapts the model's metric definitions to the registry the shared primitives consume.
 *
 * The two shapes differ deliberately: the model's entry carries domain fields (`family`,
 * `ambiguityNote`, `shortLabel`) that a primitive has no business knowing, and the primitive's
 * entry carries only what it renders. This adapter is the single crossing point, mounted once in
 * `App`, so `MetricValue` anywhere in the tree gets the same label and the same explanation - which
 * is what stops any screen from labelling one of the six sequence counts "Sequences".
 */
export const metricRegistry: MetricDefinitionRegistry = Object.fromEntries(
  Object.values(METRIC_DEFINITIONS).map(definition => [
    definition.id,
    {
      id: definition.id,
      label: definition.label,
      description:
        definition.ambiguityNote === undefined
          ? definition.definition
          : `${definition.definition} ${definition.ambiguityNote}`,
      source: definition.source,
    },
  ])
)
