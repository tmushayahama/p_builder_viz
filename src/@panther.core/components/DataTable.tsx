import clsx from 'clsx'
import { Tooltip } from '@mantine/core'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/@panther.core/components/EmptyState'
import { TruncationNotice } from '@/@panther.core/components/TruncationNotice'
import type { Completeness } from '@/@panther.core/vocabulary'
import { isTruncated } from '@/@panther.core/vocabulary'

/**
 * The one table.
 *
 * Sticky header, tabular figures, horizontal scroll inside its own container
 * (the page must never scroll sideways), stable sort, numeric columns sorted
 * numerically, and "show more" instead of pagination chrome - a build report is
 * read by scanning, and page controls break a scan.
 *
 * The load-bearing prop is `completeness`. When the underlying data is
 * truncated - which on the real fixture is every table in `other_reports`,
 * 50/147, 20/132 and 20/813 - sorting and filtering are DISABLED and the
 * truncation notice is shown, because offering them implies a completeness the
 * report does not have. Sorting 50 of 147 rows by count and calling the top row
 * the largest is the specific wrong answer this prevents.
 *
 * Absent values are the caller's business, but the table helps: a `sortValue`
 * of `null` sorts last in both directions, so "unknown" never masquerades as
 * the smallest value.
 */
export type ColumnAlign = 'left' | 'right' | 'center'

/**
 * `number` right-aligns and applies tabular figures, `mono` is for identifiers
 * and paths, `node` is a caller-rendered cell (a BarCell, a StatusChip) that
 * should get no text treatment.
 */
export type ColumnKind = 'text' | 'number' | 'mono' | 'node'

export interface DataColumn<T> {
  id: string
  header: ReactNode
  /** Cell content. Without it the column shows the `sortValue`. */
  render?: (row: T) => ReactNode
  /** The comparable value. Numbers compare numerically, strings by locale. */
  sortValue?: (row: T) => number | string | null | undefined
  kind?: ColumnKind
  align?: ColumnAlign
  width?: number | string
  /** Header tooltip - usually the metric definition's description. */
  hint?: string
  /** Opt a single column out of sorting. */
  sortable?: boolean
}

export interface SortState {
  columnId: string
  direction: 'asc' | 'desc'
}

export interface DataTableProps<T> {
  columns: readonly DataColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  /** Accessible name for the table. Rendered visibly unless `captionVisible` is false. */
  caption: string
  captionVisible?: boolean
  /** Omit for data assembled in-app; pass it whenever the report truncated the set. */
  completeness?: Completeness
  /** Scoping note appended to the truncation notice. */
  completenessDetail?: ReactNode
  defaultSort?: SortState
  /** Rows shown before the first "show more". 0 shows everything. */
  pageSize?: number
  /** Rows added per "show more". Defaults to `pageSize`. */
  showMoreStep?: number
  /** Filter controls. Suppressed entirely when the data is truncated. */
  filters?: ReactNode
  onRowClick?: (row: T) => void
  selectedRowKey?: string | null
  /** Flashes a row a deep link points at. */
  highlightRowKey?: string | null
  empty?: ReactNode
  /** Vertical scroll threshold in px. The sticky header needs one. */
  maxHeight?: number
  density?: 'normal' | 'tight'
  footNote?: ReactNode
  className?: string
}

const alignClass: Record<ColumnAlign, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

const kindClass: Record<ColumnKind, string> = {
  text: '',
  number: 'pb-figures',
  mono: 'pb-ident',
  node: '',
}

const defaultAlign = (kind: ColumnKind): ColumnAlign => (kind === 'number' ? 'right' : 'left')

type SortValue = number | string | null | undefined

const isMissing = (value: SortValue): boolean =>
  value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))

/** Compares two PRESENT values. Absence is handled outside the direction flip. */
const compareValues = (a: SortValue, b: SortValue): number => {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

const SortGlyph = ({ direction }: { direction: 'asc' | 'desc' | null }) => (
  <svg
    viewBox="0 0 8 10"
    width={7}
    height={9}
    aria-hidden="true"
    focusable="false"
    className={clsx('shrink-0', direction ? 'text-accent' : 'text-ink-faint')}
  >
    {direction !== 'desc' && <path d="M4 0.6 7 4H1z" fill="currentColor" />}
    {direction !== 'asc' && <path d="M4 9.4 1 6h6z" fill="currentColor" />}
  </svg>
)

export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  caption,
  captionVisible = false,
  completeness,
  completenessDetail,
  defaultSort,
  pageSize = 50,
  showMoreStep,
  filters,
  onRowClick,
  selectedRowKey,
  highlightRowKey,
  empty,
  maxHeight = 480,
  density = 'normal',
  footNote,
  className,
}: DataTableProps<T>) => {
  const truncated = isTruncated(completeness)
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null)
  const [visible, setVisible] = useState(pageSize > 0 ? pageSize : rows.length)

  const sorted = useMemo(() => {
    if (truncated || !sort) return rows
    const column = columns.find(candidate => candidate.id === sort.columnId)
    if (!column?.sortValue) return rows
    const read = column.sortValue
    // Decorate with the original index so the sort is stable regardless of
    // engine, and equal rows keep the report's own order.
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const left = read(a.row)
        const right = read(b.row)
        // Absence is ranked BEFORE the direction flip, so an unknown stays at the
        // bottom in both directions. Negating it alongside the values would put
        // "we do not know" at the top of a descending sort, where a reader takes
        // the first row for the largest.
        const leftMissing = isMissing(left)
        const rightMissing = isMissing(right)
        if (leftMissing !== rightMissing) return leftMissing ? 1 : -1
        if (!leftMissing) {
          const result = compareValues(left, right)
          if (result !== 0) return sort.direction === 'asc' ? result : -result
        }
        return a.index - b.index
      })
      .map(entry => entry.row)
  }, [columns, rows, sort, truncated])

  const shown = pageSize > 0 ? sorted.slice(0, visible) : sorted
  const remaining = sorted.length - shown.length
  const step = showMoreStep ?? (pageSize > 0 ? pageSize : 50)
  const cellPadding = density === 'tight' ? 'px-1.5 py-0.5' : 'px-2 py-1'

  const toggleSort = (column: DataColumn<T>) => {
    if (truncated || !column.sortValue || column.sortable === false) return
    setSort(current =>
      current?.columnId === column.id
        ? { columnId: column.id, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId: column.id, direction: column.kind === 'number' ? 'desc' : 'asc' }
    )
  }

  return (
    <div className={clsx('space-y-1.5', className)}>
      {/* aria-hidden because the same string is the table's own <caption>;
          announcing it twice is worse than not showing it at all */}
      {captionVisible && (
        <p aria-hidden="true" className="text-ink text-xs font-semibold tracking-wide uppercase">
          {caption}
        </p>
      )}

      {completeness && truncated && (
        <TruncationNotice
          completeness={completeness}
          detail={
            completenessDetail ??
            'Sorting and filtering are disabled: they would imply a complete set.'
          }
        />
      )}

      {filters && !truncated && filters}

      {rows.length === 0 ? (
        (empty ?? (
          <EmptyState
            title="No rows"
            description="This table is present in the report and contains no rows."
          />
        ))
      ) : (
        <div
          data-pb-scroll=""
          className="pb-hairline rounded-hair overflow-auto"
          style={{ maxHeight }}
        >
          <table className="w-full min-w-max border-collapse text-xs">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map(column => {
                  const kind = column.kind ?? 'text'
                  const align = column.align ?? defaultAlign(kind)
                  const canSort =
                    !truncated && Boolean(column.sortValue) && column.sortable !== false
                  const direction = sort?.columnId === column.id ? sort.direction : null

                  const header = (
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1',
                        align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      <span className="truncate">{column.header}</span>
                      {canSort && <SortGlyph direction={direction} />}
                    </span>
                  )

                  return (
                    <th
                      key={column.id}
                      scope="col"
                      style={column.width ? { width: column.width } : undefined}
                      aria-sort={
                        direction ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                      className={clsx(
                        'bg-surface-2 text-ink-muted pb-hairline-b sticky top-0 z-10 font-semibold',
                        'text-2xs whitespace-nowrap',
                        cellPadding,
                        alignClass[align]
                      )}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className="hover:text-ink -mx-1 min-h-6 cursor-pointer px-1"
                        >
                          {column.hint ? (
                            <Tooltip
                              label={column.hint}
                              withArrow
                              openDelay={200}
                              multiline
                              maw={280}
                            >
                              {header}
                            </Tooltip>
                          ) : (
                            header
                          )}
                        </button>
                      ) : column.hint ? (
                        <Tooltip label={column.hint} withArrow openDelay={200} multiline maw={280}>
                          {header}
                        </Tooltip>
                      ) : (
                        header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map(row => {
                const key = rowKey(row)
                const selected = selectedRowKey === key
                const highlighted = highlightRowKey === key
                return (
                  <tr
                    key={key}
                    data-row-key={key}
                    aria-selected={onRowClick ? selected : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={clsx(
                      'pb-hairline-b',
                      onRowClick && 'hover:bg-wash-hover cursor-pointer',
                      selected && 'bg-wash-selected',
                      highlighted && 'bg-accent-wash'
                    )}
                  >
                    {columns.map(column => {
                      const kind = column.kind ?? 'text'
                      const align = column.align ?? defaultAlign(kind)
                      const content = column.render
                        ? column.render(row)
                        : (column.sortValue?.(row) ?? null)
                      return (
                        <td
                          key={column.id}
                          className={clsx(
                            'text-ink align-baseline',
                            cellPadding,
                            kindClass[kind],
                            alignClass[align]
                          )}
                        >
                          {content}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(remaining > 0 || footNote) && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {remaining > 0 && (
            <button
              type="button"
              data-pb-print="hide"
              onClick={() => setVisible(current => current + step)}
              className="text-accent hover:text-accent-hover pb-figures text-2xs min-h-6 cursor-pointer"
            >
              {`Show ${Math.min(step, remaining).toLocaleString()} more (${remaining.toLocaleString()} not shown)`}
            </button>
          )}
          {footNote && <span className="text-ink-muted text-2xs">{footNote}</span>}
        </div>
      )}
    </div>
  )
}
