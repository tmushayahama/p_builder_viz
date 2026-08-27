# Task: Mapping progression, previous-library comparison, and truncation honesty

**Status:** PLANNED
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Sequence Mapping and Family Assignment", "Previous Library Comparison", "Truncation Honesty", Suggested Build Order §4–5
**Branch:** main (no feature branches yet)

## Goal

Two report experiences that hang off the spine, plus the honesty rule that governs both:

1. **Mapping progression** — tell the story of how assignment changes through the build, visually,
   before offering a table.
2. **Previous-library comparison** — a unified release-review view assembled from whatever sources the
   report actually contains, answering "what materially changed, and which changes deserve
   investigation?"
3. **Truncation honesty** — the UI never behaves as though a truncated table is complete.

## Context

- **Related files (to create):**
  - `src/features/mapping/components/MappingProgression.tsx` — the stage/mechanism visual
  - `src/features/mapping/components/StageAnnotations.tsx`
  - `src/features/mapping/components/MappingStageTable.tsx` — raw data behind a detail view
  - `src/features/mapping/components/MappingReport.tsx` — bound to Sequence-to-family mapping
  - `src/features/comparison/components/ComparisonOverview.tsx`
  - `src/features/comparison/components/SpeciesChanges.tsx`
  - `src/features/comparison/components/IdentifierAgreement.tsx`
  - `src/@panther.core/components/TruncationNotice.tsx`
- **Depends on:** `01-report-model` (stages, mechanisms, normalized deltas, definitions registry),
  `02-visual-language` (chart chassis, `DataTable` completeness), `05-species-cross-section` (rename
  inference, species detail entry point).
- **Depended on by:** `07` exports these views.

## Current State

- What works now: nothing.
- What's broken/missing: everything in this plan.

## Steps

### Phase 1: Truncation honesty (do this first — it constrains both views)

- [ ] `TruncationNotice`: renders `50 of 147 rows included in report` wherever a table is partial.
- [ ] **Do not offer client-side sorting or filtering that implies operation over the complete
      dataset** unless the complete dataset is present. `DataTable` takes a `completeness` prop and
      disables those affordances when the data is truncated.
- [ ] Every table in `other_reports` is truncated on this fixture — 50/147, 20/132 and 20/813 — so this
      is the normal case here, not an edge case.
- [ ] Any derived statement computed over a truncated table must be scoped in its wording ("among the
      50 rows included"), including the rename inference from `05`.
- [ ] `ragged_rows` is a **count, not a boolean**. Handle a ragged table by showing which columns are
      missing per row rather than rendering blanks that read as zeros.

### Phase 2: Mapping progression

- [ ] **Prefer a visual progression across the 14 stages over a raw table.** A stepped stacked-area (or
      similarly compact progression) is the leading candidate.
- [ ] Communicate at each stage: total sequences, assigned, unassigned, family count, and contribution
      by mechanism.
- [ ] Use the **total sequence count as an envelope** so trimming/deduplication losses stay visible
      rather than being hidden inside a normalised stack.
- [ ] Mechanisms are the **four** the data contains: `ID`, `BLAST`, `HMM_scoring`, `RECLUSTER_NEW`.
      Fixed slot order so a segment never changes colour between stages. Note in the UI that the
      extension stage's gain is booked to `HMM_scoring` — the brief lists "extension" as a mechanism,
      but the data does not have one.
- [ ] `by_mechanism` values are **cumulative totals at that stage**, not increments. Per-stage deltas
      must be computed; plotting the raw values as increments would be wrong.
- [ ] **Annotate the meaningful changes** rather than making users compute them: the `hmm` stage's
      +182,097 (largest gain), `blast` +84,440, `exten` +9,887, and the trimming losses at
      `pass1_trim` (−4,030) and `post_giga`. Assignment goes 66.9 % → 79.0 %, +12.1 pp overall.
- [ ] Exact tabular data remains available behind a detail / raw-data view, including each stage's
      `mapping_file` and the pipeline step that produced it.

### Phase 3: Previous-library comparison — assembled, not section-bound

- [ ] **Do not tie the view to the `prev_lib` section.** On this fixture `prev_lib` is **absent**
      (`inputs not present yet`), yet `other_reports` carries previous-vs-new sequence counts, the
      species table and the previous-UniProt agreement figures. Assemble from every available source and
      record which ones contributed.
- [ ] Availability is therefore `partial` here, not `absent`. Say what is missing and why, using the
      generator's own message, and still show what _is_ known. This is the strongest available
      demonstration that the JSON-report architecture degrades usefully.
- [ ] **Normalize inconsistent representations before presentation.** The species table stores counts as
      **strings** and `pct_change` as a **fraction** (`-1.0` for a complete removal). Recompute change
      from the counts; formatting the raw field yields −1 % where −100 % belongs.
- [ ] Comparisons to present: sequence counts, family counts, subfamily counts, genome/species counts,
      largest increases, largest decreases, percent changes, likely renames, newly added species,
      removed species.
- [ ] **Renames must not dominate largest-increase/decrease.** `USTMA`/`MYCMD` and `CRYNJ`/`CRYD1` are
      exact-count pairs from `05`; present them as renames and exclude them from gain/loss rankings (or
      mark them inline), so the rankings show real biological change.
- [ ] Use the metric definitions registry for every count. `prev_lib_sequences` (2,692,827) and
      `library.sequences` (1,736,983) are different concepts and must never both read "Sequences".

### Phase 4: Binding to the spine

- [ ] The mapping report binds to **Sequence-to-family mapping**; note that the same phase is a
      **hole** on this fixture (two pending validation steps) so the report and the hole appear
      together — a reader should see that the mapping numbers exist but were not validated.
- [ ] The comparison is a release-review concern spanning phases. Bind it where the registry in `01`
      says, and if that is nowhere specific, let it surface under **Unattached reports** rather than
      inventing a peer tab.

### Phase 5: Tests

- [ ] Stage deltas match the per-stage figures in `01` Appendix A.5.
- [ ] `pct_change` is recomputed, not echoed: a removed species renders −100 %, not −1 %.
- [ ] String count columns are parsed to numbers before arithmetic.
- [ ] The comparison view reports `partial` availability on the real fixture and names `prev_lib` as
      the missing source.
- [ ] `DataTable` sort/filter is disabled and the truncation notice is shown for all three
      `other_reports` tables.
- [ ] Rename pairs are excluded from (or marked within) the largest-decrease and largest-increase
      rankings.
- [ ] The mapping progression renders on `toEarly()`, where the mapping section is present but the
      build has barely started, and on `stripSection('mapping')`.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written. Stage deltas, truncation counts and the `pct_change`
  representation verified against the fixture.
- **Next immediate action:** blocked on `01-report-model` and `05-species-cross-section` Phase 4.
  Start with Phase 1 (truncation honesty) since it changes `DataTable`'s contract.
- **Recent commands run:**
  - `python` ad-hoc per-stage mechanism delta analysis over `docs/build_state.json`
- **Uncommitted changes:** none.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried                                                              | Why it failed                                                                                                                                                                                                                                                    | Date       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Formatting the species table's `pct_change` column directly as a percentage | It is a fraction, not a percentage — `-1.0` means a 100 % removal. Rendering it produced a −1 % bar for a species that vanished entirely. Recompute from `prev_count` / `new_count`.                                                                             | 2026-08-27 |
| Treating the comparison as unavailable because `prev_lib` is absent         | `other_reports` carries previous-vs-new sequence counts, the 50-row species table and previous-UniProt agreement. Reporting "unavailable" throws away most of the release-review value and misses the point that comparison data is not confined to one section. | 2026-08-27 |
| Plotting `by_mechanism` counts as per-stage contributions                   | They are cumulative totals at each stage. Plotted as increments, the `hmm` stage appears to contribute 1.8 M sequences instead of 182,097.                                                                                                                       | 2026-08-27 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers

- Depends on `01-report-model` Phases 1 and 7, and `05-species-cross-section` Phase 4 (renames).

## Notes

- Stage/mechanism figures, the six sequence counts, and the truncation table are in
  [`01-report-model` Appendix A.4–A.5 and A.10](./01-report-model.md#a4-the-six-sequence-counts--the-terminology-problem).
- The truncation rule has teeth: it removes a feature (sorting a 50-row species table) that would
  otherwise feel like an obvious win. That is intentional — a sortable partial table invites a reviewer
  to conclude "the largest decrease in the release is BRANA", which the data does not support.

## Lessons Learned

- [Fill during and after the task.]

## Additional Context (Claude)

- The stepped stacked-area is a good default but has a real difficulty here: three of the four
  mechanisms barely move after their introducing stage (`ID` is flat at ~1.536 M for all 14 stages,
  `BLAST` flat at ~84 K after stage 3, `RECLUSTER_NEW` ~2.5 K throughout), so the stack is dominated
  by one near-constant band. A small-multiples strip per mechanism, or a chart of per-stage _deltas_
  with the cumulative total as a line, may tell the story better. Prototype against the real numbers
  before committing to the stacked area.
- Subfamily counts appear in `library` but there is no previous-library subfamily figure in this
  fixture, so that comparison row will be unavailable. Make sure the layout does not look broken when
  one row of a comparison set is missing — this is exactly the graceful-degradation case, and it occurs
  on the primary fixture rather than only in a transform.
