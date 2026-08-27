import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable } from '@/@panther.core/components/DataTable'
import type { DataColumn, DataTableProps } from '@/@panther.core/components/DataTable'
import { renderWithProviders } from '@tests/test-utils'

interface Species {
  oscode: string
  prev: number | null
  next: number
}

const rows: Species[] = [
  { oscode: 'USTMA', prev: 6788, next: 0 },
  { oscode: 'DAPMA', prev: null, next: 26600 },
  { oscode: 'BOVIN', prev: 21000, next: 20800 },
  { oscode: 'ARATH', prev: 27000, next: 27100 },
]

const columns: DataColumn<Species>[] = [
  { id: 'oscode', header: 'Oscode', kind: 'mono', sortValue: row => row.oscode },
  { id: 'prev', header: 'Previous', kind: 'number', sortValue: row => row.prev },
  { id: 'next', header: 'Current', kind: 'number', sortValue: row => row.next },
]

const renderTable = (props: Partial<DataTableProps<Species>> = {}) =>
  renderWithProviders(
    <DataTable
      caption="Sequence counts by species"
      columns={columns}
      rows={rows}
      rowKey={row => row.oscode}
      {...props}
    />
  )

describe('DataTable completeness', () => {
  it('sorts when the data is complete', async () => {
    const { user } = renderTable()

    await user.click(screen.getByRole('button', { name: /Current/ }))

    const cells = screen
      .getAllByRole('row')
      .slice(1)
      .map(row => within(row).getAllByRole('cell')[0])
    expect(cells[0]).toHaveTextContent('ARATH')
  })

  it('shows the completeness note and disables sort when truncated', () => {
    renderTable({ completeness: { included: 50, total: 147, noun: 'rows' } })

    expect(screen.getByText('50 of 147 rows included in report')).toBeInTheDocument()
    // no column header is a button any more
    expect(screen.queryAllByRole('button', { name: /Oscode|Previous|Current/ })).toHaveLength(0)
  })

  it('suppresses filter controls when truncated', () => {
    renderTable({
      completeness: { included: 20, total: 813 },
      filters: <span>filter controls</span>,
    })

    expect(screen.queryByText('filter controls')).not.toBeInTheDocument()
  })

  it('keeps filter controls when the set is complete', () => {
    renderTable({ filters: <span>filter controls</span> })

    expect(screen.getByText('filter controls')).toBeInTheDocument()
  })

  it('treats an unknown total as truncated rather than complete', () => {
    renderTable({ completeness: { included: 20, total: null } })

    expect(
      screen.getByText(/20 rows included in report; the report does not say how many exist/)
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /Oscode/ })).toHaveLength(0)
  })

  it('sorts absent values last in both directions', async () => {
    const { user } = renderTable()
    const header = screen.getByRole('button', { name: /Previous/ })

    await user.click(header)
    let first = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0]
    expect(first).not.toHaveTextContent('DAPMA')

    await user.click(header)
    first = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0]
    expect(first).not.toHaveTextContent('DAPMA')
  })

  it('shows more rather than paginating', async () => {
    const many = Array.from({ length: 131 }, (_, index) => ({
      oscode: `SP${index.toString().padStart(3, '0')}`,
      prev: index,
      next: index + 1,
    }))
    const { user } = renderWithProviders(
      <DataTable
        caption="131 species"
        columns={columns}
        rows={many}
        rowKey={row => row.oscode}
        pageSize={50}
      />
    )

    expect(screen.getAllByRole('row')).toHaveLength(51)
    await user.click(screen.getByRole('button', { name: /Show 50 more/ }))
    expect(screen.getAllByRole('row')).toHaveLength(101)
  })
})
