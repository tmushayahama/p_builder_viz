import { describe, expect, it } from 'vitest'
import { getFixtureReport } from '@/features/build/fixtures'
import type { BuildReport } from '@/features/build/model'

/**
 * Arithmetic against the verified data facts in
 * `.plans/feature/01-report-model.md`, "Appendix A - Verified data facts".
 *
 * Every expectation here was computed independently from `docs/build_state.json` before the model
 * existed. If one of these fails, either the model is wrong or the fixture was replaced - in both
 * cases the Appendix has to be re-verified, not the test loosened.
 */

const report: BuildReport = getFixtureReport('real')

describe('Appendix A.1 - shape', () => {
  it('reads the schema version, target and section inventory', () => {
    expect(report.schema.version).toBe(1)
    expect(report.schema.state).toBe('supported')
    expect(report.identity.target).toBe('target')
    expect(report.identity.generatedAt.iso).toBe('2026-08-20T23:26:31.000Z')
    expect(report.reports).toHaveLength(8)
    expect(report.reports.map(entry => entry.sectionId)).toEqual([
      'config_ledger',
      'progress',
      'mapping',
      'node_tracking',
      'library',
      'prev_lib',
      'giga',
      'other_reports',
    ])
    // prev_lib is the one absent section, and it carries the generator's own reason.
    expect(report.comparison.previousLibrary.availability).toBe('absent')
    expect(report.comparison.previousLibrary.message).toBe('inputs not present yet')
  })

  it('finds 14 phases, 61 steps and 55 done, with no populated attempts', () => {
    expect(report.pipeline.phases).toHaveLength(14)
    expect(report.pipeline.steps).toHaveLength(61)
    expect(report.pipeline.computedHeadline).toEqual({
      phasesComplete: 11,
      stepsComplete: 55,
      stepsTotal: 61,
    })
    expect(report.pipeline.declaredHeadline).toEqual(report.pipeline.computedHeadline)
    expect(report.pipeline.headlineConsistent).toBe(true)
    expect(report.pipeline.steps.every(step => step.attemptCount === 0)).toBe(true)
    // Only `done` and `pending` appear, so nothing degrades to an unknown status.
    expect([...new Set(report.pipeline.steps.map(step => step.status.kind))].sort()).toEqual([
      'done',
      'pending',
    ])
  })

  it('reads 14 mapping stages, 5 node types, 131 species and 11 ledger rows', () => {
    expect(report.mapping.stages).toHaveLength(14)
    expect(report.nodeTracking.byType).toHaveLength(5)
    expect(report.nodeTracking.bySpecies).toHaveLength(131)
    expect(report.config.ledgerEntries).toHaveLength(11)
    expect(report.trees.booksTotal).toBe(15797)
    expect(report.trees.emptyTrees).toBe(0)
    expect(report.otherReports.metrics).toHaveLength(12)
  })
})

describe('Appendix A.2 - frontier and holes', () => {
  it('puts the frontier at phase 12, Library export products at 10/12', () => {
    expect(report.pipeline.frontierIndex).toBe(12)
    expect(report.pipeline.frontierPhaseName).toBe('Library export products')
    const frontier = report.pipeline.phases[12]
    expect(frontier.completedSteps).toBe(10)
    expect(frontier.totalSteps).toBe(12)
    expect(frontier.status).toBe('active')
    expect(frontier.isFrontier).toBe(true)
    // Phase 13 has not started and is not the frontier.
    expect(report.pipeline.phases[13].completedSteps).toBe(0)
    expect(report.pipeline.phases[13].status).toBe('pending')
  })

  it('treats phase 2 as a hole, not as where the build stopped', () => {
    expect(report.pipeline.holes.map(hole => hole.index)).toEqual([2])
    const hole = report.pipeline.phases[2]
    expect(hole.name).toBe('Sequence-to-family mapping')
    expect(hole.status).toBe('hole')
    expect(hole.isHole).toBe(true)
    expect(hole.completedSteps).toBe(3)
    expect(hole.totalSteps).toBe(5)
    expect(hole.incompleteSteps).toEqual([
      'sequence-to-family-mapping--validate-idmapping-step',
      'sequence-to-family-mapping--validate-blast-step',
    ])
    // Five later phases completed, which is what makes this a hole rather than the frontier.
    expect(
      report.pipeline.phases.slice(3, 12).filter(phase => phase.status === 'complete')
    ).toHaveLength(9)
    expect(hole.index).toBeLessThan(report.pipeline.frontierIndex as number)
  })

  it('counts 11 complete, 1 active, 1 hole and 1 pending phase', () => {
    expect(report.pipeline.phaseStatusCounts).toEqual({
      complete: 11,
      active: 1,
      hole: 1,
      pending: 1,
      blocked: 0,
    })
  })
})

describe('Appendix A.3 - timing, and A.4 freshness', () => {
  it('brackets artifact activity between the oldest and newest mtime', () => {
    expect(report.timing.oldestArtifactAt.iso).toBe('2026-08-16T16:30:32.075Z')
    expect(report.timing.newestArtifactAt.iso).toBe('2026-08-17T21:41:36.155Z')
    // Roughly 29 h of artifact activity, labelled as activity rather than runtime.
    expect(Math.round((report.timing.activitySpan.seconds as number) / 3600)).toBe(29)
    expect(report.timing.activitySpan.provenance).toBe('inferred')
    expect(report.timing.activitySpan.kind).toBe('artifact-activity')
  })

  it('finds exactly the two out-of-order completed steps', () => {
    expect(report.timing.outOfOrder).toHaveLength(2)
    expect(report.timing.outOfOrder.map(pair => `${pair.previousGoal} -> ${pair.goal}`)).toEqual([
      'download_resources.touch -> organism.dat',
      'QfO_OrthoXML.xml -> ftp/PANTHER_HMM_Classification_files/PANTHER20.0_HMM_classifications',
    ])
    expect(report.timing.outOfOrder.every(pair => pair.rawDeltaSeconds < 0)).toBe(true)
  })

  it('reads the config snapshot as taken at build start, not at report time', () => {
    // config_ledger.current.generated_at equals the mtime of download_resources.touch.
    expect(report.config.generatedAt.iso).toBe('2026-08-16T16:35:48.000Z')
    const firstStep = report.pipeline.steps[0]
    expect(firstStep.goal).toBe('download_resources.touch')
    expect(Math.round(firstStep.timing.artifactAt.epochSeconds as number)).toBe(
      Math.round(report.config.generatedAt.epochSeconds as number)
    )
  })

  it('is Current by 73.7 hours, which is positive evidence', () => {
    expect(report.freshness.state).toBe('current')
    expect(report.freshness.label).toBe('Current')
    expect(Math.round(((report.freshness.leadSeconds as number) / 3600) * 10) / 10).toBe(73.7)
    expect(report.freshness.newestArtifactStepId).toBe(
      'library-export-products--panther-altversion-gtar-touch'
    )
  })

  it('has no measured timing in this fixture but supports it', () => {
    expect(report.timing.hasMeasuredTiming).toBe(false)
    expect(report.pipeline.steps.every(step => step.timing.jobId === null)).toBe(true)
    expect(report.pipeline.steps.every(step => !step.timing.startedAt.present)).toBe(true)
  })
})

describe('Appendix A.4 - the six sequence counts', () => {
  it('keeps all six distinct and separately labelled', () => {
    const byMetric = new Map(
      report.consistency.sequenceCounts.map(entry => [entry.metricId, entry.value])
    )
    expect(byMetric.get('prevLibSequences')).toBe(2692827)
    expect(byMetric.get('inputReferenceSequences')).toBe(2297097)
    expect(byMetric.get('finalStageSequences')).toBe(2291508)
    expect(byMetric.get('assignedSequences')).toBe(1810099)
    expect(byMetric.get('librarySequences')).toBe(1736983)
    expect(byMetric.get('leafNodesMapped')).toBe(1627862)
    expect(new Set(byMetric.values()).size).toBe(6)
  })
})

describe('Appendix A.5 - mapping', () => {
  it('moves assignment from 66.9 % to 79.0 %, a gain of 12.1 points', () => {
    expect(report.mapping.firstPctAssigned).toBe(66.9)
    expect(report.mapping.finalPctAssigned).toBe(79)
    expect(report.mapping.assignmentGainPoints).toBe(12.1)
    expect(report.mapping.stages[0].families).toBe(15683)
    expect(report.mapping.finalFamilies).toBe(15797)
  })

  it('has exactly four mechanisms, with extension absent because it is a stage', () => {
    expect(report.mapping.mechanismOrder.map(slot => slot.mechanism)).toEqual([
      'ID',
      'BLAST',
      'HMM_scoring',
      'RECLUSTER_NEW',
    ])
    expect(report.mapping.mechanismOrder.every(slot => slot.known)).toBe(true)
    expect(report.mapping.stages.map(stage => stage.stage)).toContain('exten')
  })

  it('gives every mechanism the same slot in every stage', () => {
    for (const stage of report.mapping.stages) {
      expect(stage.byMechanism.map(entry => entry.mechanism)).toEqual(
        report.mapping.mechanismOrder.map(slot => slot.mechanism)
      )
      expect(stage.byMechanism.map(entry => entry.slot)).toEqual([0, 1, 2, 3])
    }
  })

  it('differences the cumulative by_mechanism totals into per-stage deltas', () => {
    const delta = (stage: string, mechanism: string): number | null => {
      const found = report.mapping.stages.find(entry => entry.stage === stage)
      return found?.byMechanism.find(entry => entry.mechanism === mechanism)?.delta ?? null
    }
    expect(delta('blast', 'BLAST')).toBe(84440)
    expect(delta('hmm', 'HMM_scoring')).toBe(182097)
    expect(delta('recluster', 'RECLUSTER_NEW')).toBe(2571)
    expect(delta('pass1_trim', 'HMM_scoring')).toBe(-4030)
    // The extension stage's gain is booked to HMM_scoring, not to a mechanism of its own.
    expect(delta('exten', 'HMM_scoring')).toBe(9887)
    expect(delta('post_giga', 'ID')).toBe(-20)
    expect(delta('post_giga', 'HMM_scoring')).toBe(-154)
    expect(delta('post_giga', 'RECLUSTER_NEW')).toBe(-35)
  })

  it('never reads an unreported mechanism as zero', () => {
    const idStage = report.mapping.stages[0]
    expect(idStage.byMechanism.find(entry => entry.mechanism === 'ID')?.cumulative).toBe(1536527)
    expect(idStage.byMechanism.find(entry => entry.mechanism === 'BLAST')?.cumulative).toBeNull()
    expect(idStage.byMechanism.find(entry => entry.mechanism === 'BLAST')?.delta).toBeNull()
  })
})

describe('Appendix A.6 - node forward tracking', () => {
  it('reports 2,830,262 of 3,026,743 nodes mapped', () => {
    expect(report.nodeTracking.nodesMapped).toBe(2830262)
    expect(report.nodeTracking.nodesTotal).toBe(3026743)
    expect(report.nodeTracking.pctMapped).toBe(93.5)
    expect(report.nodeTracking.recomputedPctMapped).toBe(93.5)
    expect(report.nodeTracking.speciesReported).toBe(131)
  })

  it('reproduces the per-node-type figures', () => {
    const byType = new Map(
      report.nodeTracking.byType.map(entry => [entry.nodeType, [entry.mapped, entry.total]])
    )
    expect(byType.get('SPECIATION')).toEqual([916937, 957149])
    expect(byType.get('LEAF')).toEqual([1627862, 1736983])
    expect(byType.get('DUPLICATION')).toEqual([280581, 326455])
    expect(byType.get('HORIZ_TRANSFER')).toEqual([4882, 5794])
    expect(byType.get('UNKNOWN')).toEqual([0, 362])
  })

  it('describes a tight distribution with a labelled low tail', () => {
    expect(report.nodeTracking.medianPct).toBe(99.5)
    expect(report.nodeTracking.madPct).toBe(0.4)
    expect(report.nodeTracking.atOrAbove90).toBe(120)
    expect(report.nodeTracking.zeroPctOscodes).toEqual(['DAPMA'])
    expect(report.nodeTracking.lowOutliers.map(entry => entry.oscode)).toEqual([
      'DAPMA',
      'FELCA',
      'PHANO',
      'POPTR',
      'TOBAC',
      'SPIOL',
      'MANES',
      'BOVIN',
      'GOSHI',
      'HELAN',
      'HORVV',
    ])
  })

  it('keeps species_reported and species_total as different denominators', () => {
    expect(report.nodeTracking.speciesReported).toBe(131)
    expect(report.library.genomes).toBe(131)
    expect(report.otherReports.values.prev_uniprot_proteomes).toBe(131)
    expect(report.otherReports.values.species_total).toBe(147)
  })
})

describe('Appendix A.7 - expected passing checks', () => {
  it('agrees LEAF node total with library sequences exactly', () => {
    expect(report.consistency.leafLibraryAgreement.comparable).toBe(true)
    expect(report.consistency.leafLibraryAgreement.allEqual).toBe(true)
    expect(report.consistency.leafLibraryAgreement.values.map(entry => entry.value)).toEqual([
      1736983, 1736983,
    ])
  })

  it('agrees four family counts at 15,797', () => {
    expect(report.consistency.familyAgreement.allEqual).toBe(true)
    expect(report.consistency.familyAgreement.values.map(entry => entry.value)).toEqual([
      15797, 15797, 15797, 15797,
    ])
    // Reclustering is 26 higher, which is expected because trimming runs after it.
    const recluster = report.mapping.stages.find(stage => stage.stage === 'recluster')
    expect(recluster?.families).toBe(15823)
  })

  it('has a usable tree for every book and no unresolved config variables', () => {
    expect(report.consistency.treeCompleteness).toEqual({
      booksTotal: 15797,
      treesSucceeded: 15797,
      emptyTrees: 0,
      complete: true,
    })
    expect(report.consistency.unresolvedVars).toEqual([])
  })
})

describe('Appendix A.8 - config tiers', () => {
  it('surfaces the QfO release/data-dir mismatch with its literal evidence', () => {
    expect(report.consistency.qfoDeclaredRelease).toBe('2026_02')
    expect(report.consistency.qfoActiveDataDir).toBe(
      'ref_prot_2026_01/external_data/qfo_reference_proteome'
    )
    expect(report.consistency.qfoReleaseMatchesDataDir).toBe(false)
    expect(report.consistency.qfoCommentedEvidence).toHaveLength(1)
    expect(report.consistency.qfoCommentedEvidence[0]).toMatchObject({
      key: 'QFO_DATA_DIR',
      value: 'QfO_release_2026_02/external_data/qfo_reference_proteome',
      commentedOut: true,
    })
  })

  it('records the dirty source tree and the source revision', () => {
    expect(report.config.sourceDirty).toBe(true)
    expect(report.config.sourceRevision).toBe('7f1ab73e485e5285d2ff53e512a9c3a380863dcd')
    expect(report.identity.pantherVersion).toBe('20.0')
    expect(report.identity.libraryLabel).toBe('PANTHER 20.0')
    expect(report.identity.previousLibraryLabel).toBe('PANTHER19.0')
  })

  it('reads the lineage as 19 PREV_* variables on 19.0 and 2 PREV_PREV_* on 17.0', () => {
    expect(report.config.previousLineage).toHaveLength(19)
    expect(report.config.previousLineage.every(entry => entry.release === '19')).toBe(true)
    expect(report.config.previousPreviousLineage).toHaveLength(2)
    expect(report.config.previousPreviousLineage.every(entry => entry.release === '17')).toBe(true)
  })

  it('keeps notable inherited inputs visible', () => {
    expect(report.config.values.PC_CLASS).toContain('PANTHER18.0')
    expect(report.config.values.PC_RELATIONSHIP).toContain('PANTHER18.0')
    expect(report.config.values.PTHR_FULLGO_ANNOT_TSV).toContain('Pthr_GO_19.0.tsv')
    expect(report.config.values.PREV_GENE_NODE_DAT).toBe('gene_node_19_no_XENTR.dat')
    expect(report.config.values.PREV_SF_TO_SEQ).toBe('sfToSeq_19_XENTR_dropped')
    // Declared but empty is an observation, not a missing value.
    expect(report.config.emptyValueKeys).toEqual(['MAFFT_BINARIES'])
    expect(report.config.values.MAFFT_BINARIES).toBe('')
  })
})

describe('Appendix A.9 - species changes and renames', () => {
  it('finds 16 removals and 3 additions within the 50 reported rows', () => {
    expect(report.comparison.speciesCounts.rows).toHaveLength(50)
    expect(report.comparison.removedOscodes).toHaveLength(16)
    expect(report.comparison.addedOscodes).toEqual(['DAPMA', 'MYCMD', 'CRYD1'])
  })

  it('claims exactly the two exact-count rename pairs', () => {
    expect(report.species.renames.map(link => `${link.removed}->${link.added}`)).toEqual([
      'USTMA->MYCMD',
      'CRYNJ->CRYD1',
    ])
    expect(report.species.renames.every(link => link.confidence === 'exact')).toBe(true)
    expect(report.species.renames.every(link => link.countDelta === 0)).toBe(true)
    expect(report.species.byOscode.MYCMD.renameOf).toBe('USTMA')
    expect(report.species.byOscode.USTMA.renamedTo).toBe('MYCMD')
    expect(report.species.byOscode.CRYD1.renameOf).toBe('CRYNJ')
  })

  it('keeps DAPPU/DAPMA as a lower-confidence replacement, not a rename', () => {
    expect(report.species.replacements.map(link => `${link.removed}->${link.added}`)).toEqual([
      'DAPPU->DAPMA',
    ])
    const link = report.species.replacements[0]
    expect(link.confidence).toBe('likely')
    expect(link.removedCount).toBe(30118)
    expect(link.addedCount).toBe(26600)
    expect(report.species.byOscode.DAPMA.replacementOf).toBe('DAPPU')
    expect(report.species.byOscode.DAPMA.renameOf).toBeNull()
    expect(report.species.byOscode.DAPPU.replacedBy).toBe('DAPMA')
  })

  it('flags DAPMA as new on both independent pieces of evidence', () => {
    const dapma = report.species.byOscode.DAPMA
    expect(dapma.isNewInBuild).toBe(true)
    expect(dapma.newInBuildConfidence).toBe('confirmed')
    expect(dapma.counts.value?.previousCount).toBe(0)
    expect(dapma.counts.value?.currentCount).toBe(26600)
    expect(dapma.uniprot.value?.noPreviousMatch).toBe(26600)
    expect(dapma.uniprot.value?.totalSequences).toBe(26600)
    expect(dapma.uniprot.value?.allUnmatched).toBe(true)
    // Which is why its 0 % forward tracking is expected rather than a failure.
    expect(dapma.nodeTracking.value?.pct).toBe(0)
    expect(dapma.evidence.join(' ')).toContain('no previous nodes')
  })

  it('never reads absence from a truncated table as zero', () => {
    // 131 tracked species, but only 50 of 147 count rows and 19 species in the UniProt table.
    expect(report.species.coverage).toEqual({
      nodeTracking: 131,
      counts: 50,
      uniprot: 19,
      countsTotalRows: 147,
      uniprotTotalRows: 132,
    })
    const human = report.species.byOscode.HUMAN
    expect(human.counts.present).toBe(true)
    const unlisted = report.species.records.find(record => !record.counts.present)
    expect(unlisted).toBeDefined()
    expect(unlisted?.counts.value).toBeNull()
    expect(unlisted?.isNewInBuild).toBe(false)
    expect(unlisted?.missingFrom.join(' ')).toContain('truncated')
    // Only three species are new; reading absence as zero would invent roughly 97 more.
    expect(report.species.newOscodes.sort()).toEqual(['CRYD1', 'DAPMA', 'MYCMD'])
  })

  it('excludes the TOTAL aggregate row from the species join', () => {
    expect(report.species.byOscode.TOTAL).toBeUndefined()
    expect(report.comparison.uniprotTotals?.oscode).toBe('TOTAL')
    expect(report.comparison.uniprotTotals?.totalSequences).toBe(2297097)
    expect(report.comparison.uniprotAgreement.rows).toHaveLength(20)
  })
})

describe('Appendix A.10 - truncation', () => {
  it('carries the truncation metadata for all three tables', () => {
    expect(report.otherReports.speciesCounts.truncation).toMatchObject({
      truncated: true,
      includedRows: 50,
      totalRows: 147,
      raggedRows: 0,
      hasRaggedRows: false,
      label: '50 of 147 rows included in report',
    })
    expect(report.otherReports.uniprotMatch.truncation).toMatchObject({
      truncated: true,
      includedRows: 20,
      totalRows: 132,
      raggedRows: 0,
      label: '20 of 132 rows included in report',
    })
    expect(report.otherReports.uniRules.truncation).toMatchObject({
      truncated: true,
      includedRows: 20,
      totalRows: 813,
      // A count, not a boolean.
      raggedRows: 813,
      hasRaggedRows: true,
      label: '20 of 813 rows included in report',
    })
  })

  it('withholds client-side sort and filter over every truncated table', () => {
    for (const table of [
      report.otherReports.speciesCounts,
      report.otherReports.uniprotMatch,
      report.otherReports.uniRules,
    ]) {
      expect(table.truncation.allowClientSort).toBe(false)
      expect(table.truncation.allowClientFilter).toBe(false)
    }
    expect(report.health.truncatedTableCount).toBe(3)
  })
})

describe('normalising the species table', () => {
  it('recomputes the change instead of echoing the fractional pct_change', () => {
    const brana = report.comparison.speciesCounts.rows.find(row => row.oscode === 'BRANA')
    expect(brana).toMatchObject({
      previousCount: 57383,
      currentCount: 0,
      countDiff: -57383,
      fractionChange: -1,
      // The report stores -1.0; formatting that directly would render -1 %.
      percentChange: -100,
      reportedPctChange: -1,
      isRemoval: true,
    })
  })

  it('leaves the percent change undefined for an addition from zero', () => {
    const dapma = report.comparison.speciesCounts.rows.find(row => row.oscode === 'DAPMA')
    expect(dapma?.previousCount).toBe(0)
    expect(dapma?.percentChange).toBeNull()
    expect(dapma?.isAddition).toBe(true)
  })
})

describe('assembled comparison and generator warnings', () => {
  it('reports partial availability with the contributing sections named', () => {
    expect(report.comparison.availability).toBe('partial')
    const present = report.comparison.contributors
      .filter(entry => entry.present)
      .map(entry => entry.sectionId)
    expect(present).toEqual(['other_reports', 'library', 'mapping', 'node_tracking'])
    expect(
      report.comparison.contributors.find(entry => entry.sectionId === 'prev_lib')
    ).toMatchObject({ present: false, note: 'inputs not present yet' })
  })

  it('compares previous and current input sequence counts across two sources', () => {
    const sequences = report.comparison.metrics.find(
      entry => entry.metricId === 'inputReferenceSequences'
    )
    expect(sequences).toMatchObject({
      previous: 2692827,
      current: 2297097,
      delta: -395730,
      previousSource: 'other_reports.prev_lib_sequences',
      currentSource: 'other_reports.new_lib_sequences',
    })
    // The two sides are different concepts, so each carries its own definition id.
    expect(sequences?.metricId).toBe('inputReferenceSequences')
    expect(sequences?.previousMetricId).toBe('prevLibSequences')
  })

  it('carries the single generator warning with an anchor back to its section', () => {
    expect(report.generatorWarnings).toHaveLength(1)
    expect(report.generatorWarnings[0]).toMatchObject({
      sectionId: 'progress',
      origin: 'generator',
      anchor: '#report--progress',
    })
    expect(report.generatorWarnings[0].message).toContain('possibly stale')
  })
})
