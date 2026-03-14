import { describe, it, expect } from 'vitest'
import { validateSql, SqlValidationError } from '../../src/sql-safety/validator.js'

describe('SQL validator', () => {
  it('allows simple SELECT', () => {
    expect(() => validateSql('SELECT 1 AS val')).not.toThrow()
  })

  it('allows SELECT with JOIN and GROUP BY', () => {
    expect(() => validateSql(`
      SELECT v.party_name, SUM(ABS(a.amount)) AS total
      FROM trn_voucher v JOIN trn_accounting a ON a.guid = v.guid
      WHERE v.voucher_type = 'Sales' AND v.date >= '2024-01-01'
      GROUP BY v.party_name ORDER BY total DESC LIMIT 10
    `)).not.toThrow()
  })

  it('blocks INSERT', () => {
    expect(() => validateSql("INSERT INTO config VALUES ('x', 'y')"))
      .toThrow(SqlValidationError)
  })

  it('blocks UPDATE', () => {
    expect(() => validateSql("UPDATE mst_ledger SET name = 'hack'"))
      .toThrow(SqlValidationError)
  })

  it('blocks DELETE', () => {
    expect(() => validateSql('DELETE FROM trn_voucher')).toThrow(SqlValidationError)
  })

  it('blocks DROP TABLE', () => {
    expect(() => validateSql('DROP TABLE trn_voucher')).toThrow(SqlValidationError)
  })

  it('blocks unknown tables', () => {
    expect(() => validateSql('SELECT * FROM users')).toThrow(SqlValidationError)
  })

  it('blocks multiple statements via semicolon', () => {
    expect(() => validateSql("SELECT 1; DROP TABLE config")).toThrow(SqlValidationError)
  })

  it('allows queries against multi-tenant tables', () => {
    expect(() => validateSql('SELECT id, name FROM companies')).not.toThrow()
  })
})
