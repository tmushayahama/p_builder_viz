# Task: Derived build-report model, schema contract, and fixture transforms

**Status:** ACTIVE
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Derived Checks Layer", "Phase Timeline and Timing Model", "Phase-to-Report Binding", "Schema Version and Unknown Values", "Prototype Fixture Strategy", "Metric Definitions Registry"
**Branch:** main (no feature branches yet)

## Goal

Turn `docs/build_state.json` into a derived build model that every view reads, so no component ever
touches the raw JSON. "Done" means: `raw build JSON → derived build model → UI` is real, the model is
pure and total, unknown schema versions and unknown enum values degrade visibly instead of being
coerced, and the application states the brief asks for are produced by deterministic transforms of
the real fixture rather than hand-authored JSON files.

This plan owns the data substrate only. It ships no UI. It is the dependency of every other plan, and
it is the single place the verified data facts (see the Appendix) are recorded.

## Context

- **Related files (to create):**
  - `src/features/build/model/types.ts` — the domain model
  - `src/features/build/model/parse.ts` — `parseBuildState(raw: unknown): BuildReport`
  - `src/features/build/model/sections/*.ts` — one extractor per section family
  - `src/features/build/model/schema.ts` — schema-version support contract
  - `src/features/build/model/timing.ts` — the dual timing model
  - `src/features/build/model/binding.ts` — `sectionId → phaseId` registry
  - `src/features/build/model/definitions.ts` — metric definitions registry
  - `src/features/build/model/anchors.ts` — deep-link anchor/route builders
  - `src/features/build/fixtures/source.ts` — the static import of `docs/build_state.json`
  - `src/features/build/fixtures/transforms.ts` — the deterministic state transforms
  - `src/features/build/fixtures/index.ts` — the named state catalog
- **Reads:** `docs/build_state.json` (static import; the data is static and there is no fetch layer)
- **Triggered by:** the v3 brief. Supersedes an earlier v1-based approach that pre-generated four
  fixture JSON files — see Failed Approaches.

## Current State

- What works now: nothing. The repo is a bare template (React 19 / Vite / Mantine / Tailwind / RTK)
  that boots to a placeholder route. `docs/build_state.json` is committed.
- What's broken/missing: everything in this plan.

## Steps

### Phase 1: Domain model and section extractors

- [ ] Define the domain model in `types.ts`: build identity, health, pipeline (phases → steps →
      attempts), mapping, node tracking, library, trees, comparison, provenance, checks, report
      registry entries.
- [ ] Make absence a first-class value. Every sub-summary carries an `Availability` —
      one of `available`, `partial`, `absent`, `error`, `unknown` — plus the generator's own
      `message`. Sub-summaries are always objects, never `null`, so no view null-checks a summary.
      **Never render a zero where a measurement is absent.**
- [ ] Write one extractor per section family, each wrapped so a malformed section degrades that part
      only and appends to `ingestNotes`.
- [ ] `parseBuildState` must be pure and total: no `Date.now()`, no `Math.random()`, no argless
      `new Date()`, and it must not throw on `null`, `{}`, `{sections: 'nope'}`, a section whose
      `data` is a string, or sections in reversed order.

### Phase 2: Frontier and holes

- [ ] Compute `frontierIndex` = the highest phase index with any completed step.
- [ ] Derive phase status as `complete | active | hole | pending | blocked`, where `hole` is a phase
      behind the frontier that never finished. **A hole is not where the build stopped** — the model
      must make that distinction structurally, not by wording in a component.
- [ ] Expose `holes[]` separately from the frontier so the UI can present them as different
      conditions rather than two shades of "incomplete".

### Phase 3: Dual timing model (`timing.ts`)

- [ ] Keep **declared pipeline order** (for the step list and spine) and **artifact time order** (for
      the inferred timeline) as two separate orderings. Never reorder one to satisfy the other.
- [ ] Every timing value carries a provenance of `measured | inferred | unavailable`. `measured` reads
      optional `started_at` / `ended_at` / `job_id` fields — absent in this fixture, supported from
      day one so Slurm timing can take precedence later without a UI change.
- [ ] Clamp elapsed intervals at zero. **Never emit a negative interval** — the fixture has 2
      out-of-order completed steps and naive subtraction produces one.
- [ ] Flag tightly clustered artifact times as _potentially concurrent_ rather than sequential.
- [ ] Label inferred spans as artifact activity, e.g. `≈ 2.9h elapsed`, never as measured runtime.

### Phase 4: Report freshness

- [ ] Compare report `generated_at` against the newest artifact mtime to yield one of
      `current`, `potentially-stale`, `unknown`. This fixture is **Current** by 73.7 h, which is
      positive evidence and should read as such.

### Phase 5: Schema contract and unknown values (`schema.ts`)

- [ ] Declare the supported `schema_version` set explicitly. A newer or unrecognised version renders
      a visible degradation notice; it does not silently proceed and does not refuse to render.
- [ ] Never discard unknown fields or sections — preserve them for the generic renderer.
- [ ] An unknown section `status` renders as `Unknown status: <value>` with the literal value kept
      visible. **Do not coerce it into a known state.** Same rule for any unfamiliar enum.

### Phase 6: Phase-to-report binding (`binding.ts`)

- [ ] Registry mapping `sectionId → phaseId`, supporting many sections per phase and one section
      contributing to more than one view.
- [ ] Unmapped and unknown sections collect under an **Unattached reports** node at the end of the
      spine — surfaced, never hidden.
- [ ] Read an optional per-section phase hint if present, so the binding can become data-driven
      later without a model change.

### Phase 7: Metric definitions registry (`definitions.ts`)

- [ ] One registry of user-facing metric labels + short explanations, consumed identically by
      summaries, charts, tables, tooltips, exports and checks.
- [ ] It must disambiguate the **six** distinct sequence counts in this fixture (Appendix A.4). No
      screen may label a bare number "Sequences".

### Phase 8: Anchors (`anchors.ts`)

- [ ] Stable deep-link anchor + route builders for phase, step, report, check, species, config key and
      metric. Nothing outside this module hand-writes an anchor, so links and DOM ids cannot drift.

### Phase 9: Fixture transforms (`transforms.ts`)

- [ ] Deterministic, pure `BuildState → BuildState` transforms composed over the real fixture:
      `toCompleted()`, `toEarly()`, `toFailed()`, `toWarning()`, `stripSection(id)`, `toTruncated()`,
      `toStale()`, `withUnknownSection()`, `withUnknownStatus()`, `withFutureSchema()`.
- [ ] `toFailed()` must populate attempt history (status, timestamps, job id, log reference) because
      the real fixture has none and the failure UI would otherwise be untested.
- [ ] `toCompleted()` must recompute per-phase `done`/`total` and the headline counters from the step
      statuses it rewrites — see Failed Approaches; getting this wrong makes the frontier derivation
      nonsense.
- [ ] Every transform is composable and named in the catalog, so a state is a recipe over real data
      rather than a separate file that can drift.

### Phase 10: Unit tests

- [ ] `parseBuildState` arithmetic against independently computed expectations (Appendix A).
- [ ] Totality: the malformed inputs listed in Phase 1.
- [ ] Determinism: same input parsed twice is deeply equal; every transform is idempotent in the
      sense that composing it twice equals composing it once where that is the intent.
- [ ] Every transform produces a self-consistent state (phase counters agree with step statuses;
      completed steps have an mtime and incomplete ones do not).

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written; data facts verified against `docs/build_state.json` and
  recorded in the Appendix. No model code exists yet.
- **Next immediate action:** Phase 1 — write `types.ts`, starting from the section inventory in
  Appendix A.1.
- **Recent commands run:**
  - `python` ad-hoc inspection of `docs/build_state.json` (facts in the Appendix)
- **Uncommitted changes:** none — working tree clean at the template commit.
- **Environment state:** `node_modules` installed; dev server not running; nothing to tear down.

## Failed Approaches

<!-- Prevent repeating mistakes after context reset -->

| What was tried                                                                | Why it failed                                                                                                                                                                                                                                                                                                                                   | Date       |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Pre-generating four standalone fixture JSON files with a build script         | v3 explicitly rejects hand-authored parallel fixtures in favour of deterministic transforms over the real JSON. Separate files also drift from the real schema, and the generator silently emitted a state the real generator never would (phases reading 3/5 while all five steps said `done`) because per-phase counters were not recomputed. | 2026-08-27 |
| Trusting the report's own `pct_change` column in the species comparison table | It stores a fraction (`-1.0` for a complete removal), not a percentage. Formatting it directly yields a −1 % bar where −100 % belongs. Recompute from the counts.                                                                                                                                                                               | 2026-08-27 |
| Rename detection with a 10 % count tolerance                                  | Produces 7 candidate pairs on this fixture of which 5 are nonsense (it pairs `CITSI`/`ERYGU`/`AMBTC` with `DAPMA`). Only exact-count matches are defensible — see `05-species-cross-section`.                                                                                                                                                   | 2026-08-27 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers

- None currently.

## Notes

- **The data is static.** `docs/build_state.json` is imported directly (`resolveJsonModule` is on).
  There is no fetch, no RTK Query endpoint, no loading state. `useBuildReport()` is the only seam a
  future API needs to replace, with `parseBuildState` staying in front of it.
- Parsing is memoised per state recipe, not per render. A module-level cache keyed by the transform
  chain is sufficient and keeps the model pure.
- The brief lists "extension" as an assignment mechanism. **It is not one in this data** — see
  Appendix A.5. Model mechanisms from what the JSON contains, not from the brief's prose.
- `ragged_rows` is a **count, not a boolean** (Appendix A.6). Typing it as `boolean` compiles and then
  silently reads `813` as truthy, which happens to work and will break the day it is `0` vs `false`.

## Lessons Learned

- Verifying the brief's factual claims against the fixture before planning found two things the brief
  does not mention (a second exact rename pair, and the false-positive rate of loose rename matching)
  and one place where the brief and the data disagree (mechanisms). Do this first, every time.

## Additional Context (Claude)

Open questions to resolve while implementing, not before:

- Where should the derived checks live — in this model, or in a layer above it? Current intent:
  the checks layer (`04-derived-checks`) is a separate pure module that _consumes_ `BuildReport` and
  returns `Check[]`, so a check can be added without touching the parser. The model should expose the
  joined facts checks need (e.g. per-species records already merged across sections) rather than
  making each check re-join them.
- Species records are needed by node tracking, the comparison and the UniProt match table. Building a
  single `species: Map<oscode, SpeciesRecord>` in the model — joining all three sources plus
  derived rename/new-species flags — is probably right, and is what makes
  `05-species-cross-section` cheap. Decide in Phase 1.

---

## Appendix A — Verified data facts

Measured from `docs/build_state.json` on 2026-08-27. **These are the reference values for the whole
prototype**; other plans link here rather than restating them. Re-verify if the fixture is replaced.

### A.1 Shape

`schema_version: 1` · `target: "target"` · `generated_at: 2026-08-20T23:26:31Z` · 8 sections.

| Section id      | Status     | Notes                                                            |
| --------------- | ---------- | ---------------------------------------------------------------- |
| `config_ledger` | ok         | resolved values + captured `config.mk` contents + 11 ledger rows |
| `progress`      | ok         | 14 phases, 61 steps, 55 done                                     |
| `mapping`       | ok         | 14 stages, 45 `by_mechanism` rows                                |
| `node_tracking` | ok         | 5 node types, 131 species                                        |
| `library`       | ok         | genomes/sequences/families/subfamilies                           |
| `prev_lib`      | **absent** | message: `inputs not present yet`                                |
| `giga`          | ok         | 15,797 books, 0 empty trees                                      |
| `other_reports` | ok         | 12 metrics + 3 tables, **all three truncated**                   |

No step in the real fixture has a populated `attempts` array, and step statuses are only `done` and
`pending`.

### A.2 Frontier and holes

- Frontier = phase index 12, **Library export products at 10/12**; phase 13 (Final packaging) is 0/2.
- Hole = phase index 2, **Sequence-to-family mapping at 3/5** — `validate_idmapping_step` and
  `validate_blast_step` pending, while phases 3–12 completed. Any model that calls the earliest
  incomplete phase "where the build stopped" is wrong.
- Phase status counts: 11 complete, 1 active (frontier), 1 hole, 1 pending.

### A.3 Timing and freshness

- Oldest artifact `2026-08-16T16:30:32Z`; newest `2026-08-17T21:41:36Z` (≈ 29 h of activity).
- Report generated `2026-08-20T23:26:31Z` → **73.7 h after the newest artifact → freshness Current.**
- **2** out-of-order completed steps in declared order: `organism.dat` before
  `download_resources.touch`, and `ftp/…/PANTHER20.0_HMM_classifications` before `QfO_OrthoXML.xml`.
  The second is the subject of the generator's own stale-artifact warning.
- `config_ledger.current.generated_at` (`2026-08-16T16:35:48Z`) equals the mtime of
  `download_resources.touch`: the config snapshot is taken at **build start**, not at report time.

### A.4 The six sequence counts — the terminology problem

| Value     | Concept                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------ |
| 2,692,827 | previous-library reference/input sequences (`prev_lib_sequences`)                                |
| 2,297,097 | current reference-proteome input sequences (`new_lib_sequences`, = mapping stage 1 `total_seqs`) |
| 2,291,508 | sequences surviving to the final mapping stage (`post_giga.total_seqs`)                          |
| 1,810,099 | sequences **assigned** to a family at the final stage                                            |
| 1,736,983 | sequences represented in the **built library**                                                   |
| 1,627,862 | LEAF nodes mapped forward                                                                        |

Labelling any of these simply "Sequences" is a defect.

### A.5 Mapping

14 stages, `id` → `post_giga`. Assignment 66.9 % → 79.0 % (**+12.1 pp**). Families 15,683 → 15,797.

Distinct mechanisms are **four**: `ID`, `BLAST`, `HMM_scoring`, `RECLUSTER_NEW`. `by_mechanism`
counts are **cumulative totals at that stage**, not per-stage increments. Notable per-stage deltas:

| Stage        | Mechanism delta                             |
| ------------ | ------------------------------------------- |
| `blast`      | BLAST +84,440                               |
| `hmm`        | HMM_scoring +182,097 (largest single gain)  |
| `recluster`  | RECLUSTER_NEW +2,571                        |
| `pass1_trim` | HMM_scoring −4,030 (trimming loss)          |
| `exten`      | HMM_scoring **+9,887**                      |
| `post_giga`  | ID −20, HMM_scoring −154, RECLUSTER_NEW −35 |

**"Extension" is a stage, not a mechanism** — its gain is booked to `HMM_scoring`. The brief's
mechanism list says otherwise; the data wins.

### A.6 Node forward tracking

Overall 2,830,262 / 3,026,743 = **93.5 %**. 131 species reported.

| Node type      | Mapped / total        | %       |
| -------------- | --------------------- | ------- |
| SPECIATION     | 916,937 / 957,149     | 95.8    |
| LEAF           | 1,627,862 / 1,736,983 | 93.7    |
| DUPLICATION    | 280,581 / 326,455     | 85.9    |
| HORIZ_TRANSFER | 4,882 / 5,794         | 84.3    |
| UNKNOWN        | 0 / 362               | **0.0** |

Species distribution is extremely tight at the top: median 99.5 %, MAD 0.4, 120 of 131 species ≥ 90 %.
Low tail: `DAPMA` 0.0, `FELCA` 65.0, `PHANO` 65.0, `POPTR` 68.0, `TOBAC` 73.8, `SPIOL` 77.3,
`MANES` 77.7, `BOVIN` 77.8, `GOSHI` 80.1, `HELAN` 88.3, `HORVV` 89.7. Exactly **1** species at 0 %.

`species_reported` 131 = `library.genomes` 131 = `prev_uniprot_proteomes` 131, but
`other_reports.species_total` is **147** — a different denominator, not a contradiction.

### A.7 Expected passing checks

Positive evidence the checks layer should surface, not just failures:

- **Leaf/library agreement:** LEAF total 1,736,983 **==** library sequences 1,736,983, exact.
- **Four-way family agreement at 15,797:** `post_giga.n_families` == `library.families` ==
  `giga.books_total` == `giga.trees_succeeded`. (`recluster` is 15,823 — 26 higher, expected, because
  trimming runs after reclustering.)
- **Trees:** 15,797 of 15,797 books have a usable tree; **0 empty**.
- **`unresolved_vars: []`** — nothing unresolved in the config ledger.

### A.8 Config tiers

- **Mismatch (counts as an issue):** `QFO_RELEASE_VERSION=2026_02` vs the active
  `QFO_DATA_DIR=ref_prot_2026_01/external_data/qfo_reference_proteome`. The captured `config.mk`
  retains the commented-out `#export QFO_DATA_DIR=QfO_release_2026_02/…` — literal evidence to
  preserve with the finding. Also **`panther_build_dirty: true`**.
- **Notable (visible, not a warning):** `PC_CLASS` and `PC_RELATIONSHIP` inherited from
  **PANTHER18.0**; `PTHR_FULLGO_ANNOT_TSV` = `…/Pthr_GO_19.0.tsv`;
  `PREV_GENE_NODE_DAT=gene_node_19_no_XENTR.dat` and `PREV_SF_TO_SEQ=sfToSeq_19_XENTR_dropped`
  (XENTR was dropped from the previous library); `MAFFT_BINARIES=` is declared but empty.
- **Lineage (positive, display-only):** ~20 `PREV_*` variables consistently reference PANTHER19.0;
  both `PREV_PREV_*` variables reference PANTHER17.0 (internally consistent, though 18.0 would be the
  naive expectation for a 20.0 build — surface as satisfied lineage with a note, not a warning).
- Source revision `7f1ab73e485e5285d2ff53e512a9c3a380863dcd`.

### A.9 Species changes and renames

The species table holds **50 of 147** rows. Within those 50: 16 removals (`new_count` 0) and 3
additions (`prev_count` 0).

**Exact-count rename pairs** — the only defensible ones:

| Removed | Added   | Counts                          |
| ------- | ------- | ------------------------------- |
| `USTMA` | `MYCMD` | 6,788 → 0 and 0 → 6,788 (exact) |
| `CRYNJ` | `CRYD1` | 6,604 → 0 and 0 → 6,604 (exact) |

The brief names only the first. **A likely replacement at lower confidence:** `DAPPU` 30,118 → 0 with
`DAPMA` 0 → 26,600 — same genus, 12 % apart, so a replacement rather than a rename.

**`DAPMA` is new in this build**, corroborated twice: `prev_count` 0 in the species table, and
`no_prev_match = 26,600` of `total_seqs = 26,600` in the UniProt match table. This is why its 0 % node
forward tracking is expected, and it is acceptance question 3.

### A.10 Truncation

Every table in `other_reports` is truncated:

| Table                                       | Rows          | `ragged_rows` |
| ------------------------------------------- | ------------- | ------------- |
| Sequence counts by species, previous vs new | **50 of 147** | 0             |
| Previous-UniProt-ID match by proteome       | **20 of 132** | 0             |
| UniRules gaining in more than one family    | **20 of 813** | **813**       |

`ragged_rows` is a **count, not a boolean**. Client-side sort/filter over any of these would imply a
completeness the report does not have — see `06-results-and-comparison`.
