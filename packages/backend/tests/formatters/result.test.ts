import { describe, it, expect } from 'vitest'
import { formatRows, formatCurrency } from '../../src/formatters/result.js'

describe('formatRows', () => {
  it('renders a markdown table', () => {
    const rows = [{ customer: 'Acme', total: 50000 }]
    const result = formatRows(rows)
    expect(result).toContain('| customer |')
    expect(result).toContain('Acme')
  })

  it('returns "No results found." for empty rows', () => {
    expect(formatRows([])).toBe('No results found.')
  })

  it('truncates to 50 rows by default', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({ n: i }))
    const result = formatRows(rows)
    expect(result).toContain('50 of 60')
  })
})

describe('formatCurrency', () => {
  it('formats as Indian rupees', () => {
    expect(formatCurrency(1234567)).toContain('₹')
  })
})
