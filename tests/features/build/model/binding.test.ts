import { describe, expect, it } from 'vitest'
import {
  getBinding,
  hasBinding,
  PHASE_IDS,
  phaseHintOf,
  resolveBinding,
  SECTION_BINDINGS,
  sectionIdsForPhase,
  UNATTACHED_PHASE_ID,
  UNATTACHED_PHASE_NAME,
} from '@/features/build/model'
import { getFixtureReport } from '@/features/build/fixtures'

/**
 * Phase 6 of `.plans/feature/01-report-model.md`: the `sectionId -> phaseId` registry.
 *
 * Reports hang from the phase they describe, so the pipeline can be the spine of the experience
 * instead of a navigation model that mirrors `sections[].id`. The registry has to support many
 * sections on one phase and one section on many phases, has to prefer a data-driven hint when the
 * generator supplies one, and has to surface anything it cannot place rather than hiding it.
 */

const report = getFixtureReport('real')

describe('the static registry', () => {
  it('covers every section the real report contains', () => {
    const registered = new Set(SECTION_BINDINGS.map(binding => binding.sectionId))
    for (const entry of report.reports) {
      expect(registered.has(entry.sectionId), entry.sectionId).toBe(true)
    }
    expect(hasBinding('progress')).toBe(true)
    expect(hasBinding('nothing_like_this')).toBe(false)
    expect(getBinding('nothing_like_this')).toBeNull()
  })

  it('gives every binding a written rationale, so a later reader need not guess', () => {
    for (const binding of SECTION_BINDINGS) {
      expect(binding.rationale.length, binding.sectionId).toBeGreaterThan(20)
    }
  })

  it('places configuration in the preamble rather than as a peer report tab', () => {
    const entry = report.reports.find(item => item.sectionId === 'config_ledger')
    expect(entry?.placement).toBe('preamble')
    expect(entry?.primaryPhaseId).toBeNull()
    // It still contributes to setup, because the snapshot is taken at build start.
    expect(entry?.phaseIds).toEqual([PHASE_IDS.setup])
  })

  it('treats progress as the spine itself, bound to no phase', () => {
    const entry = report.reports.find(item => item.sectionId === 'progress')
    expect(entry?.placement).toBe('pipeline')
    expect(entry?.phaseIds).toEqual([])
  })
})

describe('one section contributing to several phases', () => {
  it('binds mapping to the mapping, cleanup, extension and tree-building phases', () => {
    const entry = report.reports.find(item => item.sectionId === 'mapping')
    expect(entry?.primaryPhaseId).toBe(PHASE_IDS.sequenceToFamilyMapping)
    expect(entry?.phaseIds).toEqual([
      PHASE_IDS.sequenceToFamilyMapping,
      PHASE_IDS.mappingCleanupPass1,
      PHASE_IDS.extenBuildAndScoring,
      PHASE_IDS.mappingCleanupPass2,
      PHASE_IDS.treeBuilding,
    ])
  })

  it('lists the primary section first on the phase it primarily describes', () => {
    const treePhase = report.pipeline.phases.find(phase => phase.id === PHASE_IDS.treeBuilding)
    expect(treePhase?.sectionIds[0]).toBe('giga')
    expect(treePhase?.sectionIds).toContain('mapping')
  })

  it('puts several sections on one phase', () => {
    const rebuild = report.pipeline.phases.find(
      phase => phase.id === PHASE_IDS.previousLibraryRebuild
    )
    expect(rebuild?.sectionIds).toEqual(expect.arrayContaining(['prev_lib', 'other_reports']))
  })

  it('leaves a phase no section describes with an empty list, not a placeholder', () => {
    const msa = report.pipeline.phases.find(phase => phase.id === PHASE_IDS.msaBuild)
    expect(msa?.sectionIds).toEqual([])
  })
})

describe('the optional per-section phase hint', () => {
  it('reads both spellings the future schema might settle on', () => {
    expect(phaseHintOf({ phase_id: 'tree-building-giga' })).toBe('tree-building-giga')
    expect(phaseHintOf({ phase: 'Tree building (GIGA)' })).toBe('tree-building-giga')
    expect(phaseHintOf({ phase: '   ' })).toBeNull()
    expect(phaseHintOf({})).toBeNull()
    expect(phaseHintOf(null)).toBeNull()
  })

  it('wins over the static registry, so the binding can become data-driven', () => {
    const resolved = resolveBinding('giga', { phase_id: 'node-forward-tracking' }, [
      PHASE_IDS.treeBuilding,
      PHASE_IDS.nodeForwardTracking,
    ])
    expect(resolved.phaseHint).toBe(PHASE_IDS.nodeForwardTracking)
    expect(resolved.primaryPhaseId).toBe(PHASE_IDS.nodeForwardTracking)
    expect(resolved.placement).toBe('phase')
    expect(resolved.known).toBe(true)
  })

  it('binds an unregistered section when it carries a hint', () => {
    const resolved = resolveBinding('pfam_coverage', { phase: 'Library export products' }, [
      PHASE_IDS.libraryExportProducts,
    ])
    expect(resolved.known).toBe(false)
    expect(resolved.placement).toBe('phase')
    expect(resolved.phaseIds).toEqual([PHASE_IDS.libraryExportProducts])
  })
})

describe('unmapped and unplaceable sections', () => {
  it('collects an unregistered section without a hint under Unattached reports', () => {
    const resolved = resolveBinding('brand_new_report', null, [PHASE_IDS.setup])
    expect(resolved.placement).toBe('unattached')
    expect(resolved.primaryPhaseId).toBeNull()
    expect(resolved.phaseIds).toEqual([])
    expect(UNATTACHED_PHASE_ID).toBe('unattached')
    expect(UNATTACHED_PHASE_NAME).toBe('Unattached reports')
  })

  it('surfaces rather than drops a section claiming a phase nobody declared', () => {
    const resolved = resolveBinding('giga', { phase_id: 'a-phase-that-does-not-exist' }, [
      PHASE_IDS.setup,
    ])
    expect(resolved.phaseHint).toBe('a-phase-that-does-not-exist')
    expect(resolved.phaseIds).toEqual([])
    expect(resolved.placement).toBe('unattached')
  })

  it('resolves against the registry when the report declares no phases at all', () => {
    const resolved = resolveBinding('giga', null, [])
    expect(resolved.primaryPhaseId).toBe(PHASE_IDS.treeBuilding)
    expect(resolved.placement).toBe('phase')
  })
})

describe('sectionIdsForPhase', () => {
  it('orders primary bindings before contributing ones', () => {
    const resolved = [
      { sectionId: 'mapping', primaryPhaseId: 'p1', phaseIds: ['p1', 'p2'] },
      { sectionId: 'giga', primaryPhaseId: 'p2', phaseIds: ['p2'] },
      { sectionId: 'library', primaryPhaseId: 'p3', phaseIds: ['p3', 'p2'] },
    ]
    expect(sectionIdsForPhase('p2', resolved)).toEqual(['giga', 'mapping', 'library'])
    expect(sectionIdsForPhase('p9', resolved)).toEqual([])
  })
})
