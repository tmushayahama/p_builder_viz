import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Read the router hash, scroll its target into view, and report it back so a
 * view can flash a transient highlight on the thing that was linked to.
 *
 * Deep links are a product requirement here, not a nicety: a check links to a
 * config value, a warning links to a step, an export carries stable anchors. A
 * link that jumps to an anchor without marking it leaves the reader hunting.
 *
 * The scroll is attempted on a rAF so it runs after the target's own render,
 * and every DOM call is guarded because the target may legitimately not exist
 * (a stale anchor from an older report).
 */
export interface HashTarget {
  /** The id from the hash, with the `#` stripped. `null` when there is none. */
  id: string | null
  /** True for `highlightMs` after arriving, so the view can flash the target. */
  isRecent: boolean
  /** True when an element with that id was actually found. */
  found: boolean
}

export interface UseHashTargetOptions {
  /** How long `isRecent` stays true. 0 keeps it true indefinitely. */
  highlightMs?: number
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
}

const EMPTY: HashTarget = { id: null, isRecent: false, found: false }

export const useHashTarget = (options: UseHashTargetOptions = {}): HashTarget => {
  const { highlightMs = 2400, behavior = 'smooth', block = 'start' } = options
  const { hash } = useLocation()
  const [target, setTarget] = useState<HashTarget>(EMPTY)

  useEffect(() => {
    const id = hash.startsWith('#') ? decodeURIComponent(hash.slice(1)) : ''
    if (!id) {
      setTarget(EMPTY)
      return
    }

    let frame = 0
    let timer = 0

    const run = () => {
      const element = typeof document === 'undefined' ? null : document.getElementById(id)
      element?.scrollIntoView?.({ behavior, block })
      setTarget({ id, isRecent: true, found: Boolean(element) })

      if (highlightMs > 0) {
        timer = window.setTimeout(
          () => setTarget(previous => ({ ...previous, isRecent: false })),
          highlightMs
        )
      }
    }

    if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(run)
    else run()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      if (timer) window.clearTimeout(timer)
    }
  }, [hash, behavior, block, highlightMs])

  return target
}
