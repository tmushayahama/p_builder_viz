import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COLOR_SCHEME_STORAGE_KEY, useColorScheme } from '@/@panther.core/hooks/useColorScheme'

/**
 * Two failure modes are worth a test. A private-mode browser throws on
 * localStorage rather than returning null, and a build console that will not
 * start because it cannot remember a preference is a worse outcome than one that
 * forgets. And the attribute has to be the one Mantine and the rebound Tailwind
 * `dark:` variant both read, or the two halves of the UI desync.
 */
afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  delete document.documentElement.dataset.mantineColorScheme
})

describe('useColorScheme', () => {
  it('stamps the attribute Mantine and the dark: variant both read', () => {
    const { result } = renderHook(() => useColorScheme({ fallback: 'dark' }))

    expect(document.documentElement.dataset.mantineColorScheme).toBe('dark')

    act(() => result.current.toggleColorScheme())

    expect(document.documentElement.dataset.mantineColorScheme).toBe('light')
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('light')
  })

  it('reads a stored preference on mount', () => {
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'light')

    const { result } = renderHook(() => useColorScheme({ fallback: 'dark' }))

    expect(result.current.colorScheme).toBe('light')
    expect(result.current.stored).toBe('light')
  })

  it('ignores a stored value it does not recognise', () => {
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'sepia')

    const { result } = renderHook(() => useColorScheme({ fallback: 'dark' }))

    expect(result.current.colorScheme).toBe('dark')
    expect(result.current.stored).toBeNull()
  })

  it('keeps working when storage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('private mode')
    })
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('private mode')
    })

    const { result } = renderHook(() => useColorScheme({ fallback: 'dark' }))

    expect(result.current.stored).toBeNull()
    act(() => result.current.setColorScheme('light'))
    expect(result.current.colorScheme).toBe('light')
    expect(document.documentElement.dataset.mantineColorScheme).toBe('light')
  })

  it('mirrors a controlled value instead of owning it', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useColorScheme({ value: 'light', onChange }))

    act(() => result.current.setColorScheme('dark'))

    // the store stays the source of truth: the hook reports the controlled value
    expect(result.current.colorScheme).toBe('light')
    expect(onChange).toHaveBeenCalledWith('dark')
  })
})
