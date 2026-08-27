import { MARK } from '@/@panther.core/theme/tokens'

/**
 * Path and rectangle maths shared by every mark.
 *
 * `num()` guards every value that reaches an SVG attribute. A `NaN` in a path
 * string or a coordinate does not throw - the browser drops the attribute and
 * the chart renders blank - so it is coerced here rather than hunted later.
 */
export const num = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback

/** Round to 3 dp: shorter path strings, and no float noise in a snapshot. */
const px = (value: number): number => Math.round(num(value) * 1000) / 1000

export interface CornerRadii {
  topLeft?: number
  topRight?: number
  bottomRight?: number
  bottomLeft?: number
}

/** A rectangle path with per-corner radii, each clamped to fit the box. */
export const roundedRectPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  radii: CornerRadii = {}
): string => {
  const w = Math.max(0, num(width))
  const h = Math.max(0, num(height))
  const left = num(x)
  const top = num(y)
  const cap = Math.min(w, h) / 2
  const clamp = (radius = 0) => Math.max(0, Math.min(num(radius), cap))
  const tl = clamp(radii.topLeft)
  const tr = clamp(radii.topRight)
  const br = clamp(radii.bottomRight)
  const bl = clamp(radii.bottomLeft)

  if (w === 0 || h === 0) return ''

  const arc = (radius: number, endX: number, endY: number) =>
    radius > 0 ? `A${px(radius)} ${px(radius)} 0 0 1 ${px(endX)} ${px(endY)}` : ''

  return [
    `M${px(left + tl)} ${px(top)}`,
    `H${px(left + w - tr)}`,
    arc(tr, left + w, top + tr),
    `V${px(top + h - br)}`,
    arc(br, left + w - br, top + h),
    `H${px(left + bl)}`,
    arc(bl, left, top + h - bl),
    `V${px(top + tl)}`,
    arc(tl, left + tl, top),
    'Z',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * A bar rounded on its DATA END only. The baseline end stays square so the bar
 * visibly starts at its baseline rather than floating above it.
 */
export const barPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  end: 'top' | 'right' | 'bottom' | 'left',
  radius: number = MARK.barEndRadius
): string => {
  const radii: CornerRadii =
    end === 'top'
      ? { topLeft: radius, topRight: radius }
      : end === 'bottom'
        ? { bottomLeft: radius, bottomRight: radius }
        : end === 'right'
          ? { topRight: radius, bottomRight: radius }
          : { topLeft: radius, bottomLeft: radius }
  return roundedRectPath(x, y, width, height, radii)
}

export interface Point {
  x: number
  y: number
}

/**
 * A polyline through the points, BROKEN at every gap.
 *
 * `null` is a gap, not a zero: interpolating across an absent value invents data
 * that the report does not contain. Returns one path string with separate `M`
 * subpaths, so a single `<path>` still draws every segment.
 */
export const linePath = (points: readonly (Point | null)[]): string => {
  const commands: string[] = []
  let open = false
  for (const point of points) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      open = false
      continue
    }
    commands.push(`${open ? 'L' : 'M'}${px(point.x)} ${px(point.y)}`)
    open = true
  }
  return commands.join(' ')
}

/**
 * The area between a line and a baseline, broken at the same gaps as the line.
 * Single points produce no area - a one-datum area chart is a dot, and a
 * degenerate polygon reads as noise.
 */
export const areaPath = (points: readonly (Point | null)[], baselineY: number): string => {
  const base = num(baselineY)
  const segments: Point[][] = []
  let current: Point[] = []
  for (const point of points) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      if (current.length > 0) segments.push(current)
      current = []
      continue
    }
    current.push(point)
  }
  if (current.length > 0) segments.push(current)

  return segments
    .filter(segment => segment.length > 1)
    .map(segment => {
      const first = segment[0]
      const last = segment[segment.length - 1]
      const top = segment.map(
        (point, index) => `${index === 0 ? 'M' : 'L'}${px(point.x)} ${px(point.y)}`
      )
      return `${top.join(' ')} L${px(last.x)} ${px(base)} L${px(first.x)} ${px(base)} Z`
    })
    .join(' ')
}

/**
 * A transparent hit rectangle centred on a mark, never smaller than the app's
 * minimum hit target. Pointer targets are bigger than the marks they belong to.
 */
export const hitRect = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  minimum: number = MARK.minHitTarget
): { x: number; y: number; width: number; height: number } => {
  const w = Math.max(num(width), minimum)
  const h = Math.max(num(height), minimum)
  return { x: num(centerX) - w / 2, y: num(centerY) - h / 2, width: w, height: h }
}

/**
 * A non-negative span. Artifact timestamps are not an execution log and naive
 * subtraction produces negative intervals on this fixture's out-of-order steps;
 * a negative interval must never reach a coordinate.
 */
export const clampSpan = (from: number, to: number): number => Math.max(0, num(to) - num(from))

/**
 * Insets a stacked segment so a `surfaceGap`-wide strip of the chart surface
 * shows between it and its neighbours. The gap is the surface showing through,
 * not a stroke drawn around the mark.
 */
export const insetSegment = (
  start: number,
  end: number,
  options: { first: boolean; last: boolean; gap?: number }
): { start: number; length: number } => {
  const gap = options.gap ?? MARK.surfaceGap
  const half = gap / 2
  const lo = Math.min(num(start), num(end))
  const hi = Math.max(num(start), num(end))
  const insetLo = lo + (options.first ? 0 : half)
  const insetHi = hi - (options.last ? 0 : half)
  return { start: insetLo, length: Math.max(0, insetHi - insetLo) }
}
