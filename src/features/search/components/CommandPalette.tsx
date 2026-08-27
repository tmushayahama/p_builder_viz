import { Modal, TextInput } from '@mantine/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { LuSearch } from 'react-icons/lu'
import { EmptyState } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { useJumpToEntry, useSearchIndex } from '@/features/search/hooks'
import { SearchResultRow } from '@/features/search/components/SearchResultRow'
import {
  SEARCH_KIND_LABELS,
  SEARCH_KIND_ORDER,
  SEARCH_KIND_PLURALS,
  searchEntries,
} from '@/features/search/model/searchIndex'

/**
 * One palette over the whole build.
 *
 * Keyboard-first because that is the difference between a nav box and an investigative tool:
 * ctrl/cmd-K from anywhere, type a fragment of a step goal, an oscode, a variable name or a
 * warning, arrow to it and press enter. Enter jumps to the thing itself via the model's anchors,
 * so the target is expanded and highlighted rather than merely scrolled past.
 *
 * The empty state lists what is indexed. That is deliberate: a reviewer who does not know the
 * palette also searches configuration variables and findings will only ever use it for phases.
 */

const OPTION_PREFIX = 'pb-search-option'

export const CommandPalette = () => {
  const index = useSearchIndex()
  const jump = useJumpToEntry()

  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const { hits, total } = useMemo(() => searchEntries(index, query), [index, query])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setOpened(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const close = useCallback(() => {
    setOpened(false)
    setQuery('')
    setActive(0)
  }, [])

  const commit = useCallback(
    (position: number) => {
      const hit = hits[position]
      if (hit === undefined) return
      jump(hit.entry)
      close()
    },
    [close, hits, jump]
  )

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(current => (hits.length === 0 ? 0 : Math.min(current + 1, hits.length - 1)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(current => Math.max(current - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(active)
    }
  }

  const composition = SEARCH_KIND_ORDER.filter(kind => index.countsByKind[kind] > 0)
    .map(kind => {
      const value = index.countsByKind[kind]
      const noun = value === 1 ? SEARCH_KIND_LABELS[kind].toLowerCase() : SEARCH_KIND_PLURALS[kind]
      return `${value.toLocaleString()} ${noun}`
    })
    .join(' · ')

  return (
    <>
      <button
        type="button"
        data-pb-print="hide"
        onClick={() => setOpened(true)}
        aria-label="Search this build"
        className="pb-hairline rounded-hair text-ink-muted hover:text-ink bg-surface-1 text-2xs flex min-h-6 items-center gap-1.5 px-1.5"
      >
        <LuSearch size={12} aria-hidden="true" />
        <span>Search</span>
        <kbd className="pb-ident text-ink-faint text-3xs">Ctrl K</kbd>
      </button>

      <Modal
        opened={opened}
        onClose={close}
        title="Jump to anything in this build"
        size="lg"
        padding={0}
        withCloseButton={false}
        transitionProps={{ duration: 0 }}
      >
        <div className="space-y-1.5 p-2">
          <TextInput
            value={query}
            onChange={event => setQuery(event.currentTarget.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Step goal, species oscode, config variable, report or finding"
            aria-label="Search the build report"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="pb-search-results"
            aria-activedescendant={
              hits.length > 0 ? `${OPTION_PREFIX}-${hits[active]?.entry.id ?? ''}` : undefined
            }
            autoComplete="off"
            data-autofocus
            autoFocus
            size="xs"
          />

          <p className="text-ink-faint text-2xs">
            {query.trim() === ''
              ? `Indexed: ${composition}. Arrow keys to move, Enter to jump, Escape to close.`
              : total === 0
                ? 'No match.'
                : `${total.toLocaleString()} ${plural(total, 'match', 'matches')}${
                    total > hits.length ? `, showing the first ${hits.length}` : ''
                  }.`}
          </p>

          {query.trim() !== '' && total === 0 && (
            <EmptyState
              compact
              title="Nothing in this report matches"
              description="The index covers phases, steps, reports, findings, species and configuration variables of this build report only."
            />
          )}

          {hits.length > 0 && (
            <ul
              id="pb-search-results"
              role="listbox"
              aria-label="Search results"
              data-pb-scroll=""
              className="pb-hairline rounded-hair max-h-80 list-none overflow-y-auto p-0"
            >
              {hits.map((hit, position) => (
                <SearchResultRow
                  key={hit.entry.id}
                  entry={hit.entry}
                  active={position === active}
                  optionId={`${OPTION_PREFIX}-${hit.entry.id}`}
                  onSelect={() => commit(position)}
                  onHover={() => setActive(position)}
                />
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  )
}

export default CommandPalette
