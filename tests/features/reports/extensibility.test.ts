import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getFixtureReport } from '@/features/build/fixtures'
import { readGenericSection } from '@/features/reports/model/genericView'
import { getReportRenderer } from '@/features/reports/registry'

/**
 * The extensibility claim, checked rather than asserted.
 *
 * A registry that COULD render an unknown section is worth much less than a fixture that visibly
 * does, and the only way to know the fallback is not quietly special-casing the demonstration is to
 * grep for the section ids. Nothing in `src/` outside the fixture that invents them may name
 * `pfam_coverage` or `tree_quality`: not the model, not the renderer registry, not the fallback.
 */

const SOURCE_ROOT = join(process.cwd(), 'src')

/** Where the future sections are invented. Everything else must be ignorant of them. */
const FIXTURE_FILE = posix.join('src', 'features', 'build', 'fixtures', 'transforms.ts')

const FUTURE_SECTION_IDS = ['pfam_coverage', 'tree_quality'] as const

function sourceFiles(directory: string): string[] {
  const found: string[] = []
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path))
    } else if (/\.tsx?$/.test(name)) {
      found.push(path)
    }
  }
  return found
}

describe('a future report renders with no code that knows its name', () => {
  it('no source file outside the fixture mentions the future section ids', () => {
    const offenders: string[] = []
    for (const path of sourceFiles(SOURCE_ROOT)) {
      const relativePath = relative(process.cwd(), path).split(sep).join(posix.sep)
      if (relativePath === FIXTURE_FILE) continue
      const contents = readFileSync(path, 'utf8')
      for (const id of FUTURE_SECTION_IDS) {
        if (contents.includes(id)) offenders.push(`${relativePath} mentions ${id}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('the renderer registry has nothing registered for them', () => {
    for (const id of FUTURE_SECTION_IDS) {
      expect(getReportRenderer(id)).toBeNull()
    }
  })

  it('both are still in the report registry, and the model reads them as unrecognised', () => {
    const report = getFixtureReport('unknownSection')

    for (const id of FUTURE_SECTION_IDS) {
      const entry = report.reports.find(candidate => candidate.sectionId === id)
      expect(entry, `${id} must reach the registry`).toBeDefined()
      expect(entry?.known).toBe(false)
    }
  })

  it('the two future reports have deliberately different internal shapes, and both decompose', () => {
    const report = getFixtureReport('unknownSection')
    const pfam = report.reports.find(entry => entry.sectionId === 'pfam_coverage')
    const trees = report.reports.find(entry => entry.sectionId === 'tree_quality')

    const pfamReading = readGenericSection(pfam!)
    expect(pfamReading.text).not.toBeNull()
    expect(pfamReading.headline).toHaveLength(4)
    expect(pfamReading.tables).toHaveLength(1)
    expect(pfamReading.warnings).toHaveLength(1)

    const treeReading = readGenericSection(trees!)
    expect(treeReading.text).toBeNull()
    expect(treeReading.tables).toHaveLength(0)
    expect(treeReading.headline).toHaveLength(3)
    expect(treeReading.rows).toHaveLength(0)
  })

  it('one lands unattached and the other follows its phase hint, without a registry change', () => {
    const report = getFixtureReport('unknownSection')
    const pfam = report.reports.find(entry => entry.sectionId === 'pfam_coverage')
    const trees = report.reports.find(entry => entry.sectionId === 'tree_quality')

    expect(pfam?.placement).toBe('unattached')
    expect(trees?.placement).toBe('phase')
    expect(trees?.primaryPhaseId).toBe('tree-building-giga')
  })
})
