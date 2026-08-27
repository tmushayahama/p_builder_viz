import { describe, expect, it } from 'vitest'
import {
  bandScale,
  extent,
  extentWithZero,
  linearScale,
  niceTicks,
} from '@/@panther.core/charts/scales'
import { areaPath, clampSpan, insetSegment, linePath, num } from '@/@panther.core/charts/geometry'

/**
 * The scales are the one place a chart can produce a non-finite coordinate, so
 * these are unit tests rather than render tests: every degenerate input a build
 * report actually contains is asserted to come back finite.
 */
describe('linearScale totality', () => {
  it('never returns a non-finite number for a zero-span domain', () => {
    const scale = linearScale([5, 5], [0, 100])

    expect(Number.isFinite(scale(5))).toBe(true)
    expect(Number.isFinite(scale(9))).toBe(true)
  })

  it('never returns a non-finite number for a zero-width range', () => {
    const scale = linearScale([0, 10], [0, 0])

    expect(scale(10)).toBe(0)
  })

  it('coerces a non-finite input to the range start rather than propagating it', () => {
    const scale = linearScale([0, 10], [0, 100])

    expect(scale(Number.NaN)).toBe(0)
    expect(scale(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('inverts, and returns the domain start when the range is degenerate', () => {
    expect(linearScale([0, 10], [0, 100]).invert(50)).toBeCloseTo(5)
    expect(linearScale([0, 10], [0, 0]).invert(50)).toBe(0)
  })
})

describe('niceTicks', () => {
  it('yields one tick for an all-equal column instead of an empty axis', () => {
    expect(niceTicks(7, 7)).toEqual([7])
  })

  it('yields rounded ticks inside the domain', () => {
    const ticks = niceTicks(0, 1802537, 5)

    expect(ticks.length).toBeGreaterThan(1)
    expect(ticks.every(tick => Number.isFinite(tick))).toBe(true)
    expect(Math.max(...ticks)).toBeLessThanOrEqual(1802537)
  })
})

describe('bandScale', () => {
  it('returns finite positions for an empty key set', () => {
    const band = bandScale([], [0, 100])

    expect(band.step).toBe(0)
    expect(Number.isFinite(band.center('missing'))).toBe(true)
  })

  it('caps mark thickness and leaves the leftover as air', () => {
    const band = bandScale(['a', 'b'], [0, 400])

    expect(band.bandwidth).toBeCloseTo(160)
    expect(band.markThickness(24)).toBe(24)
    expect(band.markOffset(24)).toBeCloseTo(68)
  })

  it('places an unknown key at the range start rather than at NaN', () => {
    expect(bandScale(['a'], [10, 110])('zzz')).toBe(10)
  })
})

describe('extent helpers', () => {
  it('anchors a magnitude domain to zero', () => {
    expect(extentWithZero([120, 400])).toEqual([0, 400])
  })

  it('returns a usable domain for empty and all-absent data', () => {
    expect(extentWithZero([])).toEqual([0, 1])
    expect(extentWithZero([null, undefined, Number.NaN])).toEqual([0, 1])
    expect(extent([null, undefined])).toBeNull()
  })
})

describe('geometry totality', () => {
  it('breaks a path at a gap instead of interpolating across it', () => {
    const path = linePath([{ x: 0, y: 0 }, null, { x: 10, y: 10 }])

    expect(path.split('M')).toHaveLength(3)
  })

  it('emits no area for a single point', () => {
    expect(areaPath([{ x: 0, y: 0 }], 10)).toBe('')
  })

  it('clamps an out-of-order interval at zero', () => {
    expect(clampSpan(100, 40)).toBe(0)
  })

  it('never lets a segment inset produce a negative length', () => {
    expect(insetSegment(10, 10, { first: false, last: false }).length).toBe(0)
  })

  it('substitutes a fallback for a non-finite coordinate', () => {
    expect(num(Number.NaN)).toBe(0)
    expect(num(Number.NaN, 5)).toBe(5)
  })
})
