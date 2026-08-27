# Task: Lay down the template as a reviewable, bottom-up commit history

**Status:** COMPLETE
**Issue:** user request — "now start commit bit by bit group things show me first before you commit"
**Branch:** main

## Goal

Commit the initialized template as a sequence of small, coherent commits rather than one bulk import,
so each layer lands on top of what it needs and the history is reviewable. "Done" meant: a plan
approved before anything was staged, then the sequence executed with a clean working tree and all
verification passing at `HEAD`.

## Context

- **Related files:** all 28 tracked files from `.plans/config/01-project-initialization.md`
- **Triggered by:** user request, 2026-08-27, after the template was verified green
- **Pre-existing history:** the user had already made the initial commit `9eb5ada`
  _"init with sample json and spec"_, adding `docs/build_state.json` and
  `docs/panther-build-dashboard-prototype-brief-v3.md`.

## Current State

- What works now: 11 commits on `main` on top of the user's initial commit. Working tree clean.
  Nothing pushed.
- What's broken/missing: nothing in this plan's scope.

## Steps

### Phase 1: Plan and approval — COMPLETE

- [x] Inventory what `.gitignore` would actually track (28 files; `node_modules`, `dist`,
      `.env.development`, `.env.production` and `downloads` correctly excluded).
- [x] Confirm git identity was configured, so commits would not fail mid-sequence.
- [x] Group into 11 commits, ordered so each depends only on earlier ones.
- [x] Present the plan and the two open questions before staging anything.
- [x] Resolve the commit-trailer conflict — see Notes.

### Phase 2: Execute — COMPLETE

- [x] `27bf897` chore: git hygiene files — first, so `node_modules` can never be staged by accident
- [x] `b1b08dc` chore: npm manifest and lockfile
- [x] `30dd8f2` build: TypeScript project configuration (two project references)
- [x] `2c6e9a7` build: Vite config, HTML entry and static assets
- [x] `0287315` feat: Redux store with typed hooks
- [x] `77e655e` feat: Tailwind entry and Mantine theme
- [x] `53303a8` feat: app entry, router and placeholder route — **the app first boots here**
- [x] `34314fb` test: Vitest setup, render helper and smoke test
- [x] `1f7ed24` test: Playwright config and e2e smoke test — adds the third tsconfig reference
- [x] `23ce2aa` chore: ESLint and Prettier configuration
- [x] `6333b88` docs: project documentation and plan template

### Phase 3: Verify at HEAD — COMPLETE

- [x] `type-check` exit 0 · `lint` exit 0 · `test` 2 passed · `build` exit 0 · Playwright 1 passed ·
      `prettier --check` clean
- [x] `git status` clean

## Recovery Checkpoint

✅ TASK COMPLETE

## Failed Approaches

| What was tried                                                      | Why it failed                                                                                                                                                                                                                     | Date       |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Putting all four tsconfig files in one commit                       | `tsconfig.json` would then reference `tsconfig.e2e.json`, whose `include` glob matches nothing until `e2e/` exists — and `tsc -b` errors with _"No inputs were found"_. That breaks `npm run build` for six intermediate commits. | 2026-08-27 |
| Committing the ESLint config alongside the other root configuration | Its `overrides` reference `tsconfig.node.json` and `tsconfig.e2e.json`. Landing it before those exist means `npm run lint` fails until the end of the sequence.                                                                   | 2026-08-27 |
| Assuming the repository had no commits                              | An earlier `git log` reported no commits on `main`, but the user committed `docs/` at 06:11 between that check and the first `git commit`. Re-check state immediately before writing, not just while planning.                    | 2026-08-27 |

## Files Modified

| File                    | Action                                                    | Status |
| ----------------------- | --------------------------------------------------------- | ------ |
| `tsconfig.json`         | committed with 2 references, third added in `1f7ed24`     | done   |
| `CLAUDE.md`             | `downloads/` reference corrected to `docs/` before commit | done   |
| all other tracked files | committed once, in the group listed above                 | done   |

## Blockers

- None. Task complete.

## Notes

- **Ordering rule that shaped the sequence:** a configuration file must not land before the thing it
  points at. That is why the tsconfig set was split across two commits and why the ESLint config lands
  tenth rather than with the other root configuration.
- **Commit trailer.** The default instruction to append a `Co-Authored-By: Claude …` trailer conflicted
  with the rule in `CLAUDE.md` — carried over from `noctua-visual-pathway-editor` — that forbids Claude
  attribution in commit messages. Raised before committing; the user chose to follow `CLAUDE.md`, so no
  trailers were added.
- **Mid-sequence correction.** The user's initial commit put the reference material in `docs/`, but
  `CLAUDE.md` (written earlier) pointed at `downloads/`, which is gitignored and now empty. Corrected
  before `6333b88` so the docs commit was accurate on landing rather than needing a follow-up fix.
- Only `6333b88` is green on every script. Commits 3–8 have no tests to run and no lint config yet;
  that is inherent to laying a scaffold down incrementally, and was flagged to the user before
  executing.

## Lessons Learned

- Showing the grouping before staging caught two ordering problems (the tsconfig reference and the
  ESLint overrides) that would have produced six commits with a broken `npm run build`. The review
  step paid for itself.
- Re-read repository state immediately before mutating it. The user committed while the plan was being
  written, and the plan's "this is the initial commit" assumption was already stale.

## Summary

The template landed as 11 bottom-up commits on `main` atop the user's `9eb5ada`, each one a coherent
layer: hygiene → manifest → TypeScript → Vite → store → theme → app → unit tests → e2e → lint → docs.
Working tree clean, all six verification commands green at `HEAD`, nothing pushed.

**Follow-up work:**

- Nothing is pushed, so the history is still freely rewritable if a different grouping is wanted.
- `downloads/` is still listed in `.gitignore` but is now an empty directory, since the reference
  material lives in the tracked `docs/`. Harmless; remove the ignore rule if the directory is deleted.
