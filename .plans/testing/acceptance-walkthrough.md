# Task: Acceptance walkthrough and graceful-degradation matrix

**Status:** PLANNED
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Acceptance Walkthrough", "Overall Success Criteria", "Prototype Fixture Strategy", "Schema Version and Unknown Values"
**Branch:** main (no feature branches yet)

## Goal

Turn the brief's acceptance walkthrough into executable tests, so "the prototype succeeds if those five
questions can be answered in a few minutes" is a check that runs rather than an opinion. Plus a
degradation matrix covering every fixture transform, since graceful degradation is a stated success
criterion and is easy to regress invisibly.

Write this plan's specs **as each feature plan lands**, not at the end. Each spec is the definition of
done for the plan it covers.

## Context

- **Related files (to create):**
  - `e2e/acceptance/q1-frontier.spec.ts` … `q5-terminology.spec.ts`
  - `e2e/degradation.spec.ts`
  - `tests/features/build/model/*.test.ts` — model-level assertions
  - `tests/features/checks/rules/*.test.ts`
  - `tests/acceptance/answers.test.ts` — the five answers asserted against the derived model
- **Depends on:** each feature plan for the surface it tests.
- **Existing harness:** Vitest + RTL + jsdom with `renderWithProviders` (store + Mantine +
  MemoryRouter); Playwright on port 4310 with its own dev server. Both green on the template.

## Current State

- What works now: the harness. One template smoke test (`tests/features/home/HomePage.test.tsx`) and
  one e2e smoke test (`e2e/smoke.spec.ts`), both passing.
- What's broken/missing: every spec in this plan.

## Steps

### Phase 1: The five acceptance questions

Each is asserted twice — once against the **derived model** (fast, precise) and once against the
**rendered UI** (proves a reviewer can actually find it). The model assertion catches a wrong number;
the UI assertion catches a right number nobody can see.

- [ ] **Q1 — Where is the build frontier?**
      Expected: _Library export products is incomplete at 10/12, and Final packaging has not started._
      Assert the frontier is phase index 12. **Assert explicitly that the frontier is NOT the earliest
      incomplete phase** (index 2) — this is the specific failure the brief warns about.
- [ ] **Q2 — Is anything incomplete behind the frontier?**
      Expected: _Yes — two validation steps remain in Sequence-to-family mapping even though downstream
      phases completed._ Assert phase 2 is a **hole**, that both pending goals are named, and that the
      UI labels it as a hole rather than as where the build stopped.
- [ ] **Q3 — Is DAPMA's 0 % node forward tracking necessarily a problem?**
      Expected: _No — DAPMA is new in this build and has no previous nodes to forward-track._ Assert
      the species detail states the explanation, and that it cites both corroborating sources
      (`prev_count` 0; `no_prev_match` = `total_seqs`).
- [ ] **Q4 — Is a large species decrease necessarily a biological loss?**
      Expected: _Not always — a paired drop/add with near-identical counts may be a rename, e.g.
      USTMA → MYCMD._ Assert the rename is detected and labelled derived, and that it does not appear
      as a top biological decrease.
- [ ] **Q5 — Why do two values labelled "sequences" differ substantially?**
      Expected: _They refer to different concepts — reference/input sequences versus sequences
      represented in the built library._ Assert no rendered label reads bare "Sequences" where one of
      the six counts is shown, and that each carries its definition.

### Phase 2: Success-criteria assertions

Beyond the five questions, the brief lists what the prototype must also make clear:

- [ ] Report freshness is visible and reads **Current** on this fixture.
- [ ] The expected passing consistency checks report `pass` with their real numbers.
- [ ] Every check is attributable to generator or dashboard in the UI **and** in exports.
- [ ] Configuration/version inputs are reachable, with the QfO mismatch surfaced and its evidence
      retained.
- [ ] Truncated tables are labelled, and sort/filter is not offered over them.
- [ ] A failed/retried step is distinguishable from pending, hole, warning and frontier — by label and
      icon, not colour alone.
- [ ] The schema version is displayed and understood.

### Phase 3: Degradation matrix

One spec per transform from `01-report-model` Phase 9. For each: the app renders, nothing throws, no
`NaN`/`Infinity`/`undefined` reaches the DOM, and absence is stated rather than shown as zero.

| Transform                       | Must demonstrate                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| _(none — real fixture)_         | The baseline: frontier, one hole, `prev_lib` absent, all tables truncated                         |
| `toCompleted()`                 | No frontier, no holes; reads as a permanent record; phase counters agree with step statuses       |
| `toEarly()`                     | Frontier moves early; most reports absent with the generator's message                            |
| `toFailed()`                    | Blocked phase, attempt history, failed state distinct from hole and pending                       |
| `toWarning()`                   | Warnings dominate without the layout breaking                                                     |
| `stripSection('node_tracking')` | Node tracking absent; dependent checks go `absent`, not false `pass`; species detail still usable |
| `toTruncated()`                 | Truncation notices; sort/filter withheld                                                          |
| `toStale()`                     | Freshness flips to `potentially-stale`                                                            |
| `withUnknownSection()`          | Renders through the generic fallback under Unattached reports                                     |
| `withUnknownStatus()`           | `Unknown status: <value>` with the literal preserved; not coerced                                 |
| `withFutureSchema()`            | Visible degradation notice; understood sections still render                                      |

- [ ] Also cover the malformed-input cases from `01` Phase 1 at the model level: `null`, `{}`,
      `{sections: 'nope'}`, a section whose `data` is a string, and reversed section order.

### Phase 4: Regression guards for the specific traps

These each cost real debugging time or were caught during planning. Each gets a named test so it
cannot come back quietly.

- [ ] The frontier is not the earliest incomplete phase.
- [ ] `pct_change` is recomputed: a removed species renders −100 %, not −1 %.
- [ ] Rename detection finds exactly the two exact-count pairs and does **not** pair `CITSI`, `ERYGU`
      or `AMBTC` with `DAPMA`.
- [ ] A species absent from the truncated comparison table is not claimed to be new.
- [ ] `by_mechanism` is treated as cumulative, not incremental.
- [ ] No negative elapsed interval is rendered despite 2 out-of-order artifacts.
- [ ] Config lineage does not flag the ~20 legitimate `PREV_*` 19.0 references as issues.
- [ ] `ragged_rows` is read as a count, not a boolean.
- [ ] Every transform produces a self-consistent state (per-phase counters match step statuses;
      completed steps have an mtime and incomplete ones do not).

### Phase 5: Timed walkthrough

- [ ] A written reviewer script — the five questions, in order, with where to click. Run it against the
      real fixture and record how long it actually takes. The brief's bar is "a few minutes without
      inspecting the raw JSON"; if it takes longer, that is a design finding, not a test failure.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written. All five expected answers verified as factually correct
  against `docs/build_state.json`; two additions to the brief's claims recorded in
  `01-report-model` Appendix A.9.
- **Next immediate action:** write `tests/acceptance/answers.test.ts` against the derived model as soon
  as `01-report-model` Phases 1–2 land. That single file locks the five answers before any UI exists.
- **Recent commands run:**
  - `npm test` — 2 passed (template smoke)
  - `npx playwright test` — 1 passed (template smoke)
- **Uncommitted changes:** none.
- **Environment state:** `node_modules` installed; Playwright chromium present; dev server not running.

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers

- Each phase is blocked on the feature plan it tests. Phase 1's model-level half is blocked only on
  `01-report-model`.

## Notes

- Reference values for every assertion are in
  [`01-report-model` Appendix A](../feature/01-report-model.md#appendix-a--verified-data-facts). Tests
  should cite the appendix section they encode, so a fixture change makes the intended coverage
  obvious.
- Vitest only collects `tests/**/*.test.{ts,tsx}`; a spec placed beside its source is silently ignored.
- Assert on **user-visible text**, not class names. Several requirements here are specifically about
  wording — "hole" versus "stopped", a labelled sequence metric, a derived-vs-generator attribution —
  and a class-name assertion would pass while the UI says the wrong thing.

## Lessons Learned

- Verifying the brief's five expected answers against the fixture before writing any code found a
  second rename pair the brief does not mention and confirmed every other claim. Cheap, and it means
  the acceptance tests encode facts rather than assumptions.

## Additional Context (Claude)

- Q5 is the awkward one to test. "No rendered label reads bare 'Sequences'" is best enforced as a lint-
  like sweep over the rendered output of each view rather than as five separate assertions — probably
  one spec that renders every report surface and greps the accessible text. Worth building once,
  properly, because it is the only guard against the terminology problem reappearing in a new view.
- Consider whether the degradation matrix should be a single parameterised spec over the transform
  catalog rather than eleven files. Parameterised keeps it honest — adding a transform to the catalog
  automatically requires it to pass — which is the better property.
