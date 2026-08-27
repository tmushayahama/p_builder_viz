import { describe, expect, it } from 'vitest'
import {
  createCategoricalScale,
  divergingFillForValue,
  nominalFill,
  ordinalFillForIndex,
  SERIES_SLOT_COUNT,
  sequentialFill,
  sequentialFillForValue,
  seriesFill,
} from '@/@panther.core/theme/tokens'

/**
 * The chart colour rules live in the token accessors so no chart can get them
 * wrong. These tests are the rules themselves: identity that survives a filter,
 * a neutral midpoint at zero, and no value ramp on nominal categories.
 */
describe('categorical colour is identity, not rank', () => {
  const domain = ['ID', 'BLAST', 'HMM_scoring', 'RECLUSTER_NEW']

  it('binds a slot to an entity in declaration order', () => {
    const scale = createCategoricalScale(domain)

    expect(scale.slotOf('ID')).toBe(1)
    expect(scale.slotOf('RECLUSTER_NEW')).toBe(4)
  })

  it('does not repaint survivors when a series is filtered out', () => {
    const scale = createCategoricalScale(domain)
    const before = scale.fill('HMM_scoring')

    // the view filters; the scale is kept, which is the whole contract
    const visible = domain.filter(key => key !== 'BLAST')

    expect(visible.map(key => scale.fill(key))).toContain(before)
    expect(scale.fill('HMM_scoring')).toBe(before)
  })

  it('folds overflow into the neutral other fill rather than inventing a hue', () => {
    const many = Array.from({ length: SERIES_SLOT_COUNT + 2 }, (_, index) => `s${index}`)
    const scale = createCategoricalScale(many)

    expect(scale.overflow).toHaveLength(2)
    expect(scale.slotOf('s6')).toBeNull()
    expect(scale.fill('s6')).toBe(scale.fill('s7'))
    expect(scale.fill('s6')).not.toBe(seriesFill(1))
  })

  it('gives an unknown key the other fill, not slot 1', () => {
    const scale = createCategoricalScale(domain)

    expect(scale.fill('NOT_A_MECHANISM')).not.toBe(seriesFill(1))
  })

  it('ignores a duplicate key rather than consuming a second slot', () => {
    const scale = createCategoricalScale(['ID', 'ID', 'BLAST'])

    expect(scale.slotOf('BLAST')).toBe(2)
  })
})

describe('ramps', () => {
  it('puts nominal categories all on one fill', () => {
    expect(nominalFill()).toBe(seriesFill(1))
  })

  it('buckets a magnitude across the sequential ramp', () => {
    expect(sequentialFillForValue(0, [0, 100])).toBe(sequentialFill(1))
    expect(sequentialFillForValue(100, [0, 100])).toBe(sequentialFill(5))
  })

  it('returns the low step rather than dividing by zero on an all-equal column', () => {
    expect(sequentialFillForValue(7, [7, 7])).toBe(sequentialFill(1))
    expect(sequentialFillForValue(Number.NaN, [0, 100])).toBe(sequentialFill(1))
  })

  it('walks the ordinal ramp monotonically across ordered positions', () => {
    const steps = [0, 1, 2, 3, 4].map(index => ordinalFillForIndex(index, 5))

    expect(new Set(steps).size).toBe(5)
    expect(ordinalFillForIndex(0, 1)).toBe(ordinalFillForIndex(0, 0))
  })

  it('reads zero and an unknown magnitude as the neutral midpoint', () => {
    const mid = divergingFillForValue(0, 100)

    expect(divergingFillForValue(0, 0)).toBe(mid)
    expect(divergingFillForValue(Number.NaN, 100)).toBe(mid)
    expect(divergingFillForValue(-100, 0)).toBe(mid)
  })

  it('separates the two arms around the baseline', () => {
    expect(divergingFillForValue(90, 100)).not.toBe(divergingFillForValue(-90, 100))
    expect(divergingFillForValue(10, 100)).not.toBe(divergingFillForValue(90, 100))
  })
})
