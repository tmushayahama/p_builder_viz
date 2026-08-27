import { chrome, statusFill } from '@/@panther.core/theme/tokens'
import type { StatusTone } from '@/@panther.core/theme/tokens'

/**
 * SVG hatch patterns: the texture channel for chart marks.
 *
 * A hole behind the frontier has to be distinguishable from a pending phase
 * without relying on hue - for a colour-blind reader, in a monochrome print, and
 * under `forced-colors`. Hatching is that third channel; it is never
 * decorative, and a mark that is hatched always also carries a label.
 *
 * Render this once inside a chart's `ChartFrame` children, then paint with
 * `hatchFill(tone)`. Pattern ids are global, so mounting it more than once on a
 * page is harmless.
 */
export const hatchFill = (tone: StatusTone): string => `url(#pb-hatch-${tone})`

const TONES: readonly StatusTone[] = ['pass', 'warn', 'hole', 'fail', 'active', 'neutral']

export const ChartPatterns = () => (
  <defs>
    {TONES.map(tone => (
      <pattern
        key={tone}
        id={`pb-hatch-${tone}`}
        width={5}
        height={5}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width={5} height={5} fill={chrome.surface1} />
        <rect width={1.6} height={5} fill={statusFill(tone)} />
      </pattern>
    ))}
  </defs>
)
