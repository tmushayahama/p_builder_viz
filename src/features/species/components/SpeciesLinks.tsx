import { EmptyState, Provenance, StatusChip, TruncationNotice } from '@/@panther.core/components'
import { formatCount, plural } from '@/app/format'
import type { SpeciesLinkModel, SpeciesLinkRow } from '@/features/species/model/links'
import { SpeciesButton } from '@/features/species/components/SpeciesButton'

/**
 * Renames and candidate replacements, kept in two separate categories.
 *
 * This is acceptance question 4. A species dropping 6,788 sequences to zero looks like a
 * biological loss until the same 6,788 appear under another oscode - `USTMA` to `MYCMD` is
 * _Ustilago maydis_ becoming _Mycosarcoma maydis_, and the counts match exactly because nothing
 * about the organism changed.
 *
 * `DAPPU` to `DAPMA` is NOT that. 30,118 against 26,600 is 12 % apart; the shared genus prefix
 * makes it worth showing, and the mismatch makes it a guess. Presenting it beside the renames as
 * though it were one would be the whole point of the feature thrown away, so it gets its own
 * heading, its own word and its own confidence label.
 *
 * The scope wording is load-bearing too: the pairing searched 50 of 147 rows, so "2 renames" is a
 * statement about the rows the report includes and not about the release.
 */
export interface SpeciesLinksProps {
  model: SpeciesLinkModel
  selectedOscode?: string | null
  onSelect: (oscode: string) => void
  /** Restricts the lists to pairs touching this species. */
  focusOscode?: string | null
}

const LinkRow = ({
  row,
  selectedOscode,
  onSelect,
}: {
  row: SpeciesLinkRow
  selectedOscode: string | null
  onSelect: (oscode: string) => void
}) => (
  <li className="space-y-1 py-1.5">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <StatusChip
        status="changed"
        label={row.kind === 'rename' ? 'Rename' : 'Candidate replacement'}
        hint={
          row.kind === 'rename'
            ? 'The removed and added counts are identical, which is what makes this a rename rather than a coincidence.'
            : 'The counts are close but not equal. A weaker reading than a rename, kept separate on purpose.'
        }
      />
      <span className="flex items-baseline gap-1">
        <SpeciesButton
          oscode={row.removed}
          onSelect={onSelect}
          selected={row.removed === selectedOscode}
        />
        <span className="text-ink-faint text-2xs" aria-hidden="true">
          →
        </span>
        <SpeciesButton
          oscode={row.added}
          onSelect={onSelect}
          selected={row.added === selectedOscode}
        />
      </span>
      <span className="pb-figures text-ink text-2xs">
        {`${formatCount(row.removedCount)} → ${formatCount(row.addedCount)}`}
      </span>
      <Provenance source="derived" variant="marker" />
    </div>

    <p className="text-ink max-w-prose text-xs">{row.headline}</p>

    <ul className="text-ink-muted text-2xs list-none space-y-0.5 p-0">
      {row.evidence.map(line => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  </li>
)

export const SpeciesLinks = ({
  model,
  selectedOscode = null,
  onSelect,
  focusOscode = null,
}: SpeciesLinksProps) => {
  const touches = (row: SpeciesLinkRow) =>
    focusOscode === null || row.removed === focusOscode || row.added === focusOscode
  const renames = model.renames.filter(touches)
  const replacements = model.replacements.filter(touches)

  if (renames.length === 0 && replacements.length === 0) {
    return (
      <EmptyState
        compact
        title={
          focusOscode === null
            ? 'No rename or replacement pairs'
            : `No identity change found for ${focusOscode}`
        }
        description={model.scopeNote}
      />
    )
  }

  return (
    <div className="space-y-2">
      {focusOscode === null && (
        <p className="text-ink max-w-prose text-xs">
          {`${formatCount(model.removedOscodes.length)} ${plural(
            model.removedOscodes.length,
            'removal'
          )} and ${formatCount(model.addedOscodes.length)} ${plural(
            model.addedOscodes.length,
            'addition'
          )} among the rows this report includes. Exact-count pairing finds ${formatCount(
            model.renames.length
          )} ${plural(model.renames.length, 'rename')} and ${formatCount(
            model.replacements.length
          )} candidate ${plural(model.replacements.length, 'replacement')}.`}
        </p>
      )}

      {renames.length > 0 && (
        <section className="space-y-1">
          <h4 className="text-ink text-2xs font-semibold tracking-wide uppercase">
            Renames — exact count match
          </h4>
          <ul className="[&>li+li]:pb-hairline-t list-none p-0">
            {renames.map(row => (
              <LinkRow
                key={row.key}
                row={row}
                selectedOscode={selectedOscode}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      )}

      {replacements.length > 0 && (
        <section className="space-y-1">
          <h4 className="text-ink text-2xs font-semibold tracking-wide uppercase">
            Candidate replacements — counts do not match
          </h4>
          <ul className="[&>li+li]:pb-hairline-t list-none p-0">
            {replacements.map(row => (
              <LinkRow
                key={row.key}
                row={row}
                selectedOscode={selectedOscode}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      )}

      {focusOscode === null && model.genuinelyNewOscodes.length > 0 && (
        <p className="text-ink-muted text-2xs max-w-prose">
          {`Additions with positive evidence of being new rather than renamed: ` +
            `${model.genuinelyNewOscodes.join(', ')}. The other additions are the receiving side ` +
            'of a rename, so counting them as new species would double-count the same organisms.'}
        </p>
      )}

      {model.scope.truncated && (
        <TruncationNotice
          completeness={{
            included: model.scope.includedRows,
            total: model.scope.totalRows,
            noun: 'rows',
          }}
          detail={model.scopeNote}
        />
      )}
    </div>
  )
}
