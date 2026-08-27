/**
 * The species forward-tracking distribution: the figures, the axis and the swarm geometry.
 *
 * WHY THE AXIS IS THE SHORTFALL, ON A LOG SCALE.
 *
 * The published quantity is the share of a species' nodes that mapped forward, and on this report
 * it is pathologically tight: median 99.5 %, MAD 0.4, and 120 of 131 species at or above 90 %. A
 * linear 0-100 % strip therefore draws a solid slab against the right edge with a few dots
 * trailing left, which hides the only structure a reviewer needs. The complement - the share that
 * did NOT map forward - spans four orders of magnitude on the same data (0.03 % to 100 %), so a
 * log axis over the shortfall spreads the cluster apart and leaves the low tail isolated.
 *
 * The axis is still LABELLED in forward-tracked percent, because that is the figure the report
 * publishes and the figure every table repeats; only the spacing is non-linear. A tick reads
 * `99.9 %`, not `0.1 % shortfall`.
 *
 * Two consequences are handled here rather than in the chart:
 *
 *   A species with nothing left to track has a shortfall of exactly zero, which has no position on
 *   a log axis. It gets its own separated slot instead of being nudged into the last decade, where
 *   it would read as "nearly perfect" rather than "perfect".
 *
 *   Rate is not importance. A species at 65 % with 8,910 nodes has lost fewer nodes than one at
 *   90 % with 200,000, so the node count is carried as a size band on the mark and as the sort
 *   order of the low tail - never as the axis, which stays the rate.
 */

import type { PlotRect } from '@/@panther.core/charts'
import type { NodeTrackingSummary, SpeciesTracking } from '@/features/build/model'

/** Widest shortfall the axis shows: a species that mapped nothing forward. */
export const MAX_SHORTFALL_PCT = 100
/** Narrowest: below this a shortfall is clamped, because the axis would need a sixth decade. */
export const MIN_SHORTFALL_PCT = 0.01

/** Direct labels in the plot. Beyond this they collide inside the compressed low tail. */
export const MAX_PLOT_LABELS = 6

/**
 * Node-count bands, carried as mark size so magnitude is visible without becoming the axis.
 * Fixed rather than quantile-derived, so the footer can state them as plain numbers and two
 * report states cannot silently disagree about what a big mark means.
 */
export interface NodeCountBand {
  key: 'small' | 'medium' | 'large'
  label: string
  /** Exclusive upper bound. */
  max: number
  radius: number
}

export const NODE_COUNT_BANDS: readonly NodeCountBand[] = [
  { key: 'small', label: 'under 10,000 nodes', max: 10_000, radius: 4 },
  { key: 'medium', label: '10,000 to 39,999', max: 40_000, radius: 5.5 },
  { key: 'large', label: '40,000 or more', max: Number.POSITIVE_INFINITY, radius: 7 },
]

export function nodeCountBand(total: number | null): NodeCountBand {
  if (total === null || !Number.isFinite(total)) return NODE_COUNT_BANDS[0]
  return NODE_COUNT_BANDS.find(band => total < band.max) ?? NODE_COUNT_BANDS[0]
}

export interface DistributionPoint {
  oscode: string
  mapped: number | null
  total: number | null
  /** Forward-tracked percentage, the report's own value where it gave one. */
  pct: number | null
  /** Nodes with no forward match. `null` when the counts are absent. */
  unmapped: number | null
  /**
   * The plotted quantity. Recomputed from the counts where both are present - the report rounds
   * `pct` to one decimal, and `100 - 99.5` is a two-significant-figure answer to a
   * four-significant-figure question.
   */
  shortfallPct: number | null
  /** Shortfall of exactly zero: off the log axis, in its own slot. */
  isPerfect: boolean
  isZero: boolean
  isLow: boolean
  band: NodeCountBand
  /** False when the row carries no readable percentage, in which case it is not drawn at all. */
  usable: boolean
}

export interface DistributionModel {
  points: readonly DistributionPoint[]
  /** Drawable on the log axis. */
  onAxis: readonly DistributionPoint[]
  /** Drawable in the separated `100 %` slot. */
  perfect: readonly DistributionPoint[]
  /** Below the model's low-outlier threshold, ascending by percentage. */
  low: readonly DistributionPoint[]
  /** Descending by nodes not tracked forward - the magnitude reading of the same tail. */
  lowByMagnitude: readonly DistributionPoint[]
  /** Oscodes given a direct label in the plot. */
  labelled: readonly string[]
  zeroOscodes: readonly string[]
  /** Rows the report carried but nothing could be read from. Never silently dropped. */
  unusableOscodes: readonly string[]
  medianPct: number | null
  madPct: number | null
  atOrAboveThreshold: number | null
  threshold: number
  speciesCount: number
  /** Sum of the species rows' node totals, for comparison with the by-type totals. */
  nodesInSpeciesRows: number | null
  unmappedInSpeciesRows: number | null
}

function readPct(entry: SpeciesTracking): number | null {
  return entry.pct ?? entry.recomputedPct ?? null
}

function toPoint(entry: SpeciesTracking, threshold: number): DistributionPoint {
  const { mapped, total } = entry
  const pct = readPct(entry)
  const countsUsable =
    typeof mapped === 'number' && typeof total === 'number' && Number.isFinite(total) && total > 0
  const unmapped = countsUsable ? Math.max(0, (total as number) - (mapped as number)) : null
  const shortfallPct =
    unmapped !== null && total !== null
      ? (unmapped / total) * 100
      : pct === null
        ? null
        : Math.max(0, 100 - pct)

  return {
    oscode: entry.oscode,
    mapped,
    total,
    pct,
    unmapped,
    shortfallPct,
    isPerfect: shortfallPct === 0,
    isZero: pct === 0 || (countsUsable && mapped === 0),
    isLow: pct !== null && pct < threshold,
    band: nodeCountBand(total),
    usable: shortfallPct !== null,
  }
}

/** Sums a column, returning `null` only when no row carried a value at all. */
function sumOrNull(values: readonly (number | null)[]): number | null {
  let total = 0
  let seen = false
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    seen = true
    total += value
  }
  return seen ? total : null
}

export function buildDistribution(tracking: NodeTrackingSummary): DistributionModel {
  const threshold = tracking.lowOutlierThreshold
  const points = tracking.bySpecies.map(entry => toPoint(entry, threshold))
  const usable = points.filter(point => point.usable)
  const low = usable
    .filter(point => point.isLow)
    .slice()
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0) || a.oscode.localeCompare(b.oscode))

  return {
    points,
    onAxis: usable.filter(point => !point.isPerfect),
    perfect: usable.filter(point => point.isPerfect),
    low,
    lowByMagnitude: low
      .slice()
      .sort((a, b) => (b.unmapped ?? 0) - (a.unmapped ?? 0) || a.oscode.localeCompare(b.oscode)),
    // Zeros first: a species that mapped nothing forward is the one a reviewer must be able to
    // find without hovering, whatever else the tail contains.
    labelled: [...low.filter(point => point.isZero), ...low.filter(point => !point.isZero)]
      .slice(0, MAX_PLOT_LABELS)
      .map(point => point.oscode),
    zeroOscodes: usable.filter(point => point.isZero).map(point => point.oscode),
    unusableOscodes: points.filter(point => !point.usable).map(point => point.oscode),
    medianPct: tracking.medianPct,
    madPct: tracking.madPct,
    atOrAboveThreshold: tracking.atOrAbove90,
    threshold,
    speciesCount: points.length,
    nodesInSpeciesRows: sumOrNull(points.map(point => point.total)),
    unmappedInSpeciesRows: sumOrNull(points.map(point => point.unmapped)),
  }
}

/* -- The axis ----------------------------------------------------------------------------- */

export interface ShortfallTick {
  /** Forward-tracked percentage, which is what the tick says. */
  pct: number
  label: string
  position: number
  emphasis: boolean
}

export interface ShortfallAxis {
  /** Pixel for a shortfall percentage. Clamped into the axis domain; never non-finite. */
  x(shortfallPct: number): number
  /** Centre of the separated slot for species with no shortfall at all. */
  perfectX: number
  /** Right edge of the log region, i.e. where the separating gap starts. */
  logRight: number
  /** Centre of the gap that separates the log region from the `100 %` slot. */
  breakX: number | null
  ticks: readonly ShortfallTick[]
  /** False when the plot is too narrow to lay the axis out; nothing should be drawn. */
  usable: boolean
}

/** Width reserved for the `100 %` slot, and the gap that separates it from the log region. */
const PERFECT_SLOT_WIDTH = 30
const PERFECT_SLOT_GAP = 14
/** Keeps the widest-shortfall mark off the plot's left edge. */
const LEFT_INSET = 10

const LOG_MAX = Math.log10(MAX_SHORTFALL_PCT)
const LOG_MIN = Math.log10(MIN_SHORTFALL_PCT)
const LOG_SPAN = LOG_MAX - LOG_MIN

/** Decade edges, as forward-tracked percentages: 0, 90, 99, 99.9, 99.99. */
const DECADE_SHORTFALLS: readonly number[] = [100, 10, 1, 0.1, 0.01]

export function shortfallAxis(plot: PlotRect, hasPerfect: boolean): ShortfallAxis {
  const reserved = hasPerfect ? PERFECT_SLOT_WIDTH + PERFECT_SLOT_GAP : 0
  const left = plot.x + LEFT_INSET
  const width = plot.width - LEFT_INSET - reserved
  const usable = Number.isFinite(width) && width > 0 && LOG_SPAN > 0

  const x = (shortfallPct: number): number => {
    if (!usable || !Number.isFinite(shortfallPct)) return left
    const clamped = Math.min(MAX_SHORTFALL_PCT, Math.max(MIN_SHORTFALL_PCT, shortfallPct))
    return left + ((LOG_MAX - Math.log10(clamped)) / LOG_SPAN) * width
  }

  const logRight = usable ? left + width : left
  const perfectX = hasPerfect ? logRight + PERFECT_SLOT_GAP + PERFECT_SLOT_WIDTH / 2 : logRight

  const ticks: ShortfallTick[] = DECADE_SHORTFALLS.map(shortfall => {
    const pct = 100 - shortfall
    return {
      pct,
      label: `${Number(pct.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 })} %`,
      position: x(shortfall),
      emphasis: shortfall === MAX_SHORTFALL_PCT,
    }
  })
  if (hasPerfect) {
    ticks.push({ pct: 100, label: '100 %', position: perfectX, emphasis: true })
  }

  return {
    x,
    perfectX,
    logRight,
    breakX: hasPerfect ? logRight + PERFECT_SLOT_GAP / 2 : null,
    ticks,
    usable,
  }
}

/* -- The swarm ---------------------------------------------------------------------------- */

export interface SwarmItem {
  key: string
  x: number
  radius: number
}

export interface SwarmPlacement {
  key: string
  x: number
  y: number
  radius: number
}

export interface SwarmOptions {
  centerY: number
  /** Furthest a mark's CENTRE may sit from the centre line. */
  halfHeight: number
  /** Surface showing between two touching marks. */
  gap?: number
  step?: number
}

/**
 * Beeswarm packing: each mark takes the position closest to the centre line that does not overlap
 * one already placed.
 *
 * Deterministic by construction - the input is sorted by x and then by key, and no random jitter
 * is involved - because a plot whose points move between renders cannot be compared between two
 * screenshots or trusted in a build record. A pile that would exceed `halfHeight` is clamped
 * rather than allowed to escape the plot: overlap in the very densest column is an honest
 * failure, a mark drawn outside the frame is not.
 */
export function packSwarm(
  items: readonly SwarmItem[],
  options: SwarmOptions
): readonly SwarmPlacement[] {
  const { centerY, halfHeight, gap = 2, step = 2 } = options
  const ordered = items
    .filter(item => Number.isFinite(item.x) && Number.isFinite(item.radius))
    .slice()
    .sort((a, b) => a.x - b.x || a.key.localeCompare(b.key))

  const placed: SwarmPlacement[] = []
  const maxSteps = step > 0 ? Math.max(0, Math.floor(Math.max(0, halfHeight) / step)) : 0

  const free = (x: number, y: number, radius: number): boolean =>
    placed.every(other => {
      if (Math.abs(other.x - x) >= other.radius + radius + gap) return true
      return Math.abs(other.y - y) >= other.radius + radius + gap
    })

  for (const item of ordered) {
    const radius = Math.max(0, item.radius)
    const reach = Math.max(0, halfHeight - radius)
    let y: number | null = null
    for (let index = 0; index <= maxSteps && y === null; index += 1) {
      const offset = index * step
      if (offset > reach) break
      for (const sign of index === 0 ? [1] : [1, -1]) {
        const candidate = centerY + sign * offset
        if (free(item.x, candidate, radius)) {
          y = candidate
          break
        }
      }
    }
    placed.push({ key: item.key, x: item.x, y: y ?? centerY, radius })
  }

  return placed
}

/* -- Direct labels ------------------------------------------------------------------------ */

export interface LabelAnchor {
  key: string
  text: string
  /** The mark the label points at. */
  x: number
  y: number
}

export interface PlacedLabel extends LabelAnchor {
  /** Left edge of the text. */
  labelX: number
  labelY: number
  lane: number
}

export interface LabelLayoutOptions {
  /** Baselines for the label lanes. */
  laneYs: readonly number[]
  /** Right edge the text may not cross. */
  right: number
  charWidth?: number
  padding?: number
  offsetX?: number
}

/**
 * Places direct labels into horizontal lanes so the compressed low tail can be labelled without
 * text overlapping text. Greedy in x order: the first lane whose cursor has cleared this label's
 * position wins, so a label never moves left of the mark it names.
 */
export function layoutLabels(
  anchors: readonly LabelAnchor[],
  options: LabelLayoutOptions
): readonly PlacedLabel[] {
  const { laneYs, right, charWidth = 6.2, padding = 6, offsetX = 6 } = options
  if (laneYs.length === 0) return []

  const cursors = laneYs.map(() => Number.NEGATIVE_INFINITY)
  const ordered = anchors
    .filter(anchor => Number.isFinite(anchor.x) && Number.isFinite(anchor.y))
    .slice()
    .sort((a, b) => a.x - b.x || a.key.localeCompare(b.key))

  return ordered.map(anchor => {
    const width = anchor.text.length * charWidth + padding
    const wanted = anchor.x + offsetX
    let lane = cursors.findIndex(cursor => cursor <= wanted)
    if (lane < 0) {
      lane = cursors.reduce((best, cursor, index) => (cursor < cursors[best] ? index : best), 0)
    }
    const labelX = Math.min(Math.max(wanted, cursors[lane]), Math.max(0, right - width))
    cursors[lane] = labelX + width
    return { ...anchor, labelX, labelY: laneYs[lane], lane }
  })
}
