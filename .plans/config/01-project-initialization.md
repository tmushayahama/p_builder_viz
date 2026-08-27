# Task: Initialize the project from the noctua-visual-pathway-editor stack

**Status:** COMPLETE
**Issue:** user request — "initialize this project by copy template and tech stack from C:\work\go\noctua-visual-pathway-editor react mantine, tailwind etc."
**Branch:** main

## Goal

Stand up an empty repository as a working React + TypeScript SPA template using the same stack and
conventions as `C:/work/go/noctua-visual-pathway-editor`, so that dashboard work can start against a
known-good baseline. "Done" meant: dependencies installed, the app boots, and `type-check`, `lint`,
`test`, `build` and Playwright all pass.

Explicitly **not** in scope: implementing the build dashboard. The brief in `docs/` was a heads-up
about upcoming work, not a work order — see Failed Approaches.

## Context

- **Source template:** `C:/work/go/noctua-visual-pathway-editor` (React 19, Vite 6, Mantine v9,
  Tailwind v4, Redux Toolkit, Vitest, Playwright, ESLint 8 + Prettier)
- **Triggered by:** user request, 2026-08-27
- **Reference material left untouched:** `docs/build_state.json`,
  `docs/panther-build-dashboard-prototype-brief-v3.md`

## Current State

- What works now: everything below. The template boots, and all five verification commands pass.
- What's broken/missing: nothing in this plan's scope. The application itself is unbuilt by design —
  see `.plans/feature/01-report-model.md` and its siblings.

## Steps

### Phase 1: Dependency set — COMPLETE

- [x] Copy the template's `package.json` scripts and dependency choices.
- [x] Drop what a report viewer does not need: Apollo/GraphQL, JointJS, ReactFlow, dagre, graphlib,
      socket.io, axios, react-hook-form, react-ga4, uuid, @use-gesture.
- [x] Keep: React 19, react-dom, react-router-dom v7, Mantine v9 (core/hooks/notifications), Redux
      Toolkit + react-redux, Tailwind v4 + `@tailwindcss/vite`, framer-motion, react-icons,
      vite-plugin-checker, rollup-plugin-visualizer, clsx.
- [x] Dev: Vitest, RTL, jsdom, Playwright, ESLint 8 + `eslint-config-react-app`, Prettier +
      `prettier-plugin-tailwindcss`, TypeScript 5.7, `@types/node`.
- [x] `npm install` — 696 packages.

### Phase 2: Build and language configuration — COMPLETE

- [x] `tsconfig.json` solution file with project references; `tsconfig.app.json` (src + tests),
      `tsconfig.node.json` (vite.config.ts), `tsconfig.e2e.json` (e2e + playwright.config.ts).
- [x] `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
      `noUncheckedSideEffectImports` on, matching the template.
- [x] `vite.config.ts`: port 4310, `@` and `@tests` aliases mirroring tsconfig, vendor
      `manualChunks`, hashed asset output, the Vitest config block, and `vite-plugin-checker`.
- [x] `.eslintrc.json` and `.prettierrc.json` carried over, including the rule that bans
      `useSelector`/`useDispatch`/`useStore` imports from react-redux outside `@/app/hooks`.
- [x] `playwright.config.ts` on 4310 with its own dev server.
- [x] `.gitignore`, `.gitattributes` (LF on all text types), `.env.example`/`.env.development`/
      `.env.production`, `.claude/settings.json`, `.plans/` category folders + `template.md`.

### Phase 3: Minimal boot shell — COMPLETE

- [x] `src/main.tsx` — Redux Provider + StrictMode, Mantine stylesheets imported before ours.
- [x] `src/App.tsx` — `MantineProvider` as a controlled consumer of the store's colour scheme.
- [x] `src/app/store/store.ts` — `combineSlices` + `makeStore(preloadedState)` for tests.
- [x] `src/app/hooks.ts` — the typed `useAppDispatch`/`useAppSelector`, the one file where the
      restricted-import rule is disabled.
- [x] `src/app/slices/uiSlice.ts` — colour scheme, so Mantine does not hold a second copy.
- [x] `src/app/routes.tsx`, `src/app/layout/AppLayout.tsx`,
      `src/features/home/components/HomePage.tsx` — a placeholder route that exercises a Mantine
      component, a Tailwind utility and a typed store read.
- [x] `src/index.css` — Tailwind v4 entry with a `@theme` block and the `dark:` variant rebind.
- [x] `src/@panther.core/theme/mantineTheme.ts` — control-size defaults.

### Phase 4: Test harness — COMPLETE

- [x] `tests/setup.ts` — stubs `matchMedia`, `ResizeObserver`, `scrollIntoView`.
- [x] `tests/test-utils.tsx` — `renderWithProviders` wrapping store + Mantine + `MemoryRouter`,
      accepting `preloadedState`, `store` and `route`.
- [x] `tests/features/home/HomePage.test.tsx` — 2 tests.
- [x] `e2e/smoke.spec.ts` — boots the app and round-trips the colour-scheme toggle.

### Phase 5: Verification — COMPLETE

- [x] `npm run type-check` — exit 0
- [x] `npm run lint` — exit 0
- [x] `npm test` — 2 passed
- [x] `npm run build` — succeeds (`tsc -b` + vite production build)
- [x] `npx playwright test` — 1 passed
- [x] `npx prettier --check` — clean
- [x] Dev server boots on 4310 and serves the transformed entry.

### Phase 6: Documentation — COMPLETE

- [x] `CLAUDE.md` — conventions, architecture, and the config traps below.
- [x] `README.md` — stack table, commands, layout, aliases.

## Recovery Checkpoint

✅ TASK COMPLETE

## Failed Approaches

| What was tried                                                                | Why it failed                                                                                                                                                                                                                                                                                                                        | Date       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Building the whole dashboard during initialization                            | The request was to initialize the template; the brief was flagged as upcoming work. A design system, domain model, fixture generator and parallel agent workflow were started and had to be stopped and deleted. **Read the scope, not the attachment.**                                                                             | 2026-08-27 |
| Adding `@typescript-eslint/parser` + `eslint-plugin` to `devDependencies`     | `eslint-config-react-app` already brings them. Two copies makes ESLint fail with _"couldn't determine the plugin '@typescript-eslint' uniquely"_; removing only the plugin then broke parser resolution. Fixed by removing both and doing a clean reinstall so react-app's copy hoists to the top level, exactly as in the template. | 2026-08-27 |
| Writing multi-hundred-line TypeScript via a quoted bash heredoc               | The heredoc truncated mid-file and bash reported an unmatched quote; nothing was written and it looked like a permissions problem. Use the Write tool for large source files.                                                                                                                                                        | 2026-08-27 |
| Leaving `tsconfig.app.json` with the template's `"types": ["vitest/globals"]` | Overriding `types` drops `vite/client`, so `import.meta.env` and CSS imports fail to type-check. The template carries this latent because nothing there tripped it.                                                                                                                                                                  | 2026-08-27 |

## Files Modified

| File                                        | Action  | Status |
| ------------------------------------------- | ------- | ------ |
| `package.json`, `package-lock.json`         | created | done   |
| `tsconfig.{json,app,node,e2e}.json`         | created | done   |
| `vite.config.ts`, `playwright.config.ts`    | created | done   |
| `.eslintrc.json`, `.prettierrc.json`        | copied  | done   |
| `.gitignore`, `.gitattributes`              | copied  | done   |
| `index.html`, `public/favicon.ico`          | created | done   |
| `.env.example`/`.development`/`.production` | created | done   |
| `.claude/settings.json`                     | created | done   |
| `.plans/template.md` + category folders     | copied  | done   |
| `src/**` (11 files)                         | created | done   |
| `tests/**` (3 files)                        | created | done   |
| `e2e/smoke.spec.ts`                         | created | done   |
| `CLAUDE.md`, `README.md`                    | created | done   |

## Blockers

- None. Task complete.

## Notes

Four configuration decisions that are load-bearing and easy to undo by accident. All four are also
recorded in `CLAUDE.md`.

1. **`vite/client` must stay in `tsconfig.app.json` `types`.** Without it, `import.meta.env` and CSS
   imports do not type-check.
2. **Never add top-level `@typescript-eslint` packages.** `eslint-config-react-app` provides them.
3. **`tsconfig.e2e.json` exists and is referenced** so `e2e/**` and `playwright.config.ts` are
   type-checked, with matching ESLint `overrides`. Without those overrides, `npm run lint` errors on
   every root config file — also latent in the source template.
4. **Tailwind's `dark:` variant is rebound** to `[data-mantine-color-scheme='dark']` in
   `src/index.css`. At its default it follows `prefers-color-scheme`, which desyncs Tailwind from the
   in-app toggle.

Also: `npm run dev` inherits `server.open: true` from the template, so it opens a browser. The
Playwright `webServer` command passes `--open false` to suppress that during test runs.

## Lessons Learned

- The most expensive mistake here was scope, not code: a heads-up about future work read as
  authorization to do it. About an hour of design-system and model work was written and deleted.
- Copying a template also copies its latent problems. Two config bugs (`types` override, missing
  ESLint project overrides) exist in the source project and only surfaced here because a broader set
  of commands was run. Worth reporting upstream.
- Verifying with all five commands — not just `npm run dev` — is what caught both.

## Summary

An empty directory is now a working React 19 + TypeScript + Vite 6 + Mantine v9 + Tailwind v4 + Redux
Toolkit template with Vitest and Playwright harnesses, matching the conventions of
`noctua-visual-pathway-editor`. 28 tracked files, 696 packages, all verification green, committed as
11 grouped commits (see `.plans/config/02-initial-commit-history.md`).

**Follow-up work:**

- Dashboard implementation is planned in `.plans/feature/01-report-model.md` through
  `07-extensibility-search-export.md`, with acceptance criteria in
  `.plans/testing/acceptance-walkthrough.md`.
- Consider a `cSpell.words` list in `.claude/settings.json` or a `cspell.json`: the domain vocabulary
  (species oscodes such as `DAPMA`/`USTMA`, plus `oscode`, `proteome`, `giga`, `recluster`, `Slurm`)
  produces heavy editor spell-check noise in both the plans and the upcoming source.
- `.plans/template.md` is not Prettier-formatted (inherited as-is from the source template) and is the
  only file in the repo that fails `prettier --check`. Left untouched deliberately; format it if the
  inconsistency becomes annoying.
