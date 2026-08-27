import { useCallback, useEffect, useState } from 'react'

/**
 * Measure an element's content box.
 *
 * Charts need their container's width before they can build a scale, and the
 * first render always happens before any measurement exists. The hook therefore
 * reports `{ width: 0, height: 0, measured: false }` until it has measured, and
 * callers must treat that as "not yet measured" rather than as a real width - a
 * zero width divided into a domain is where NaN SVG coordinates come from, and
 * a NaN coordinate blanks a chart silently instead of throwing.
 *
 * The observed node is held in state rather than a ref so the effect re-runs
 * when the node is replaced; a ref would leave the observer watching a detached
 * element after a remount.
 */
export interface ElementSize {
  width: number
  height: number
  /** False until the first measurement lands. */
  measured: boolean
}

const EMPTY: ElementSize = { width: 0, height: 0, measured: false }

export const useElementSize = <T extends HTMLElement = HTMLDivElement>(): [
  (node: T | null) => void,
  ElementSize,
] => {
  const [node, setNode] = useState<T | null>(null)
  const [size, setSize] = useState<ElementSize>(EMPTY)

  const ref = useCallback((next: T | null) => setNode(next), [])

  useEffect(() => {
    if (!node) {
      setSize(EMPTY)
      return
    }

    const measure = () => {
      const rect = node.getBoundingClientRect()
      const width = Math.max(0, rect.width)
      const height = Math.max(0, rect.height)
      setSize(previous =>
        previous.measured && previous.width === width && previous.height === height
          ? previous
          : { width, height, measured: true }
      )
    }

    measure()

    // jsdom and older browsers have no ResizeObserver; a window listener is a
    // worse but working fallback rather than a crash.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  return [ref, size]
}
