# PANTHER Build Visualization

Project template. The stack is wired and boots; the application itself is not built yet.

## Quick start

```bash
npm install
npm run dev            # http://localhost:4310
```

## Stack

| Concern       | Choice                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| Framework     | React 19 + TypeScript (strict)                                                      |
| Build         | Vite 6                                                                              |
| Components    | Mantine v9 (`@mantine/core`, `hooks`, `notifications`)                              |
| Styling       | Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first config, no `tailwind.config.js`) |
| State         | Redux Toolkit + react-redux, `combineSlices`                                        |
| Routing       | react-router-dom v7                                                                 |
| Icons         | react-icons                                                                         |
| Animation     | framer-motion                                                                       |
| Unit tests    | Vitest + React Testing Library + jsdom                                              |
| E2E           | Playwright                                                                          |
| Lint / format | ESLint 8 (`eslint-config-react-app`) + Prettier (+ `prettier-plugin-tailwindcss`)   |

## Commands

| Command                     | What it does                                                             |
| --------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`               | Vite dev server on port **4310**                                         |
| `npm run start`             | Same, host `0.0.0.0`, `development` mode (`start:production` variant)    |
| `npm run build`             | `tsc -b` then `vite build --mode production` into `dist/`                |
| `npm run preview`           | Serve the production build                                               |
| `npm test`                  | Vitest run (`test:watch` variant)                                        |
| `npm run test:e2e`          | Playwright; starts its own dev server (`test:e2e:ui`, `test:e2e:headed`) |
| `npm run lint` / `lint:fix` | ESLint                                                                   |
| `npm run format`            | Prettier                                                                 |
| `npm run type-check`        | `tsc --noEmit`                                                           |

## Layout

```
src/
  main.tsx                     entry: Redux Provider + StrictMode, CSS import order
  App.tsx                      MantineProvider (colour scheme driven from the store) + router
  index.css                    Tailwind entry, @theme tokens, the dark: variant bridge
  @panther.core/               shared library — no feature knowledge
    theme/mantineTheme.ts
  app/                         app shell
    hooks.ts                   the typed useAppDispatch / useAppSelector
    routes.tsx
    slices/uiSlice.ts
    store/store.ts
    layout/AppLayout.tsx
  features/                    one directory per feature
    home/components/HomePage.tsx
tests/                         specs mirroring src/; setup.ts, test-utils.tsx
e2e/                           Playwright specs
```

Path aliases: `@/*` → `src/*`, `@tests/*` → `tests/*` (configured in both `tsconfig.app.json` and
`vite.config.ts`).

## Conventions worth knowing before you write code

- **Typed Redux hooks only.** Import `useAppDispatch` / `useAppSelector` from `@/app/hooks`.
  Importing `useSelector` / `useDispatch` / `useStore` from `react-redux` is a lint error.
- **`import type`** for type-only imports — `@typescript-eslint/consistent-type-imports` is an error.
- **Prettier:** no semicolons, single quotes, 2-space indent, trailing comma `es5`, 100-char width,
  `arrowParens: avoid`. Tailwind classes are sorted automatically.
- **Tailwind v4 has no JS config.** Extend the design system with `@theme` in `src/index.css`.
- **`dark:` follows Mantine, not the OS.** `src/index.css` redefines the variant against
  `[data-mantine-color-scheme='dark']` so the in-app toggle drives Tailwind and Mantine together.
- **Vitest only collects `tests/**/*.test.{ts,tsx}`.** A spec written next to its source is silently
  ignored. Use `renderWithProviders` from `tests/test-utils.tsx` — it supplies the store, Mantine and
  a `MemoryRouter`.

## Plans

Non-trivial work gets a plan file under `.plans/<category>/<task-name>.md`. See
[.plans/template.md](.plans/template.md) for the template and the recovery-checkpoint convention.
