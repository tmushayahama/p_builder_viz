import { Tooltip } from '@mantine/core'
import { Panel, PanelGrid, StatusChip } from '@/@panther.core/components'
import { formatCount } from '@/app/format'
import { useBuildReport } from '@/features/build/hooks'
import { TERMS } from '@/features/release/vocabulary'
import type { TermKey } from '@/features/release/vocabulary'

/**
 * What is in this library.
 *
 * Each figure carries its own definition, because "sequences" is ambiguous here in exactly the way
 * it is in the build record: this report holds six distinct sequence counts, and two of them differ
 * by more than half a million. A bare "Sequences: 1,736,983" beside "Sequences: 2,297,097" reads as
 * a contradiction rather than as two different concepts.
 *
 * Absent stays absent. A library figure the report did not carry shows as such, never as zero - a
 * zero here would say the release contains nothing of that kind, which is a much stronger claim
 * than "not measured".
 */

interface Figure {
  term: TermKey
  value: number | null
}

const FigureTile = ({ term, value }: Figure) => {
  const { label, hint } = TERMS[term]
  return (
    <Tooltip label={hint} withArrow multiline maw={300} openDelay={200}>
      <div className="min-w-0">
        <div className="text-ink-faint text-2xs truncate">{label}</div>
        <div className="text-ink pb-figures text-lede font-semibold">
          {value === null ? (
            <span className="text-ink-faint text-xs font-normal">not reported</span>
          ) : (
            formatCount(value)
          )}
        </div>
      </div>
    </Tooltip>
  )
}

export const ReleaseContents = () => {
  const report = useBuildReport()
  const { library, trees, mapping } = report

  const treesComplete =
    trees.emptyTrees !== null && trees.emptyTrees === 0 && trees.treesSucceeded !== null

  return (
    <PanelGrid minColumnWidth={420}>
      <Panel
        title="What this library contains"
        availability={library.availability}
        message={library.message ?? undefined}
        missingSubject="The library contents"
        density="tight"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <FigureTile term="genomes" value={library.genomes} />
          <FigureTile term="librarySequences" value={library.sequences} />
          <FigureTile term="families" value={library.families} />
          <FigureTile term="subfamilies" value={library.subfamilies} />
        </div>
      </Panel>

      <Panel
        title="Family assignment and trees"
        availability={mapping.availability}
        message={mapping.message ?? undefined}
        missingSubject="Family assignment"
        density="tight"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <FigureTile term="inputSequences" value={mapping.inputSequences} />
          <FigureTile term="assignedSequences" value={mapping.finalAssigned} />
          <FigureTile term="trees" value={trees.treesSucceeded} />
        </div>

        {/* 15,797 of 15,797 with none empty is good news and should read as such, rather than as a
            neutral pair of numbers a reader has to compare themselves. */}
        {treesComplete && trees.booksTotal !== null && (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-xs">
            <StatusChip status="pass" label="Every family has a tree" />
            <span className="text-ink-muted">
              {formatCount(trees.treesSucceeded)} of {formatCount(trees.booksTotal)}, none empty.
            </span>
          </p>
        )}
      </Panel>
    </PanelGrid>
  )
}

export default ReleaseContents
