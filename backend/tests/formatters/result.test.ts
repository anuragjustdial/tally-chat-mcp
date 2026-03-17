import { describe, it, expect } from 'vitest'
import { formatPythonResponse, formatCurrency } from '../../src/formatters/result.js'

describe('formatPythonResponse', () => {
  it('renders a markdown table from columns + rows', () => {
    const result = formatPythonResponse(['customer', 'total'], [['Acme', 50000]])
    expect(result).toContain('| customer | total |')
    expect(result).toContain('| Acme | 50000 |')
  })

  it('returns "No results found." for empty rows', () => {
    expect(formatPythonResponse(['col'], [])).toBe('No results found.')
  })

  it('truncates to 50 rows by default and shows count', () => {
    const rows = Array.from({ length: 60 }, (_, i) => [i])
    const result = formatPythonResponse(['n'], rows)
    expect(result).toContain('50 of 60')
  })

  it('renders all rows when under the limit', () => {
    const rows = Array.from({ length: 3 }, (_, i) => [i])
    const result = formatPythonResponse(['n'], rows)
    expect(result).not.toContain('Showing')
  })

  it('handles null/undefined cell values gracefully', () => {
    const result = formatPythonResponse(['a', 'b'], [[null, undefined]])
    expect(result).toContain('|  |  |')
  })
})

describe('formatCurrency', () => {
  it('formats as Indian rupees', () => {
    expect(formatCurrency(1234567)).toContain('₹')
  })
})
