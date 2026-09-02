import type { BuildReport, PipelineSummary } from '@/features/build/model'

/**
 * The record's language, translated once, for a reader who does not run the pipeline.
 *
 * The build record is deliberately pipeline-first: its navigation is the phase spine, its steps are
 * Make goals, and its evidence is artifact mtimes. That is right for whoever babysits a build and
 * wrong for whoever reviews a release, who wants to know what is in the library and what moved.
 *
 * Every phrase the release view shows comes from here, so the two views cannot drift into two
 * different accounts of the same report, and so no component invents its own wording for a term the
 * domain already has a name for.
 *
 * TWO RULES, and the second is the one that makes this worth building.
 *
 * 1. Never surface a term this module does not define. A release page that leaks `pass1_dedup` or
 *    `refProteomePANTHERmapping_post_giga` has failed at its only job.
 *
 * 2. **Simplifying is not licence to be vaguer, and never licence to be less honest.** A table that
 *    holds 50 of 147 rows still says so here; absence still reads as absent rather than zero; and a
 *    reading this dashboard derived is still labelled as derived. A domain reader has MORE need of
 *    that last label than an engineer, not less - they are the one who will quote the number in a
 *    release note. Dropping "50 of 147" to make the page friendlier would let a reviewer conclude
 *    BRANA is the release's largest decrease, which the report does not support.
 */

/** Plain-language readiness, replacing the frontier/hole vocabulary entirely. */
export interface ReadinessReading {
  /** One sentence: is this library finished? */
  headline: string
  /** What remains, or `null` when nothing does. */
  outstanding: string | null
  /**
   * Work the build passed over rather than reached - the record calls these holes. Kept because a
   * skipped validation step has release consequences: the numbers below it were produced without
   * it. Translated, never dropped.
   */
  skipped: string | null
  tone: 'complete' | 'in-progress' | 'attention'
}

const stepWord = (count: number) => (count === 1 ? 'step' : 'steps')
const checkWord = (count: number) => (count === 1 ? 'check' : 'checks')

export function readRelease(pipeline: PipelineSummary): ReadinessReading {
  const phases = pipeline.phases
  if (phases.length === 0) {
    return {
      headline: 'This report does not say how far the build progressed.',
      outstanding: null,
      skipped: null,
      tone: 'attention',
    }
  }

  const outstandingSteps = pipeline.steps.filter(step => step.status.kind !== 'done').length
  const failed = pipeline.steps.filter(
    step => step.status.kind === 'failed' || step.hasFailedAttempt
  ).length

  // The record's "holes" - phases the build carried on past. Counted in steps rather than phases,
  // because a reader cares what was not done, not how the driver grouped it.
  const skippedSteps = phases
    .filter(phase => phase.isHole)
    .reduce((total, phase) => total + phase.incompleteSteps.length, 0)

  const skipped =
    skippedSteps === 0
      ? null
      : `${skippedSteps} validation ${checkWord(skippedSteps)} earlier in the build never ran. ` +
        'The figures below were produced without them.'

  if (failed > 0) {
    return {
      headline: 'This library did not finish building.',
      outstanding: `${failed} ${stepWord(failed)} failed, so the figures below are incomplete.`,
      skipped,
      tone: 'attention',
    }
  }

  if (outstandingSteps === 0) {
    return {
      headline: 'This library finished building.',
      outstanding: null,
      skipped,
      tone: 'complete',
    }
  }

  return {
    headline: 'This library is still being built.',
    outstanding:
      `${outstandingSteps} ${stepWord(outstandingSteps)} remain, all in packaging and export. ` +
      'The library contents below are already computed.',
    skipped,
    tone: 'in-progress',
  }
}

/**
 * How current the page is, without the word "freshness".
 *
 * The record frames this as a report-versus-artifact comparison, which is a build concern. What a
 * reader needs is whether the page describes the library as it stands.
 */
export function readCurrency(report: BuildReport): string | null {
  switch (report.freshness.state) {
    case 'current':
      return 'This page was written after every file it describes, so it is up to date.'
    case 'potentially-stale':
      return 'Part of the library changed after this page was written, so a figure may be out of date.'
    default:
      return null
  }
}

/** Why a comparison is partial, in terms of what is missing rather than which section is absent. */
export function readComparisonGap(report: BuildReport): string | null {
  const { comparison } = report
  if (comparison.availability === 'available') return null
  const missing = comparison.contributors.filter(source => !source.present)
  if (missing.length === 0) return null
  return (
    'The comparison below is assembled from the figures this report happens to carry. The ' +
    'dedicated previous-library comparison was not produced, so some rows are unavailable rather ' +
    'than zero.'
  )
}

/**
 * Terms the release view is allowed to use, with the record's equivalent, so the mapping is
 * reviewable in one place rather than scattered through components.
 *
 * `oscode` is deliberately kept ALONGSIDE the plain word rather than replaced: a five-letter code
 * is what a biologist will search the FTP site for, and hiding it would cost them the identifier
 * they actually need. Note that oscodes are not uniformly five characters - `PIG` and `RAT` are
 * real - so nothing may format them on that assumption.
 */
export const TERMS = {
  genomes: { label: 'Genomes', hint: 'Reference proteomes included in this library.' },
  librarySequences: {
    label: 'Sequences in the library',
    hint: 'Protein sequences placed into a family and present in the finished library.',
  },
  inputSequences: {
    label: 'Sequences submitted',
    hint: 'Sequences drawn from the reference proteomes before family assignment.',
  },
  assignedSequences: {
    label: 'Sequences placed in a family',
    hint: 'Sequences the build succeeded in assigning to a protein family.',
  },
  families: { label: 'Families', hint: 'PANTHER protein families (PTHR identifiers).' },
  subfamilies: { label: 'Subfamilies', hint: 'Subfamilies within those families.' },
  trees: {
    label: 'Families with a tree',
    hint: 'Families for which a phylogenetic tree was built.',
  },
  carriedForward: {
    label: 'Annotation carried forward',
    hint:
      'Share of the previous library’s annotation nodes that were matched into this one. ' +
      'A genome new to this release has nothing to carry forward, so a low figure is not ' +
      'necessarily a problem.',
  },
} as const

export type TermKey = keyof typeof TERMS

/** A rename is taxonomy; a replacement is a different genome taking a slot. Never conflate them. */
export const LINK_WORDING = {
  rename: {
    label: 'Renamed',
    hint:
      'The same genome under a new code, inferred from an exact match between the sequences ' +
      'removed and added. A reclassification, not a gain or a loss.',
  },
  replacement: {
    label: 'Replaced',
    hint:
      'A different genome took the place of one that left. The counts are close but not equal, ' +
      'so this is a substitution rather than a rename — read it as both a loss and a gain.',
  },
} as const
