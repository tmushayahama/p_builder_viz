import { useCallback, useEffect, useState } from 'react'

/**
 * Colour-scheme plumbing: the attribute, the storage, and nothing else.
 *
 * The app's source of truth for the scheme is the Redux store, which
 * `MantineProvider` consumes via `forceColorScheme`; adding a second source
 * would desync Tailwind's rebound `dark:` variant from Mantine. So this hook
 * has two modes:
 *
 *   controlled   - pass `value`. The hook only mirrors it onto
 *                  `documentElement.dataset.mantineColorScheme` and persists it.
 *                  The store stays the single source of truth. This is what the
 *                  app shell should use.
 *   uncontrolled - omit `value`. The hook owns the scheme. Useful for a
 *                  standalone surface (a print preview, a test, an isolated
 *                  story) that has no store.
 *
 * `readStoredColorScheme()` is exported separately so the shell can seed the
 * store's initial state from the persisted preference without importing the
 * hook into a reducer.
 *
 * Every storage access is wrapped: Safari private mode throws on
 * `localStorage` rather than returning null, and a build console that cannot
 * remember a preference is far better than one that will not start.
 */
export type ColorScheme = 'light' | 'dark'

export const COLOR_SCHEME_STORAGE_KEY = 'pb.colorScheme'

/** Dark is the working default for a build console. */
export const DEFAULT_COLOR_SCHEME: ColorScheme = 'dark'

const isColorScheme = (value: unknown): value is ColorScheme =>
  value === 'light' || value === 'dark'

export const readStoredColorScheme = (
  storageKey: string = COLOR_SCHEME_STORAGE_KEY
): ColorScheme | null => {
  try {
    const stored = window.localStorage.getItem(storageKey)
    return isColorScheme(stored) ? stored : null
  } catch {
    return null
  }
}

const writeStoredColorScheme = (scheme: ColorScheme, storageKey: string): void => {
  try {
    window.localStorage.setItem(storageKey, scheme)
  } catch {
    // private-mode browsers throw; the preference is simply not remembered
  }
}

const applyToDocument = (scheme: ColorScheme): void => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.mantineColorScheme = scheme
}

export interface UseColorSchemeOptions {
  /** Controlled value. When present the hook mirrors and persists it only. */
  value?: ColorScheme
  /** Called on every change, controlled or not, so the shell can dispatch. */
  onChange?: (scheme: ColorScheme) => void
  storageKey?: string
  /** Used when nothing is stored and no `value` is given. */
  fallback?: ColorScheme
}

export interface UseColorSchemeResult {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
  toggleColorScheme: () => void
  /** What storage held on mount, or `null` when storage was unreadable. */
  stored: ColorScheme | null
}

export const useColorScheme = (options: UseColorSchemeOptions = {}): UseColorSchemeResult => {
  const {
    value,
    onChange,
    storageKey = COLOR_SCHEME_STORAGE_KEY,
    fallback = DEFAULT_COLOR_SCHEME,
  } = options

  const [stored] = useState<ColorScheme | null>(() => readStoredColorScheme(storageKey))
  const [internal, setInternal] = useState<ColorScheme>(() => value ?? stored ?? fallback)

  const colorScheme = value ?? internal

  useEffect(() => {
    applyToDocument(colorScheme)
  }, [colorScheme])

  const setColorScheme = useCallback(
    (next: ColorScheme) => {
      writeStoredColorScheme(next, storageKey)
      applyToDocument(next)
      setInternal(next)
      onChange?.(next)
    },
    [onChange, storageKey]
  )

  const toggleColorScheme = useCallback(() => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')
  }, [colorScheme, setColorScheme])

  return { colorScheme, setColorScheme, toggleColorScheme, stored }
}
