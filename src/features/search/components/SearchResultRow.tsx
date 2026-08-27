import clsx from 'clsx'
import { Provenance } from '@/@panther.core/components'
import { SEARCH_KIND_LABELS } from '@/features/search/model/searchIndex'
import type { SearchEntry } from '@/features/search/model/searchIndex'

/**
 * One hit.
 *
 * The kind is a word, not a colour or an icon, because six kinds cannot be told apart by hue and
 * the palette has to be readable at a glance while typing. A finding also carries its provenance
 * mark, so a generator-emitted warning and a dashboard-derived reading are distinguishable in the
 * one place where the whole report is flattened into a single list.
 */
export interface SearchResultRowProps {
  entry: SearchEntry
  active: boolean
  optionId: string
  onSelect: () => void
  /** Hover moves the active option, so mouse and keyboard cannot disagree. */
  onHover: () => void
}

export const SearchResultRow = ({
  entry,
  active,
  optionId,
  onSelect,
  onHover,
}: SearchResultRowProps) => (
  <li
    id={optionId}
    role="option"
    aria-selected={active}
    data-search-kind={entry.kind}
    onMouseMove={onHover}
    onClick={onSelect}
    className={clsx(
      'flex cursor-pointer items-baseline gap-2 px-2 py-1',
      active ? 'bg-wash-selected' : 'hover:bg-wash-hover'
    )}
  >
    <span className="text-ink-faint text-2xs w-14 shrink-0 uppercase">
      {SEARCH_KIND_LABELS[entry.kind]}
    </span>
    <span className="min-w-0 flex-1">
      <span className="pb-ident text-ink block truncate text-xs">{entry.title}</span>
      {entry.detail !== null && (
        <span className="text-ink-muted text-2xs block truncate">{entry.detail}</span>
      )}
    </span>
    {entry.origin !== null && (
      <Provenance
        source={entry.origin}
        variant="marker"
        detail={entry.origin === 'generator' ? 'report generator' : 'this dashboard'}
      />
    )}
  </li>
)
