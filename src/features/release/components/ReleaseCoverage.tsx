import { useMemo } from 'react'
import { Panel } from '@/@panther.core/components'
import { useBuildReport, useSelectSpecies, useSelectedOscode } from '@/features/build/hooks'
import { SpeciesDetail } from '@/features/species/components/SpeciesDetail'
import { SpeciesDistribution } from '@/features/species/components/SpeciesDistribution'
import { buildDistribution } from '@/features/species/model/distribution'
import { TERMS } from '@/features/release/vocabulary'

/**
 * How much of the previous library's annotation was matched into this one.
 *
 * Reuses the build record's distribution and species panel unchanged, because they are already the
 * right things for this reader - the chart names its outliers instead of hiding them in a
 * 131-row table, and the species panel explains a number rather than only flagging it.
 *
 * That explanation is the most useful thing on this page. `DAPMA` carried nothing forward, which
 * reads as catastrophic in isolation; the panel says it is a genome new to this release with no
 * previous annotation to match, corroborated independently by its previous sequence count and by
 * the UniProt comparison. And where context does NOT excuse a low figure - `FELCA` at 65 % with an
 * established previous proteome - it says that too, which is what makes the first claim worth
 * believing.
 */
export const ReleaseCoverage = () => {
  const report = useBuildReport()
  const selected = useSelectedOscode()
  const selectSpecies = useSelectSpecies()
  const { nodeTracking } = report
  const distribution = useMemo(() => buildDistribution(nodeTracking), [nodeTracking])

  return (
    <div className="space-y-gutter">
      <Panel
        title={TERMS.carriedForward.label}
        subtitle="every genome in the library, by how much matched"
        availability={nodeTracking.availability}
        message={nodeTracking.message ?? undefined}
        missingSubject="Annotation carry-forward"
        density="tight"
        provenance="derived"
        footer={TERMS.carriedForward.hint}
      >
        <SpeciesDistribution
          model={distribution}
          byOscode={report.species.byOscode}
          selectedOscode={selected}
          onSelect={selectSpecies}
        />
      </Panel>

      {selected !== null && <SpeciesDetail oscode={selected} onClose={() => selectSpecies(null)} />}
    </div>
  )
}

export default ReleaseCoverage
