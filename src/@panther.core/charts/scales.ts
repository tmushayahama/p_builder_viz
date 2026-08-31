import { extent as d3Extent } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'

/**
 * The scales every chart in the app shares. No chart re-implements one.
 *
 * The arithmetic is `d3-scale`'s. This module used to compute it by hand -
 * 1-2-5 tick stepping, band layout, linear interpolation, invert - which was
 * about 190 lines reimplementing a solved problem, and it was the single most
 * likely place in the codebase for a subtle numeric bug to hide.
 *
 * What stays ours is the part d3 deliberately does not do: **a scale here NEVER
 * returns a non-finite number.** A `NaN` in an SVG coordinate does not throw -
 * the browser silently drops the attribute and the chart renders blank - so the
 * three cases that produce one are handled here, once, rather than in every
 * mark:
 *
 *   a zero-width range   (the container has not been measured yet)
 *   a zero-span domain   (every value in the column is identical, e.g. all zero)
 *   a non-finite input   (a null slipped through, or a division produced NaN)
 *
 * d3 returns `NaN` for the third and collapses the first two onto a point, so
 * the guards below are not redundant with it.
 *
 * Marks are still expected to SKIP absent data rather than scale it: a scaled
 * absent value lands on the baseline and reads as a measured zero, which is the
 * one thing the report must never say.
 *
 * The public shape is unchanged from the hand-rolled version, so no call site
 * moved when the implementation did.
 */

export interface LinearScale {
  (value: number): number
  readonly domain: readonly [number, number]
  readonly range: readonly [number, number]
  /** Rounded, human-readable tick values inside the domain. */
  ticks(count?: number): number[]
  /** Pixel back to a domain value. Returns `domain[0]` when the range is degenerate. */
  invert(pixel: number): number
  /** Clamp a domain value into the domain. */
  clamp(value: number): number
}

const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback

/**
 * Rounded 1-2-5 ticks. A zero-span domain yields a single tick rather than an
 * empty axis, so an all-equal column still gets a labelled baseline - d3 would
 * return a run of identical values there.
 */
export const niceTicks = (min: number, max: number, count = 5): number[] => {
  const lo = finite(min, 0)
  const hi = finite(max, 0)
  if (lo === hi) return [lo]
  if (count < 2) return [lo, hi]
  const ticks = scaleLinear().domain([lo, hi]).ticks(count)
  return ticks.length > 0 ? ticks : [lo, hi]
}

export const linearScale = (
  domain: readonly [number, number],
  range: readonly [number, number]
): LinearScale => {
  const d0 = finite(domain[0], 0)
  const d1 = finite(domain[1], 0)
  const r0 = finite(range[0], 0)
  const r1 = finite(range[1], 0)
  const degenerate = d1 - d0 === 0
  const inner = scaleLinear().domain([d0, d1]).range([r0, r1])

  // A zero-span domain makes d3 map every value to the range midpoint. The
  // report's convention is the baseline instead: an all-equal column should sit
  // on the axis, not float in the middle of the plot.
  const scale = (value: number): number => {
    if (!Number.isFinite(value) || degenerate) return r0
    return finite(inner(value), r0)
  }

  return Object.assign(scale, {
    domain: [d0, d1] as const,
    range: [r0, r1] as const,
    ticks: (count = 5) => niceTicks(d0, d1, count),
    invert: (pixel: number) => {
      if (!Number.isFinite(pixel) || r1 - r0 === 0) return d0
      return finite(inner.invert(pixel), d0)
    },
    clamp: (value: number) => {
      if (!Number.isFinite(value)) return d0
      const lo = Math.min(d0, d1)
      const hi = Math.max(d0, d1)
      return Math.min(hi, Math.max(lo, value))
    },
  })
}

export interface BandScale {
  /** Start pixel of a key's band. `range[0]` for an unknown key. */
  (key: string): number
  readonly keys: readonly string[]
  readonly range: readonly [number, number]
  readonly step: number
  readonly bandwidth: number
  /** Centre pixel of a key's band - where a line point or dot belongs. */
  center(key: string): number
  /**
   * Mark thickness inside the band, capped. The band's leftover is left as air
   * rather than being spent on a fatter bar.
   */
  markThickness(cap?: number): number
  /** Offset from the band start that centres a capped mark. */
  markOffset(cap?: number): number
  indexOf(key: string): number
}

export interface BandScaleOptions {
  /** Fraction of the step left as gap. 0.2 is the app default. */
  padding?: number
}

export const bandScale = (
  keys: readonly string[],
  range: readonly [number, number],
  options: BandScaleOptions = {}
): BandScale => {
  const { padding = 0.2 } = options
  const r0 = finite(range[0], 0)
  const r1 = finite(range[1], 0)
  // Duplicate keys would silently collapse in d3's internal index; the report
  // can carry a repeated stage name, so first occurrence wins and the rest map
  // onto it rather than disappearing.
  const unique = [...new Set(keys)]
  const inner = scaleBand()
    .domain(unique)
    .range([r0, r1])
    .paddingInner(Math.min(0.9, Math.max(0, padding)))
    .paddingOuter(Math.min(0.9, Math.max(0, padding)) / 2)

  // With an empty domain d3 still reports a full-width step and bandwidth - for
  // a 0-100 range it returns step 100, bandwidth 80 - which would size a mark
  // for data that does not exist. A band scale over nothing has no step.
  const empty = unique.length === 0
  const bandwidth = empty ? 0 : finite(inner.bandwidth(), 0)
  const step = empty ? 0 : finite(inner.step(), 0)
  const index = new Map(unique.map((key, position) => [key, position]))

  const start = (key: string): number => finite(inner(key) ?? r0, r0)

  return Object.assign(start, {
    keys,
    range: [r0, r1] as const,
    step,
    bandwidth,
    center: (key: string) => start(key) + bandwidth / 2,
    markThickness: (cap = Number.POSITIVE_INFINITY) => Math.max(0, Math.min(bandwidth, cap)),
    markOffset: (cap = Number.POSITIVE_INFINITY) =>
      Math.max(0, (bandwidth - Math.max(0, Math.min(bandwidth, cap))) / 2),
    indexOf: (key: string) => index.get(key) ?? -1,
  })
}

/**
 * Domain from data, always including a baseline of zero for magnitude scales -
 * a bar chart whose axis starts at 4,900 exaggerates every difference.
 *
 * Returns `[0, 1]` for empty or all-absent data so the axis still renders.
 */
export const extentWithZero = (
  values: readonly (number | null | undefined)[]
): [number, number] => {
  const span = extent(values)
  if (span === null) return [0, 1]
  const [min, max] = span
  if (min === max) return min === 0 ? [0, 1] : [Math.min(0, min), Math.max(0, max)]
  return [Math.min(0, min), Math.max(0, max)]
}

/** Plain extent, for a scale that must not be anchored to zero (a 90-100 % axis). */
export const extent = (values: readonly (number | null | undefined)[]): [number, number] | null => {
  const clean = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  )
  const [min, max] = d3Extent(clean)
  return min === undefined || max === undefined ? null : [min, max]
}
