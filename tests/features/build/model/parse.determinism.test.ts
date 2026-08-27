import { describe, expect, it } from 'vitest'
import { parseBuildState, parseBuildStateCached } from '@/features/build/model'
import { buildStateSource, FIXTURE_STATE_KEYS, getFixtureState } from '@/features/build/fixtures'
import type { BuildReport } from '@/features/build/model'

/**
 * Determinism, per Phase 10 of `.plans/feature/01-report-model.md`.
 *
 * A build report is a permanent record, so the same JSON must produce the same model every time.
 * `raw` is excluded from the comparison because it is the input by reference, not a derived value.
 */

function derived(report: BuildReport): Record<string, unknown> {
  const out: Record<string, unknown> = { ...report }
  delete out.raw
  return out
}

describe('parseBuildState is deterministic', () => {
  it('parses the real report to a deeply equal model twice', () => {
    const first = parseBuildState(buildStateSource)
    const second = parseBuildState(buildStateSource)
    expect(first).not.toBe(second)
    expect(derived(second)).toEqual(derived(first))
  })

  for (const key of FIXTURE_STATE_KEYS) {
    it(`parses the "${key}" state to a deeply equal model twice`, () => {
      const state = getFixtureState(key)
      expect(derived(parseBuildState(state))).toEqual(derived(parseBuildState(state)))
    })
  }

  it('produces the same model for a structurally identical but distinct object', () => {
    const copy: unknown = JSON.parse(JSON.stringify(buildStateSource))
    expect(derived(parseBuildState(copy))).toEqual(derived(parseBuildState(buildStateSource)))
  })
})

describe('memoisation', () => {
  it('returns the identical report object for the same state', () => {
    const state = getFixtureState('real')
    expect(parseBuildStateCached(state)).toBe(parseBuildStateCached(state))
  })

  it('does not share a report between two different states', () => {
    expect(parseBuildStateCached(getFixtureState('real'))).not.toBe(
      parseBuildStateCached(getFixtureState('completed'))
    )
  })

  it('still parses a non-object input, which cannot be cached', () => {
    expect(parseBuildStateCached(null).schema.state).toBe('unknown')
  })
})
