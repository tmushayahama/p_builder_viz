import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartFrame } from '@/@panther.core/charts/ChartFrame'
import type { PlotRect } from '@/@panther.core/charts/ChartFrame'
import { Bars } from '@/@panther.core/charts/marks/Bars'
import type { BarDatum } from '@/@panther.core/charts/marks/Bars'
import { Line } from '@/@panther.core/charts/marks/Line'
import { StackedBars } from '@/@panther.core/charts/marks/StackedBars'
import { bandScale, extentWithZero, linearScale } from '@/@panther.core/charts/scales'
import { seriesFill } from '@/@panther.core/theme/tokens'
import { renderWithProviders } from '@tests/test-utils'

/**
 * The regression these guard against is silent: a NaN in an SVG coordinate does
 * not throw, the browser drops the attribute, and the chart renders blank. So
 * every case asserts on the emitted markup rather than on "it did not crash".
 *
 * jsdom reports a zero width for every element, which is exactly the
 * pre-measurement state a real browser passes through; minWidth is how a test
 * asks for a measured plot without stubbing the layout engine.
 */

/** Every attribute value that carries a digit, so a NaN cannot hide in one path. */
const numericAttributes = (root: Element): string[] => {
  const values: string[] = []
  for (const node of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const attribute of Array.from(node.attributes)) {
      if (/[0-9]/.test(attribute.value)) values.push(`${attribute.name}=${attribute.value}`)
    }
  }
  return values
}

const expectNoNaN = (container: HTMLElement) => {
  const svg = container.querySelector('svg')
  expect(svg).not.toBeNull()
  expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
  for (const attribute of numericAttributes(svg as Element)) {
    expect(attribute).not.toMatch(/NaN|Infinity/)
  }
}

interface Row {
  key: string
  value: number | null
}

const Chart = ({ rows, width }: { rows: readonly Row[]; width: number }) => (
  <ChartFrame
    title="Sequences assigned by stage"
    description="One column per mapping stage."
    height={120}
    minWidth={width}
    yTicks={plot => {
      const scale = linearScale(extentWithZero(rows.map(row => row.value)), [
        plot.y + plot.height,
        plot.y,
      ])
      return scale.ticks(4).map(tick => ({ position: scale(tick), label: tick.toLocaleString() }))
    }}
    xTicks={plot => {
      const band = bandScale(
        rows.map(row => row.key),
        [plot.x, plot.x + plot.width]
      )
      return rows.map(row => ({ position: band.center(row.key), label: row.key }))
    }}
    isEmpty={rows.length === 0}
    empty={<span>No stages in this report</span>}
  >
    {(plot: PlotRect) => {
      const band = bandScale(
        rows.map(row => row.key),
        [plot.x, plot.x + plot.width]
      )
      const value = linearScale(extentWithZero(rows.map(row => row.value)), [
        plot.y + plot.height,
        plot.y,
      ])
      const data: BarDatum[] = rows.map(row => ({ key: row.key, value: row.value }))
      return (
        <>
          <Bars data={data} plot={plot} band={band} value={value} />
          <Line
            points={rows.map(row => ({
              key: row.key,
              x: band.center(row.key),
              y: row.value === null ? null : value(row.value),
            }))}
            stroke={seriesFill(2)}
          />
          <StackedBars
            data={rows.map(row => ({
              key: row.key,
              segments: [{ seriesKey: 'id', value: row.value }],
            }))}
            plot={plot}
            band={band}
            value={value}
            series={['id']}
            fillFor={() => seriesFill(1)}
          />
        </>
      )
    }}
  </ChartFrame>
)

const rows: Row[] = [
  { key: 'id', value: 1536000 },
  { key: 'blast', value: 1620440 },
  { key: 'hmm', value: 1802537 },
]

describe('ChartFrame degenerate inputs', () => {
  it('renders an accessible title and no marks before the container is measured', () => {
    const { container } = renderWithProviders(<Chart rows={rows} width={0} />)

    expect(screen.getByTitle('Sequences assigned by stage')).toBeInTheDocument()
    // no plot width yet, so no mark, no tick and above all no coordinate
    expect(container.querySelectorAll('path')).toHaveLength(0)
    expectNoNaN(container)
  })

  it('renders the empty notice instead of marks on an empty array', () => {
    const { container } = renderWithProviders(<Chart rows={[]} width={720} />)

    expect(screen.getByText('No stages in this report')).toBeInTheDocument()
    expect(container.querySelectorAll('path')).toHaveLength(0)
    expectNoNaN(container)
  })

  it('draws a single datum without a NaN coordinate', () => {
    const { container } = renderWithProviders(
      <Chart rows={[{ key: 'id', value: 42 }]} width={720} />
    )

    expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
    expectNoNaN(container)
  })

  it('survives all-zero values', () => {
    const { container } = renderWithProviders(
      <Chart
        rows={[
          { key: 'id', value: 0 },
          { key: 'blast', value: 0 },
        ]}
        width={720}
      />
    )

    expectNoNaN(container)
  })

  it('breaks the line at a null rather than scaling it to the baseline', () => {
    const { container } = renderWithProviders(
      <Chart
        rows={[
          { key: 'id', value: 10 },
          { key: 'blast', value: null },
          { key: 'hmm', value: 30 },
        ]}
        width={720}
      />
    )

    // two subpaths means the line lifted over the gap instead of interpolating
    const broken = Array.from(container.querySelectorAll('path')).some(
      path => (path.getAttribute('d') ?? '').split('M').length === 3
    )
    expect(broken).toBe(true)
    expectNoNaN(container)
  })

  it.each([320, 720, 1400])('renders at %s px without a NaN coordinate', width => {
    const { container } = renderWithProviders(<Chart rows={rows} width={width} />)

    expect(container.querySelector('svg')?.getAttribute('width')).toBe(String(width))
    expectNoNaN(container)
  })

  it('sizes the SVG to include the axis band rather than cropping it', () => {
    const { container } = renderWithProviders(<Chart rows={rows} width={720} />)

    // plot height 120 plus the top margin and the x-axis band the ticks need
    expect(Number(container.querySelector('svg')?.getAttribute('height'))).toBeGreaterThan(120)
    expect(screen.getByText('blast')).toBeInTheDocument()
  })

  it('offers the table twin whenever one is given', () => {
    renderWithProviders(
      <ChartFrame title="Assignment by stage" minWidth={720} tableView={<span>table twin</span>}>
        {() => null}
      </ChartFrame>
    )

    expect(screen.getByRole('radio', { name: 'Table' })).toBeInTheDocument()
  })
})
