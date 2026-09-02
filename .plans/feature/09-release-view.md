# Task: A release view for a domain reader, alongside the build record

**Status:** ACTIVE
**Issue:** direct user request, 2026-09-02 — a view a biologist can read, still biology-heavy, without
removing the existing record. Supported by
[the brief](../../docs/panther-build-dashboard-prototype-brief-v3.md)'s Visual Direction, which asks
for something "suitable for both developers and biology/domain users".
**Branch:** main (no feature branches yet)

## Goal

A second route that answers _what is in this release and what changed_ for someone who does not run
the pipeline, using the same derived model. "Done" means a domain reader can answer the release-review
questions without encountering a Make goal, an artifact timestamp, a phase index, or the words
_frontier_ and _hole_ — and without being misled by the simplification.

Additive. The build record at `/` is unchanged.

## Context

- **Related files (to create):**
  - `src/features/release/components/ReleaseView.tsx` — the route's root
  - `src/features/release/components/ReleaseIdentity.tsx` — what this release is
  - `src/features/release/components/ReleaseContents.tsx` — genomes / sequences / families / subfamilies
  - `src/features/release/components/ReleaseChanges.tsx` — added, removed, renamed, deltas
  - `src/features/release/components/ReleaseCoverage.tsx` — annotation carry-forward by genome
  - `src/features/release/components/ReleaseReadiness.tsx` — is it finished, is it trustworthy
  - `src/features/release/vocabulary.ts` — **the translation layer** (see Phase 1)
  - `src/app/routes.tsx` — add the route
  - `src/app/layout/TopBar.tsx` — the toggle between the two views
- **Reuses unchanged:** the whole of `src/features/build/model/**`, `SpeciesDetail`, the species
  distribution, `Panel`, `DataTable`, `StatusChip`, the chart chassis.
- **Depends on:** nothing new. This is a presentation layer over `BuildReport`.

## Current State

- What works now: one view, the build record at `/`. It is pipeline-first by design: the spine is the
  navigation, and reports hang from the phase that produced them. Good for whoever babysits the build;
  it opens with `refProteomePANTHERmapping_post_giga` and artifact mtimes.
- What's missing: nothing for a reader who wants the release, not the build. Every number they need
  is already computed and already on screen — buried under the machinery that produced it.

## Steps

### Phase 1: The translation layer

The crux of the whole plan. A friendlier view is worthless if it is also vaguer, and dangerous if it
is quietly less honest.

- [x] `vocabulary.ts` maps the record's terms to domain language, in one place, so no component
      invents its own phrasing:
      | record | release view |
      | --- | --- |
      | build frontier at 10/12 | still being built — 2 of the final packaging steps remain |
      | hole behind the frontier | two validation checks were skipped; the results below were produced without them |
      | assigned sequences | sequences placed in a family |
      | node forward tracking | how much of the previous library's annotation carried forward |
      | reference-proteome input sequences | sequences submitted from the reference proteomes |
      | library sequences | sequences in the finished library |
      | oscode | genome (show the code alongside, not instead) |
      | schema version, config ledger, artifact mtime | omitted entirely |
- [x] **The honesty rules survive translation.** They are not developer detail. A table holding 50 of
      147 rows still says so and still withholds sort and filter; absence still reads as absent
      rather than zero; and a dashboard inference is still marked as one. The renames and the DAPMA
      explanation are both derived, and a domain reader has more need of that label than an
      engineer, not less.
- [x] Never use a term this layer does not define. A translation that leaks `pass1_dedup` has failed.

### Phase 2: Route and toggle

- [x] Route at `/release`, with the build record staying at `/`. Both read the same fixture state, so
      switching views does not lose the selected state.
- [x] A clear two-way toggle in the top bar — _Release_ / _Build record_ — labelled by audience, not
      by feature. It is a lens switch, so it belongs in the chrome rather than in the nav.
- [x] The fixture-state switcher stays visible in both, and the synthetic-state marking with it. A
      domain reader is _more_ likely to mistake a demo state for a measurement.

### Phase 3: What this release is

- [x] PANTHER 20.0, its predecessor, and the reference-proteome release it drew from.
- [x] Whether it is finished, in one sentence of plain language.
- [x] Report generation time, so the reader knows how current the page is. Freshness is worth keeping;
      the _word_ "freshness" is not.

### Phase 4: What is in it

- [x] Genomes, sequences, families, subfamilies — each labelled with its concept, from the metric
      definitions registry, because "sequences" is ambiguous here in exactly the way it is in the
      record. The registry already disambiguates six distinct counts.
- [x] Trees: how many families have one. 15,797 of 15,797 with none empty is a good-news number and
      should read as one.

### Phase 5: What changed from the previous library — the reason this view exists

- [x] Family, subfamily, genome and sequence deltas against PANTHER19.0.
- [x] **Genomes added and removed**, named. This is the change a domain reader will care about most.
- [x] **Renames presented as taxonomy, not as churn.** `USTMA → MYCMD` is _Ustilago maydis_ →
      _Mycosarcoma maydis_ and `CRYNJ → CRYD1` is a _Cryptococcus_ strain redesignation. Both are real
      reclassifications, which is why the counts match exactly. Label them derived, and keep them out
      of the gain/loss rankings so the rankings show biological change.
- [x] `DAPPU → DAPMA` is a genus-level _replacement_, not a rename — 12 % apart. Keep the categories
      separate; conflating them would misreport the release.
- [x] Say plainly that the comparison is assembled from what the report contains and that the
      dedicated previous-library section was not produced, rather than presenting it as complete.

### Phase 6: How well annotation carried forward

- [x] Reuse the species distribution. It is already the right chart for this audience — the outliers
      are named and the dense cluster is visible — and only its labelling needs to change.
- [x] Reuse `SpeciesDetail`. **The DAPMA case is the single best thing in the product for this
      reader:** 0 % looks catastrophic, and the explanation is that it is a new genome with nothing to
      carry forward. Two independent sources agree, and the panel says so.
- [x] Where context does not explain a low value — `FELCA` at 65 % with an established previous
      proteome — say that too. A view that explains everything away is not trustworthy.

### Phase 7: Anything to be aware of

- [ ] The derived checks, in domain language, with the passing ones shown: the exact LEAF/library
      agreement at 1,736,983 and the four-way family agreement at 15,797 are reassurance a reviewer
      can act on.
- [ ] Omit checks that are purely about build mechanics (artifact ordering, log routing). Keep the
      ones with release consequences — the QfO release/path mismatch belongs here, because it says
      which input data the library was actually built from.

### Phase 8: Tests

- [x] No record vocabulary leaks: render `ReleaseView` against every fixture state and assert the page
      text contains no Make goal, no `pass1_*`/`post_giga` stage id, and not the words _frontier_,
      _hole_, _mtime_ or _schema_.
- [x] Truncation is still declared, and sort/filter still withheld.
- [x] Renames appear as renames, the replacement appears as a replacement, and neither appears in the
      gain/loss rankings.
- [x] DAPMA's 0 % is presented as explained.
- [ ] Every fixture state renders with no leaked non-value, as `tests/app/fixtureStates.test.tsx`
      already does for the record — extend it to cover both routes rather than writing a second one.
- [x] The toggle round-trips and preserves the selected fixture state.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Phases 1-6 and most of 8 built. `vocabulary.ts` owns every phrase;
  `/release` routes to `ReleaseView` with a Release / Build record toggle in the chrome; contents,
  changes and carry-forward all render from the same model. `ReleaseChanges` is a lens over
  `buildComparisonView` rather than a second derivation — see Failed Approaches. 728 tests, and a
  13-state leak guard asserting no record vocabulary reaches the page. Verified by driving the
  browser: the toggle round-trips and the selected fixture state survives the switch.
- **Next immediate action:** Phase 7 — the derived checks in domain language, which is the one
  section of the plan not built. The passing checks (LEAF/library agreement at 1,736,983, the
  four-way family agreement at 15,797) are the reassurance a reviewer can act on.
- **Recent commands run:**
  - `npx vitest run tests/features/release` — 21 passed
  - browser checks of the toggle and of fixture-state preservation
- **Uncommitted changes:** none after this commit.
- **Environment state:** `node_modules` installed; no dev server left running.

## Failed Approaches

| What was tried                                                                 | Why it failed                                                                                                                                                                                                                                                                                                                                                                                                        | Date       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Showing `identity.qfoReleaseVersion` as the reference-proteome line            | That is the DECLARED release, and on the captured report it disagrees with the path actually read: the build declares QfO 2026_02 and reads `ref_prot_2026_01`. Showing it told a reader the library was built from proteomes it never saw — the exact "simplification becomes misleading" failure this plan was written to avoid. Now shows `consistency.qfoActiveDataDir` with a chip flagging the declared value. | 2026-09-02 |
| Re-deriving the rankings, rename split and percentages inside `ReleaseChanges` | `buildComparisonView` already computes all of it for the build record. A second derivation would eventually give the two views two different accounts of one release. Rewritten as a lens over it.                                                                                                                                                                                                                   | 2026-09-02 |

## Files Modified

| File                                                  | Action                                              | Status |
| ----------------------------------------------------- | --------------------------------------------------- | ------ |
| `src/features/release/vocabulary.ts`                  | created — the translation layer                     | done   |
| `src/features/release/components/ReleaseView.tsx`     | created                                             | done   |
| `src/features/release/components/ReleaseContents.tsx` | created                                             | done   |
| `src/features/release/components/ReleaseChanges.tsx`  | created — lens over `buildComparisonView`           | done   |
| `src/features/release/components/ReleaseCoverage.tsx` | created — reuses the distribution and species panel | done   |
| `src/features/build/model/anchors.ts`                 | added `RELEASE_ROUTE`                               | done   |
| `src/app/routes.tsx`                                  | routed `/release`                                   | done   |
| `src/app/layout/TopBar.tsx`                           | added the lens toggle                               | done   |
| `tests/features/release/ReleaseView.test.tsx`         | created — 21 tests incl. a 13-state leak guard      | done   |

## Blockers

- None. Nothing here needs a model change.

## Notes

- **This is a lens, not a fork.** If a component needs a number the model does not expose, the answer
  is almost certainly that it exists under a different name — check `01-report-model.md` Appendix A
  before adding anything to the model.
- **The three-column comparison would land best here.** `prev_lib_rebuilt/` separates the effect of
  family surgery from the effect of new data, which is precisely a release-review question. It is
  blocked upstream: `reports/prev_lib_baseline.json` is defined in the pipeline's Makefile but nothing
  depends on it, so no build produces it. See `docs/ui-roadmap.md`.
- **Do not build a third audience.** Two lenses over one model is maintainable; three is a rewrite.

## Lessons Learned

- [Fill during and after the task.]

## Additional Context (Claude)

Open questions worth deciding by building rather than arguing:

- **Does the release view need the pipeline at all?** Probably one sentence of readiness and nothing
  more — but a reader may reasonably ask "is this final?", and the honest answer on the captured
  report is "no, and two validation checks were also skipped". That is a build fact with release
  consequences, so it cannot be dropped entirely, only translated.
- **Which is the default route?** Leaving the record at `/` favours the engineer. If the wider
  audience is domain readers, `/` should probably be the release view and the record should move to
  `/build`. Worth asking before wiring, because it changes every existing deep link — and the
  anchors are load-bearing for the diagnostics.
- **Print matters more for this audience.** A release summary is the thing someone actually wants to
  hand round or attach to release notes, which raises the priority of plan 07's print/export half
  from "deferred" to "probably the next real feature".
