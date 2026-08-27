import clsx from 'clsx'
import type { ReactNode } from 'react'
import { StatusIcon } from '@/@panther.core/components/StatusIcon'

/**
 * Nothing to show, and why.
 *
 * Deliberately distinct from `UnavailableNotice`: that one means the report
 * could not supply the data, this one means the data is present and a filter or
 * a genuinely empty set left nothing to render. Confusing the two would let a
 * filter look like a broken report.
 */
export interface EmptyStateProps {
  title: string
  description?: ReactNode
  /** A control that undoes whatever emptied the view. */
  action?: ReactNode
  compact?: boolean
  className?: string
}

export const EmptyState = ({
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) => (
  <div
    className={clsx(
      'text-ink-muted flex flex-col items-start gap-1',
      compact ? 'py-1.5' : 'py-4',
      className
    )}
    role="status"
  >
    <span className="text-ink-faint inline-flex items-center gap-1.5 text-xs">
      <StatusIcon shape="dash" size={12} />
      <span className="text-ink font-semibold">{title}</span>
    </span>
    {description && <p className="text-2xs max-w-prose">{description}</p>}
    {action && <span className="mt-1">{action}</span>}
  </div>
)
