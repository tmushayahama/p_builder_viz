# What this UI can be

Written 2026-08-30, from reading `panther_build` (the pipeline that produces the JSON) and
`panther-workspace` (the redesign SDLC effort). Everything marked **verified** was read out of those
repos; everything marked **inferred** is my reading and needs team confirmation.

---

## Where this project sits

`panther_build/.specs/2026-08-13-build-state-report-design.md` §11 lists as explicitly out of scope:

> **The web app** that consumes `build_state.json`. This design only guarantees the payload and its
> key stability.

**This repo is that web app.** The generator side is already built and merged — 39 commits on
`issue-64-build-state-report`, 185 tests. So the contract is not hypothetical, and neither side has
to guess at the other.

The producing chain, all **verified**:

```
$TARGET/reports/*.tsv          written by pipeline steps during the build
  → scripts/build_state.py     8 collectors, --write, --snapshot, --budget
      → $TARGET/reports/build_state/build_state.json   ← what we consume
                                  build_state.md       archival human copy
                                  build_state.tsv      spreadsheet headline rows
```

`make target/state` is the Makefile wrapper. The report is a snapshot of _now_, overwritten each
run; `--snapshot` additionally writes a timestamped `build_state_<UTC>.json`.

---

## What the generator emits today

**Verified** — `build_state_collectors/__init__.py` `REGISTRY`, in display order:

| id              | reads                                                                                              | our view                |
| --------------- | -------------------------------------------------------------------------------------------------- | ----------------------- |
| `config_ledger` | `reports/build_config.jsonl`                                                                       | preamble + config tiers |
| `progress`      | the target's own `scripts/make_all.slurm`, `logs/`, artifact mtimes                                | spine, frontier, holes  |
| `mapping`       | `reports/mapping_stats.tsv`, `..._by_mechanism.tsv`                                                | mapping progression     |
| `node_tracking` | `nodeForwardTracking/{speciation,duplication,horiz_transfer}/*`, `nodeMapping_stats_by_genome.tsv` | distribution + species  |
| `library`       | `DBload/node.dat`, `RP_taxonomy_organism_lib.txt`, `DBload/sfToPTN`                                | library contents        |
| `prev_lib`      | `reports/prev_lib_baseline.json`                                                                   | comparison              |
| `giga`          | `empty_trees.txt`, tree counts, retry dirs                                                         | tree building           |
| `other_reports` | an **allowlist** of four `reports/*.tsv`                                                           | tables                  |

Our eight sections match one-for-one. The generic renderer is not speculative: the collector
contract already promises `text` / `rows` / `tables` / `headline` / `warnings`, which is exactly what
our fallback renders.

**A detail worth building on:** phases come from `# PHASE:` markers in the target's _own copy_ of
`make_all.slurm`, rendered by `envsubst` at build time. Phase structure is therefore per-build and
can legitimately differ between targets — the UI must never hardcode the 14 we see.

---

## Constraints the pipeline imposes — things the UI must not promise

All four are **verified** in `.plans/2026-08-13-build-state-report-follow-ups.md`, which is a
deliberate deferral list, not a bug tracker.

### 1. Attempt histories are empty on every real build

The largest gap, and it directly affects us. Two measured causes:

- `progress.step_key_for` derives a key from the Make goal (`giga.touch` → `giga`), but SLURM `%x`
  defaults to the _script_ name (`giga.slurm`). **0 of 59** step keys match any real job name.
- `SBATCH = sbatch --output=$*/logs/…` uses the rule _stem_, so the longest-running compute — GIGA,
  MAFFT, seed MSAs, subfamily HMMs, the whole `prev_lib_rebuilt/` chain — writes into
  `$TARGET/famlib/dev/PANTHER<V>/lib_<V>/logs/`, while `progress.collect` reads only
  `$TARGET/logs`.

**Consequence:** `attempts` is always `[]`, so `running` / `failed` / `unknown` are _unreachable_,
and both ⚠ cross-checks in spec §3 never fire.

Our attempt-history UI is therefore correct but inert — only reachable through the `toFailed()`
fixture. That is the right call (the spec's own example rendering shows a three-attempt GIGA
history), but **we should label it as anticipating a capability, not reflecting one**, or a reviewer
will conclude the builds never fail.

### 2. The previous-library comparison is permanently unavailable, not transiently

`Makefile:361` defines the `reports/prev_lib_baseline.json` rule, but **nothing depends on it** — not
`%/all`, not `%/state`, not any line in `make_all.slurm`. `prev_lib.collect` returns `None` without
it.

So our fixture's `"inputs not present yet"` is not a mid-build state that resolves later. It reads
that way **forever** until someone wires the goal. Our decision to assemble the comparison from
`other_reports` instead is, in hindsight, not a graceful-degradation nicety — it is the only path to
a comparison at all on a real build today.

### 3. `--budget` does not bound the run

It gates whether an expensive collector _starts_. `node_tracking`'s first-run walk over ~15,500
`treeNodes.tab` files can overrun the 5–10 minute cap with nothing to interrupt it. If the UI ever
triggers generation, it cannot rely on a bounded response.

### 4. Renderers sit outside the error-isolation guard

`_run_collector` is airtight, but `render_json` / `render_md` / `render_tsv` are not. A future
collector returning a `Path` in `headline`, or a `tables` entry missing `truncated`, aborts the whole
run and writes **nothing** — after the collector already reported `status: ok`. Our UI can receive a
stale file with no indication that the latest run failed.

---

## What can be added

Ordered by value-per-effort. Each is grounded in an artifact that already exists.

### A. Three-column comparison — previous / rebuilt / new

**The most valuable addition, and we currently model only two columns.** Spec §7:

```
metric              PTHR19     rebuilt    PTHR20     Δ vs 19
genomes                   147          —        152       +5
sequences           2,102,411  2,102,411  2,292,053  +189,642
families               15,619     15,402     15,488     -131
subfamilies           134,192          —    138,401   +4,209
```

`prev_lib_rebuilt/` is the previous library **with splits, merges and removals already applied**. The
middle column therefore separates _the effect of family surgery_ from _the effect of new data_ —
which is the question a release reviewer actually has. A two-column view conflates them.

Note the blanks are structural, not missing data: the rebuilt column is sourced from
`refProteomePANTHERmapping_single_genome_fams_removed`, which records neither a genome roster nor
subfamilies. Our `Availability` model already handles this; the UI must render `—` and explain why,
not "unavailable".

### B. Six report files the pipeline already writes but nobody surfaces

`other_reports` is an **allowlist** of four. The spec's own context section lists these as already
written to `$TARGET/reports/` and **not** in it:

- `multi_proteome_conflicts.txt`
- `new_lib_unmapped_by_ID_counts.txt`
- `species_namespace_counts_new_lib.txt`
- `tree_rules_all`
- `dropped_dup_gene_ids_mapping_lines.txt`
- `createSeqClassification.log`

Adding one is "one `Entry`, not zero code" on the generator side, and **zero** on ours — the generic
renderer picks them up. This is the cheapest way to widen the report, and the best demonstration
that the extensibility story is real. Several are species-keyed and would join straight into the
species cross-section.

### C. SLURM execution metadata, once item 1 is fixed

The spec already designs for it, and `sacct` supplies state, exit code, **elapsed time** and
**MaxRSS**. That unlocks what we currently fake with inferred artifact spans:

- real per-step runtime, so `timing.provenance` flips from `inferred` to `measured` — our model
  already carries that field and the UI already distinguishes it
- job IDs as the ordering key (monotonic per cluster; immune to `touch`, copies and clock skew)
- memory high-water marks — a natural "why did this phase take 9h41m" drill-down
- the two ⚠ cross-checks: artifact newer than its latest job (**modified outside the build**), and
  artifact older than an upstream artifact (**stale, needs rerun**)

**Inferred:** a memory/runtime view per phase is probably the single most requested thing from
whoever babysits these builds, and it costs us nothing but a chart once the data arrives.

### D. The config ledger is append-only — we render one record of many

`reports/build_config.jsonl` gets **one record appended each time `%/all` fires**. The spec: _"a
config change mid-build becomes visible rather than silently overwriting the earlier value"_, and the
report renders a ⚠ with a field-level diff when records differ.

We currently show the latest record as though it were the only one. A timeline of config changes
across a build is a genuinely new view, and it is the thing that explains "why does this artifact
disagree with that one".

The ledger also carries, per spec §4, things we do not show:

- **external tool versions** — MAFFT, HMMer, BLAST, GIGA, ROBOT, OWLtools
- **QfO / RefProt README version lines** and the QfO **directory sha256**
- every `PREV_*` path resolved

For a permanent build record, tool versions matter as much as library versions. This is the
provenance view's real content.

### E. Build-over-build comparison, via `--snapshot`

`--snapshot` writes timestamped `build_state_<UTC>.json` files beside the canonical one. Two
snapshots make a diff view possible — what moved between Tuesday and Thursday — with no generator
change at all. The plans already flagged a report diff as out of scope for the generator; it is
natural on our side.

### F. Species-count reconciliation as a first-class view

Our fixture shows 131 / 131 / 131 / **147** and we currently present it as "a different denominator".
The real story is more interesting and is a known pipeline bug (follow-ups item 9, **verified**):
`oscode_from_species_tree.py` walks every graph node, so `genome_list.txt` contains ancestral names
alongside leaf OSCODEs — measured at 261 total, 116 ancestral, 145 real leaves, against 143 UP-numbered
proteomes.

Two traps recorded there that any UI explanation must respect: the ancestor list is _not_ a usable
complement (`S=Opisthokonts` vs graph node `Opisthokonta`), and OSCODEs are **not** uniformly five
characters — `PIG` and `RAT` are real, so a `^[A-Z0-9]{5}$` filter silently drops them.

---

## What can be removed

- **The `toStale()` fixture path is near-unreachable in practice.** Report freshness compares generation
  time to the newest artifact; since the report is regenerated on demand and overwrites,
  `potentially-stale` mostly indicates the _cross-check_ case in item C, which does not fire yet.
  Keep the state, drop any prominence it has.
- **`render_tsv`'s shape assumption is not ours to mirror.** Only `giga`, `library`, `prev_lib` and
  `config_ledger` are `{metric,value}`-shaped; the TSV mislabels `mapping` and drops columns for
  `node_tracking`. If we ever offer a "download as TSV", generate it from our model rather than
  proxying theirs.
- **The `.md` output already exists.** `build_state.md` is the generator's own archival human copy.
  Our plan 07 print/PDF/Markdown export should not duplicate it — better to _link_ to it, or drop
  the Markdown half of that plan entirely and keep only print.

---

## Open questions for the team

1. **Is the web app meant to trigger generation, or only read?** Everything in the spec assumes a
   file on disk. If the UI ever calls `make target/state`, the unbounded `--budget` (item 3) and the
   unguarded renderers (item 4) both become our problem.
2. **One target or many?** Every artifact path is `$TARGET`-scoped and the report is reproducible
   from the target alone. A target picker changes the IA substantially — the spine assumes one build.
3. **Is `prev_lib_baseline.json` going to be wired?** It decides whether the comparison view is a
   first-class feature or permanently a fallback assembled from `other_reports`.
4. **Does the UI belong in `panther-workspace`'s redesign?** That repo is in Phase 1
   (_document what exists_) with `panther_build` as one of 10 legacy systems. This viewer is new
   build, not legacy documentation — worth confirming it is not expected to follow that SDLC gate.

---

## Sources

- `panther_build/.specs/2026-08-13-build-state-report-design.md` — the contract (500 lines)
- `panther_build/.plans/2026-08-13-build-state-report-follow-ups.md` — deferred gaps (162 lines)
- `panther_build/scripts/build_state.py` + `build_state_collectors/` (~1,500 lines)
- `panther_build/CLAUDE.md`, `docs/orchestration.md`, `docs/data-pipeline.md`
- `panther-workspace/CLAUDE.md`, `SDLC-WORKFLOW.md`, `docs/phase1/`
