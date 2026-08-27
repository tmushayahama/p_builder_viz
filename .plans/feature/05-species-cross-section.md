# Task: Species cross-section intelligence and distribution-first node forward tracking

**Status:** PLANNED
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Cross-Section Species Intelligence", "Node Forward Tracking", Suggested Build Order §3
**Branch:** main (no feature branches yet)

## Goal

Join species facts across reports so the dashboard can _explain_ a number instead of merely flagging
it. "Done" means selecting `DAPMA` shows why its 0 % node forward tracking is expected rather than
catastrophic, and the node-tracking view leads with the distribution instead of a sortable table.

The brief calls this "an important proof that the JSON report provides more value when interpreted as
one coherent build model". It is the strongest single demonstration in the prototype, and it is
acceptance question 3.

## Context

- **Related files (to create):**
  - `src/features/species/model/speciesRecord.ts` — the joined per-species record (may live in
    `01-report-model` instead; see its Additional Context)
  - `src/features/species/model/renames.ts` — rename / replacement inference
  - `src/features/species/components/SpeciesDistribution.tsx` — strip / beeswarm
  - `src/features/species/components/SpeciesDetail.tsx` — the cross-report panel
  - `src/features/species/components/SpeciesTable.tsx` — full table behind a toggle
  - `src/features/nodes/components/NodeTypeBreakdown.tsx`
  - `src/features/nodes/components/NodeTrackingReport.tsx` — bound to the Node forward tracking phase
- **Depends on:** `01-report-model` (joined species map, anchors), `02-visual-language` (chart chassis,
  `DataTable` with completeness, `Provenance`).
- **Depended on by:** `06-results-and-comparison` reuses the rename inference for the release
  comparison so "largest increase/decrease" is not dominated by renames.

## Current State

- What works now: nothing.
- What's broken/missing: everything in this plan.

## Steps

### Phase 1: The joined species record

- [ ] One record per oscode, merging every species-keyed fact in the report:
      node forward tracking (`mapped`, `total`, `pct`), previous vs current sequence counts,
      previous-UniProt-ID agreement (`same_uniprot`, `diff_uniprot`, `no_prev_match`), and any further
      species-keyed report that appears later.
- [ ] Each field records **which section it came from** and whether it is present, because the sources
      have different coverage: node tracking has 131 species, the comparison table 50 of 147 rows, the
      UniProt table 20 of 132. A species will routinely have some fields and not others.
- [ ] Derived flags: `isNewInBuild`, `isRemoved`, `likelyRenameOf` / `likelyRenamedTo`,
      `likelyReplacementOf`, and `zeroForwardTrackingExplained`.
- [ ] **Never fabricate a field from absence.** A species missing from the truncated comparison table
      is unknown, not zero — that mistake is what would turn a truncation artifact into a false
      "new species" claim.

### Phase 2: Distribution-first node forward tracking

- [ ] The **primary** visualisation is a strip / beeswarm / compact distribution plot over 0–100 %, not
      a table. It must make the dense cluster of high performers obvious while leaving low outliers
      isolated and **labelled**.
- [ ] This fixture is a hard case for the form: median 99.5 %, MAD 0.4, 120 of 131 species ≥ 90 %.
      Nearly every point piles into the last 10 % of the axis. The plot needs deliberate handling —
      jitter, a broken or non-linear axis, or an inset — decided by looking at it, not in the abstract.
- [ ] Show overall mapping percentage, mapping by node type, the species distribution, and labelled low
      outliers. Selecting a point opens the species detail.
- [ ] The full species table stays available behind a toggle. **It is supporting evidence, not the
      headline experience.**
- [ ] `UNKNOWN` node type is 0 % of 362 nodes — surface it here, anchored to the check from `04`.

### Phase 3: Species detail — the explanation surface

- [ ] A popover or side panel combining every joined source for the selected species, with each fact
      attributed to its section.
- [ ] **The DAPMA case:** 0 % forward tracking, `prev_count` 0 in the comparison table, and
      `no_prev_match` equal to `total_seqs` in the UniProt table. Two independent sources agree it is
      new, so it has no previous nodes to forward-track and 0 % is _expected_. The panel must say that
      in words, not leave the reader to infer it.
- [ ] Inferred interpretations are **clearly labelled as derived**, using the same `Provenance`
      treatment as `04`.
- [ ] Where context does _not_ explain a low value (e.g. `FELCA` at 65 % with an established previous
      proteome), say that too. The panel's credibility depends on it not explaining away everything.

### Phase 4: Rename and replacement inference

- [ ] **Exact-count pairing only** for a rename claim: a removed species and an added species with
      identical counts. On this fixture that yields exactly two pairs — `USTMA → MYCMD` and
      `CRYNJ → CRYD1` — both of which are real taxonomic renames.
- [ ] A **replacement** is a weaker, separately-labelled category: near-but-not-equal counts with
      corroborating evidence such as a shared genus prefix. `DAPPU` (30,118 → 0) with `DAPMA`
      (0 → 26,600) is the example — 12 % apart, same genus, not a rename.
- [ ] Do **not** use a loose percentage tolerance. A 10 % window produces 7 candidates on this data of
      which 5 are nonsense; see Failed Approaches.
- [ ] Label renames so release comparisons are not dominated by misleading largest-increase/decrease
      entries — consumed by `06`.
- [ ] Renames are inferred from a **truncated** table (50 of 147 rows). State that the inference covers
      only the rows present, so a reader does not read "2 renames" as "2 renames in the release".

### Phase 5: Tests

- [ ] `DAPMA` is flagged new by both sources and its 0 % is marked explained.
- [ ] Exactly two exact-count rename pairs are found, and they are `USTMA→MYCMD` and `CRYNJ→CRYD1`.
- [ ] `DAPPU`/`DAPMA` is classified as a replacement, not a rename.
- [ ] No rename pairs `CITSI`, `ERYGU` or `AMBTC` with `DAPMA` — the specific regression the loose
      heuristic caused.
- [ ] A species present in node tracking but absent from the truncated comparison table has unknown —
      not zero — previous counts, and is **not** claimed to be new.
- [ ] `stripSection('node_tracking')` leaves the species detail usable from the remaining sources.
- [ ] The distribution renders with 131 points, with 1 point, and with 0 points.

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written. Rename pairs and the DAPMA evidence verified against the
  fixture.
- **Next immediate action:** blocked on `01-report-model`. Start with Phase 1 (the joined record) —
  everything else in this plan is a view over it.
- **Recent commands run:**
  - `python` ad-hoc rename-candidate analysis over `docs/build_state.json`
- **Uncommitted changes:** none.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried                                                           | Why it failed                                                                                                                                                                                                                              | Date       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Rename detection by count similarity within 10 %                         | 7 candidate pairs on this fixture, 5 of them wrong: it pairs `CITSI` (27,934), `ERYGU` (27,425) and `AMBTC` (27,327) with `DAPMA` (26,600) purely because the numbers are close. Exact-count matching yields exactly the two real renames. | 2026-08-27 |
| Treating a species missing from the comparison table as `prev_count = 0` | The table holds 50 of 147 rows. Absence means unknown, and reading it as zero would manufacture ~97 phantom "new species".                                                                                                                 | 2026-08-27 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers

- Depends on `01-report-model` Phase 1 (and its decision on where the joined species map lives).

## Notes

- Species facts, the low tail, the rename pairs and the DAPMA corroboration are in
  [`01-report-model` Appendix A.6 and A.9](./01-report-model.md#a6-node-forward-tracking).
- `USTMA → MYCMD` is _Ustilago maydis_ → _Mycosarcoma maydis_ and `CRYNJ → CRYD1` is a
  _Cryptococcus_ strain redesignation. Both are genuine taxonomic reclassifications, which is why the
  counts match exactly — useful reassurance that exact-count matching is detecting a real phenomenon
  rather than a coincidence.
- The brief only names `USTMA → MYCMD`. Finding the second pair is a good sign the heuristic
  generalises; finding a third with a loose tolerance was a bad sign that it over-fires.

## Lessons Learned

- [Fill during and after the task.]

## Additional Context (Claude)

- The distribution plot is the highest-risk visual in the prototype. With MAD 0.4 and 92 % of species
  above 90 %, a plain 0–100 % strip is a solid bar at the right edge with a handful of dots trailing
  left. Options to try: a log-scaled _unmapped_ axis instead of a linear mapped-percentage axis (the
  interesting quantity is the shortfall, which spans orders of magnitude); a full-range strip with a
  zoomed inset over 88–100 %; or plotting unmapped node **count** rather than rate, which also fixes
  the fact that a 65 % species with 8,910 nodes matters less than a 90 % species with 200,000.
  Worth prototyping all three against the real data — this is where "surface problems rather than
  forcing users to inspect every species" is won or lost.
- Consider whether the species detail should be reachable from anywhere a species appears (comparison
  table, UniProt table, distribution) via one shared entry point. That would make the cross-section
  value visible from several directions rather than only from node tracking.
