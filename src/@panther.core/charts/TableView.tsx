import type { ReactNode } from 'react'
import { DataTable } from '@/@panther.core/components/DataTable'
import type { DataColumn } from '@/@panther.core/components/DataTable'
import type { Completeness } from '@/@panther.core/vocabulary'

/**
 * A chart's table twin.
 *
 * Every chart ships one, which is why this is a thin, deliberately unadorned
 * wrapper over `DataTable`: the twin is the same numbers in the same order as
 * the marks, not a second analysis. It is what makes a chart readable by a
 * screen reader, on a touch device with no hover, and on paper.
 *
 * `completeness` is passed straight through, so a chart drawn from a truncated
 * table gets a table twin that says so and refuses to sort.
 */
export interface TableViewProps<T> {
  /** Usually the chart's own title, so the twin is obviously the same figure. */
  caption: string
  columns: readonly DataColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  completeness?: Completeness
  footNote?: ReactNode
  maxHeight?: number
  className?: string
}

export const TableView = <T,>({
  caption,
  columns,
  rows,
  rowKey,
  completeness,
  footNote,
  maxHeight = 320,
  className,
}: TableViewProps<T>) => (
  <DataTable
    caption={caption}
    columns={columns}
    rows={rows}
    rowKey={rowKey}
    completeness={completeness}
    density="tight"
    pageSize={0}
    maxHeight={maxHeight}
    footNote={footNote}
    className={className}
  />
)
