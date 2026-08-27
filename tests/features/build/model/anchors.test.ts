import { describe, expect, it } from 'vitest'
import {
  BUILD_ROUTE,
  buildStepId,
  checkAnchor,
  checkElementId,
  checkRoute,
  configAnchor,
  configElementId,
  configRoute,
  metricAnchor,
  metricElementId,
  metricRoute,
  parseAnchor,
  phaseAnchor,
  phaseElementId,
  phaseRoute,
  reportAnchor,
  reportElementId,
  reportRoute,
  speciesAnchor,
  speciesElementId,
  speciesRoute,
  stepAnchor,
  stepElementId,
  stepRoute,
} from '@/features/build/model'
import { getFixtureReport } from '@/features/build/fixtures'

/**
 * Phase 8 of `.plans/feature/01-report-model.md`: anchors.
 *
 * Nothing outside `anchors.ts` builds one, so a link and the element it points at cannot drift.
 * Every entity exposes the bare element id, the `#`-prefixed anchor and the full route, and every
 * id has to survive being used as a DOM id and as a URL fragment - which matters here because a
 * step goal is a filesystem path like `ftp/PANTHER_HMM_Classification_files/...`.
 */

const report = getFixtureReport('real')

const BUILDERS = [
  ['phase', phaseElementId, phaseAnchor, phaseRoute],
  ['step', stepElementId, stepAnchor, stepRoute],
  ['report', reportElementId, reportAnchor, reportRoute],
  ['check', checkElementId, checkAnchor, checkRoute],
  ['species', speciesElementId, speciesAnchor, speciesRoute],
  ['config', configElementId, configAnchor, configRoute],
  ['metric', metricElementId, metricAnchor, metricRoute],
] as const

describe('the three forms', () => {
  for (const [kind, id, anchor, route] of BUILDERS) {
    it(`${kind} exposes element id, anchor and route consistently`, () => {
      const element = id('Some Value')
      expect(anchor('Some Value')).toBe(`#${element}`)
      expect(route('Some Value')).toBe(`${BUILD_ROUTE}#${element}`)
      expect(element.startsWith(`${kind}--`)).toBe(true)
    })
  }
})

describe('ids are safe as DOM ids and as URL fragments', () => {
  it('slugifies a filesystem-path goal into something a selector can address', () => {
    const stepId = buildStepId(
      'library-export-products',
      'ftp/PANTHER_HMM_Classification_files/PANTHER20.0_HMM_classifications'
    )
    expect(stepId).toBe(
      'library-export-products--ftp-panther-hmm-classification-files-panther20-0-hmm-classifications'
    )
    expect(stepElementId(stepId)).toBe(`step--${stepId}`)
  })

  it('produces only characters a fragment and an id both accept, across the whole report', () => {
    const safe = /^[a-z0-9-]+$/
    for (const phase of report.pipeline.phases) {
      expect(phaseElementId(phase.id), phase.id).toMatch(safe)
    }
    for (const step of report.pipeline.steps) {
      expect(stepElementId(step.id), step.id).toMatch(safe)
    }
    for (const entry of report.reports) {
      expect(reportElementId(entry.sectionId), entry.sectionId).toMatch(safe)
    }
    for (const record of report.species.records) {
      expect(speciesElementId(record.oscode), record.oscode).toMatch(safe)
    }
    for (const key of Object.keys(report.config.values)) {
      expect(configElementId(key), key).toMatch(safe)
    }
  })

  it('never collides across the 61 steps of this report', () => {
    const ids = report.pipeline.steps.map(step => stepElementId(step.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to a usable id rather than an empty one', () => {
    expect(phaseElementId('///')).toBe('phase--unnamed')
    expect(speciesElementId('')).toBe('species--unnamed')
  })
})

describe('reading an anchor back', () => {
  it('round-trips every entity kind', () => {
    expect(parseAnchor(phaseAnchor('final-packaging'))).toEqual({
      kind: 'phase',
      parts: ['final-packaging'],
      elementId: 'phase--final-packaging',
    })
    expect(parseAnchor(speciesRoute('DAPMA'))?.kind).toBe('species')
    expect(parseAnchor(configElementId('QFO_DATA_DIR'))?.parts).toEqual(['qfo-data-dir'])
    expect(parseAnchor(metricRoute('librarySequences'))?.parts).toEqual(['librarysequences'])
  })

  it('splits a step anchor back into its phase and goal parts', () => {
    const step = report.pipeline.steps.find(item => item.phaseIndex === 13)
    const parsed = parseAnchor(stepAnchor(step?.id ?? ''))
    expect(parsed?.kind).toBe('step')
    expect(parsed?.parts[0]).toBe('final-packaging')
    expect(parsed?.parts).toHaveLength(2)
  })

  it('returns null for anything it did not build, rather than guessing', () => {
    expect(parseAnchor('')).toBeNull()
    expect(parseAnchor('#')).toBeNull()
    expect(parseAnchor('#something-else')).toBeNull()
    expect(parseAnchor('#phase')).toBeNull()
    expect(parseAnchor('/build')).toBeNull()
  })
})

describe('the model hands out anchors it built here', () => {
  it('anchors every report registry entry and generator warning', () => {
    for (const entry of report.reports) {
      expect(entry.anchor).toBe(reportAnchor(entry.sectionId))
    }
    for (const warning of report.generatorWarnings) {
      expect(parseAnchor(warning.anchor)?.kind).toBe('report')
    }
  })
})
