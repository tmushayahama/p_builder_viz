/**
 * Books with a usable tree, against books submitted.
 *
 * GIGA is where a build most plausibly loses families quietly: a book whose tree comes back empty
 * still counts as a book. On this report every one of the 15,797 books has a non-empty tree, which
 * is why the family agreement downstream holds.
 */

import { passing, unevaluated, warned } from '../finding'
import { count, sectionTarget } from '../context'
import type { CheckRule } from '../types'

const RULE_ID = 'consistency.tree-completeness'

export const treeCompletenessRule: CheckRule = {
  id: RULE_ID,
  label: 'Tree completeness',
  category: 'consistency',
  run: report => {
    const { booksTotal, treesSucceeded, emptyTrees } = report.consistency.treeCompleteness
    const target = sectionTarget(report, 'giga')

    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'consistency' as const,
      label: 'Tree completeness',
      explanation: '',
      source: 'giga.books_total, giga.trees_succeeded, giga.empty_trees',
      evidence: [
        `Books submitted: ${count(booksTotal)} (giga.books_total)`,
        `Books with a usable tree: ${count(treesSucceeded)} (giga.trees_succeeded)`,
        `Empty trees: ${count(emptyTrees)} (giga.empty_trees)`,
      ],
      metricId: 'treesSucceeded' as const,
      ...target,
    }

    if (booksTotal === null || treesSucceeded === null) {
      return [
        unevaluated({
          ...seed,
          label: 'Tree completeness could not be established',
          explanation:
            'The tree-building section does not report both a book count and a usable-tree ' +
            'count, so coverage cannot be computed. No coverage is assumed from the absence.',
          reason: 'inputs-missing',
        }),
      ]
    }

    const shortfall = booksTotal - treesSucceeded

    if (shortfall !== 0 || (emptyTrees ?? 0) > 0) {
      return [
        warned({
          ...seed,
          label: 'Some books have no usable tree',
          explanation:
            `${count(treesSucceeded)} of ${count(booksTotal)} books came back with a usable ` +
            `tree${shortfall > 0 ? `, leaving ${count(shortfall)} without one` : ''}` +
            `${(emptyTrees ?? 0) > 0 ? ` and ${count(emptyTrees)} empty` : ''}. A book without a ` +
            'tree still counts as a family, so the family totals downstream will not show this.',
        }),
      ]
    }

    return [
      passing({
        ...seed,
        label: 'Every book has a usable tree',
        explanation:
          `${count(treesSucceeded)} of ${count(booksTotal)} books have a non-empty tree and ` +
          `${count(emptyTrees)} came back empty. Nothing was lost between family assignment and ` +
          'tree building.',
      }),
    ]
  },
}
