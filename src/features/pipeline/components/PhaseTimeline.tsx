import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChartFrame,
  ChartLegend,
  ChartPatterns,
  ChartTooltip,
  TableView,
  clampSpan,
  hatchFill,
  linearScale,
  num,
} from '@/@panther.core/charts'
import type { AxisTick, LegendItem, PlotRect } from '@/@panther.core/charts'
import { EmptyState, Panel, StatusChip } from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { MARK, accent, chrome, ink, statusFill } from '@/@panther.core/theme/tokens'
import type { StatusTone } from '@/@panther.core/theme/tokens'
import { formatUtcClockFromEpoch, formatUtcShortFromEpoch, plural } from '@/app/format'
import { phaseRoute } from '@/features/build/model'
import { useBuildReport, useSelectPhase } from '@/features/build/hooks'
import { useActivePhaseIndex } from '@/features/pipeline/hooks'
import { buildTimelineModel } from '@/features/pipeline/timeline'
import type { TimelineRow } from '@/features/pipeline/timeline'

/**
 * The inferred timeline: phases on a shared wall clock, built from artifact time order.
 *
 * This chart is the one place artifact ordering is used, and every decision in it exists to stop
 * the drawing from claiming more than the data supports.
 *
 * A span is elapsed ARTIFACT ACTIVITY, never runtime. The label says so, the tooltip says so, and
 * the footer says so, because an mtime difference is not a measurement of how long a step took.
 *
 * A phase with no completed steps gets an empty track and a stated reason. It never gets a
 * zero-width bar, which would read as "ran instantly", and it is never given a position inferred
 * from its declared neighbours.
 *
 * A single artifact fixes an instant, so it is drawn as a point rather than a hairline-thin bar.
 *
 * And no coordinate can be negative: the row model clamps the interval, and `clampSpan` clamps it
 * again on the way into the geometry.
 */

/** Row pitch. Bars are capped well under it, so the leftover is air rather than a fatter bar. */
const ROW_HEIGHT = 22
const BAR_HEIGHT = Math.min(12, MARK.maxBarThickness)
/** Real spans narrower than this would vanish; a span that exists must be visible. */
const MIN_SPAN_WIDTH = 2
const INSTANT_RADIUS = 4

const MARGINS = { top: 4, right: 14, bottom: 22, left: 178 }

/** Round wall-clock steps, so a tick lands on a time a human recognises. */
const TICK_STEPS: readonly number[] = [
  900, 1800, 3600, 7200, 10800, 21600, 43200, 86400, 172800, 604800,
]

function timeTicks(domain: readonly [number, number], target = 6): number[] {
  const [start, end] = domain
  const span = end - start
  if (!Number.isFinite(span) || span <= 0) return []
  const ideal = span / Math.max(1, target)
  const step = TICK_STEPS.find(candidate => candidate >= ideal) ?? TICK_STEPS[TICK_STEPS.length - 1]
  const first = Math.ceil(start / step) * step
  const ticks: number[] = []
  for (let index = 0; index < 64; index += 1) {
    const value = first + index * step
    if (value > end) break
    ticks.push(value)
  }
  return ticks
}

const toneOf = (row: TimelineRow): StatusTone => {
  if (row.isHole) return 'hole'
  if (row.isFrontier) return 'active'
  if (row.status === 'complete') return 'pass'
  if (row.status === 'blocked') return 'fail'
  return 'neutral'
}

/** A hole is hatched: the texture channel, so it survives a monochrome print. */
const fillOf = (row: TimelineRow): string =>
  row.isHole ? hatchFill('hole') : statusFill(toneOf(row))

const LEGEND_TONES: readonly { key: string; label: string; tone: StatusTone }[] = [
  { key: 'complete', label: 'Complete', tone: 'pass' },
  { key: 'frontier', label: 'Frontier', tone: 'active' },
  { key: 'hole', label: 'Hole (hatched)', tone: 'hole' },
  { key: 'blocked', label: 'Blocked', tone: 'fail' },
  { key: 'pending', label: 'Not started', tone: 'neutral' },
]

interface Hover {
  row: TimelineRow
  x: number
  y: number
}

export const PhaseTimeline = () => {
  const report = useBuildReport()
  const model = useMemo(() => buildTimelineModel(report), [report])
  const active = useActivePhaseIndex(report)
  const select = useSelectPhase()
  const navigate = useNavigate()
  const [hover, setHover] = useState<Hover | null>(null)

  const rows = model.rows
  const plotHeight = Math.max(ROW_HEIGHT, rows.length * ROW_HEIGHT)

  const present = new Set<string>(
    rows.map(row => (row.isHole ? 'hole' : row.isFrontier ? 'frontier' : row.status))
  )
  const legendItems: LegendItem[] = LEGEND_TONES.filter(entry => present.has(entry.key)).map(
    entry => ({ key: entry.key, label: entry.label, swatch: statusFill(entry.tone) })
  )

  const columns: readonly DataColumn<TimelineRow>[] = [
    {
      id: 'phase',
      header: 'Phase',
      render: row => row.label,
      sortValue: row => row.index,
    },
    {
      id: 'status',
      header: 'State',
      kind: 'node',
      render: row => <StatusChip status={row.isFrontier ? 'frontier' : row.status} />,
    },
    {
      id: 'first',
      header: 'First artifact',
      kind: 'mono',
      render: row => row.firstArtifactLabel,
    },
    {
      id: 'last',
      header: 'Last artifact',
      kind: 'mono',
      render: row => row.lastArtifactLabel,
    },
    {
      id: 'artifacts',
      header: 'Artifacts',
      kind: 'number',
      render: row => row.artifactCount,
      sortValue: row => row.artifactCount,
    },
    {
      id: 'elapsed',
      header: 'Inferred activity',
      hint: 'Elapsed between the first and last artifact in the phase. Not measured runtime.',
      render: row => row.elapsedLabel,
      sortValue: row => row.elapsedSeconds,
    },
    {
      id: 'concurrent',
      header: 'Possibly concurrent',
      render: row => (row.potentiallyConcurrent ? 'yes' : 'no'),
    },
  ]

  const openPhase = (row: TimelineRow) => {
    select(row.index)
    navigate(phaseRoute(row.phaseId))
  }

  return (
    <Panel
      title="Inferred artifact activity"
      provenance="derived"
      status={
        <span className="pb-figures text-ink-muted text-2xs">
          {model.activityLabel} · artifact time order
        </span>
      }
    >
      <ChartFrame
        title="Phase activity on a shared wall clock, inferred from artifact timestamps"
        description="One track per phase, ordered by its first artifact. Spans are elapsed artifact activity, not measured runtime."
        height={plotHeight}
        margins={MARGINS}
        minWidth={520}
        grid="x"
        axes="y"
        isEmpty={!model.hasDomain}
        empty={
          <EmptyState
            title="No artifact times to place on a clock"
            description="No step in this report carries an artifact timestamp, so there is nothing to lay out in time. Nothing here is inferred from that absence."
          />
        }
        xTicks={plot => {
          const scale = linearScale(model.domain, [plot.x, plot.x + plot.width])
          const ticks = timeTicks(model.domain)
          return ticks.map((value, index): AxisTick => {
            const midnight = value % 86400 === 0
            return {
              position: scale(value),
              label:
                index === 0 || midnight
                  ? formatUtcShortFromEpoch(value)
                  : formatUtcClockFromEpoch(value),
              emphasis: index === 0 || index === ticks.length - 1,
            }
          })
        }}
        yTicks={plot =>
          rows.map((row, index): AxisTick => ({
            position: plot.y + index * ROW_HEIGHT + ROW_HEIGHT / 2,
            label: row.label,
            emphasis: row.isFrontier || row.isHole,
            noGrid: true,
          }))
        }
        legend={
          <ChartLegend
            items={legendItems}
            note="A hole is drawn hatched. A phase with no completed steps has an empty track, never a zero-width bar."
          />
        }
        tableView={
          <TableView
            caption="Phase activity inferred from artifact timestamps"
            columns={columns}
            rows={rows}
            rowKey={row => row.phaseId}
            footNote="Ordered by first artifact. Elapsed values are inferred from artifact timestamps, not measured runtime."
          />
        }
        footer={
          <span className="flex flex-wrap gap-x-2">
            <span>
              Spans are inferred from artifact timestamps: elapsed activity, not measured runtime.
            </span>
            {model.concurrentPhaseCount > 0 && (
              <span>
                {model.concurrentPhaseCount} of {rows.length} {plural(rows.length, 'phase')} contain
                artifacts within {Math.round(model.concurrencyWindowSeconds / 60)} minutes of each
                other, so parts of them may have run in parallel rather than in sequence.
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
            title={hover?.row.label}
            rows={
              hover === null
                ? []
                : [
                    { label: 'State', value: hover.row.isFrontier ? 'Frontier' : hover.row.status },
                    { label: 'First artifact', value: hover.row.firstArtifactLabel },
                    { label: 'Last artifact', value: hover.row.lastArtifactLabel },
                    { label: 'Artifacts', value: hover.row.artifactCount },
                    { label: 'Inferred activity', value: hover.row.elapsedLabel, emphasis: true },
                  ]
            }
            footer={
              hover?.row.note ??
              'Inferred from artifact timestamps; this is elapsed activity, not measured runtime.'
            }
          />
        )}
      >
        {(plot: PlotRect) => {
          const scale = linearScale(model.domain, [plot.x, plot.x + plot.width])
          const right = plot.x + plot.width

          return (
            <>
              <ChartPatterns />
              {rows.map((row, index) => {
                const rowTop = plot.y + index * ROW_HEIGHT
                const centre = rowTop + ROW_HEIGHT / 2
                const barTop = centre - BAR_HEIGHT / 2
                const isActive = active === row.index
                const labelled = model.labelledPhaseIds.includes(row.phaseId)

                const startX = row.startSeconds === null ? plot.x : num(scale(row.startSeconds))
                const endX = row.endSeconds === null ? plot.x : num(scale(row.endSeconds))
                const rawWidth = clampSpan(startX, endX)
                const width = Math.min(
                  Math.max(rawWidth, MIN_SPAN_WIDTH),
                  Math.max(0, right - startX)
                )

                const labelX = startX + width + 5
                const labelFits = labelX + row.elapsedLabel.length * 4.6 < right

                return (
                  <g key={row.phaseId}>
                    {isActive && (
                      <rect
                        x={plot.x}
                        y={rowTop}
                        width={plot.width}
                        height={ROW_HEIGHT}
                        fill={accent.wash}
                      />
                    )}

                    {/* An empty track: the phase produced nothing to place on the clock. */}
                    {row.kind === 'none' && (
                      <line
                        x1={plot.x}
                        x2={right}
                        y1={centre}
                        y2={centre}
                        stroke={chrome.grid}
                        strokeWidth={MARK.hairlineWidth}
                        shapeRendering="crispEdges"
                      />
                    )}

                    {row.kind === 'none' && (
                      <text
                        x={plot.x + 6}
                        y={centre + 3}
                        fill={ink.faint}
                        fontSize={9}
                        textAnchor="start"
                      >
                        no artifacts — no span
                      </text>
                    )}

                    {row.kind === 'instant' && (
                      <path
                        d={`M${num(startX)} ${centre - INSTANT_RADIUS} L${
                          num(startX) + INSTANT_RADIUS
                        } ${centre} L${num(startX)} ${centre + INSTANT_RADIUS} L${
                          num(startX) - INSTANT_RADIUS
                        } ${centre} Z`}
                        fill={fillOf(row)}
                      />
                    )}

                    {row.kind === 'span' && (
                      <rect
                        x={num(startX)}
                        y={barTop}
                        width={width}
                        height={BAR_HEIGHT}
                        fill={fillOf(row)}
                      />
                    )}

                    {/* Selective labels: the longest spans, not every row. */}
                    {row.kind === 'span' && labelled && (
                      <text
                        x={labelFits ? labelX : startX - 5}
                        y={centre + 3}
                        fill={ink.muted}
                        fontSize={9}
                        textAnchor={labelFits ? 'start' : 'end'}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {row.elapsedLabel}
                      </text>
                    )}

                    <rect
                      x={plot.x}
                      y={rowTop}
                      width={plot.width}
                      height={ROW_HEIGHT}
                      fill="transparent"
                      role="button"
                      tabIndex={0}
                      aria-label={`${row.label}: ${row.elapsedLabel}, ${row.artifactCount} artifacts`}
                      className="cursor-pointer"
                      onMouseEnter={event =>
                        setHover({
                          row,
                          x: event.nativeEvent.offsetX,
                          y: centre,
                        })
                      }
                      onMouseMove={event =>
                        setHover({ row, x: event.nativeEvent.offsetX, y: centre })
                      }
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ row, x: plot.x + plot.width / 2, y: centre })}
                      onBlur={() => setHover(null)}
                      onClick={() => openPhase(row)}
                      onKeyDown={event => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        openPhase(row)
                      }}
                    />
                  </g>
                )
              })}
            </>
          )
        }}
      </ChartFrame>
    </Panel>
  )
}

export default PhaseTimeline
