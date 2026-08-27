# PANTHER Build Dashboard Prototype Brief

## Goal

Create a polished, JSON-driven dashboard prototype that demonstrates how a PANTHER library build can be understood from a generated build-state report without requiring direct access to the build filesystem.

The prototype should make it obvious that, given only a structured build JSON, a user can quickly understand:

- where the build frontier currently is
- whether there are incomplete or skipped holes behind that frontier
- whether the build looks healthy
- key sequence mapping and family assignment results
- node forward tracking quality
- meaningful differences from the previous library
- the configuration and provenance used for the build
- whether the report itself is fresh relative to the artifacts it describes
- enough historical context for the report to serve as a permanent build record

The dashboard is a viewer and diagnostic interface, not a pipeline controller.

---

## Prototype Assumption

Use the current `build_state.json` as the primary fixture.

The UI should consume that JSON as though it were produced by a separate report-generation process.

Do not build filesystem scanning, Slurm integration, pipeline execution, or report-generation logic yet.

The prototype should prove:

> Given only a build-state JSON file, we can produce a useful operational, QC, and historical dashboard for a library build.

Future integration can replace the fixture JSON with an API or generated file without requiring a major UI redesign.

---

## Product Mental Model

The dashboard should primarily answer:

1. **Where is the build frontier?**
2. **Are there holes or incomplete checks behind it?**
3. **Is the build healthy?**
4. **What changed from the previous library?**
5. **Can I understand exactly how this library was built later?**

Do not treat the JSON section list as the application navigation.

The pipeline itself should be the spine of the experience.

---

# Primary Information Architecture

## The Pipeline Is the Spine

Use the build phases as the main navigation and visual structure of the page.

A left rail, vertical timeline, or similarly persistent pipeline spine should represent the ordered phases of the build.

The same structure should simultaneously communicate:

- navigation
- progress
- build frontier
- incomplete holes
- warnings
- phase duration
- access to phase-specific reports

Reports should hang from the phase they describe.

Examples:

- Sequence mapping statistics belong to **Sequence-to-family mapping**
- GIGA statistics belong to **Tree building**
- Node forward tracking statistics belong to **Node forward tracking**
- DB load statistics belong to **DB load generation**
- export warnings belong to the relevant **Library export** step
- build configuration and provenance act as a preamble above the pipeline rather than as another peer report tab

Avoid a top-level navigation model that simply mirrors `sections[].id`.


## Phase-to-Report Binding

Because reports are organized around the pipeline spine, the relationship between a report section and a pipeline phase must be explicit in the application model.

For the prototype:

- maintain a registry mapping known `sectionId → phaseId`
- allow multiple report sections to bind to one phase
- allow one report to contribute to more than one view where useful
- collect unknown/unmapped sections under an **Unattached reports** node at the end of the spine rather than hiding them

The future JSON schema should support an optional phase hint on report sections so the binding can eventually become data-driven.

Unknown future sections must still render through the generic fallback even when they have no known phase binding.

This is important to demonstrate real extensibility rather than only extensibility for pre-registered report types.

---

# Build Frontier vs Holes

The UI must distinguish two fundamentally different conditions.

## Frontier

The frontier represents how far the build has genuinely progressed.

For example, if Library export products are incomplete and Final packaging has not started, that is the current frontier.

## Holes

A phase may contain pending or missing steps even though later phases completed successfully.

These are not the point where the build stopped.

The fixture demonstrates this in Sequence-to-family mapping: validation steps remain pending while later mapping, tree building, DB load, and export work has completed.

Represent holes differently from the frontier.

Possible visual language:

- completed: solid
- frontier / current incomplete work: active or emphasized
- hole behind frontier: hatched, hollow, or otherwise visually distinct
- failed: strong error state
- warning: contextual marker

Never imply that the build “stopped” at the earliest incomplete phase if downstream phases have completed.

---

# Phase Timeline and Timing Model

Artifact modification times provide useful timing evidence, but they are not true step runtimes and must not be treated as a sequential execution log.

The fixture contains non-monotonic mtimes inside declared step order and clusters of artifacts completing within a few minutes, which may indicate parallel execution.

The derived model should therefore maintain two separate concepts:

- **declared pipeline order** for the step list and pipeline spine
- **artifact time order** for the inferred timeline

For inferred timing:

- sort artifacts by `mtime` when constructing the timeline
- preserve declared order separately
- never render a negative elapsed interval
- treat tightly clustered artifact times as potentially concurrent rather than necessarily sequential
- describe inferred values as artifact activity / elapsed intervals, not measured runtime

A useful UI label may be:

**≈ 2.9h elapsed**

with a tooltip explaining that the value is inferred from artifact timestamps.

## Future Timing Contract

The derived step model should support optional execution fields from day one, even when they are absent in the current fixture:

- `started_at`
- `ended_at`
- `job_id`

When real execution timing becomes available from Slurm or another source, measured timing should take precedence over inferred `mtime` timing without requiring a UI redesign.

The UI should indicate whether a displayed timing value is:

- measured
- inferred
- unavailable

The timeline should help answer:

> Where was build activity concentrated, and which phases appear to have taken the most elapsed time?

It should also make pipeline holes visually easier to understand.

---

# Report Freshness

Compare the build report generation time with the newest artifact timestamp represented in the report.

Expose a simple freshness state such as:

- **Current** — report generated after the newest known artifact
- **Potentially stale** — an artifact appears newer than the report
- **Unknown** — insufficient timing information

The fixture currently represents a report generated after the final known build artifact, which is useful positive evidence.

Report freshness should be visible near the build identity/provenance area.

---

# Build Preamble

At the top of the dashboard, show the minimum identity needed to understand the build before entering the pipeline.

Possible information:

- PANTHER/library version
- build status
- target/build identifier
- report generation time
- freshness state
- source revision
- dirty/clean source state
- QfO / reference proteome identifiers
- previous library/version
- warning/check summary

Keep this compact and dense.

The preamble should feel like the header of a scientific build record, not an analytics dashboard hero section.

---

# Derived Checks Layer

## Purpose

Do not rely only on `warnings[]`.

Create a client-side derived model, conceptually something like:

**raw build JSON → derived build model → UI**

The derived layer should compute additional consistency checks and contextual interpretations from the JSON.

Each check should have:

- state: pass / warn / absent
- short label
- explanation
- source
- anchor to the relevant phase/report
- whether it came from the report generator or was derived by the dashboard

Generator warnings and dashboard-derived checks must remain visually distinct.

This provenance matters because the dashboard may become part of the permanent build record.

## Show Passing Checks Too

A diagnostic interface is stronger when it shows what was verified, not only what failed.

Useful checks from the fixture include:

### Family-count consistency

The family count across major stages should be compared.

For example:

- reclustering family count
- post-GIGA family count
- library family count
- GIGA book count
- successful tree count

If these values line up where expected, surface that as a positive health signal.

### Leaf/node consistency

Compare LEAF node totals against library sequence totals where appropriate.

A matching count is meaningful evidence that two parts of the build agree.

### Sequence terminology check

The fixture contains multiple sequence counts representing different concepts.

Do not present all of them simply as “Sequences.”

Explicitly distinguish concepts such as:

- input/reference-proteome sequences
- sequences represented in the built library
- mapped/assigned sequences

The UI should prevent users from mistaking differing but legitimate counts for contradictions.

### Config lineage and sanity

Configuration interpretation should use three tiers.

#### Lineage

Display-only, positive provenance.

Derive expected release relationships where possible. For example, a 20.0 build may legitimately reference 19.0 through `PREV_*` inputs and an older release through `PREV_PREV_*`.

When those relationships are internally consistent, show them as satisfied lineage patterns.

These do not contribute to the issue count.

#### Notable

Show historically useful inheritance that falls outside the obvious naming pattern but is not known to be wrong.

Examples may include:

- Protein Class inputs inherited from an older release
- annotation inputs whose filenames encode an earlier release
- other configuration values worth explaining to someone reviewing the build years later

These should be visible but should not count as warnings by default.

#### Mismatch

Count only stronger inconsistencies where the evidence supports a real discrepancy.

For example, if the declared QfO release version disagrees with the active resolved data path, surface that as a mismatch.

Where possible, preserve the evidence that led to the finding, including the literal configuration snapshot and relevant commented lines.

The fixture includes both resolved config values and the captured `config.mk` contents. The dashboard may use both when explaining a mismatch.

Also surface:

- dirty source tree
- unresolved variables
- other directly supported configuration inconsistencies

Do not automatically classify all older-release references as errors.

---

# Cross-Section Species Intelligence

The most compelling value of the dashboard may come from joining related facts across reports.

Do not analyze species only inside isolated tables.

When a species is selected, combine relevant information from:

- node forward tracking
- previous/current species counts
- UniProt/reference-proteome comparison
- rename/match information
- other species-specific reports available in the JSON

## Example: New Species

A species with 0% node forward tracking may look catastrophic in isolation.

If that species is new in the current release and has no previous nodes to map, 0% forward tracking may be expected.

The UI should be able to explain that context directly in a species detail popover or side panel.

This type of cross-report explanation is a central proof point for the JSON-report architecture.

## Example: Renames

Large paired additions and removals with nearly identical counts may represent renamed species rather than biological gain/loss.

Where the data supports it, detect likely rename/match relationships and label them so that release comparisons are not dominated by misleading “largest increase/decrease” entries.

Keep inferred relationships clearly labeled as derived interpretation.

---

# Sequence Mapping and Family Assignment

Mapping should tell the story of how assignment changes through the build.

Prefer a visual progression across stages rather than presenting a raw table first.

The UI should communicate:

- total sequences at each stage
- assigned sequences
- unassigned sequences
- family counts
- contribution by mechanism
- losses caused by trimming/deduplication
- major assignment gains

A stepped stacked-area or similarly compact progression view is a strong candidate.

Mechanisms may include:

- ID
- BLAST
- HMM scoring
- reclustering
- extension

Use the total sequence count as an envelope or related reference so trimming losses remain visible.

Annotate especially meaningful changes rather than requiring users to calculate them mentally.

Exact table data should remain available behind a detail/raw-data view.

---

# Node Forward Tracking

The default experience should make the distribution obvious rather than focusing on a sortable table.

A useful primary visualization is a strip, beeswarm, or compact distribution plot from 0–100%.

This should make the dense cluster of high-performing species visually obvious while leaving low outliers isolated and labeled.

Show:

- overall mapping percentage
- mapping by node type
- species distribution
- labeled low outliers
- contextual species detail on selection

Keep the full species table available behind a toggle or drill-down.

The table is supporting evidence, not the headline experience.

---

# Previous Library Comparison

Comparison with the previous library is a major release-review feature.

Do not tie the information architecture strictly to a single `prev_lib` JSON section.

Relevant comparison data may exist elsewhere in the report.

Present a unified comparison experience that can combine available sources.

Useful comparisons include:

- sequence counts
- family counts
- subfamily counts
- genome/species counts
- largest increases
- largest decreases
- percent changes
- likely renames
- newly added species
- removed species

Normalize inconsistent representations before presentation.

For example, if a change field is stored as a fractional value or string, the UI model should normalize it before formatting it as a percentage.

The goal is:

> What materially changed, and which changes deserve investigation?

---

# Truncation Honesty

Some tables in the report may contain only a subset of their full rows.

The UI must never behave as though truncated data is complete.

If a table contains only part of the result set, clearly display something like:

**50 of 147 rows included in report**

Do not offer client-side sorting/filtering that implies it is operating over the complete dataset unless the complete dataset is actually present.

If only a subset exists, make that limitation explicit.

---

# Warnings and Issues

Warnings should remain contextual.

Examples:

- stale or suspicious artifact
- incomplete validation
- missing report inputs
- report freshness issue
- inconsistent counts
- dirty source tree
- version mismatch worth reviewing

A warning should link directly to the relevant phase, step, artifact, configuration value, or metric.

Avoid a disconnected warning page as the primary experience.

A compact global summary is useful, but investigation should happen in context.


# Failed Steps and Attempt History

Design for failure now even though the current fixture contains no populated attempts.

A step may eventually contain retry/failure history, and the UI should support:

- failed step state
- attempt count badge
- expandable attempt history
- per-attempt status
- timestamps when available
- job IDs when available
- concise failure reason or log reference when available

Add a fixture transform such as `toFailed()` so this state is exercised during the prototype.

A failed state must remain distinguishable from:

- pending
- skipped/hole
- warning
- current frontier

Do not rely on color, texture, or animation alone to distinguish these states. Use labels, icons, shape, text, or other redundant cues.

---

# Permanent Build Record

The same dashboard should work for:

- an active/in-progress build
- a completed historical build

A completed build should feel like a permanent scientific/technical record.

Someone returning later should be able to understand:

- what ran
- approximate timing
- what inputs/configuration were used
- what the major output statistics were
- what changed from the previous library
- what was verified
- what warnings were present
- which conclusions came from the generator versus dashboard-derived checks

---

# Print, Export, and Deep Linking

Because the dashboard is intended to support release review and historical reference, include an export/record story in the prototype.

Explore support for:

- print-friendly layout
- PDF export
- copy/share as Markdown
- direct links to a phase
- direct links to a warning/check/species
- stable anchors within a build report

The web UI is interactive, but the build record should remain useful outside the application.

Any exported or printed check must preserve provenance.

For every warning/check shown in exported output, retain whether it was:

- emitted by the report generator
- derived by the dashboard

Exports should also carry:

- dashboard/application version
- build report schema version
- report generation time
- export generation time where useful

A permanent record must not make a dashboard inference indistinguishable from a generator-authored warning.

---

# Extensibility

Additional statistics should be easy to add without redesigning the application.

The prototype should demonstrate this rather than merely state it.

Create a generic fallback presentation for unknown/future sections based on common structural elements such as:

- headline/summary values
- rows
- tables
- text
- warnings
- status

Conceptually, the UI should be capable of rendering an unfamiliar report reasonably even before a specialized renderer exists.

Add at least one fake future report fixture, such as:

- Pfam coverage
- tree quality
- GO annotation summary

This should prove that new reports can enter the system without changing the core dashboard architecture.

Specialized visualizations can then override the generic presentation when a report becomes important enough.

---

# Prototype Fixture Strategy

Do not hand-author four independent JSON fixtures.

Use the real build JSON as the base and create deterministic transforms that simulate application states.

Useful transforms include:

- `toCompleted()`
- `toEarly()`
- `toFailed()`
- warning build
- `stripSection('node_tracking')`
- truncated report
- stale report
- unknown section
- unknown status
- unsupported/newer schema version

This keeps the fixtures realistic and simultaneously tests graceful degradation against actual data structures.

---

# Schema Version and Unknown Values

The JSON already contains `schema_version`, so compatibility must be part of the prototype contract.

The dashboard should:

- read and display the report schema version
- support known versions explicitly
- visibly degrade when opening a newer or unsupported schema
- avoid silently discarding unknown fields or sections
- preserve unfamiliar report sections through the generic fallback where possible

Unknown `status` values should not be coerced into a known state.

Instead, render them as an explicit **Unknown status: `<value>`** state and keep the underlying value visible for debugging and historical honesty.

The same principle applies to unfamiliar enums or future report structures: degrade visibly rather than pretending they are understood.

---

# Search and Navigation

The build contains enough entities that fast navigation is valuable.

Provide a global jump/search interaction that can find things such as:

- pipeline steps
- species
- config variables
- reports
- warnings/checks

The intent is to make the dashboard feel like an investigative tool rather than a static report.

## Metric Definitions Registry

Maintain a single definitions registry for user-facing metric labels and short explanations.

This is especially important for ambiguous terms such as **sequences**.

The registry should distinguish concepts such as:

- input/reference-proteome sequences
- library sequences
- assigned sequences
- mapped nodes
- families
- subfamilies

Use the same definitions consistently in:

- summary metrics
- charts
- tables
- tooltips
- exports
- derived checks

This avoids fixing terminology in one screen while leaving another ambiguous.

---

# Visual Direction

Aim for a dense technical/scientific build report.

Prefer:

- low chrome
- compact spacing
- tabular numerals
- near-monospace treatment for identifiers, paths, revisions, filenames, and configuration
- restrained surfaces
- clear hierarchy
- subtle but meaningful status language
- one strong accent reserved primarily for changed, anomalous, or attention-worthy information

Avoid:

- generic Mantine card-on-gray dashboard styling
- excessive colorful KPI cards
- unnecessary gradients
- analytics-product aesthetics
- large decorative empty areas

Think closer to:

**lab notebook + CI/build report + release review tool**

than:

**business analytics dashboard**

Leave room for visual experimentation within that direction.

---

# What Not to Build Yet

For this prototype, do not implement:

- pipeline execution
- filesystem inspection
- Slurm job submission
- log discovery
- target-path scanning
- report-generation scripts
- backend persistence
- authentication
- production deployment concerns

Assume another process eventually produces the build JSON.

The prototype exists to prove the value of consuming that JSON well.

---

# Future Data Flow

Expected eventual architecture:

**Build filesystem / intermediate statistics / logs**

→ **report generator**

→ **JSON build report**

→ **dashboard**

The report-generation process should eventually evaluate a target path in roughly 5–10 minutes or less.

Expensive statistics may come from intermediate stats files already produced by pipeline steps rather than being recomputed.

The dashboard remains decoupled from that collection process.

---

# Suggested Prototype Build Order

Prioritize the parts that best demonstrate the concept.

## 1. Pipeline spine + timeline

Build the persistent phase navigation first.

Include:

- phase status
- frontier
- holes
- warnings
- approximate durations

This establishes the overall product model.

## 2. Derived checks layer

Add cross-report consistency checks, report freshness, config sanity, and passing health signals.

This demonstrates that the dashboard can add useful interpretation without modifying the pipeline.

## 3. Species cross-section

Implement species detail that joins node tracking, previous/current counts, and available reference-proteome/match information.

Demonstrate at least one case where raw data looks alarming but cross-report context explains it.

This is an important proof that the JSON report provides more value when interpreted as one coherent build model.

## 4. Mapping progression

Add the stage/mechanism visualization and meaningful annotations.

## 5. Previous-library comparison

Add normalized changes, new/removed species, likely renames, and meaningful outliers.

## 6. Generic renderer + future fixture

Demonstrate extensibility with an unfamiliar report.

## 7. Print/export and polish

Finish the permanent-record experience once the diagnostic model is convincing.

---

# Acceptance Walkthrough

The prototype should be testable against the real fixture with a short scripted review.

A reviewer should be able to answer these questions directly from the dashboard.

## 1. Where is the build frontier?

Expected answer:

**Library export products is incomplete at 10/12, and Final packaging has not started.**

The dashboard must not identify the earliest incomplete phase as the frontier.

## 2. Is anything incomplete behind the frontier?

Expected answer:

**Yes. Two validation steps remain incomplete in Sequence-to-family mapping even though downstream phases completed.**

The UI should identify these as holes, not as the place where the build stopped.

## 3. Is DAPMA's 0% node forward tracking necessarily a problem?

Expected answer:

**No. The joined species context indicates that DAPMA is new in this build and has no previous nodes to forward-track.**

The dashboard should explain why the raw 0% value is expected rather than merely flagging it as the worst species.

## 4. Is a large species decrease necessarily a biological loss?

Expected answer:

**Not always. A paired drop/add with near-identical counts may indicate a rename or matched replacement, such as USTMA → MYCMD.**

The UI should distinguish likely renames from genuine gains/losses when the available data supports that interpretation.

## 5. Why do two values labeled “sequences” differ substantially?

Expected answer:

**They refer to different concepts: reference/input sequences versus sequences represented in the built library.**

The dashboard should use explicit metric definitions so these values are not presented as contradictory.

---

# Overall Success Criteria

The prototype succeeds if those five questions can be answered in a few minutes without inspecting the raw JSON.

It should also make clear:

- whether the report is fresh
- whether important cross-report consistency checks pass
- which findings came from the generator versus the dashboard
- which configuration/version inputs were used
- whether data shown in a table is truncated
- whether a step failed or was retried
- whether the dashboard understands the report schema version
- enough context to understand the build later

Most importantly, the design should make a strong case that a single generated JSON report can support:

**build monitoring + QC + release review + historical provenance**

without requiring the web application to access the build filesystem directly.
