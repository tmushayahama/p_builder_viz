import { StatusChip, UnknownValue } from '@/@panther.core/components'
import type { SchemaSupport } from '@/features/build/model'

export interface SchemaNoticeProps {
  schema: SchemaSupport
}

/**
 * The visible half of the schema contract.
 *
 * A report the dashboard does not fully understand still renders - refusing would make the
 * dashboard useless the first time the generator gains a field - but it must say so, in the record,
 * above everything it went on to display. The literal version is preserved rather than described,
 * because that is what a maintainer needs years later.
 *
 * Renders nothing for a supported schema: the version itself is already a row in the preamble.
 */
export const SchemaNotice = ({ schema }: SchemaNoticeProps) => {
  if (!schema.degraded) return null

  return (
    <div
      role="note"
      data-pb-print="show"
      className="bg-status-warn-wash pb-hairline flex flex-col gap-1 px-3 py-1.5"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusChip
          status={schema.state === 'unknown' ? 'unknown' : 'warn'}
          label="Report schema not fully supported"
          size="md"
          hint={schema.explanation}
        />
        <UnknownValue value={schema.reported} kind="schema version" source="schema_version" />
        <span className="text-ink-faint pb-figures text-2xs">
          supported: {schema.supported.join(', ')}
        </span>
      </div>
      <p className="text-ink-muted text-2xs max-w-prose">{schema.explanation}</p>
    </div>
  )
}
