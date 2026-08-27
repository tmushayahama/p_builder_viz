import clsx from 'clsx'
import { Tooltip } from '@mantine/core'
import { CodeBlock, KeyValueList, MetricValue } from '@/@panther.core/components'
import type { KeyValueItem } from '@/@panther.core/components'
import { getMetricDefinition } from '@/features/build/model'
import type { MetricId } from '@/features/build/model'
import type { GenericField } from '@/features/reports/model/genericView'

/**
 * How a fallback view labels a value it may not understand.
 *
 * The registry wins wherever the key resolves to a metric, so a generic render of the library
 * section says "Sequences in the built library" exactly as a bespoke view would. Where it does not
 * resolve, the report's own field name is shown verbatim in mono and marked as such. Humanising
 * `sequences` into the label "Sequences" would be the worse option by a wide margin: this report
 * carries six different sequence counts, and a guessed label is how they get confused.
 */

const KEY_HINT =
  'The report’s own field name. No specialised view or metric definition is registered for it, ' +
  'so the fallback shows the key verbatim rather than inventing a label.'

const AMBIGUOUS_HINT =
  'This report carries six distinct sequence counts. No metric definition is registered for this ' +
  'key, so the fallback cannot say which one it is and shows the report’s own field name instead.'

export interface FieldLabelProps {
  field: GenericField
}

/** The report's own key, in mono, with a dotted underline when the term is a known ambiguity. */
export const ReportKeyLabel = ({ field }: FieldLabelProps) => (
  <Tooltip
    label={field.ambiguousTerm ? AMBIGUOUS_HINT : KEY_HINT}
    withArrow
    openDelay={200}
    multiline
    maw={300}
  >
    <span
      className={clsx(
        'pb-ident text-ink-muted text-2xs',
        field.ambiguousTerm && 'underline decoration-dotted'
      )}
      data-generic-key={field.key}
      data-ambiguous={field.ambiguousTerm ? '' : undefined}
    >
      {field.path}
    </span>
  </Tooltip>
)

export interface MetricLabelProps {
  metricId: MetricId
}

export const MetricLabel = ({ metricId }: MetricLabelProps) => {
  const definition = getMetricDefinition(metricId)
  const hint =
    definition.ambiguityNote === undefined
      ? definition.definition
      : `${definition.definition} ${definition.ambiguityNote}`

  return (
    <Tooltip label={hint} withArrow openDelay={200} multiline maw={300}>
      <span className="text-ink-muted text-2xs">{definition.label}</span>
    </Tooltip>
  )
}

const numericValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** One summary figure. Registered metrics go through `MetricValue` so the label is the shared one. */
export const GenericFigure = ({ field }: FieldLabelProps) => {
  if (field.metricId !== null) {
    return (
      <MetricValue
        metricId={field.metricId}
        value={numericValue(field.value) ?? field.formatted}
        layout="stack"
      />
    )
  }

  return (
    <div className="flex flex-col gap-px" data-generic-figure={field.key}>
      <ReportKeyLabel field={field} />
      <span className="pb-figures text-ink text-sm leading-tight">{field.formatted}</span>
    </div>
  )
}

export interface GenericFigureListProps {
  fields: readonly GenericField[]
}

export const GenericFigureList = ({ fields }: GenericFigureListProps) => (
  <div className="flex flex-wrap gap-x-6 gap-y-2">
    {fields.map(field => (
      <GenericFigure key={field.path} field={field} />
    ))}
  </div>
)

export interface GenericFieldRowsProps {
  fields: readonly GenericField[]
  /** Element ids for the named variables, keyed by field path. */
  anchorIds?: Record<string, string>
  /** Highlight the row a deep link points at. */
  highlightId?: string | null
  labelWidth?: number
}

function snapshotOf(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

function rowValue(field: GenericField) {
  if (field.kind === 'scalar') return field.formatted
  return (
    <CodeBlock code={snapshotOf(field.value)} copy wrap maxHeight={200} showLineNumbers={false} />
  )
}

/**
 * Label/value rows. A value that is multi-line text or a nested structure is shown as a snapshot
 * block instead of being flattened onto one line, because a truncated path or a collapsed object
 * is exactly the kind of quiet data loss this view exists to avoid.
 */
export const GenericFieldRows = ({
  fields,
  anchorIds,
  highlightId,
  labelWidth = 26,
}: GenericFieldRowsProps) => {
  const items: KeyValueItem[] = fields.map(field => ({
    key: field.path,
    label:
      field.metricId !== null ? (
        <MetricLabel metricId={field.metricId} />
      ) : (
        <ReportKeyLabel field={field} />
      ),
    value: rowValue(field),
    mono: field.kind === 'scalar',
    anchorId: anchorIds?.[field.path],
  }))

  return <KeyValueList items={items} labelWidth={labelWidth} highlightId={highlightId} />
}
