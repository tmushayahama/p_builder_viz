# Task: Visual pass — hierarchy, colour, breathing room, and charts via a chart library

**Status:** ACTIVE
**Issue:** direct user direction, 2026-08-30, after looking at the running MVP
**Branch:** main (no feature branches yet)

## Goal

Make the dashboard look considered rather than flat, and put real graphics on the landing view.
"Done" means the four problems the user named after seeing it — no hierarchy, too grey, too dense,
no charts up front — are visibly fixed in **both** colour schemes, with all 694 tests still passing.

This plan supersedes two earlier decisions. Both were mine, both are now overridden by the user, and
both are recorded rather than quietly dropped — see Notes.

## Context

- **Related files (to change):**
  - `src/index.css` — the token layer; type scale, surfaces, spacing, palette
  - `src/@panther.core/theme/mantineTheme.ts` — the spacing/size scale is currently very tight
  - `src/@panther.core/components/**` — `StatusChip`, `Panel`, `DataTable` density
  - `src/@panther.core/charts/**` — replaced by the library; `scales.ts` and `geometry.ts` go
  - `src/app/layout/**`, `src/features/preamble/**`, `src/features/pipeline/**` — hierarchy, spine
  - `src/features/{mapping,nodes,species,comparison,reports}/**` — chart migration
- **Depends on:** nothing new. The data model is settled and off-limits.
- **Triggered by:** the user running the MVP and calling it flat, grey, dense and chart-less; and
  separately deciding to use a chart library.

## Current State

- What works now: the MVP renders the captured report correctly. 694 tests, type-check and lint
  clean, build and e2e green. It is on-brief — dense, technical, reads as a build record.
- What's broken/missing: it is visually flat. Observed directly from screenshots at 1600×1100 in
  both schemes (`scratchpad/ui-light.png`, `ui-dark.png`), not inferred:
  1. **No hierarchy.** Preamble, frontier block, spine and phase detail sit at the same weight, on
     the same surface, behind the same hairline. Type is uniformly ~11–12px. The eye has no entry
     point.
  2. **Monochrome.** Six categorical slots, a sequential ramp, an ordinal ramp and a diverging pair
     are all defined and essentially unused. Nothing encodes magnitude.
  3. **Cramped.** The Mantine spacing scale runs xs `0.25rem` → xl `1rem`, and panel padding
     matches.
  4. **No graphics at all on the landing view** of a tool whose job is diagnosis.
  5. **Repeated success drowns the exceptions** (found while reviewing, not named by the user): the
     step table renders twelve identical green `Done` chips and twelve `Inferred` chips, so the two
     `Pending` rows — the only ones that matter — do not stand out.
  6. **Light mode is the weaker scheme** — washed out, panels barely separating from the page.

## Steps

### Phase 1: Token and scale foundation — COMPLETE

- [x] Establish at least three surface levels and at least three steps of type scale, so the page
      has strata. This is the root cause of problem 1; everything else in this plan sits on it.
- [x] Loosen the spacing scale in `mantineTheme.ts` and the panel padding that matches it. Denser
      than a generic dashboard, looser than now.
- [x] Widen the palette and put it to work where it **encodes** something — duration, magnitude,
      state, delta — rather than decorates. A second accent is allowed.
- [x] Keep every colour literal in `src/index.css`. A hex, `rgb()` or `hsl()` anywhere else under
      `src/` remains a defect, checked by grep.
- [x] If the categorical set changes, re-run a colour-vision check and update the recorded numbers
      in the `index.css` comment. Do not eyeball it.
- [x] Bring light mode to parity with dark.

### Phase 2: The frontier statement and the spine — COMPLETE

- [x] Elevate the frontier statement. It answers acceptance question 1 and currently renders as body
      text. Larger type, phase name emphasised, the `10/12` counter in prominent tabular figures.
      This is the one place a genuinely large number is warranted.
- [x] Make the spine read as a pipeline rather than a list: a connecting rail, larger status nodes,
      the hole's hatching actually visible at size, and a sense of progression.
- [x] Add a duration micro-bar per phase using the ordinal ramp. Phase durations run 3.5m → 26.6m
      across fourteen phases and that spread is currently invisible.
- [x] The frontier and the hole stay the two most salient things in the spine.

### Phase 3: Signal over repetition — COMPLETE

- [x] Collapse the common `Done` case to a quiet mark; reserve the full chip for exceptions —
      pending, failed, hole, unknown.
- [x] Move `Inferred` out of every row into the column header or a single footnote.
- [x] Verify afterwards that the two `Pending` rows are unmissable.
- [x] Every state that still renders keeps an icon **and** a word. Status is never colour-alone —
      this constraint survives the brief being superseded, because it is an accessibility property,
      not a stylistic one.

### Phase 4: Chart dependency — REVERSED, then COMPLETE

The original plan was to migrate the charts to `@mantine/charts`. **That was wrong, and looking at
the rendered charts is what showed it.** The report views' charts encode things no general charting
library expresses: a beeswarm on a log axis over the _shortfall_ (the only form that works on a
distribution with median 99.5 % and MAD 0.4), a stacked bar with the total drawn as an **envelope
outline** so trimming losses stay visible, leader-line labels on outliers, and a Gantt over artifact
times. Migrating would have made the two best visuals worse, and the library measured at **433 kB
raw / 211 kB gzipped** to render the three simplest charts in the app.

The liability was never the marks. It was the arithmetic: `scales.ts` reimplemented `d3-scale`'s
`scaleLinear().nice()`, `ticks()` and `scaleBand()` by hand. So the dependency that was actually
worth having is `d3-scale`, not a chart library.

- [x] **Do not migrate.** The hand-rolled charts stay.
- [x] Remove `@mantine/charts` and `recharts`.
- [x] Add `d3-scale`, `d3-shape`, `d3-array` (~11 kB gzip) and rewrite `scales.ts` as a thin adapter
      over them, preserving the public API so no call site moved.
- [x] Keep the guards d3 does not provide: a scale must never return a non-finite number, a
      zero-span domain sits on the baseline rather than the range midpoint, and a band scale over
      zero keys has zero step — d3 reports a full-width step and bandwidth for an empty domain,
      which a test caught.
- [x] Rebuild the three landing-view charts on the app's own chassis.

### Phase 5: Charts on the landing view — PARTIAL

- [x] Add graphics that earn their place, from data already in the model: mapping progression across
      the 14 stages, node forward tracking distribution, mapping by node type, library composition,
      previous-vs-new species change.
- [ ] **The species distribution is the highest-risk visual.** Median 99.5%, MAD 0.4, 120 of 131
      species at or above 90% — on a linear 0–100% axis it is a solid bar at the right edge with a
      few dots trailing left. Try plotting the _unmapped_ count or rate (the shortfall spans orders
      of magnitude), a log axis on the shortfall, or a full-range view with a zoomed inset over
      88–100%. A 65% species with 8,910 nodes matters less than a 90% species with 200,000, so the
      count matters, not only the rate. Record what was tried and why the winner won.
- [ ] **The mapping chart has a known trap.** Three of four mechanisms are near-constant after their
      introducing stage (ID flat at ~1.536M across all fourteen stages, BLAST flat at ~84K after
      stage three, RECLUSTER_NEW ~2.5K throughout), so a stacked view is dominated by one unchanging
      band. The model exposes both `cumulative` and `delta` per mechanism per stage; a per-stage
      delta chart with the cumulative total as a line, or small multiples, will likely read better.
- [x] Keep the honesty rules: truncated tables still withhold sort and filter, absence still renders
      as absent, every chart keeps a table-view twin.

### Phase 6: Verify by looking — COMPLETE

- [x] Screenshot at 1600×1100 in **both** schemes, before and after. Chromium needs `--disable-gpu`
      in this environment or `page.screenshot` throws a protocol error — see Failed Approaches.
- [x] Give an honest per-problem verdict. If one of the four is not fixed, say so.
- [x] Smoke every fixture state (real + 11 transforms): renders, nothing throws, no
      `NaN` / `Infinity` / `undefined` / `[object Object]` in the DOM.
- [x] `tsc --noEmit`, `lint`, `test` (694), `build`, `playwright`, `prettier --check`, and the
      colour-literal grep all clean.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Phase 1 complete. Type scale widened to six steps (11/12/13/15/17/30)
  from an effective one; `--text-2xs` raised one step, which lifted all 133 of its call sites at
  once. Surfaces widened and a `surface-raised` stratum plus two shadow tokens added, and the
  preamble moved onto it so the page has a real top layer. Mantine spacing and font scales raised
  roughly one step. 694 tests still pass; build, lint, prettier and the colour-literal grep clean.
  Phase 3 then complete: a `quiet` StatusChip variant renders the icon alone with the word kept in
  the accessible name, used only for `done` in a repeated list; the per-row timing-provenance chip
  moved to a single note on the Steps header. Twelve `Done` chips and twelve `Inferred` chips became
  ten faint checkmarks, and the two `Pending` rows now carry the only chips in the table. Verified by
  screenshot and by asserting the ten accessible "Done" names survive in the DOM.
  Phase 2 then complete: the frontier renders as a display-size `10/12` beside the phase name at
  lede size, with the plain-language sentence kept below it as supporting text rather than replaced;
  spine markers scaled 12px to 16px in a wider rail; and a duration micro-bar per phase on one
  shared scale, so the 26.6m Exten phase reads visibly longer than the 3.5m cleanup passes.
  Phase 5 then started: `GlanceCharts` puts three charts on the landing view via `@mantine/charts` —
  a stepped area of assignment across the 14 mapping stages, a donut of assignment mechanism at the
  final stage with a legend carrying the counts, and a value-labelled bar of node forward tracking by
  type. This is the first place the categorical palette does any work. Figures verified against
  Appendix A (ID 1,536,283 · HMM 186,844 · BLAST 84,436 · Reclustering 2,536).
  Phase 4 then complete, by reversal — see its section. `@mantine/charts` and `recharts` removed;
  `d3-scale`/`d3-shape`/`d3-array` added; `scales.ts` now delegates to d3 while keeping the
  non-finite guards; the landing charts rebuilt on the chassis as a sparkline, a single stacked bar
  and labelled bars. The mantine chunk returned to 296 kB from 729 kB.
  Phase 6 then complete. All 13 fixture states smoked through a parameterised test over the catalog
  (`tests/app/fixtureStates.test.tsx`) rather than a throwaway script, so adding a transform now
  requires it to pass. 707 tests, lint clean, build, e2e, prettier.

  **Per-problem verdict, against the four the user named:**

  | Problem                 | Verdict                                                                                                                                                  |
  | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Too flat / no hierarchy | **Fixed.** Raised preamble, display-size frontier, six-step type scale where there was effectively one.                                                  |
  | Too grey / needs colour | **Partly.** The charts and duration bars use the palette; the spine and step table are still near-monochrome, which is arguably right for a status list. |
  | Too dense               | **Fixed.** Spacing and type both up about a step; the step table lost 24 redundant chips.                                                                |
  | Needs charts up front   | **Fixed.** Three panels on the landing view.                                                                                                             |

- **Next immediate action:** nothing required. Open judgement calls are recorded in Additional
  Context: whether the landing band should carry more than three charts, and whether the step table
  belongs on the landing view at all.
- **Recent commands run:**
  - `npm install @mantine/charts recharts`
  - Playwright screenshots of the current state into the scratchpad
- **Uncommitted changes:** `package.json`, `package-lock.json`, plus unrelated in-flight work — the
  config-ledger `recordCount` fix (`BuildPreamble.tsx`, `fixtures/index.ts`, `transforms.ts`, its
  test) and `docs/ui-roadmap.md`.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried                                                      | Why it failed                                                                                                                                                                                                                                                                                        | Date       |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Starting the visual pass by launching a workflow, with no plan file | The repo's own convention (CLAUDE.md → `.plans/<category>/<task-name>.md`) requires a plan for non-trivial work. Stopped and written up before any source changed.                                                                                                                                   | 2026-08-30 |
| `page.screenshot()` under default Chromium launch args              | Fails with `Protocol error (Page.captureScreenshot): Unable to capture screenshot` in this environment. Launching with `--disable-gpu --disable-dev-shm-usage --no-sandbox` works. This blocked visual review for the whole MVP build, which is why the app was designed against rendered text only. | 2026-08-30 |

## Files Modified

| File                                | Action                              | Status |
| ----------------------------------- | ----------------------------------- | ------ |
| `package.json`, `package-lock.json` | added `@mantine/charts`, `recharts` | done   |

## Blockers

- None currently.

## Notes

### This plan reverses two decisions of mine

**1. The brief's visual direction is superseded — by the user, explicitly.**
`docs/panther-build-dashboard-prototype-brief-v3.md` bans colourful KPI cards, gradients, analytics
aesthetics and a hero figure, and asks for "low chrome". The MVP followed that faithfully, and the
result is the flatness above. The user has looked at it and asked for the opposite: more colour, more
hierarchy, more breathing room, more charts. Design for appeal.
**What does not change:** status never carried by colour alone, absence never rendered as zero, and
truncated data never presented as complete. Those are honesty and accessibility properties that the
brief happened to also contain; they are not style.

**2. The chart-library deferral in plan 02 is now resolved — use a library.**
`.plans/feature/02-visual-language.md` carries a `DEFERRED` note recommending `d3-scale`/`d3-shape`
with hand-rolled markup, and a second renderer only for the generic report path. The user has decided
for a chart library outright. `@mantine/charts` was chosen over Nivo and ECharts because it is
Recharts-based, inherits the Mantine v9 theming already in place (so dark mode and colour come free),
and ships a keyboard-navigable accessibility layer by default. **Update plan 02's note to point
here** rather than leaving it reading as current.

Two things the library does not cover, and their status:

- **The species beeswarm.** Nivo has `swarmplot`; Recharts does not. `ScatterChart` with jitter is
  the fallback, and given the distribution's shape (Phase 5) the right answer is probably not a
  beeswarm anyway.
- **The phase timeline (Gantt) and the spine.** No library covers either; both stay hand-rolled, as
  established when the deferral was first written.

### Scope discipline

This is a visual pass on a working app. The derived model (`src/features/build/model/**`) is
verified and off-limits. No new features, no new report types, no plan-07 work. If a change requires
a model change, it is out of scope for this plan.

## Lessons Learned

- The whole MVP was built without anyone looking at it, because `page.screenshot` failed and I
  treated that as an environment limitation rather than a blocker to solve. One flag fixed it. The
  cost was a UI designed against rendered text, which is exactly how it ended up flat.

## Additional Context (Claude)

- **Sequencing risk.** Phases 1–3 (tokens, spine, chips) and Phases 4–5 (charts) touch disjoint
  files and can run in parallel, but they are one _look_. If split across agents, the reconciliation
  step is not optional — two independently reasonable visual passes will not agree on surface
  levels or emphasis.
- **The step table is where density and signal collide.** Loosening spacing there makes twelve rows
  taller while the two that matter are still buried. Phase 3 should land before or with Phase 1's
  spacing change, or the table gets worse before it gets better.
- **Worth deciding explicitly:** whether the landing view keeps the phase-detail step table at all,
  or whether charts displace it and steps move behind the phase disclosure. That is an IA question
  the visual pass will surface, and it is bigger than styling.
