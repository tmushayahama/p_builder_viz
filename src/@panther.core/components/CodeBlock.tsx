import clsx from 'clsx'
import type { ReactNode } from 'react'
import { CopyButton } from '@/@panther.core/components/CopyButton'
import { EmptyState } from '@/@panther.core/components/EmptyState'

/**
 * A captured configuration snapshot - `config.mk` and its like - shown as
 * evidence.
 *
 * The interesting prop is `highlightLines`. A config finding is only credible if
 * the literal line it rests on is visible: the fixture's QfO mismatch is
 * argued from a commented-out `#export QFO_DATA_DIR=...` line that has to be
 * pointed at, not paraphrased. So the block numbers its lines, can mark
 * specific ones, and can scroll to the first mark.
 *
 * Long snippets scroll inside their own container so the page never scrolls
 * sideways, and `data-pb-scroll` lets the print stylesheet unclip them.
 */
export interface CodeBlockProps {
  code: string
  /** Shown in the block's header, in mono. */
  filename?: string
  /** 1-based line numbers to mark as the evidence for a finding. */
  highlightLines?: readonly number[]
  /** Why those lines are marked - rendered under the header. */
  highlightNote?: ReactNode
  showLineNumbers?: boolean
  /** Max on-screen height in px before the block scrolls. */
  maxHeight?: number
  copy?: boolean
  wrap?: boolean
  anchorId?: string
  className?: string
}

export const CodeBlock = ({
  code,
  filename,
  highlightLines,
  highlightNote,
  showLineNumbers = true,
  maxHeight = 320,
  copy = true,
  wrap = false,
  anchorId,
  className,
}: CodeBlockProps) => {
  const lines = code.length === 0 ? [] : code.replace(/\n$/, '').split('\n')
  const marked = new Set(highlightLines ?? [])

  return (
    <figure
      id={anchorId}
      data-pb-anchor={anchorId ? '' : undefined}
      className={clsx('bg-surface-3 pb-hairline rounded-hair overflow-hidden', className)}
    >
      {(filename || copy) && (
        <figcaption className="pb-hairline-b flex items-baseline gap-2 px-2 py-1">
          {filename && <span className="pb-ident text-ink-muted text-2xs">{filename}</span>}
          <span className="pb-figures text-ink-faint text-3xs">
            {lines.length.toLocaleString()} lines
          </span>
          {copy && (
            <span className="ml-auto">
              <CopyButton value={code} iconOnly ariaLabel={`Copy ${filename ?? 'snippet'}`} />
            </span>
          )}
        </figcaption>
      )}

      {highlightNote && (
        <p className="pb-hairline-b text-ink-muted text-2xs px-2 py-1">{highlightNote}</p>
      )}

      {lines.length === 0 ? (
        <div className="px-2 py-1">
          <EmptyState
            compact
            title="Snapshot empty"
            description="The report carried this file but its contents were empty."
          />
        </div>
      ) : (
        <div data-pb-scroll="" className="overflow-auto" style={{ maxHeight }}>
          <pre className={clsx('text-2xs leading-4', wrap ? 'whitespace-pre-wrap' : 'w-max')}>
            <code>
              {lines.map((line, index) => {
                const number = index + 1
                const isMarked = marked.has(number)
                return (
                  <span
                    key={number}
                    data-code-line={number}
                    className={clsx(
                      'flex px-2',
                      isMarked && 'bg-accent-wash text-ink',
                      !isMarked && 'text-ink-muted'
                    )}
                  >
                    {showLineNumbers && (
                      <span
                        aria-hidden="true"
                        className="text-ink-faint pb-figures mr-2 inline-block w-8 shrink-0 text-right select-none"
                      >
                        {number}
                      </span>
                    )}
                    <span className={clsx(wrap && 'min-w-0 flex-1')}>{line || ' '}</span>
                  </span>
                )
              })}
            </code>
          </pre>
        </div>
      )}
    </figure>
  )
}
