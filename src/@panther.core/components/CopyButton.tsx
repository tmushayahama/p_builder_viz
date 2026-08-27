import { ActionIcon, Button, Tooltip } from '@mantine/core'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copy a value - a revision, a path, a whole `config.mk` - to the clipboard.
 *
 * The clipboard API is absent in jsdom, blocked in insecure contexts, and can
 * reject. A copy button that throws in a test or on an http host is worse than
 * one that says it failed, so every path is guarded and the failure surfaces in
 * the label rather than being swallowed.
 */
export interface CopyButtonProps {
  value: string
  /** Idle label. Ignored when `iconOnly`. */
  label?: string
  copiedLabel?: string
  iconOnly?: boolean
  /** Accessible name; required in practice when `iconOnly`. */
  ariaLabel?: string
  className?: string
}

type CopyState = 'idle' | 'copied' | 'failed'

const writeToClipboard = async (value: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

const Glyph = () => (
  <svg viewBox="0 0 14 14" width={11} height={11} aria-hidden="true" focusable="false">
    <rect
      x="1.7"
      y="1.7"
      width="7.6"
      height="7.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M4.7 12.3h7.6V4.7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
)

export const CopyButton = ({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  iconOnly = false,
  ariaLabel,
  className,
}: CopyButtonProps) => {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onClick = useCallback(() => {
    void writeToClipboard(value).then(ok => {
      setState(ok ? 'copied' : 'failed')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setState('idle'), 1600)
    })
  }, [value])

  const text = state === 'copied' ? copiedLabel : state === 'failed' ? 'Copy failed' : label

  if (iconOnly) {
    return (
      <Tooltip label={text} withArrow openDelay={200}>
        <ActionIcon
          onClick={onClick}
          aria-label={ariaLabel ?? label}
          size="sm"
          className={className}
          data-pb-print="hide"
        >
          <Glyph />
        </ActionIcon>
      </Tooltip>
    )
  }

  return (
    <Button
      onClick={onClick}
      variant="default"
      size="compact-xs"
      leftSection={<Glyph />}
      aria-label={ariaLabel}
      className={className}
      data-pb-print="hide"
    >
      {text}
    </Button>
  )
}
