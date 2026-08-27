# Task: Derived checks layer — consistency checks, freshness, config tiers, and passing signals

**Status:** COMPLETE
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Derived Checks Layer", "Show Passing Checks Too", "Report Freshness", "Warnings and Issues", Suggested Build Order §2
**Branch:** main (no feature branches yet)

## Goal

Add a layer of interpretation the report generator did not provide: cross-report consistency checks,
report freshness, configuration sanity in three tiers, and — importantly — the checks that **pass**.
"Done" means the dashboard demonstrably adds diagnostic value over the raw `warnings[]` array, and a
reader can always tell whether a finding came from the generator or from the dashboard.

## Context

- **Related files (created):**
  - `src/features/checks/model/types.ts` — the `Check` contract, weights, tiers, summary shapes
  - `src/features/checks/model/finding.ts` — the four factories (the only way to build a finding)
  - `src/features/checks/model/runChecks.ts` — the runner, dedupe, ordering, counting, memoisation
  - `src/features/checks/model/rules/*.ts` — one module per check family + the registry
  - `src/features/checks/model/context.ts` — shared report readings (anchors, config entries)
  - `src/features/checks/model/anchoring.ts` — where a generator warning belongs
  - `src/features/checks/hooks.ts` — `useChecks` and the per-phase/config/metric/section lookups
  - `src/features/checks/components/*` — panel, list, row, summary, config tiers, three markers
- **Depends on:** `01-report-model` (`report.consistency`, freshness, anchors, definitions),
  `02-visual-language` (`StatusChip`, `Provenance`, `Panel`, `CodeBlock`, `KeyValueList`,
  `DataTable`), `03-pipeline-spine` (`useBuildReport`, `attributeWarningsToPhases`, the registry
  mount point).
- **Depended on by:** `03-pipeline-spine` can now render `PhaseCheckMarker` on a phase node;
  `07-extensibility-search-export` must carry `origin` into exports.

## Current State

- The runner produces 20 findings on the captured report: **5 issues** (1 generator + 4 derived),
  **8 verified**, **7 noted**, 0 absent, with **1 derived duplicate suppressed**.
- `ChecksPanel` is mounted build-wide by `BuildShell` through `features/reports/registry.tsx`.
- 74 tests over `tests/features/checks/**`.

## Steps

### Phase 1: The check contract

- [x] A `Check` carries **state**, **label**, **explanation**, **source**, **anchor** and **origin**.
      `CheckFinding extends Check` from the model, and adds `weight`, `tier`, `configKey`, `phaseId`,
      `stepId`, `oscode`, `metricId`, `evidenceTokens`, `absentReason`, `supersededBy`.
- [x] The runner is a pure `BuildReport → CheckRunResult`, memoised on the report object. A new check
      is a new module in `model/rules/` plus a line in `model/rules/index.ts`.
- [x] Every string in `generatorWarnings` becomes a generator-sourced check, anchored by step goal →
      mapping stage → oscode → config key → section, and the match route is recorded in its evidence.
- [x] Derived findings carrying `evidenceTokens` stand down when a generator warning names all of
      them. The suppressed finding is kept (with `supersededBy`) rather than dropped.

### Phase 2: Provenance is visible and preserved

- [x] Every row renders `Provenance`, which separates the two by glyph and border style, not colour.
- [x] `origin` is on the finding itself, so an export cannot lose it.

### Phase 3: Show passing checks

- [x] Four groups, all visible, no filter: Needs review / Noted / Verified / Not evaluated.
- [x] `summary.issues` counts `weight === 'issue'` only.

### Phase 4: Report freshness

- [x] `freshness.report` reads the model's state; **Current** is a `verified` finding stating the
      73.7 h lead, anchored to the step whose artifact is newest.

### Phase 5: Cross-report consistency checks

- [x] **Family-count consistency** — passes at 15,797 across four sources and explains reclustering's
      15,823 (26 higher) from the eight stages that run after it.
- [x] **Leaf/node consistency** — passes at 1,736,983 exactly.
- [x] **Tree completeness** — 15,797 of 15,797, 0 empty.
- [x] **Sequence terminology** — the six counts with their registry labels; also asserted as a
      rendering test (no rendered label reads bare "Sequences").
- [x] **Species denominator** — passes at 131 three ways and explains the 147.
- [x] **Node-type coverage** — `UNKNOWN` 0 of 362 is a `warn` anchored to node forward tracking.
- [x] **Artifact ordering** — one finding per out-of-order pair, anchored to the step, deduplicated
      against the generator's stale-artifact warning.

### Phase 6: Config interpretation — three tiers

- [x] **Lineage** — 19 `PREV_*` at 19.0 and 2 `PREV_PREV_*` at 17.0 read as a satisfied pattern,
      with the 18.0-naive-expectation note. Passing, display-only, not counted.
- [x] **Notable** — exactly the six values in Appendix A.8, each detected from evidence (older than
      the previous release / release in the filename / a named dropped proteome / declared empty) and
      each carrying a sentence for a reader years from now.
- [x] **Mismatch** — the QfO release against the active data dir, with the commented-out `config.mk`
      line kept verbatim and marked in a `CodeBlock`; plus the dirty source tree.
- [x] `unresolved_vars` empty is a passing check.
- [x] No blanket older-release rule. The lineage tier absorbs the ~21 legitimate references.

### Phase 7: Contextual presentation

- [x] `PhaseCheckMarker`, `ConfigCheckMarker` and `MetricCheckMarker` put findings where their
      subject is; `ConfigTiers` uses the config marker on every anchored value.
- [x] Every row links to its anchor through a router `Link` (so the spine selection moves), or opens
      a species through the store when the finding names an oscode.

### Phase 8: Tests

- [x] Each rule against the real fixture, asserting state AND anchor.
- [x] Appendix A.7 numbers asserted literally.
- [x] The QfO mismatch and its commented line, including that the model carries the evidence.
- [x] Lineage does not flag any of the 21 `PREV_*`/`PREV_PREV_*` references.
- [x] `stripSection('node_tracking')` → both dependent checks `absent` with `inputs-missing`, issue
      count 4 rather than 5, no crash, and the partially-comparable check says what was missing.
- [x] Generator vs derived distinguishable in rendered output (`data-check-origin`,
      `data-provenance`, and the words "Generator"/"Derived").

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** whole plan implemented and verified. `npx tsc --noEmit -p
tsconfig.app.json` clean, `npx eslint src/features/checks tests/features/checks` clean,
  `npx vitest run tests/features/checks` 7 files / 74 tests passing, colour-literal grep empty,
  every file prettier-clean.
- **Next immediate action:** none for this plan. Two follow-ups belong to other lanes: `03` should
  mount `PhaseCheckMarker` on `PhaseNode`, and `tests/app/BuildShell.test.tsx` still asserts the old
  `ChecksPanel` stub text.
- **Recent commands run:** `npx vitest run tests/features/checks`, `npx eslint`, `npx tsc --noEmit`,
  `npx prettier --write`.
- **Uncommitted changes:** everything under `src/features/checks/**` and `tests/features/checks/**`.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried                                                           | Why it failed                                                                                                                                                                                                                                                                                                      | Date       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Flagging every configuration value that references an older release      | About a third of `config.mk` legitimately points at PANTHER19.0/18.0/17.0 inputs. A blanket rule buries the one real mismatch (QfO 2026_02 vs `ref_prot_2026_01`) in ~25 false positives. The three-tier model exists precisely to avoid this.                                                                     | 2026-08-27 |
| Reporting only failures, on the assumption that passing checks are noise | v3 asks for the opposite: "A diagnostic interface is stronger when it shows what was verified, not only what failed." On this fixture the passing checks (exact leaf/library agreement, four-way family agreement) are the strongest evidence the build is sound.                                                  | 2026-08-27 |
| A hand-written list of "notable" config keys                             | It produces the right six rows on this fixture and would keep producing them after the data changed, which is a fixture-shaped lie. Detection is now evidential (release older than the previous library, release in the filename, a named dropped proteome, declared empty) and the curated text is wording only. | 2026-08-27 |
| Three states only, with `notable` as a weak `warn`                       | It put six configuration inheritances into the issue count, which is exactly the noise the tier model exists to prevent. `weight` was added as a second axis: `note` is `state: 'pass'` and counts as neither an issue nor a verification.                                                                         | 2026-08-27 |

## Files Modified

| File                                                     | Action        | Status |
| -------------------------------------------------------- | ------------- | ------ |
| `src/features/checks/model/types.ts`                     | created       | done   |
| `src/features/checks/model/finding.ts`                   | created       | done   |
| `src/features/checks/model/context.ts`                   | created       | done   |
| `src/features/checks/model/anchoring.ts`                 | created       | done   |
| `src/features/checks/model/runChecks.ts`                 | created       | done   |
| `src/features/checks/model/index.ts`                     | created       | done   |
| `src/features/checks/model/rules/index.ts`               | created       | done   |
| `src/features/checks/model/rules/generatorWarnings.ts`   | created       | done   |
| `src/features/checks/model/rules/freshness.ts`           | created       | done   |
| `src/features/checks/model/rules/familyAgreement.ts`     | created       | done   |
| `src/features/checks/model/rules/leafLibrary.ts`         | created       | done   |
| `src/features/checks/model/rules/treeCompleteness.ts`    | created       | done   |
| `src/features/checks/model/rules/speciesDenominator.ts`  | created       | done   |
| `src/features/checks/model/rules/sequenceTerminology.ts` | created       | done   |
| `src/features/checks/model/rules/nodeTypeCoverage.ts`    | created       | done   |
| `src/features/checks/model/rules/artifactOrdering.ts`    | created       | done   |
| `src/features/checks/model/rules/pipelineHoles.ts`       | created       | done   |
| `src/features/checks/model/rules/configQfo.ts`           | created       | done   |
| `src/features/checks/model/rules/configSourceState.ts`   | created       | done   |
| `src/features/checks/model/rules/configLineage.ts`       | created       | done   |
| `src/features/checks/model/rules/configNotable.ts`       | created       | done   |
| `src/features/checks/hooks.ts`                           | created       | done   |
| `src/features/checks/components/ChecksPanel.tsx`         | replaced stub | done   |
| `src/features/checks/components/CheckList.tsx`           | created       | done   |
| `src/features/checks/components/CheckRow.tsx`            | created       | done   |
| `src/features/checks/components/CheckMark.tsx`           | created       | done   |
| `src/features/checks/components/ChecksSummary.tsx`       | created       | done   |
| `src/features/checks/components/ConfigTiers.tsx`         | created       | done   |
| `src/features/checks/components/InlineCheckMarker.tsx`   | created       | done   |
| `src/features/checks/components/ConfigCheckMarker.tsx`   | created       | done   |
| `src/features/checks/components/MetricCheckMarker.tsx`   | created       | done   |
| `src/features/checks/components/PhaseCheckMarker.tsx`    | created       | done   |
| `src/features/checks/components/index.ts`                | created       | done   |
| `tests/features/checks/rules.test.ts`                    | created       | done   |
| `tests/features/checks/passingChecks.test.ts`            | created       | done   |
| `tests/features/checks/configTiers.test.ts`              | created       | done   |
| `tests/features/checks/degradation.test.ts`              | created       | done   |
| `tests/features/checks/dedupe.test.ts`                   | created       | done   |
| `tests/features/checks/markers.test.tsx`                 | created       | done   |
| `tests/features/checks/ChecksPanel.test.tsx`             | created       | done   |

## Blockers

- None. One cross-lane note: `tests/app/BuildShell.test.tsx` (owned by `03`) asserts the text of the
  `ChecksPanel` stub this plan replaced, so that assertion needs updating in its own lane. The
  equivalent coverage now lives in `tests/features/checks/ChecksPanel.test.tsx`.

## Notes

- Expected check outcomes, the config tier assignments, and the exact numbers each check should report
  are in [`01-report-model` Appendix A.7–A.8](./01-report-model.md#a7-expected-passing-checks). Every
  number the layer renders was checked against it rather than re-derived.
- The check provenance requirement exists because the dashboard may become part of the permanent build
  record. Treat it as a correctness property, not a UI nicety.
- `configElementId(key)` is owned by `ConfigTiers` for the mismatch, ledger, notable and
  `PREV_RELEASE_DIR` rows. Any other view rendering configuration values must not set the same ids —
  it should render `ConfigCheckMarker` instead.

## Lessons Learned

- **`state` alone could not carry the config tiers.** A notable inheritance is not a warning and not
  a verification; forcing it into either wrecks the count a reviewer reads. Adding `weight` as a
  second axis, with the pairing enforced by the four factories, was the smallest honest fix.
- **Deduplication should be evidential, not textual similarity.** Matching a derived finding's
  literal `evidenceTokens` (a step goal, a config key, a release string) inside the generator's
  message suppresses exactly the right one finding on the captured report and exactly two on
  `toWarning`, with no tuning.
- **Reusing `attributeWarningsToPhases` from the spine mattered more than it looked.** A warning that
  flagged one phase on the spine and linked to another from the panel would be worse than either
  alone; sharing the matcher makes disagreement impossible.
- **`absent` needed a reason.** `inputs-missing` and `not-applicable` are different findings about the
  report: the first is a gap in the record, the second is not. The open question in this plan is
  resolved that way rather than by adding a fifth state.
- Rendering the whole `BuildShell` in jsdom to prove the mount contract takes ~8–19 s. Worth one
  test, not more.

## Additional Context (Claude)

- Resolved: `absent` now carries `absentReason`, so "the inputs are missing" and "this does not
  apply" are distinguishable without a fifth state.
- Resolved: the sequence-terminology check exists in both forms. The user-facing row enumerates the
  six counts with their registry labels (which is what stops a reader treating them as contradictory),
  and `ChecksPanel.test.tsx` additionally asserts that nothing rendered reads bare "Sequences".
- Open for `03`: `PhaseCheckMarker` is exported and tested but not mounted on `PhaseNode`, because
  that file belongs to the spine lane.
