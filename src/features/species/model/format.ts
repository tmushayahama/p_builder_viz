/**
 * Percentage formatting for the species cross-section.
 *
 * It lives here rather than at each call site because the same value has to read identically in a
 * chart label, a table cell, a tooltip and a sentence: one percentage rounded two ways inside one
 * panel reads as two different measurements. Two functions, because a column of figures wants
 * fixed decimals to line up (`65.0 %`) and a sentence wants the shortest true form (`65 %`).
 */

import { ABSENT_MARK } from '@/@panther.core/vocabulary'

/** Fixed decimals, for a column of figures. */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ABSENT_MARK
  return `${value.toFixed(digits)} %`
}

/** Trailing zeros dropped, for running text: `0 %`, `65 %`, `99.5 %`. */
export function formatPercentTerse(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ABSENT_MARK
  return `${Number(value.toFixed(digits)).toLocaleString('en-US', {
    maximumFractionDigits: digits,
  })} %`
}
