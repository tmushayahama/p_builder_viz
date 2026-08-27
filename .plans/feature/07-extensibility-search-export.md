# Task: Generic renderer, global search, and the permanent-record export story

**Status:** PLANNED
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Extensibility", "Search and Navigation", "Print, Export, and Deep Linking", "Permanent Build Record", Suggested Build Order §6–7
**Branch:** main (no feature branches yet)

## Goal

Close the prototype's argument on three fronts:

1. **Extensibility** — _demonstrate_, not claim, that an unfamiliar report renders usefully before any
   specialised code exists for it.
2. **Search** — make the dashboard feel like an investigative tool rather than a static report.
3. **Permanent record** — make the build report useful outside the application, with provenance intact.

## Context

- **Related files (to create):**
  - `src/features/reports/components/GenericReport.tsx` — the fallback renderer
  - `src/features/reports/components/GenericTable.tsx` / `HeadlineRows.tsx`
  - `src/features/build/fixtures/futureReports.ts` — the fake future report
  - `src/features/search/components/CommandPalette.tsx`
  - `src/features/search/model/searchIndex.ts`
  - `src/features/export/model/toMarkdown.ts`
  - `src/features/export/components/ExportMenu.tsx`
  - `src/styles/print.css` — extend the foundation from `02`
- **Depends on:** everything. This plan is last.

## Current State

- What works now: nothing.
- What's broken/missing: everything in this plan.

## Steps

### Phase 1: Generic fallback renderer

- [ ] Render an unknown section from its **common structural elements** alone: headline/summary values,
      rows, tables, text, warnings, status. No knowledge of the section's meaning.
- [ ] Tolerate a `data` that is null, an array, a scalar, or an object with unexpected keys. Preserve
      unknown fields rather than dropping them.
- [ ] Honour the same rules as bespoke views: metric definitions where a label is recognised,
      truncation notices, unknown-status honesty, and the generator-vs-derived provenance marking.
- [ ] Unknown sections reach the UI through **Unattached reports** on the spine (`03`) when they have
      no phase binding. A specialised renderer can later override the generic one for the same section
      id without touching the core.

### Phase 2: Prove it with a future report

- [ ] Add at least one fake future report fixture — Pfam coverage, tree quality, or a GO annotation
      summary — via `withUnknownSection()` from `01`.
- [ ] Give two of them **deliberately different internal shapes** (one metrics + table, one prose +
      headline only), because the brief warns that future reports will not share one shape.
- [ ] Also exercise `withUnknownStatus()` and `withFutureSchema()` here: an unrecognised status renders
      as `Unknown status: <value>`, and a newer `schema_version` degrades visibly while still rendering
      what it can.

### Phase 3: Global search / jump

- [ ] One palette that finds pipeline steps, species, config variables, reports, and warnings/checks.
- [ ] Results navigate via the anchor builders from `01`, so a hit lands on the thing itself, expanded
      and highlighted.
- [ ] The index is built from the derived model — 61 steps, 131 species, ~60 config variables, 8+
      reports, and the check list. Small enough to build eagerly and match on substrings; no
      dependency needed.
- [ ] Keyboard-first: an open shortcut, arrow navigation, enter to jump.

### Phase 4: Deep linking and stable anchors

- [ ] Stable anchors within a build report for a phase, a step, a report, a check/warning, a species,
      and a config value. These are already centralised in `01`'s anchor module — this phase makes them
      addressable in the URL and restores state on load (expand the phase, open the species, scroll to
      and highlight the target).
- [ ] Anchors must remain stable across sessions so a link in a review comment still works.

### Phase 5: Print and PDF

- [ ] Print-friendly layout: light palette forced, navigation and chrome suppressed, disclosures
      expanded so nothing is hidden in a printed record, sensible page breaks around phases and
      reports, and anchors/URLs made visible.
- [ ] PDF export via the browser's print path rather than a PDF library — the record must be
      reproducible without a dependency, and the print stylesheet is the single source of truth.
- [ ] Verify the printed output actually contains the frontier, the holes, the checks and the
      provenance markers. A print stylesheet that silently drops the checks fails the plan's purpose.

### Phase 6: Copy / share as Markdown

- [ ] `toMarkdown()` over the derived model: preamble, frontier and holes, phase table with timing and
      timing provenance, checks with **generator-vs-derived attribution preserved**, key results,
      comparison highlights, and the truncation notices.
- [ ] Pasteable into a review ticket or a lab notebook and readable as plain text.

### Phase 7: Export provenance and versioning

- [ ] Every exported or printed check retains whether it was **emitted by the report generator** or
      **derived by the dashboard**. This is the plan's hardest requirement and the reason the
      `Provenance` primitive exists.
- [ ] Exports also carry: dashboard/application version, build report `schema_version`, report
      generation time, and export generation time.
- [ ] **A permanent record must not make a dashboard inference indistinguishable from a
      generator-authored warning.** Treat this as a correctness property with a test, not a caption.

### Phase 8: Historical-record review

- [ ] Walk the completed state (`toCompleted()`) as a returning reader and confirm all eight questions
      from the brief's Permanent Build Record section are answerable: what ran, approximate timing, what
      inputs/configuration, major output statistics, what changed from the previous library, what was
      verified, what warnings were present, and which conclusions came from the generator versus the
      dashboard.
- [ ] An in-progress build and a completed build should differ by **emphasis, not layout**, so a
      completed report reads as a permanent record rather than a monitoring screen with nothing moving.

### Phase 9: Tests

- [ ] The generic renderer handles: null data, array data, scalar data, unknown keys, a table with
      `ragged_rows`, and a section with only `text`.
- [ ] A future report added via `withUnknownSection()` renders without any code referencing its id.
- [ ] `withUnknownStatus()` renders the literal value; `withFutureSchema()` shows the degradation
      notice and still renders the sections it understands.
- [ ] Search finds a known step goal, an oscode, a config key and a check, and each result navigates to
      a live anchor.
- [ ] `toMarkdown()` output contains the frontier, the hole, and at least one generator-sourced and one
      derived check with distinguishable attribution.
- [ ] A Playwright print-media assertion that navigation is hidden and disclosures are expanded.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written. Nothing built.
- **Next immediate action:** blocked on `01`–`06`. Phase 1 (generic renderer) can start as soon as
  `01`'s report registry exists, and is worth doing early since it is cheap and de-risks the
  extensibility claim.
- **Recent commands run:** none for this plan.
- **Uncommitted changes:** none.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers

- Depends on all of `01`–`06`. Phase 1 can begin after `01`'s report registry.

## Notes

- Extensibility is graded on demonstration. A registry that _could_ render an unknown section is worth
  much less than a fixture that visibly does — which is why the fake future report is part of this plan
  rather than a nice-to-have.
- The brief lists print/export under "explore support for", so this plan may legitimately land partial.
  If it does, prioritise in this order: (1) export provenance, because it is a correctness property;
  (2) deep-link anchors, because reviews depend on them; (3) Markdown copy; (4) print/PDF polish.

## Lessons Learned

- [Fill during and after the task.]

## Additional Context (Claude)

- Search scope is worth a decision rather than a default: indexing 131 species and 61 steps is trivial,
  but indexing the ~60 config variables and every check makes the palette the fastest route to almost
  anything in the build — which is closer to the "investigative tool" framing than a nav-only jump box.
  Lean inclusive.
- The Markdown export and the print stylesheet are two renderings of the same record. It may be worth
  building `toMarkdown()` first and treating the print layout as its visual counterpart, since the
  Markdown forces a decision about what belongs in the permanent record without any layout to hide
  behind.
- One thing the brief does not ask for but this data invites: a diff between two build reports. Out of
  scope here (there is only one report), but the anchor and definitions registries should not make it
  harder later.
