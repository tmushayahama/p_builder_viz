# Task: Visual language and shared primitives for a dense technical build report

**Status:** PLANNED
**Issue:** [docs/panther-build-dashboard-prototype-brief-v3.md](../../docs/panther-build-dashboard-prototype-brief-v3.md) — "Visual Direction", "Failed Steps and Attempt History" (redundant cues), "Print, Export, and Deep Linking"
**Branch:** main (no feature branches yet)

## Goal

Establish the design system the whole prototype is built from, so the result reads as a **lab notebook

- CI/build report + release review tool** rather than a business analytics dashboard. "Done" means a
  component author has a token for every colour, a primitive for every recurring shape, and no reason
  to reach for a hex value or a decorative card.

This plan ships primitives and tokens only — no build-specific views.

## Context

- **Related files (to create):**
  - `src/index.css` — extend the existing Tailwind entry with the token layer
  - `src/@panther.core/theme/tokens.ts` — typed accessors for the CSS tokens
  - `src/@panther.core/theme/mantineTheme.ts` — extend the existing theme
  - `src/@panther.core/components/**` — primitives (see Phase 3)
  - `src/@panther.core/charts/**` — chart chassis + marks (see Phase 4)
  - `src/@panther.core/hooks/**` — `useElementSize`, `useHashTarget`, `useColorScheme`
  - `src/styles/print.css` — print foundation
- **Depends on:** nothing. Can be built in parallel with `01-report-model`.
- **Depended on by:** every view plan.
- **Triggered by:** the v3 brief's Visual Direction section, which is unusually prescriptive and
  explicitly rules out the default Mantine look.

## Current State

- What works now: `src/index.css` has a minimal Tailwind v4 entry with a `@theme` block (font stacks,
  `text-2xs`) and a `dark:` variant rebound to `[data-mantine-color-scheme='dark']`.
  `mantineTheme.ts` sets control-size defaults. That is all.
- What's broken/missing: no token layer, no primitives, no charts, no print stylesheet.

## Steps

### Phase 1: Token layer

- [ ] Two-layer tokens in `src/index.css`: raw `--pb-*` values declared once per colour scheme, then a
      `@theme` block mapping them onto Tailwind utilities **by role** (`bg-surface-1`, `text-ink-muted`,
      `border-hairline`, `text-status-serious`). Component code names a job, never a colour.
- [ ] **`src/index.css` is the only file in `src/` allowed to contain a colour literal.** Add this to
      `CLAUDE.md` as an enforced pattern.
- [ ] Restrained surfaces: at most three surface steps plus the page plane. No gradients. Hairline
      rings (`box-shadow: inset 0 0 0 1px`) instead of borders, so chrome never competes with data ink.
- [ ] One accent, reserved primarily for **changed, anomalous or attention-worthy** information — not
      for every interactive element.
- [ ] Both colour schemes work from one definition. Dark is the working default for a build console;
      light must be equally deliberate because printing and release review happen in light.

### Phase 2: Typography and numerals

- [ ] `font-variant-numeric: tabular-nums` on every column of figures — tables, axis ticks, step
      counters. This is called out in the brief and is what makes dense numeric rows readable.
- [ ] Near-monospace treatment for **identifiers, paths, revisions, filenames and configuration
      values**. A goal name, an oscode, a git rev and a `config.mk` key all render mono.
- [ ] Compact spacing scale. Dense is the goal; large decorative empty areas are a defect.

### Phase 3: Primitives

Each must handle an absent/unknown value without collapsing to a zero or an empty box.

- [ ] `Panel` — the one container. Hairline ring, tight header, optional actions. When availability is
      not `available`, it renders an `UnavailableNotice` **instead of** children (absent/error) or
      **above** them (partial). This is how the whole app degrades gracefully; get it right once.
- [ ] `UnavailableNotice` — says plainly what is missing and why, quoting the generator's message.
- [ ] `StatusChip` — phase/step/check state. **Always icon + text label.** Never colour, texture or
      animation alone; the brief requires redundant cues, and `failed` must be distinguishable from
      `pending`, `hole`, `warning` and `frontier` by shape and word as well as hue.
- [ ] `UnknownValue` — renders `Unknown status: <value>` with the literal preserved. Used wherever the
      schema contract meets an unfamiliar enum.
- [ ] `MetricValue` — pulls its label and tooltip from the metric definitions registry, so no screen
      can show a bare number labelled "Sequences".
- [ ] `Provenance` — a compact marker distinguishing **generator-emitted** from **dashboard-derived**.
      Two visually distinct treatments, both legible in print and in export.
- [ ] `DeltaValue` — signed count / percentage-point / percent, with a direction arrow so the sign is
      not carried by colour alone.
- [ ] `Disclosure` — progressive disclosure row, keyboard accessible. 61 steps and 131 species depend
      on this.
- [ ] `DataTable` — sortable, sticky header, horizontal scroll inside its own container, tabular
      figures, `pageSize` "show more". **Must accept a `completeness` prop**: when the underlying data
      is truncated it disables sort/filter and shows `50 of 147 rows included in report`, because
      offering them would imply a completeness the report lacks (`06-results-and-comparison`).
- [ ] `KeyValueList`, `CodeBlock` (for `config.mk`, with copy), `CopyButton`, `EmptyState`,
      `FilterRow`, `SegmentedToggle`.

### Phase 4: Chart chassis

- [ ] `ChartFrame` — measures its container, provides the plot rect after margins, renders hairline
      solid gridlines and axes, tick labels, an accessible `<title>`, and a tooltip layer. **Sizes to
      include the axis band** so a card never crops labels into a nested scrollbar. Every chart builds
      on this; no chart re-implements a scale.
- [ ] Fixed mark geometry shared by all charts: bars capped in thickness with the band's leftover left
      as air, rounded data-end and square baseline, 2 px lines, ≥ 8 px markers, a **2 px surface gap**
      between touching fills rather than a stroke, and a 2 px surface ring on overlapping dots.
- [ ] Colour rules encoded in the token accessors, not left to each chart: categorical = identity in
      fixed slot order, never cycled, never reassigned by rank or by a filter; sequential = one hue
      light→dark; ordinal = one hue, monotone steps; diverging = two opposed hues with a neutral
      midpoint; status = the reserved scale, always with icon + label. Validate the categorical set
      for colour-vision separation in **both** schemes before use, and record the result in a comment.
- [ ] Text in a chart wears ink tokens, never a series colour. Identity comes from a swatch beside
      the text. Label selectively — the endpoint, the extreme, the one series that matters — never a
      number on every point.
- [ ] Every chart ships a hover/focus tooltip **and** a table-view twin. A tooltip may enhance a value
      but must never be the only way to read it.
- [ ] Every chart renders sensibly at 320 / 720 / 1400 px, and on an empty array, a single datum,
      all-zero values, and a container width of 0 before the first measurement.

### Phase 5: Print foundation

- [ ] `src/styles/print.css`: light palette forced, chrome and nav suppressed, disclosures expanded,
      page-break control around phases and reports, and URLs/anchors made visible. The full export
      story is `07-extensibility-search-export`; this plan only ensures the token layer and primitives
      do not have to be rewritten for it.

### Phase 6: Component tests

- [ ] `Panel` degradation paths for each `Availability`.
- [ ] `StatusChip` renders a text label for every state (guards against a colour-only regression).
- [ ] `DataTable` disables sort and shows the completeness note when `completeness` says truncated.
- [ ] Chart chassis: zero-width container, empty data, single datum — no `NaN` in emitted SVG
      coordinates (a `NaN` silently blanks a chart rather than throwing).

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written. Nothing built.
- **Next immediate action:** Phase 1 — extend `src/index.css` with the two-layer token block.
- **Recent commands run:** none for this plan.
- **Uncommitted changes:** none.
- **Environment state:** `node_modules` installed; dev server not running.

## Failed Approaches

| What was tried                                                 | Why it failed                                                                                                                                                                                         | Date       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Leading views with a large hero figure and a colourful KPI row | v3 explicitly rejects both: the preamble should read as "the header of a scientific build record, not an analytics dashboard hero section", and "excessive colorful KPI cards" is listed under Avoid. | 2026-08-27 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers

- None currently.

## Notes

- The brief's Avoid list is a real constraint, not taste: **no** card-on-gray Mantine styling, **no**
  colourful KPI cards, **no** gradients, **no** analytics aesthetics, **no** large decorative empty
  areas. If a screen starts looking like a SaaS dashboard, it is wrong regardless of how clean it is.
- Mantine is for interactive controls (Select, Tooltip, Menu, Modal, Tabs, SegmentedControl, Collapse,
  ActionIcon). Layout and all colour come from Tailwind tokens. Do not use Mantine colour props to
  carry status — that puts colour outside the token layer.
- "Leave room for visual experimentation within that direction" — the tokens and primitives should
  constrain colour and geometry, not composition.

## Lessons Learned

- [Fill during and after the task.]

## Additional Context (Claude)

- The status vocabulary is doing a lot of work and is worth fixing early, because five plans depend on
  it: phase `complete | active | hole | pending | blocked`; check `pass | warn | absent`; freshness
  `current | potentially-stale | unknown`; timing `measured | inferred | unavailable`; availability
  `available | partial | absent | error | unknown`. Each needs a distinct icon and word, and `hole`
  versus `pending` versus `blocked` must be unmistakable at a glance since that is acceptance
  question 2.
- Worth prototyping two or three preamble treatments against the real data before committing — it is
  the densest part of the UI and the easiest to get wrong in the analytics direction the brief warns
  about.
