import { useChecksForConfigKey } from '@/features/checks/hooks'
import { InlineCheckMarker } from '@/features/checks/components/InlineCheckMarker'

/**
 * The findings about one configuration variable, beside the value itself.
 *
 * Exported for any view that renders configuration - the ledger, the generic renderer, a provenance
 * block. Pass the key; get nothing at all when no finding names it, so it can be dropped into every
 * row without cluttering the ones that have nothing to say.
 */
export interface ConfigCheckMarkerProps {
  configKey: string
  className?: string
}

export const ConfigCheckMarker = ({ configKey, className }: ConfigCheckMarkerProps) => {
  const findings = useChecksForConfigKey(configKey)
  return <InlineCheckMarker findings={findings} subject={configKey} className={className} />
}
