import { describe, expect, it } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  evaluateSchema,
  isSupportedSchemaVersion,
  parseBuildState,
  parseSectionStatus,
  parseStepStatus,
  SUPPORTED_SCHEMA_VERSIONS,
} from '@/features/build/model'
import { buildStateSource } from '@/features/build/fixtures'

/**
 * Phase 5 of `.plans/feature/01-report-model.md`: the schema-support contract and unknown values.
 *
 * Two rules, both about honesty. A version the model does not claim to read must produce a visible
 * degradation signal rather than a throw or silence. And an unrecognised enum value must survive
 * verbatim - coercing `degraded` into `warn` would make the dashboard claim an understanding of the
 * report that it does not have.
 */

describe('the supported schema set', () => {
  it('declares exactly {1}, which is what this fixture is', () => {
    expect([...SUPPORTED_SCHEMA_VERSIONS]).toEqual([1])
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
    expect(isSupportedSchemaVersion(1)).toBe(true)
    expect(isSupportedSchemaVersion(2)).toBe(false)
    expect(isSupportedSchemaVersion(null)).toBe(false)
  })

  it('accepts the supported version without degrading', () => {
    const support = evaluateSchema(1)
    expect(support.state).toBe('supported')
    expect(support.degraded).toBe(false)
    expect(support.label).toBe('Schema 1')
    expect(support.reported).toBe(1)
  })

  it('reads a numeric string, because a generator may quote it', () => {
    const support = evaluateSchema('1')
    expect(support.version).toBe(1)
    expect(support.state).toBe('supported')
    // The literal value is kept as written, so a debugger can see the quoting.
    expect(support.reported).toBe('1')
  })

  it('degrades visibly on a newer version instead of throwing or refusing', () => {
    const support = evaluateSchema(2)
    expect(support.state).toBe('newer')
    expect(support.degraded).toBe(true)
    expect(support.version).toBe(2)
    expect(support.label).toContain('newer than supported')
    expect(support.explanation).toContain('generic renderer')
  })

  it('degrades on an older version too, naming what may be missing', () => {
    const support = evaluateSchema(0)
    expect(support.state).toBe('older')
    expect(support.degraded).toBe(true)
    expect(support.explanation).toContain('missing')
  })

  it('treats a missing or non-numeric version as unknown, not as version 1', () => {
    for (const reported of [undefined, null, 'v1', {}, true]) {
      const support = evaluateSchema(reported)
      expect(support.state).toBe('unknown')
      expect(support.version).toBeNull()
      expect(support.degraded).toBe(true)
      expect(support.label).toBe('Schema unknown')
    }
  })

  it('records the degradation as an ingest note so it cannot pass unnoticed', () => {
    const report = parseBuildState({ ...buildStateSource, schema_version: 7 })
    expect(report.schema.state).toBe('newer')
    expect(report.ingestNotes.some(note => note.message.includes('newer than'))).toBe(true)
    expect(report.health.schemaDegraded).toBe(true)
  })
})

describe('unknown section statuses', () => {
  it('renders as "Unknown status: <value>" with the value kept visible', () => {
    const status = parseSectionStatus('degraded')
    expect(status.kind).toBe('unknown')
    expect(status.raw).toBe('degraded')
    expect(status.label).toBe('Unknown status: degraded')
    expect(status.isUnknown).toBe(true)
  })

  it('is never coerced into a known state', () => {
    for (const value of ['degraded', 'stale', 'skipped', 'OK-ish', '']) {
      const status = parseSectionStatus(value)
      if (status.isUnknown) expect(status.raw).toBe(value)
    }
    // Only unambiguous synonyms of a known state are accepted.
    expect(parseSectionStatus('WARNING').kind).toBe('warn')
    expect(parseSectionStatus('success').kind).toBe('ok')
    expect(parseSectionStatus('missing').kind).toBe('absent')
  })

  it('distinguishes a missing status field from an unrecognised one', () => {
    const absent = parseSectionStatus(undefined)
    expect(absent.kind).toBe('unknown')
    expect(absent.raw).toBeNull()
    expect(absent.label).toBe('Status not reported')
  })
})

describe('unknown step statuses', () => {
  it('keeps the literal value and stays out of the completed count', () => {
    const status = parseStepStatus('skipped_by_operator')
    expect(status.kind).toBe('unknown')
    expect(status.label).toBe('Unknown status: skipped_by_operator')

    const report = parseBuildState({
      sections: [
        {
          id: 'progress',
          status: 'ok',
          data: {
            phases: [
              {
                name: 'Setup',
                done: 1,
                total: 2,
                steps: [
                  { goal: 'a', status: 'done', mtime: 1786898148 },
                  { goal: 'b', status: 'skipped_by_operator', mtime: null },
                ],
              },
            ],
          },
        },
      ],
    })
    expect(report.pipeline.computedHeadline.stepsComplete).toBe(1)
    expect(report.pipeline.phases[0].unknownStatusValues).toEqual(['skipped_by_operator'])
    expect(report.health.unknownStatusValues).toContainEqual({
      scope: 'phase:setup',
      value: 'skipped_by_operator',
    })
  })

  it('accepts the aliases a future generator is likely to use', () => {
    expect(parseStepStatus('completed').kind).toBe('done')
    expect(parseStepStatus('in_progress').kind).toBe('running')
    expect(parseStepStatus('fail').kind).toBe('failed')
    expect(parseStepStatus('skipped').kind).toBe('skipped')
  })
})

describe('nothing is discarded', () => {
  it('keeps unknown top-level section fields listed on the registry entry', () => {
    const report = parseBuildState({
      schema_version: 1,
      sections: [
        {
          id: 'future_report',
          title: 'Something new',
          status: 'ok',
          data: { headline: { a: 1 }, novel_block: { b: 2 } },
          provenance: 'a field this model has never seen',
        },
      ],
    })
    const entry = report.reports[0]
    expect(entry.unknownFields).toEqual(['provenance'])
    expect(entry.generic.extra.novel_block).toEqual({ b: 2 })
    expect(entry.raw).toMatchObject({ provenance: 'a field this model has never seen' })
    expect(report.raw).toMatchObject({ schema_version: 1 })
  })

  it('preserves a non-object payload whole rather than dropping it', () => {
    const report = parseBuildState({
      sections: [{ id: 'odd', status: 'ok', data: 'a bare string payload' }],
    })
    expect(report.reports[0].generic.extra.data).toBe('a bare string payload')
    expect(report.ingestNotes.some(note => note.message.includes('preserved verbatim'))).toBe(true)
  })

  it('keeps unknown step fields for the generic renderer', () => {
    const report = parseBuildState({
      sections: [
        {
          id: 'progress',
          status: 'ok',
          data: {
            phases: [
              {
                name: 'Setup',
                steps: [{ goal: 'a', status: 'done', mtime: 1, cpu_hours: 12.5 }],
              },
            ],
          },
        },
      ],
    })
    expect(report.pipeline.steps[0].unknownFields).toEqual({ cpu_hours: 12.5 })
  })
})
