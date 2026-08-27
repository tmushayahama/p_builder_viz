import clsx from 'clsx'

/**
 * The one way into the species cross-section from a table cell.
 *
 * A real `<button>` rather than a clickable row, because the distribution's marks are only
 * reachable with a pointer: without a focusable control per species, a keyboard reader could not
 * open a species at all. Its accessible name is the oscode itself, so a row is addressable by the
 * identifier a reviewer is actually looking for.
 */
export interface SpeciesButtonProps {
  oscode: string
  onSelect: (oscode: string) => void
  selected?: boolean
  className?: string
}

export const SpeciesButton = ({
  oscode,
  onSelect,
  selected = false,
  className,
}: SpeciesButtonProps) => (
  <button
    type="button"
    title="Open the species cross-section"
    aria-pressed={selected}
    onClick={() => onSelect(oscode)}
    className={clsx(
      'pb-ident min-h-6 cursor-pointer text-left',
      selected ? 'text-accent font-semibold' : 'text-accent hover:text-accent-hover',
      className
    )}
  >
    {oscode}
  </button>
)
