/**
 * Every string the generator wrote, as a check.
 *
 * Two rules hold here and both are about honesty. The message is carried VERBATIM as the
 * explanation - a generator warning is a quotation, not something the dashboard gets to reword -
 * and the origin stays `generator` so no export can make it look like a dashboard inference or the
 * other way round.
 *
 * What the dashboard adds is the anchor: the message names a step goal, a stage, an oscode or a
 * configuration key, and `resolveWarningAnchor` turns that into somewhere to click. That addition
 * is recorded in the evidence, so even the anchoring is attributable.
 */

import { fromGenerator } from '../finding'
import { indexPhaseFindings, resolveWarningAnchor } from '../anchoring'
import type { WarningMatch } from '../anchoring'
import type { CheckFinding, CheckRule } from '../types'

const RULE_ID = 'generator.warning'

const MATCH_WORDING: Record<WarningMatch, string> = {
  'step-goal': 'Anchored by this dashboard to the step goal named in the message.',
  stage: 'Anchored by this dashboard to the mapping stage named in the message.',
  oscode: 'Anchored by this dashboard to the species named in the message.',
  'config-key': 'Anchored by this dashboard to the configuration key named in the message.',
  section:
    'The message names no step, stage, species or configuration key, so it is anchored to the ' +
    'section that emitted it.',
}

export const generatorWarningsRule: CheckRule = {
  id: RULE_ID,
  label: 'Generator warnings',
  category: 'pipeline',
  run: report => {
    const phaseFindings = indexPhaseFindings(report)

    const findings: CheckFinding[] = report.generatorWarnings.map(warning => {
      const anchor = resolveWarningAnchor(report, warning, phaseFindings.get(warning.id))
      const sectionTitle =
        report.reports.find(entry => entry.sectionId === warning.sectionId)?.title ??
        warning.sectionId

      return fromGenerator({
        id: `${RULE_ID}:${warning.id}`,
        ruleId: RULE_ID,
        category: 'pipeline',
        label: `Generator warning in ${sectionTitle}`,
        explanation: warning.message,
        source: `sections[${warning.sectionId}].warnings[]`,
        anchor: anchor.anchor,
        anchorLabel: anchor.anchorLabel,
        evidence: [MATCH_WORDING[anchor.matchedBy]],
        ...(anchor.phaseId === null ? {} : { phaseId: anchor.phaseId }),
        ...(anchor.stepId === null ? {} : { stepId: anchor.stepId }),
        ...(anchor.oscode === null ? {} : { oscode: anchor.oscode }),
        ...(anchor.configKey === null ? {} : { configKey: anchor.configKey }),
      })
    })

    return findings
  },
}
