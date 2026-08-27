# Task: Derived checks layer — consistency checks, freshness, config tiers, and passing signals

**Status:** PLANNED
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Derived Checks Layer", "Show Passing Checks Too", "Report Freshness", "Warnings and Issues", Suggested Build Order §2
**Branch:** main (no feature branches yet)

## Goal

Add a layer of interpretation the report generator did not provide: cross-report consistency checks,
report freshness, configuration sanity in three tiers, and — importantly — the checks that **pass**.
"Done" means the dashboard demonstrably adds diagnostic value over the raw `warnings[]` array, and a
reader can always tell whether a finding came from the generator or from the dashboard.

## Context

- **Related files (to create):**
  - `src/features/checks/model/checks.ts` — the check registry and runner
  - `src/features/checks/model/rules/*.ts` — one module per check family
  - `src/features/checks/components/CheckList.tsx` / `CheckRow.tsx` / `CheckDetail.tsx`
  - `src/features/checks/components/ChecksSummary.tsx` — the compact global summary
  - `src/features/provenance/components/ConfigLedger.tsx` / `ConfigTiers.tsx`
- **Depends on:** `01-report-model` (the joined model, anchors, freshness inputs),
  `02-visual-language` (`StatusChip`, `Provenance`, `Panel`, `CodeBlock`).
- **Depended on by:** `03-pipeline-spine` renders check markers on phase nodes;
  `07-extensibility-search-export` must carry check provenance into exports.

## Current State

- What works now: nothing.
- What's broken/missing: everything in this plan.

## Steps

### Phase 1: The check contract

- [ ] A `Check` carries: **state** (`pass | warn | absent`), a short **label**, an **explanation**, a
      **source**, an **anchor** to the relevant phase/report/config value/metric, and **whether it came
      from the report generator or was derived by the dashboard**.
- [ ] The runner is a pure function `BuildReport → Check[]`. A new check is a new rule module and a
      registry entry — never a parser change.
- [ ] Every string in any section's `warnings[]` becomes a generator-sourced check, with its anchor
      resolved by matching step goals, stage names, oscodes or config keys mentioned in the text.
- [ ] Deduplicate derived checks against generator warnings that already describe the same evidence, so
      the stale-artifact finding is not reported twice.

### Phase 2: Provenance is visible and preserved

- [ ] Generator warnings and dashboard-derived checks are **visually distinct**, using the `Provenance`
      primitive. Two treatments, both legible in print.
- [ ] This provenance survives into exports (`07`). **A permanent record must not make a dashboard
      inference indistinguishable from a generator-authored warning.**

### Phase 3: Show passing checks

- [ ] Passing checks are first-class, not hidden behind a filter. A diagnostic tool is stronger when it
      shows what was verified.
- [ ] Passing checks do not inflate the issue count. Counting is over `warn` only, plus mismatches from
      Phase 6.

### Phase 4: Report freshness

- [ ] `current | potentially-stale | unknown`, derived by comparing report generation time with the
      newest artifact timestamp in the report.
- [ ] Displayed in the preamble (`03`) and available as a check.
- [ ] On this fixture the state is **Current** — render it as the positive evidence it is.

### Phase 5: Cross-report consistency checks

Each of these is expected to **pass** on the real fixture, which is the point.

- [ ] **Family-count consistency** — compare reclustering, post-GIGA, library, GIGA book count and
      successful tree count. Expect a four-way agreement at 15,797 with reclustering 26 higher, and
      explain _why_ the reclustering figure legitimately differs (trimming runs after it) rather than
      flagging it.
- [ ] **Leaf/node consistency** — LEAF node total against library sequence total. Expect an exact
      match; surface it as meaningful evidence that two parts of the build agree.
- [ ] **Tree completeness** — books with a usable tree vs total books; empty trees.
- [ ] **Sequence terminology** — a check that the six distinct sequence counts are each labelled with
      their concept, backed by the metric definitions registry. Its job is to prevent a reader from
      reading legitimate differences as contradictions.
- [ ] **Species denominator** — `species_reported` / `library.genomes` / `prev_uniprot_proteomes` all
      131 while `other_reports.species_total` is 147. Explain the different denominator; do not warn.
- [ ] **Node-type coverage** — `UNKNOWN` node type at 0 % of 362 nodes. A genuine `warn`, anchored to
      node forward tracking.
- [ ] **Artifact ordering** — out-of-order completed artifacts in declared order (2 in this fixture),
      anchored to the specific steps, deduplicated against the generator's own stale-artifact warning.

### Phase 6: Config interpretation — three tiers

- [ ] **Lineage** (display-only, positive, does not count): derive expected release relationships. A
      20.0 build legitimately references 19.0 through `PREV_*` and an older release through
      `PREV_PREV_*`. Where internally consistent, show as a satisfied lineage pattern.
- [ ] **Notable** (visible, not a warning by default): historically useful inheritance outside the
      obvious naming pattern but not known to be wrong — Protein Class inputs from an older release,
      annotation inputs whose filenames encode an earlier release, and similar. Each gets a sentence
      explaining it to someone reviewing the build years later.
- [ ] **Mismatch** (counts): only stronger inconsistencies where the evidence supports a real
      discrepancy — the declared QfO release version disagreeing with the resolved data path being the
      worked example. **Preserve the evidence**, including the literal `config.mk` snapshot and the
      relevant commented-out line.
- [ ] Also surface dirty source tree and unresolved variables. `unresolved_vars` is empty here, so that
      is a **passing** check.
- [ ] **Do not automatically classify all older-release references as errors.** Roughly a third of the
      config legitimately points at previous releases; a rule that flags them all is noise, and the
      brief says so explicitly.

### Phase 7: Contextual presentation

- [ ] Checks appear **in context**: on the phase node, beside the metric, next to the config value.
- [ ] A compact global summary is useful, but a disconnected warning page must not be the primary
      experience. Every check links directly to its anchor.

### Phase 8: Tests

- [ ] Each rule against the real fixture, asserting the expected state and anchor.
- [ ] The passing checks in Appendix A.7 of `01` actually report `pass`, with their real numbers.
- [ ] The QfO mismatch is detected and its evidence (the commented line) is retained.
- [ ] Config lineage does not flag the ~20 legitimate `PREV_*` 19.0 references as issues.
- [ ] `stripSection('node_tracking')` turns the leaf/node and node-coverage checks to `absent`, not to
      a false `pass` and not to a crash.
- [ ] Generator-sourced and derived checks are distinguishable in the rendered output.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written. Nothing built.
- **Next immediate action:** blocked on `01-report-model`. Start with Phase 1 (the check contract),
  then Phase 5, since those checks are the clearest demonstration of added value.
- **Recent commands run:** none for this plan.
- **Uncommitted changes:** none.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried                                                           | Why it failed                                                                                                                                                                                                                                                     | Date       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Flagging every configuration value that references an older release      | About a third of `config.mk` legitimately points at PANTHER19.0/18.0/17.0 inputs. A blanket rule buries the one real mismatch (QfO 2026_02 vs `ref_prot_2026_01`) in ~25 false positives. The three-tier model exists precisely to avoid this.                    | 2026-08-27 |
| Reporting only failures, on the assumption that passing checks are noise | v3 asks for the opposite: "A diagnostic interface is stronger when it shows what was verified, not only what failed." On this fixture the passing checks (exact leaf/library agreement, four-way family agreement) are the strongest evidence the build is sound. | 2026-08-27 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers

- Depends on `01-report-model` Phases 1–4 and 7 (joined model, freshness, definitions registry).

## Notes

- Expected check outcomes, the config tier assignments, and the exact numbers each check should report
  are in [`01-report-model` Appendix A.7–A.8](./01-report-model.md#a7-expected-passing-checks). Do not
  re-derive them from the JSON; if they disagree with the code, one of the two is a bug worth finding.
- The check provenance requirement exists because the dashboard may become part of the permanent build
  record. Treat it as a correctness property, not a UI nicety.

## Lessons Learned

- [Fill during and after the task.]

## Additional Context (Claude)

- Worth considering: a check's `absent` state is doing double duty — "the inputs for this check are
  missing" versus "this check does not apply to this build". They may deserve separate states, because
  the first is a gap in the record and the second is not. Decide when `stripSection` tests are written.
- The sequence-terminology check is unusual: it is a check on the _presentation_, not on the data. It
  may belong as a development-time assertion (a test that no rendered label reads bare "Sequences")
  rather than a user-facing check row. Prototype both; the test version is probably more honest.
