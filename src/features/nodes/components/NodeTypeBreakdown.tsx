import { useState } from 'react'
import {
  Bars,
  ChartFrame,
  ChartTooltip,
  TableView,
  bandScale,
  linearScale,
} from '@/@panther.core/charts'
import type { AxisTick, BarDatum, PlotRect } from '@/@panther.core/charts'
import { EmptyState } from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { nominalFill } from '@/@panther.core/theme/tokens'
import { formatCount } from '@/app/format'
import type { NodeTypeModel, NodeTypeRow } from '@/features/nodes/model'
import { zeroTypeSentence } from '@/features/nodes/model'
import { formatPercent } from '@/features/species/model/format'

/**
 * Forward tracking by node type: five nominal categories, one fill.
 *
 * The categories have no order and no magnitude relationship, so they are NOT ramped by value -
 * every bar takes series slot 1, and the differences are carried by bar length where they belong. A
 * colour ramp here would invent an ordering the data does not have.
 *
 * `UNKNOWN` at 0 of 362 nodes is the row this chart exists to surface, and it is the one row a bar
 * chart physically cannot draw: a zero-length bar is invisible, and drawing a stub instead would
 * misstate the value. So the zero rows are labelled directly and restated in a sentence underneath.
 * A measured zero and a missing measurement must not look the same.
 */
export interface NodeTypeBreakdownProps {
  model: NodeTypeModel
}

const ROW_HEIGHT = 26
const MARGINS = { top: 4, right: 92, bottom: 26, left: 112 }

interface Hover {
  row: NodeTypeRow
  x: number
  y: number
}

export const NodeTypeBreakdown = ({ model }: NodeTypeBreakdownProps) => {
  const [hover, setHover] = useState<Hover | null>(null)
  const rows = model.rows
  const byType = new Map(rows.map(row => [row.nodeType, row]))

  const columns: readonly DataColumn<NodeTypeRow>[] = [
    {
      id: 'type',
      header: 'Node type',
      kind: 'mono',
      render: row => row.nodeType,
      sortValue: row => row.nodeType,
    },
    {
      id: 'pct',
      header: 'Forward-tracked',
      kind: 'number',
      render: row => formatPercent(row.pct),
      sortValue: row => row.pct,
    },
    {
      id: 'mapped',
      header: 'Nodes mapped',
      kind: 'number',
      render: row => formatCount(row.mapped),
      sortValue: row => row.mapped,
    },
    {
      id: 'total',
      header: 'Nodes total',
      kind: 'number',
      render: row => formatCount(row.total),
      sortValue: row => row.total,
    },
    {
      id: 'unmapped',
      header: 'Not tracked',
      kind: 'number',
      render: row => formatCount(row.unmapped),
      sortValue: row => row.unmapped,
    },
  ]

  const data: readonly BarDatum[] = rows.map(row => ({
    key: row.nodeType,
    value: row.pct,
    label: row.markLabel,
  }))

  return (
    <ChartFrame
      title="Node forward tracking by node type"
      description="One bar per node type, showing the share of that type's nodes that mapped forward. A type at zero is labelled rather than drawn, because a zero-length bar cannot be seen."
      height={Math.max(ROW_HEIGHT, rows.length * ROW_HEIGHT)}
      margins={MARGINS}
      minWidth={520}
      grid="x"
      axes="y"
      isEmpty={rows.length === 0}
      empty={
        <EmptyState
          title="No node-type rows"
          description="This report carries no per-node-type figures, so there is nothing to compare. Nothing here is inferred from that absence."
        />
      }
      xTicks={plot => {
        const scale = linearScale([0, 100], [plot.x, plot.x + plot.width])
        return [0, 25, 50, 75, 100].map((value): AxisTick => ({
          position: scale(value),
          label: `${value} %`,
          emphasis: value === 100,
          noGrid: value === 0,
        }))
      }}
      yTicks={plot => {
        const band = bandScale(
          rows.map(row => row.nodeType),
          [plot.y, plot.y + plot.height]
        )
        return rows.map((row): AxisTick => ({
          position: band.center(row.nodeType),
          label: row.nodeType,
          emphasis: row.isZero,
          noGrid: true,
        }))
      }}
      tableView={
        <TableView
          caption="Node forward tracking by node type"
          columns={columns}
          rows={rows}
          rowKey={row => row.nodeType}
        />
      }
      footer={
        <span className="flex flex-wrap gap-x-3 gap-y-0.5">
          {model.zeroRows.map(row => (
            <span key={row.nodeType}>{zeroTypeSentence(row)}</span>
          ))}
          {model.unreadable.length > 0 && (
            <span>
              {`${model.unreadable.map(row => row.nodeType).join(', ')}: the report gave no ` +
                'percentage, so no bar is drawn. Unknown, not zero.'}
            </span>
          )}
        </span>
      }
      overlay={plot => (
        <ChartTooltip
          x={hover?.x ?? 0}
          y={hover?.y ?? 0}
          bounds={plot}
          visible={hover !== null}
          title={hover?.row.nodeType}
          rows={
            hover === null
              ? []
              : [
                  { label: 'Forward-tracked', value: formatPercent(hover.row.pct), emphasis: true },
                  { label: 'Nodes mapped', value: formatCount(hover.row.mapped) },
                  { label: 'Nodes total', value: formatCount(hover.row.total) },
                  { label: 'Not tracked', value: formatCount(hover.row.unmapped) },
                ]
          }
        />
      )}
    >
      {(plot: PlotRect) => {
        const band = bandScale(
          rows.map(row => row.nodeType),
          [plot.y, plot.y + plot.height]
        )
        const value = linearScale([0, 100], [plot.x, plot.x + plot.width])

        return (
          <Bars
            data={data}
            plot={plot}
            band={band}
            value={value}
            orientation="horizontal"
            fill={nominalFill()}
            labelKeys={model.labelled}
            onHover={(datum, point) => {
              if (datum === null) {
                setHover(null)
                return
              }
              const row = byType.get(datum.key)
              if (row === undefined) return
              setHover({ row, x: point.x, y: point.y })
            }}
          />
        )
      }}
    </ChartFrame>
  )
}
