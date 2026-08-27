# Task: Pipeline spine, build preamble, frontier vs holes, and the inferred timeline

**Status:** PLANNED
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

- [ ] A compact, dense header above the spine: PANTHER/library version, build status, target
      identifier, report generation time, **freshness state**, source revision, dirty/clean state,
      QfO / reference-proteome identifiers, previous library, and a warning/check summary count.
- [ ] Reads as the header of a scientific build record. Tight rows of label/value with mono
      identifiers — **not** a hero number, **not** a KPI card row.
- [ ] Freshness sits here, next to identity, per the brief. This fixture is **Current**; render that as
      positive evidence rather than a neutral badge.
- [ ] Configuration and provenance are a **preamble concern**, not a peer report tab. Link into the
      detail rather than duplicating it.

### Phase 2: The spine

- [ ] A persistent vertical structure listing the 14 phases in **declared order**, always visible, that
      doubles as the primary navigation. Selecting a phase reveals its detail and its bound reports.
- [ ] Each phase node shows: name, step counter (`10/12`), status, an inferred duration when available,
      and markers for warnings/checks anchored to that phase.
- [ ] **Do not build a top-level nav that mirrors `sections[].id`.** There is no `/mapping`,
      `/node-tracking`, `/library` peer-route model; those are reports bound to phases.
- [ ] Deep-linkable: a phase is addressable via the anchor builders from `01`, so a warning or check
      can link straight to it.

### Phase 3: Frontier vs holes — the core distinction

- [ ] The **frontier** (Library export products, 10/12) is emphasised as current work.
- [ ] A **hole** (Sequence-to-family mapping, 3/5, with phases 3–12 complete) is rendered in a
      _visually distinct_ language — hatched/hollow/otherwise clearly not-the-same-thing — and labelled
      as a hole, not as where the build stopped.
- [ ] **The UI must never imply the build stopped at the earliest incomplete phase.** This is
      acceptance question 1 and the most likely way to get the product wrong.
- [ ] `failed`, `pending`, `hole`, `warning` and `frontier` are distinguished by **label, icon and
      shape**, not by colour/texture/animation alone.
- [ ] A short plain-language summary somewhere prominent: the frontier is X, and there are N holes
      behind it. A reviewer should not have to scan 14 nodes to assemble that sentence.

### Phase 4: Steps and attempt history

- [ ] Step list per phase in **declared order**: goal (mono), status, artifact timestamp, and the
      timing provenance marker (`measured | inferred | unavailable`).
- [ ] Progressive disclosure — 61 steps must not all be open at once.
- [ ] Failed-step support even though the real fixture has none: failed state, attempt-count badge,
      expandable attempt history with per-attempt status, timestamps, job id and a concise failure
      reason or log reference when present. Exercise it with `toFailed()` from `01`.

### Phase 5: Inferred timeline

- [ ] `PhaseTimeline`: phases on a shared wall-clock axis built from **artifact time order**, kept
      separate from the declared order used by the spine.
- [ ] Label spans as inferred artifact activity — `≈ 2.9h elapsed` — with a tooltip explaining the
      value comes from artifact timestamps and is not measured runtime.
- [ ] Never render a negative interval. Treat tightly clustered artifact times as _potentially
      concurrent_, and say so rather than drawing them as a sequence.
- [ ] Phases with no completed steps have no span: render a hairline placeholder, never a zero-width
      bar that reads as instantaneous.
- [ ] Answer: where was activity concentrated, and which phases took the most elapsed time? The
      timeline should also make holes easier to understand than the spine alone does.

### Phase 6: Reports hang from phases

- [ ] Consume the `sectionId → phaseId` registry from `01`. Mapping statistics appear under
      Sequence-to-family mapping; GIGA statistics under Tree building; node forward tracking under Node
      forward tracking; DB load statistics under DB load generation; export warnings under the relevant
      Library export step.
- [ ] **Unattached reports** node at the end of the spine for unmapped and unknown sections — surfaced,
      never hidden.
- [ ] A report may bind to more than one phase where useful; the spine must not assume one-to-one.

### Phase 7: Tests

- [ ] Frontier identification against the real fixture: the frontier is phase 12, **not** phase 2.
- [ ] Hole identification: phase 2 is a hole; asserted by label, not by class name.
- [ ] `toEarly()` moves the frontier and eliminates holes; `toCompleted()` leaves neither;
      `toFailed()` produces a blocked phase distinguishable from a hole.
- [ ] Timeline emits no negative interval on the fixture's 2 out-of-order steps.
- [ ] An unknown section lands under Unattached reports rather than disappearing.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written. Nothing built.
- **Next immediate action:** blocked on `01-report-model` Phases 1–3 and `02-visual-language`
  Phase 3. Start with Phase 1 (preamble) once phase status and freshness are derivable.
- **Recent commands run:** none for this plan.
- **Uncommitted changes:** none.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried                                                                                                                    | Why it failed                                                                                                                                                                                                                                 | Date       |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| An eight-route peer navigation (`/`, `/pipeline`, `/mapping`, `/nodes`, `/comparison`, `/provenance`, `/diagnostics`, `/reports`) | Mirrors `sections[].id`, which v3 explicitly rules out. The pipeline is the spine and reports hang from phases; a peer-route model makes phase-to-report binding invisible and demotes the frontier/holes distinction to one tab among eight. | 2026-08-27 |
| Treating the 3-day gap between the newest artifact and report generation as a "stalled build" warning                             | v3 frames report-after-artifact as _positive_ freshness evidence (`Current`). The gap is the report being fresh, not the build being stalled.                                                                                                 | 2026-08-27 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers

- Depends on `01-report-model` Phases 1–3 (phase status, frontier/holes, timing) and
  `02-visual-language` Phase 3 (`StatusChip`, `Panel`, `Disclosure`).

## Notes

- Reference values for the frontier, holes, timing and out-of-order steps are in
  [`01-report-model` Appendix A.2–A.3](./01-report-model.md#a2-frontier-and-holes).
- The distinction the spine has to carry is not cosmetic. "Where did the build stop" and "what is
  incomplete behind that" are different questions with different answers on this fixture, and
  conflating them is the single most consequential design error available here.

## Lessons Learned

- [Fill during and after the task.]

## Additional Context (Claude)

- Layout question to settle by prototyping, not by argument: a fixed left rail spine versus a vertical
  timeline that scrolls with content. The rail keeps navigation and frontier permanently visible, which
  suits monitoring; the scrolling timeline reads better as a printed record, which suits release
  review. A rail that becomes a full-width timeline in the print stylesheet may serve both — worth
  trying before committing, since `07`'s print story depends on it.
- Phase names in the fixture are long ("Subfamilies, HT & orthologs", "New library HMM generation").
  A collapsed icon-only rail will not work; budget horizontal space for real labels.
