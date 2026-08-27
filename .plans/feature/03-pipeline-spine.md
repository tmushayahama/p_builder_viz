# Task: Pipeline spine, build preamble, frontier vs holes, and the inferred timeline

**Status:** COMPLETE
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Primary Information Architecture", "Build Frontier vs Holes", "Phase Timeline and Timing Model", "Build Preamble", "Failed Steps and Attempt History", Suggested Build Order §1
**Branch:** main (no feature branches yet)

## Goal

Make the pipeline the spine of the application: one persistent structure that is simultaneously
navigation, progress, frontier, holes, warnings, phase duration, and the access path to every report.
"Done" means a reviewer can answer acceptance questions 1 and 2 from the spine alone, without opening
a report and without reading the raw JSON.

This is the plan that establishes the product model. Build it first among the view plans.

## Context

- **Related files (to create):**
  - `src/features/pipeline/components/PipelineSpine.tsx` — the persistent spine
  - `src/features/pipeline/components/PhaseNode.tsx` — one phase in the spine
  - `src/features/pipeline/components/PhaseDetail.tsx` — the phase panel with its bound reports
  - `src/features/pipeline/components/StepList.tsx` / `StepRow.tsx` / `AttemptHistory.tsx`
  - `src/features/pipeline/components/PhaseTimeline.tsx` — inferred artifact-activity timeline
  - `src/features/pipeline/components/UnattachedReports.tsx`
  - `src/features/preamble/components/BuildPreamble.tsx` — identity + freshness header
  - `src/app/layout/**` — replace the template's `AppLayout` with the spine-based shell
  - `src/app/routes.tsx` — phase-addressed routing
- **Depends on:** `01-report-model` (phase status, frontier/holes, timing model, binding registry,
  anchors), `02-visual-language` (`StatusChip`, `Panel`, `Disclosure`, `ChartFrame`).
- **Depended on by:** every report view hangs off this.

## Current State

- What works now: the template's `AppLayout` renders a header strip and an `<Outlet/>` with one
  placeholder route. It is a throwaway.
- What's broken/missing: everything in this plan.

## Steps

### Phase 1: Build preamble

- [x] A compact, dense header above the spine: PANTHER/library version, build status, target
      identifier, report generation time, **freshness state**, source revision, dirty/clean state,
      QfO / reference-proteome identifiers, previous library, and a warning/check summary count.
- [x] Reads as the header of a scientific build record. Tight rows of label/value with mono
      identifiers — **not** a hero number, **not** a KPI card row.
- [x] Freshness sits here, next to identity, per the brief. This fixture is **Current**; render that as
      positive evidence rather than a neutral badge.
- [x] Configuration and provenance are a **preamble concern**, not a peer report tab. Link into the
      detail rather than duplicating it.

### Phase 2: The spine

- [x] A persistent vertical structure listing the 14 phases in **declared order**, always visible, that
      doubles as the primary navigation. Selecting a phase reveals its detail and its bound reports.
- [x] Each phase node shows: name, step counter (`10/12`), status, an inferred duration when available,
      and markers for warnings/checks anchored to that phase.
- [x] **Do not build a top-level nav that mirrors `sections[].id`.** There is no `/mapping`,
      `/node-tracking`, `/library` peer-route model; those are reports bound to phases.
- [x] Deep-linkable: a phase is addressable via the anchor builders from `01`, so a warning or check
      can link straight to it.

### Phase 3: Frontier vs holes — the core distinction

- [x] The **frontier** (Library export products, 10/12) is emphasised as current work.
- [x] A **hole** (Sequence-to-family mapping, 3/5, with phases 3–12 complete) is rendered in a
      _visually distinct_ language — hatched/hollow/otherwise clearly not-the-same-thing — and labelled
      as a hole, not as where the build stopped.
- [x] **The UI must never imply the build stopped at the earliest incomplete phase.** This is
      acceptance question 1 and the most likely way to get the product wrong.
- [x] `failed`, `pending`, `hole`, `warning` and `frontier` are distinguished by **label, icon and
      shape**, not by colour/texture/animation alone.
- [x] A short plain-language summary somewhere prominent: the frontier is X, and there are N holes
      behind it. A reviewer should not have to scan 14 nodes to assemble that sentence.

### Phase 4: Steps and attempt history

- [x] Step list per phase in **declared order**: goal (mono), status, artifact timestamp, and the
      timing provenance marker (`measured | inferred | unavailable`).
- [x] Progressive disclosure — 61 steps must not all be open at once.
- [x] Failed-step support even though the real fixture has none: failed state, attempt-count badge,
      expandable attempt history with per-attempt status, timestamps, job id and a concise failure
      reason or log reference when present. Exercise it with `toFailed()` from `01`.

### Phase 5: Inferred timeline

- [x] `PhaseTimeline`: phases on a shared wall-clock axis built from **artifact time order**, kept
      separate from the declared order used by the spine.
- [x] Label spans as inferred artifact activity — `≈ 2.9h elapsed` — with a tooltip explaining the
      value comes from artifact timestamps and is not measured runtime.
- [x] Never render a negative interval. Treat tightly clustered artifact times as _potentially
      concurrent_, and say so rather than drawing them as a sequence.
- [x] Phases with no completed steps have no span: render a hairline placeholder, never a zero-width
      bar that reads as instantaneous.
- [x] Answer: where was activity concentrated, and which phases took the most elapsed time? The
      timeline should also make holes easier to understand than the spine alone does.

### Phase 6: Reports hang from phases

- [x] Consume the `sectionId → phaseId` registry from `01`. Mapping statistics appear under
      Sequence-to-family mapping; GIGA statistics under Tree building; node forward tracking under Node
      forward tracking; DB load statistics under DB load generation; export warnings under the relevant
      Library export step.
- [x] **Unattached reports** node at the end of the spine for unmapped and unknown sections — surfaced,
      never hidden.
- [x] A report may bind to more than one phase where useful; the spine must not assume one-to-one.

### Phase 7: Tests

- [x] Frontier identification against the real fixture: the frontier is phase 12, **not** phase 2.
- [x] Hole identification: phase 2 is a hole; asserted by label, not by class name.
- [x] `toEarly()` moves the frontier and eliminates holes; `toCompleted()` leaves neither;
      `toFailed()` produces a blocked phase distinguishable from a hole.
- [x] Timeline emits no negative interval on the fixture's 2 out-of-order steps.
- [x] An unknown section lands under Unattached reports rather than disappearing.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** all seven phases built and verified. Shell, store, hooks contract,
  preamble, spine, frontier/holes, steps + attempts, inferred timeline, phase-to-report binding and
  deep links are in place; the template `AppLayout` and `HomePage` are deleted.
- **Next immediate action:** nothing in this plan. The four report views (`04`-`06`) replace the six
  contract stubs listed under Files Modified. `07` owns print/export, which will need the spine to
  render every phase on paper rather than only the selected one.
- **Recent commands run:**
  - `npx tsc --noEmit -p tsconfig.app.json` - clean
  - `npx eslint src tests e2e --ext .ts,.tsx` - clean
  - `npx vitest run` - 26 files, 432 tests passing
  - `npx vite build --mode production` - succeeds, one lazy chunk per report view
  - colour-literal grep over `src` - empty
- **Uncommitted changes:** everything in Files Modified.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried                                                                                                                    | Why it failed                                                                                                                                                                                                                                 | Date       |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| An eight-route peer navigation (`/`, `/pipeline`, `/mapping`, `/nodes`, `/comparison`, `/provenance`, `/diagnostics`, `/reports`) | Mirrors `sections[].id`, which v3 explicitly rules out. The pipeline is the spine and reports hang from phases; a peer-route model makes phase-to-report binding invisible and demotes the frontier/holes distinction to one tab among eight. | 2026-08-27 |
| Treating the 3-day gap between the newest artifact and report generation as a "stalled build" warning                             | v3 frames report-after-artifact as _positive_ freshness evidence (`Current`). The gap is the report being fresh, not the build being stalled.                                                                                                 | 2026-08-27 |

## Files Modified

| File                                                      | Action  | Status |
| --------------------------------------------------------- | ------- | ------ |
| `src/App.tsx`                                             | edited  | done   |
| `src/app/routes.tsx`                                      | rewrote | done   |
| `src/app/store/store.ts`                                  | edited  | done   |
| `src/app/format.ts`                                       | added   | done   |
| `src/app/metricRegistry.ts`                               | added   | done   |
| `src/app/layout/AppLayout.tsx`                            | rewrote | done   |
| `src/app/layout/TopBar.tsx`                               | added   | done   |
| `src/app/layout/BuildShell.tsx`                           | added   | done   |
| `src/features/build/hooks.ts`                             | added   | done   |
| `src/features/build/slices/buildSlice.ts`                 | added   | done   |
| `src/features/preamble/components/BuildPreamble.tsx`      | added   | done   |
| `src/features/preamble/components/FixtureSwitcher.tsx`    | added   | done   |
| `src/features/preamble/components/FixtureStateNotice.tsx` | added   | done   |
| `src/features/preamble/components/SchemaNotice.tsx`       | added   | done   |
| `src/features/pipeline/model.ts`                          | added   | done   |
| `src/features/pipeline/summary.ts`                        | added   | done   |
| `src/features/pipeline/timeline.ts`                       | added   | done   |
| `src/features/pipeline/hooks.ts`                          | added   | done   |
| `src/features/pipeline/components/PipelineSpine.tsx`      | added   | done   |
| `src/features/pipeline/components/PhaseNode.tsx`          | added   | done   |
| `src/features/pipeline/components/PhaseMarker.tsx`        | added   | done   |
| `src/features/pipeline/components/FrontierSummary.tsx`    | added   | done   |
| `src/features/pipeline/components/PhaseDetail.tsx`        | added   | done   |
| `src/features/pipeline/components/StepList.tsx`           | added   | done   |
| `src/features/pipeline/components/StepRow.tsx`            | added   | done   |
| `src/features/pipeline/components/AttemptHistory.tsx`     | added   | done   |
| `src/features/pipeline/components/PhaseTimeline.tsx`      | added   | done   |
| `src/features/pipeline/components/BoundReports.tsx`       | added   | done   |
| `src/features/pipeline/components/UnattachedReports.tsx`  | added   | done   |
| `src/features/reports/registry.tsx`                       | added   | done   |
| `src/features/home/**`                                    | deleted | done   |
| `e2e/smoke.spec.ts`                                       | rewrote | done   |
| `tests/app/buildStore.test.tsx`                           | added   | done   |
| `tests/app/BuildShell.test.tsx`                           | added   | done   |
| `tests/features/pipeline/frontier.test.tsx`               | added   | done   |
| `tests/features/pipeline/spine.test.tsx`                  | added   | done   |
| `tests/features/pipeline/steps.test.tsx`                  | added   | done   |
| `tests/features/pipeline/timeline.test.tsx`               | added   | done   |
| `tests/features/preamble/BuildPreamble.test.tsx`          | added   | done   |
| `tests/features/home/HomePage.test.tsx`                   | deleted | done   |

One-line stubs created for the other plans' contract paths, each to be replaced wholesale:

| File                                                      | Owner plan                       |
| --------------------------------------------------------- | -------------------------------- |
| `src/features/checks/components/ChecksPanel.tsx`          | `04-derived-checks`              |
| `src/features/mapping/components/MappingReport.tsx`       | `04`/`06` mapping progression    |
| `src/features/nodes/components/NodeTrackingReport.tsx`    | `05-species-cross-section`       |
| `src/features/species/components/SpeciesDetail.tsx`       | `05-species-cross-section`       |
| `src/features/comparison/components/ComparisonReport.tsx` | `06-results-and-comparison`      |
| `src/features/reports/components/GenericReport.tsx`       | `07-extensibility-search-export` |

## Blockers

- None. The `01` and `02` dependencies landed and this plan is built on them.

## Notes

- Reference values for the frontier, holes, timing and out-of-order steps are in
  [`01-report-model` Appendix A.2–A.3](./01-report-model.md#a2-frontier-and-holes).
- The distinction the spine has to carry is not cosmetic. "Where did the build stop" and "what is
  incomplete behind that" are different questions with different answers on this fixture, and
  conflating them is the single most consequential design error available here.

## Lessons Learned

- **The rail-versus-timeline question resolved as "both, in different roles."** The rail is a sticky
  left column carrying DECLARED order; the timeline is a full-width chart in the content column
  carrying ARTIFACT order. Making one structure serve both orderings is exactly what would turn
  artifact mtimes into a fabricated execution log.
- **A deep link has to move the selection, not only scroll.** A step, a report and a config value are
  only in the DOM while their owning spine node is selected, so `useHashTarget` alone lands on
  nothing. `resolveSelectionForAnchor` plus a second scroll pass one render later is the fix - see
  `features/pipeline/hooks.ts`.
- **One report can legitimately bind to five phases, so the spine needs two relationships.** Mounting
  a contributing report on every phase it touches makes the binding meaningless; a full mount for
  the primary phase plus a cross-reference for contributors keeps it readable. De-duplication has to
  be by RENDERER, not by section id: `prev_lib` and `other_reports` resolve to one view and would
  otherwise mount it twice on the same phase.
- **`config_ledger.record_count` is 1, not 11.** It counts config snapshots; the ledger rows are
  `rows[]`. Appendix A.1's "11 ledger rows" means the latter.
- **The generator's stale-artifact warning can be attributed to a phase from its own text.** It names
  two step goals, both in Library export products, which is the phase a reviewer would look for it
  on. Matching longest-goal-first stops a short goal claiming a warning about a longer one.
- **jsdom measures every element at zero width, so a chart draws nothing there.** `ChartFrame`'s
  `minWidth` is the seam: giving `PhaseTimeline` a real floor means its geometry is exercised in
  tests, which is the only way a negative or `NaN` coordinate is caught - neither throws.

## Additional Context (Claude)

- Layout question to settle by prototyping, not by argument: a fixed left rail spine versus a vertical
  timeline that scrolls with content. The rail keeps navigation and frontier permanently visible, which
  suits monitoring; the scrolling timeline reads better as a printed record, which suits release
  review. A rail that becomes a full-width timeline in the print stylesheet may serve both — worth
  trying before committing, since `07`'s print story depends on it.
- Phase names in the fixture are long ("Subfamilies, HT & orthologs", "New library HMM generation").
  A collapsed icon-only rail will not work; budget horizontal space for real labels.
