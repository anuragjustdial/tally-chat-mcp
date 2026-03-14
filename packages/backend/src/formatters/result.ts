const MAX_ROWS = 50

export function formatRows(rows: Record<string, unknown>[], maxRows = MAX_ROWS): string {
  if (rows.length === 0) return 'No results found.'

  const display = rows.slice(0, maxRows)
  const keys = Object.keys(rows[0])
  const header = `| ${keys.join(' | ')} |`
  const divider = `| ${keys.map(() => '---').join(' | ')} |`
  const body = display
    .map(r => `| ${keys.map(k => String(r[k] ?? '')).join(' | ')} |`)
    .join('\n')

  const table = [header, divider, body].join('\n')

  if (rows.length > maxRows) {
    return `${table}\n\n*Showing ${maxRows} of ${rows.length} results*`
  }
  return table
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatSingle(value: unknown, label?: string): string {
  if (value === null || value === undefined) return 'No data found.'
  const str = typeof value === 'number' ? formatCurrency(value) : String(value)
  return label ? `**${label}:** ${str}` : str
}
