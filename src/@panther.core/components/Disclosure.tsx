import clsx from 'clsx'
import { useCallback, useId, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * A progressive-disclosure row.
 *
 * 61 steps and 131 species depend on this, so three things matter:
 *
 *   Keyboard. The summary is a real `<button>` with `aria-expanded` and
 *   `aria-controls`, not a div with a click handler and not a `<details>` -
 *   `<details>` cannot be forced open per-medium reliably and its marker cannot
 *   be styled consistently.
 *
 *   Print. The panel stays MOUNTED when closed and is hidden with a class, so
 *   `styles/print.css` can reveal every disclosure on paper. A printed record
 *   that hides 61 steps behind a chevron is not a record. `unmountClosed` opts
 *   out for genuinely heavy content, at the cost of that content not printing.
 *
 *   Controlled or not. Passing `open` makes it controlled, so a view can expand
 *   the disclosure a deep link points at.
 */
export interface DisclosureProps {
  /** The always-visible row: a step name, a species, a report title. */
  summary: ReactNode
  /** Right-aligned slot on the summary row: a StatusChip, a count, a duration. */
  summaryAside?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  /** Controlled state. When present, `onOpenChange` must move it. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** A figure the disclosure hides, e.g. `3 attempts`. */
  count?: ReactNode
  disabled?: boolean
  /** Drops the container hairline for use inside a list of rows. */
  bare?: boolean
  anchorId?: string
  className?: string
  panelClassName?: string
  /** Unmount the panel when closed. Breaks print; use only for heavy content. */
  unmountClosed?: boolean
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 12 12"
    width={10}
    height={10}
    aria-hidden="true"
    focusable="false"
    data-pb-disclosure-chevron=""
    className={clsx('shrink-0 transition-transform', open && 'rotate-90')}
  >
    <path d="M4 2.5 8.5 6 4 9.5z" fill="currentColor" />
  </svg>
)

export const Disclosure = ({
  summary,
  summaryAside,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  count,
  disabled = false,
  bare = false,
  anchorId,
  className,
  panelClassName,
  unmountClosed = false,
}: DisclosureProps) => {
  const generatedId = useId()
  const panelId = `${anchorId ?? generatedId}-panel`
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = open ?? internalOpen

  const toggle = useCallback(() => {
    if (disabled) return
    const next = !isOpen
    setInternalOpen(next)
    onOpenChange?.(next)
  }, [disabled, isOpen, onOpenChange])

  return (
    <div
      id={anchorId}
      data-pb-anchor={anchorId ? '' : undefined}
      className={clsx(!bare && 'pb-hairline rounded-hair bg-surface-1', className)}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={panelId}
        data-pb-disclosure-toggle=""
        className={clsx(
          'flex w-full items-center gap-1.5 px-2 text-left text-xs',
          'min-h-row',
          disabled ? 'text-ink-faint cursor-default' : 'text-ink hover:bg-wash-hover'
        )}
      >
        <Chevron open={isOpen} />
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        {count !== undefined && (
          <span className="pb-figures text-ink-muted text-2xs shrink-0">{count}</span>
        )}
        {summaryAside && <span className="shrink-0">{summaryAside}</span>}
      </button>

      {(isOpen || !unmountClosed) && (
        <div
          id={panelId}
          data-pb-disclosure-panel=""
          // `hidden` the class, not the attribute: Tailwind's preflight marks
          // `[hidden]` as `!important` inside @layer base, and an important
          // layered declaration outranks the unlayered important override that
          // print.css uses to expand every disclosure on paper.
          className={clsx('pb-hairline-t px-2 py-1.5', !isOpen && 'hidden', panelClassName)}
        >
          {children}
        </div>
      )}
    </div>
  )
}
