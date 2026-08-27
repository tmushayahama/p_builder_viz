/**
 * The scales every chart in the app shares. No chart re-implements one.
 *
 * The overriding requirement is that a scale NEVER returns a non-finite number.
 * A `NaN` in an SVG coordinate does not throw - the browser silently drops the
 * attribute and the chart renders blank - so the three cases that produce one
 * are handled here, once, rather than in every mark:
 *
 *   a zero-width range   (the container has not been measured yet)
 *   a zero-span domain   (every value in the column is identical, e.g. all zero)
 *   a non-finite input   (a null slipped through, or a division produced NaN)
 *
 * Marks are still expected to SKIP absent data rather than scale it: a scaled
 * absent value lands on the baseline and reads as a measured zero, which is the
 * one thing the report must never say.
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
 * empty axis, so an all-equal column still gets a labelled baseline.
 */
export const niceTicks = (min: number, max: number, count = 5): number[] => {
  const lo = finite(min, 0)
  const hi = finite(max, 0)
  if (lo === hi) return [lo]
  if (count < 2) return [lo, hi]

  const rawStep = (hi - lo) / (count - 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))))
  const normalised = rawStep / magnitude
  const stepFactor = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10
  const step = stepFactor * magnitude

  const start = Math.ceil(lo / step) * step
  const ticks: number[] = []
  // The guard is on the count, not on floating-point comparison: accumulating
  // `start + i * step` avoids drift, and 64 caps a pathological step.
  for (let index = 0; index < 64; index += 1) {
    const value = start + index * step
    if (value > hi + step * 1e-9) break
    ticks.push(Number(value.toFixed(10)))
  }
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
  const domainSpan = d1 - d0
  const rangeSpan = r1 - r0

  const scale = (value: number): number => {
    if (!Number.isFinite(value)) return r0
    if (domainSpan === 0) return r0
    return r0 + ((value - d0) / domainSpan) * rangeSpan
  }

  return Object.assign(scale, {
    domain: [d0, d1] as const,
    range: [r0, r1] as const,
    ticks: (count = 5) => niceTicks(d0, d1, count),
    invert: (pixel: number) => {
      if (!Number.isFinite(pixel) || rangeSpan === 0) return d0
      return d0 + ((pixel - r0) / rangeSpan) * domainSpan
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
  const width = r1 - r0
  const count = keys.length
  const step = count > 0 ? width / count : 0
  const bandwidth = Math.max(0, step * (1 - Math.min(0.9, Math.max(0, padding))))
  const index = new Map<string, number>()
  keys.forEach((key, position) => {
    if (!index.has(key)) index.set(key, position)
  })

  const start = (key: string): number => {
    const position = index.get(key)
    if (position === undefined) return r0
    return r0 + position * step + (step - bandwidth) / 2
  }

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
  let min = 0
  let max = 0
  let seen = false
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    seen = true
    if (value < min) min = value
    if (value > max) max = value
  }
  if (!seen) return [0, 1]
  if (min === max) return min === 0 ? [0, 1] : [Math.min(0, min), Math.max(0, max)]
  return [min, max]
}

/** Plain extent, for a scale that must not be anchored to zero (a 90-100 % axis). */
export const extent = (values: readonly (number | null | undefined)[]): [number, number] | null => {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    if (value < min) min = value
    if (value > max) max = value
  }
  return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null
}
