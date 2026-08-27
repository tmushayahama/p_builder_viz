import { describe, expect, it } from 'vitest'
import { getFixtureReport } from '@/features/build/fixtures'
import { configAnchor } from '@/features/build/model'
import { runChecks } from '@/features/checks/model'
import type { CheckFinding } from '@/features/checks/model'

/**
 * Appendix A.8 - the three configuration tiers.
 *
 * The failure this file exists to prevent is recorded in the plan's Failed Approaches: flagging every
 * value that references an older release produces about twenty-five findings on this config and
 * buries the one real mismatch. So the assertions are as much about what does NOT warn as about
 * what does.
 */

const run = (key: 'real' | 'warning' = 'real') => runChecks(getFixtureReport(key))

const find = (checks: readonly CheckFinding[], id: string): CheckFinding => {
  const finding = checks.find(candidate => candidate.id === id)
  if (finding === undefined) throw new Error(`no finding with id ${id}`)
  return finding
}

describe('mismatch tier', () => {
  it('detects the QfO declared release against the active data path', () => {
    const finding = find(run().checks, 'config.qfo-release')

    expect(finding.state).toBe('warn')
    expect(finding.weight).toBe('issue')
    expect(finding.tier).toBe('mismatch')
    expect(finding.label).toBe('QfO release 2026_02 disagrees with the active data path')
    expect(finding.explanation).toContain('QFO_RELEASE_VERSION declares 2026_02')
    expect(finding.explanation).toContain('ref_prot_2026_01/external_data/qfo_reference_proteome')
    expect(finding.explanation).toContain('which carries 2026_01')
    expect(finding.anchor).toBe(configAnchor('QFO_DATA_DIR'))
  })

  it('retains the commented-out config.mk line as evidence, with its line number', () => {
    const finding = find(run().checks, 'config.qfo-release')

    expect(finding.evidence).toEqual([
      'QFO_RELEASE_VERSION=2026_02',
      'QFO_DATA_DIR=ref_prot_2026_01/external_data/qfo_reference_proteome',
      'config.mk:1 (commented out) #export QFO_DATA_DIR=QfO_release_2026_02/external_data/qfo_reference_proteome',
    ])
    expect(finding.explanation).toContain('commented-out line for 2026_02 on line 1')
  })

  it('keeps the commented line in the report model, so the evidence is not the check’s invention', () => {
    const { qfoCommentedEvidence } = getFixtureReport('real').consistency
    expect(qfoCommentedEvidence).toHaveLength(1)
    expect(qfoCommentedEvidence[0].commentedOut).toBe(true)
    expect(qfoCommentedEvidence[0].line).toBe(1)
  })

  it('holds only the two counted configuration findings', () => {
    const mismatches = run()
      .byTier.mismatch.map(finding => finding.id)
      .sort()
    expect(mismatches).toEqual(['config.qfo-release', 'config.source-dirty'])
  })
})

describe('lineage tier', () => {
  it('passes on the PREV_* set instead of flagging its nineteen 19.0 references', () => {
    const finding = find(run().checks, 'config.lineage')

    expect(finding.state).toBe('pass')
    expect(finding.weight).toBe('verified')
    expect(finding.tier).toBe('lineage')
    expect(finding.label).toBe('Previous-release lineage is consistent at PANTHER19.0')
    expect(finding.explanation).toContain('19 PREV_* variables consistently reference PANTHER19.0')
    expect(finding.explanation).toContain('2 PREV_PREV_* variables reference PANTHER17.0')
    expect(finding.explanation).toContain('does not count as an issue')
  })

  it('notes that 18.0 would be the naive expectation without calling 17.0 an error', () => {
    const finding = find(run().checks, 'config.lineage')

    expect(finding.explanation).toContain('PANTHER18.0 would be the naive expectation')
    expect(finding.explanation).toContain('deliberate choice of an older baseline')
    expect(finding.state).not.toBe('warn')
  })

  it('produces no warning for any of the twenty-one lineage variables', () => {
    const report = getFixtureReport('real')
    const lineageKeys = [
      ...report.config.previousLineage.map(entry => entry.key),
      ...report.config.previousPreviousLineage.map(entry => entry.key),
    ]
    expect(lineageKeys).toHaveLength(21)

    const warnedKeys = run()
      .checks.filter(finding => finding.weight === 'issue' && finding.configKey !== null)
      .map(finding => finding.configKey)

    for (const key of lineageKeys) expect(warnedKeys).not.toContain(key)
  })
})

describe('notable tier', () => {
  it('is exactly the six values Appendix A.8 names, and none of them is a warning', () => {
    const notable = run().byTier.notable
    expect(notable.map(finding => finding.configKey)).toEqual([
      'PC_CLASS',
      'PC_RELATIONSHIP',
      'PTHR_FULLGO_ANNOT_TSV',
      'PREV_GENE_NODE_DAT',
      'PREV_SF_TO_SEQ',
      'MAFFT_BINARIES',
    ])
    for (const finding of notable) {
      expect(finding.weight).toBe('note')
      expect(finding.state).toBe('pass')
      expect(finding.anchor).toBe(configAnchor(finding.configKey ?? ''))
      // Each carries a sentence, not a label: the point is to explain it years later.
      expect(finding.explanation.length).toBeGreaterThan(80)
    }
  })

  it('explains the Protein Class inheritance from PANTHER18.0', () => {
    const finding = find(run().checks, 'config.notable:PC_CLASS')
    expect(finding.label).toBe('PC_CLASS is inherited from PANTHER18.0')
    expect(finding.explanation).toContain('curated infrequently')
    expect(finding.evidence[0]).toContain('PANTHER18.0/library_building/Protein_Class_18.0')
  })

  it('explains the annotation input whose filename encodes 19.0', () => {
    const finding = find(run().checks, 'config.notable:PTHR_FULLGO_ANNOT_TSV')
    expect(finding.label).toBe('PTHR_FULLGO_ANNOT_TSV names release 19 in its filename')
    expect(finding.evidence[1]).toBe('Filename encodes release 19: Pthr_GO_19.0.tsv.')
  })

  it('reads the XENTR drop from the two inputs that name it, and links them', () => {
    const geneNode = find(run().checks, 'config.notable:PREV_GENE_NODE_DAT')
    const sfToSeq = find(run().checks, 'config.notable:PREV_SF_TO_SEQ')

    expect(geneNode.label).toBe('PREV_GENE_NODE_DAT excludes XENTR')
    expect(geneNode.oscode).toBe('XENTR')
    expect(geneNode.explanation).toContain('PREV_SF_TO_SEQ names the same oscode')
    expect(sfToSeq.explanation).toContain('PREV_GENE_NODE_DAT names the same oscode')
  })

  it('reports MAFFT_BINARIES as declared-but-empty, naming the sibling that is set', () => {
    const finding = find(run().checks, 'config.notable:MAFFT_BINARIES')
    expect(finding.label).toBe('MAFFT_BINARIES is declared but empty')
    expect(finding.evidence[0]).toBe('MAFFT_BINARIES=(empty)')
    expect(finding.explanation).toContain('MAFFT_PATH does carry a value')
  })
})

describe('the generator’s own configuration warning', () => {
  it('supersedes the derived QfO finding on the toWarning state', () => {
    const result = run('warning')

    expect(result.checks.some(finding => finding.id === 'config.qfo-release')).toBe(false)
    const stoodDown = result.suppressed.find(finding => finding.id === 'config.qfo-release')
    expect(stoodDown?.supersededBy).toBe('generator.warning:generator-config_ledger-1')

    // The generator's message survives verbatim and is anchored to the key it names.
    const generator = find(result.checks, 'generator.warning:generator-config_ledger-1')
    expect(generator.explanation).toBe(
      'QFO_RELEASE_VERSION=2026_02 does not appear in the active QFO_DATA_DIR path'
    )
    expect(generator.anchor).toBe(configAnchor('QFO_RELEASE_VERSION'))
    expect(generator.origin).toBe('generator')
  })
})
