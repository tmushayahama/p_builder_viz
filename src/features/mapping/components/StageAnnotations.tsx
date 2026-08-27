import clsx from 'clsx'
import { DeltaValue, SectionHeading } from '@/@panther.core/components'
import { formatCount, plural } from '@/app/format'
import type { MappingView, StageChange } from '@/features/mapping/model'

/**
 * The changes worth reading, stated rather than left to be computed.
 *
 * A reviewer should not have to difference fourteen rows to find out that HMM scoring is where the
 * assignment rate comes from. Each entry names the stage, the signed change and the mechanism the
 * change is booked to, and the two that matter most - the largest gain and the largest loss - take
 * the accent. Nothing else on this page does.
 *
 * A decrease is deliberately NOT painted as a failure. `pass1_trim` losing 4,030 assignments is
 * family trimming doing its job, so `DeltaValue` stays on its neutral default and the direction is
 * carried by the sign and the arrow.
 */
export interface StageAnnotationsProps {
  view: MappingView
}

const ChangeRow = ({ change }: { change: StageChange }) => (
  <li
    className={clsx(
      'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-0.5',
      (change.isLargestGain || change.isLargestLoss) && 'bg-accent-wash -mx-1 px-1'
    )}
  >
    <span className="pb-ident text-ink w-32 shrink-0 text-xs">{change.stage}</span>
    <DeltaValue value={change.assignedDelta} className="text-xs" />
    <span className="text-ink-muted text-2xs">
      {change.mechanisms.length === 0
        ? 'no mechanism moved'
        : change.mechanisms
            .map(
              entry =>
                `${entry.label} ${entry.delta > 0 ? '+' : '-'}${Math.abs(entry.delta).toLocaleString()}`
            )
            .join(' · ')}
    </span>
    {change.isLargestGain && <span className="text-accent text-2xs">largest single gain</span>}
    {change.isLargestLoss && <span className="text-accent text-2xs">largest single loss</span>}
  </li>
)

export const StageAnnotations = ({ view }: StageAnnotationsProps) => {
  const { summary, gains, losses, unchanged } = view
  const first = view.stages[0] ?? null
  const last = view.stages[view.stages.length - 1] ?? null

  return (
    <div className="space-y-2">
      <SectionHeading
        level={4}
        count={`${view.changes.length} ${plural(view.changes.length, 'stage')} compared`}
        description={
          <>
            Assignment runs{' '}
            {summary.firstPctAssigned === null ? '—' : `${summary.firstPctAssigned.toFixed(1)} %`}{' '}
            to{' '}
            {summary.finalPctAssigned === null ? '—' : `${summary.finalPctAssigned.toFixed(1)} %`}
            {summary.assignmentGainPoints === null
              ? ''
              : `, +${summary.assignmentGainPoints.toFixed(1)} percentage points overall`}
            . Over the same run the sequences present at a stage fall from{' '}
            {formatCount(first?.totalSequences ?? null)} to{' '}
            {formatCount(last?.totalSequences ?? null)}
            {view.envelopeLoss === null ? '' : ` (-${view.envelopeLoss.toLocaleString()})`}, and
            families from {formatCount(first?.families ?? null)} to{' '}
            {formatCount(last?.families ?? null)}.
          </>
        }
      >
        What changed, stage by stage
      </SectionHeading>

      <div className="gap-x-gutter grid grid-cols-1 gap-y-2 lg:grid-cols-2">
        <div>
          <p className="text-ink-muted text-2xs mb-0.5 font-semibold uppercase">
            Assignment gains ({gains.length})
          </p>
          {gains.length === 0 ? (
            <p className="text-ink-faint text-2xs">No stage gained assignments.</p>
          ) : (
            <ul className="list-none p-0">
              {gains.map(change => (
                <ChangeRow key={change.stageId} change={change} />
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-ink-muted text-2xs mb-0.5 font-semibold uppercase">
            Assignment losses ({losses.length})
          </p>
          {losses.length === 0 ? (
            <p className="text-ink-faint text-2xs">No stage lost assignments.</p>
          ) : (
            <ul className="list-none p-0">
              {losses.map(change => (
                <ChangeRow key={change.stageId} change={change} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {view.envelopeLosses.length > 0 && (
        <p className="text-ink-muted text-2xs">
          <span className="text-ink font-semibold">Where the envelope narrows: </span>
          {view.envelopeLosses
            .map(entry => `${entry.label} -${entry.loss.toLocaleString()}`)
            .join(' · ')}
          . These are trimming, de-duplication and single-genome family removal, not sequences that
          failed to map.
        </p>
      )}

      {unchanged.length > 0 && (
        <p className="text-ink-faint text-2xs">
          {unchanged.length} {plural(unchanged.length, 'stage')} changed nothing in the assigned
          count: {unchanged.map(change => change.stage).join(', ')}.
        </p>
      )}

      {view.extensionNote !== null && (
        <p className="text-ink-muted text-2xs">{view.extensionNote}</p>
      )}
    </div>
  )
}
