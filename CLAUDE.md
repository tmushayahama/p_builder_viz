# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

**PANTHER Build Visualization** — a React 19 + TypeScript SPA, currently a **project template**. The
stack is installed and boots to a placeholder route; no application has been built yet. Vite 6,
Mantine v9, Tailwind CSS v4, Redux Toolkit, react-router v7.

The stack and conventions were copied from `C:/work/go/noctua-visual-pathway-editor`, minus the
dependencies that project needs and this one does not (Apollo/GraphQL, JointJS, ReactFlow, dagre,
graphlib, socket.io, axios, react-hook-form, react-ga4).

`docs/` holds reference material for planned work: `panther-build-dashboard-prototype-brief-v3.md`
(the spec for a JSON-driven build dashboard) and `build_state.json` (a captured build-state report
for a PANTHER 20.0 target, standing in for what a report generator will eventually emit). **Neither
is implemented.** Do not build from the brief unless asked.

## Commands

- `npm run dev` — dev server on port **4310** (set in `vite.config.ts`; also opens a browser)
- `npm run start` — dev server on 4310, host `0.0.0.0`, `development` mode (`start:production` variant)
- `npm run build` — `tsc -b` then `vite build --mode production` into `dist/`
- `npm test` — Vitest. **Only `tests/**/*.test.{ts,tsx}` is collected**; a spec beside its source is
  silently ignored.
- Run one file: `npx vitest run tests/features/home/HomePage.test.tsx`
- `npm run test:e2e` — Playwright; starts its own dev server on 4310 (`test:e2e:ui`,
  `test:e2e:headed`)
- `npm run lint` / `lint:fix` / `format` / `type-check`

Env modes: `development`, `production`. Files: `.env.development`, `.env.production`,
`.env.example`. Runtime vars must be prefixed `VITE_`. `VITE_BASE_URL` sets the Vite base and the
router basename; `VITE_OUTPUT_PATH` overrides the build output directory.

## Architecture

```
src/
  main.tsx            Redux Provider + StrictMode; CSS import order matters (Mantine before ours)
  App.tsx             MantineProvider, colour scheme read from the store, then RouterProvider
  index.css           Tailwind entry, @theme tokens, the dark: variant bridge
  @panther.core/      shared library, no feature knowledge (theme/, and future components/hooks/utils)
  app/                shell only: hooks.ts, routes.tsx, store/, slices/, layout/
  features/<name>/    self-contained feature modules (components/, hooks/, services/, slices/, models/)
tests/                specs mirroring src/ paths
e2e/                  Playwright specs
```

- **`src/app/` is shell, `src/features/` is product, `src/@panther.core/` is reusable.** Keep feature
  knowledge out of `@panther.core`.
- **State:** Redux Toolkit with `combineSlices`, so slices can be added without editing a central
  reducer map. `makeStore(preloadedState?)` exists for tests; `store` is the app singleton.
- **Colour scheme lives in the store** (`app/slices/uiSlice.ts`) and `MantineProvider` consumes it via
  `forceColorScheme`. Don't add a second source of truth with Mantine's own scheme hook.

## Enforced Patterns

- **Typed Redux hooks only** — `useAppDispatch` / `useAppSelector` from `@/app/hooks`. Importing
  `useSelector` / `useDispatch` / `useStore` from `react-redux` is a lint error; `app/hooks.ts` is the
  one file where the rule is disabled.
- **`import type`** for type-only imports (`@typescript-eslint/consistent-type-imports`).
- **Path aliases** — `@/*` for `src/*`, `@tests/*` for `tests/*`. Declared in both
  `tsconfig.app.json` and `vite.config.ts`; changing one means changing both.
- **Tailwind v4 is configured in CSS, not JS.** There is no `tailwind.config.js`. Extend the design
  system with `@theme` in `src/index.css`.
- **`dark:` is redefined to follow Mantine.** `src/index.css` points the variant at
  `[data-mantine-color-scheme='dark']` so one toggle drives Tailwind and Mantine together. Using
  `prefers-color-scheme` directly would desync them.
- **Mantine for interactive controls** (Select, TextInput, Tooltip, Menu, Modal, Tabs,
  SegmentedControl, Collapse, ActionIcon); Tailwind for layout. Component-wide defaults belong in
  `@panther.core/theme/mantineTheme.ts`, not repeated at call sites.
- **Unused parameters** — prefix with `_`. `noUnusedLocals` and `noUnusedParameters` are on, as is
  `strict`.

## TypeScript project layout

`tsconfig.json` is a solution file with two project references:

- `tsconfig.app.json` — `src` + `tests`, `types: ["vitest/globals", "vite/client"]`. The `vite/client`
  entry is required for `import.meta.env` and for CSS-module imports to type-check.
- `tsconfig.node.json` — `vite.config.ts` + `playwright.config.ts`.

`.eslintrc.json` runs type-aware rules against `tsconfig.app.json`, with an override pointing the two
root config files at `tsconfig.node.json`. Without that override ESLint errors on both files.

Do not add `@typescript-eslint/parser` or `@typescript-eslint/eslint-plugin` to `devDependencies` —
`eslint-config-react-app` brings them, and a second top-level copy makes ESLint fail with
"couldn't determine the plugin '@typescript-eslint' uniquely".

## Conventions

- Prettier: no semicolons, single quotes, 2-space indent, trailing comma `es5`, 100-char width,
  `arrowParens: avoid`. Tailwind classes auto-sorted by `prettier-plugin-tailwindcss`.
- Naming: PascalCase components, camelCase hooks and utilities.
- Comments explain **why**, not what: a short block comment at the top of a module saying what job it
  does, and inline comments only where the reasoning is non-obvious.

## Testing

Vitest + React Testing Library + jsdom. `tests/setup.ts` stubs what jsdom lacks and Mantine needs
(`matchMedia`, `ResizeObserver`, `scrollIntoView`). Use `renderWithProviders` from
`tests/test-utils.tsx` — it wraps the tree in the store, `MantineProvider` and a `MemoryRouter`, and
accepts `preloadedState`, `store` and `route`.

## Task Management

Create and maintain plan files in `.plans/<category>/<task-name>.md` for non-trivial work. See
[.plans/template.md](.plans/template.md) for the full template, the recovery-checkpoint convention,
and the category folders (`bugfix`, `feature`, `refactor`, `config`, `docs`, `testing`, `misc`).

## Git Commits

- **Never** add `Co-Authored-By: Claude ...` trailers or any Claude attribution to commit messages.
- Keep messages short: a one-line subject plus a few brief bullets, not paragraphs.
