# Tally Chat — Full Stack Implementation Plan

> **Implementation style:** Phase-gated with review checkpoints. Each Chunk ends with a **REVIEW CHECKPOINT** — stop, show the user what was built, and wait for approval before proceeding to the next chunk.

> **Plan location:** Saved to `plan/implementation.md` in the project repo.

**Goal:** Build a SolidJS chat web app where business owners type natural language questions about their Tally accounting data — the backend sends the question to a locally-running Qwen 3.5 (LM Studio) which generates SQL, that SQL is validated and executed on PostgreSQL, and the results are returned as a formatted chat response.

**Architecture:**
```
SolidJS Frontend (Vite, port 3000)
         │  POST /api/chat (message + history)
         ▼
Fastify Backend API (Node.js/TypeScript, port 3001)
         │
    ┌────▼─────────────────────────┐
    │  Is this a predefined query? │
    │  (e.g. "sales this month")   │
    └────┬──────────────┬──────────┘
         │ NO           │ YES
         ▼              ▼
  LM Studio API    Predefined SQL
  (Qwen 3.5)       (parameterized)
  OpenAI-compat.
  → generates SQL
         │              │
         └──────┬───────┘
                ▼
         SQL Validator
         (SELECT-only, table allowlist)
                ▼
         PostgreSQL (read-only user)
                ▼
         Result Formatter
                ▼
  Fastify sends response back
         │
         ▼
SolidJS renders chat message
```

**Tech Stack:**
| Layer | Technology |
|---|---|
| Runtime | **Node.js 22 LTS** |
| Frontend | SolidJS + Vite + TypeScript |
| Backend | Fastify + TypeScript |
| LLM | LM Studio (OpenAI-compat API) via `openai` npm package |
| DB Query Builder | **Kysely** (TypeScript-native; swap dialect for MySQL with 1 config change) |
| DB Driver (current) | `pg` (PostgreSQL) |
| DB Driver (future) | `mysql2` (MySQL — optional, install only when migrating) |
| Validation | `zod` (all inputs + config) |
| SQL safety | `node-sql-parser` (for LLM-generated raw SQL only) |
| Testing | `vitest` |
| Package mgr | `pnpm` workspaces (monorepo) |
| Dev run | `tsx` (backend) / `vite` (frontend) |
| Build | `tsc` (backend) / `vite build` (frontend) |

**Env config (dev → prod swap is just changing env vars):**
```
# Backend
DB_TYPE=postgres                          # Switch to "mysql" for MySQL migration
DATABASE_URL=postgres://tally_readonly:pass@localhost:5432/tally
# For MySQL migration: DATABASE_URL=mysql://tally_readonly:pass@localhost:3306/tally
LLM_BASE_URL=http://localhost:1234/v1   # LM Studio dev | prod: http://llm-server:1234/v1
LLM_MODEL=qwen3-5                        # Model name as shown in LM Studio
CORS_ORIGIN=http://localhost:3000        # prod: https://your-frontend.com

# Frontend
VITE_API_URL=http://localhost:3001       # prod: https://your-backend.com
```

**Database migration strategy (PostgreSQL → MySQL):**
Kysely uses a dialect abstraction. The predefined queries (written in Kysely's TS API) work on both databases. The only changes for MySQL migration are:
1. Set `DB_TYPE=mysql` in env
2. Install `mysql2`: `pnpm add mysql2`
3. Update `DATABASE_URL` to MySQL format
4. Update the LLM system prompt to use MySQL syntax (different date functions, backtick quoting)

---

## Project Structure (Monorepo)

```
tally-chat-mcp/
├── pnpm-workspace.yaml
├── package.json                     # root: scripts only
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts             # entry: start Fastify
│   │       ├── server.ts            # Fastify app setup + routes registration
│   │       ├── config.ts            # zod-validated env config
│   │       ├── db/
│   │       │   ├── dialect.ts       # Kysely dialect factory (postgres|mysql toggle)
│   │       │   ├── kysely.ts        # Kysely instance + Database type definitions
│   │       │   └── queries/
│   │       │       ├── sales.ts     # getSalesSummary, getTopCustomers
│   │       │       ├── purchases.ts # getPurchaseSummary, getTopSuppliers
│   │       │       ├── ledger.ts    # getLedgerBalance, listLedgersByGroup
│   │       │       ├── outstanding.ts # getReceivables, getPayables
│   │       │       └── inventory.ts # getStockSummary, getTopItems
│   │       ├── llm/
│   │       │   ├── client.ts         # OpenAI client pointed at LM Studio
│   │       │   ├── schema-loader.ts  # Reads LIVE schema from DB → builds system prompt
│   │       │   └── sql-generator.ts  # callLLM(question, history) → SQL string
│   │       ├── sql-safety/
│   │       │   └── validator.ts     # validateSql() — SELECT + table allowlist
│   │       ├── routes/
│   │       │   └── chat.ts          # POST /api/chat handler
│   │       └── formatters/
│   │           └── result.ts        # formatRows(), formatCurrency()
│   └── frontend/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── index.tsx            # SolidJS render root
│           ├── App.tsx              # root component
│           ├── api/
│           │   └── chat.ts          # sendMessage(msg, history) → fetch wrapper
│           └── components/
│               ├── ChatWindow.tsx   # scrollable message list
│               ├── MessageBubble.tsx # user vs assistant styling
│               └── QueryInput.tsx   # textarea + send button
├── plan/
│   ├── plan0.1.md
│   └── sql.md
└── .env.example
```

---

## Database Schema Quick Reference

Key tables for query generation (from `plan/sql.md`):

| Table | Purpose | Key columns |
|---|---|---|
| `trn_voucher` | Every transaction | `date`, `voucher_type`, `party_name`, `guid` |
| `trn_accounting` | Ledger entries per voucher | `guid`, `ledger`, `amount` |
| `trn_inventory` | Inventory movements | `guid`, `item`, `quantity`, `rate`, `amount` |
| `trn_bill` | Bill references | `guid`, `ledger`, `amount`, `billtype` |
| `mst_ledger` | All accounts | `name`, `parent`, `closing_balance`, `gstn` |
| `mst_group` | Ledger groups | `name`, `parent`, `is_revenue` |
| `mst_stock_item` | Inventory items | `name`, `closing_balance`, `gst_hsn_code` |

**Semantic mappings (critical for correct SQL):**
- "Sales" → `trn_voucher.voucher_type = 'Sales'`, revenue via `trn_accounting.amount < 0`
- "Purchases" → `voucher_type = 'Purchase'`
- "Receivables" → ledgers in group `ILIKE '%Sundry Debtor%'` with positive `trn_bill.amount`
- "Payables" → ledgers in group `ILIKE '%Sundry Creditor%'` with negative `trn_bill.amount`
- "GST" → `trn_accounting.ledger ILIKE '%GST%' OR '%CGST%' OR '%SGST%' OR '%IGST%'`
- `trn_accounting.ledger` → `mst_ledger.name` (by name, no FK)
- `mst_ledger.parent` → `mst_group.name` (by name, no FK)

---

## Pre-Implementation: Save Plan to Repo

Before writing any code, copy this plan into the project so it lives alongside the code.

- [ ] Copy this plan file to `plan/implementation.md` in the project repo
- [ ] Commit it: `git add plan/implementation.md && git commit -m "docs: add implementation plan"`

---

## Chunk 1: Monorepo Setup

### Task 1: Initialize Monorepo

**Files:**
- Modify: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `packages/backend/package.json`
- Create: `packages/frontend/package.json`
- Create: `.env.example`

- [ ] **Step 1: Create workspace config**

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

- [ ] **Step 2: Update root package.json**

```json
{
  "name": "tally-chat-mcp",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  },
  "packageManager": "pnpm@10.15.0"
}
```

- [ ] **Step 3: Create packages/backend/package.json**

```json
{
  "name": "@tally-chat/backend",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.27.0",
    "@fastify/cors": "^9.0.1",
    "openai": "^4.52.0",
    "kysely": "^0.27.4",
    "pg": "^8.12.0",
    "zod": "^3.23.8",
    "node-sql-parser": "^4.18.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.6",
    "tsx": "^4.16.2",
    "vitest": "^2.0.5"
  }
}
```

> **MySQL migration note:** When switching to MySQL, run `pnpm add mysql2` — no other dependency changes needed.

- [ ] **Step 4: Create packages/frontend/package.json**

```json
{
  "name": "@tally-chat/frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "solid-js": "^1.8.18"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vite": "^5.3.5",
    "vite-plugin-solid": "^2.10.2",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 5: Create .env.example**

```env
# Backend — copy to packages/backend/.env
DB_TYPE=postgres
DATABASE_URL=postgres://tally_readonly:password@localhost:5432/tally
# For MySQL migration: DB_TYPE=mysql + DATABASE_URL=mysql://tally_readonly:pass@localhost:3306/tally
LLM_BASE_URL=http://localhost:1234/v1
LLM_MODEL=qwen3-5
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.1
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Frontend — copy to packages/frontend/.env
VITE_API_URL=http://localhost:3001
```

- [ ] **Step 6: Install all dependencies**

```bash
pnpm install
```

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml package.json packages/backend/package.json packages/frontend/package.json .env.example
git commit -m "chore: initialize pnpm monorepo with backend and frontend packages"
```

---

### Task 2: Backend Config + TypeScript Setup

**Files:**
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/src/config.ts`
- Create: `packages/backend/vitest.config.ts`
- Test: `packages/backend/tests/config.test.ts`

- [ ] **Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node' } })
```

- [ ] **Step 3: Write the failing test**

```ts
// packages/backend/tests/config.test.ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('config', () => {
  it('parses valid env correctly', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db'
    process.env.LLM_BASE_URL = 'http://localhost:1234/v1'
    process.env.LLM_MODEL = 'qwen3'
    const { config } = await import('../src/config.js')
    expect(config.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/db')
    expect(config.PORT).toBe(3001)
  })
})
```

- [ ] **Step 4: Run test — expect FAIL**

```bash
cd packages/backend && pnpm test tests/config.test.ts
```

- [ ] **Step 5: Implement config.ts**

```ts
// packages/backend/src/config.ts
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  DB_TYPE: z.enum(['postgres', 'mysql']).default('postgres'),
  DATABASE_URL: z.string().min(1),
  LLM_BASE_URL: z.string().url(),
  LLM_MODEL: z.string().min(1),
  LLM_MAX_TOKENS: z.coerce.number().default(1024),
  LLM_TEMPERATURE: z.coerce.number().default(0.1),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(`Invalid configuration:\n${parsed.error.message}`)
}

export const config = parsed.data
```

- [ ] **Step 6: Run test — expect PASS**

```bash
pnpm test tests/config.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add packages/backend/tsconfig.json packages/backend/src/config.ts packages/backend/vitest.config.ts packages/backend/tests/config.test.ts
git commit -m "feat(backend): add typed config with zod validation"
```

---

### Task 3: Kysely Database Layer (dialect-agnostic)

This is the key DB abstraction that makes PostgreSQL → MySQL migration a single env var + driver change.

**Files:**
- Create: `packages/backend/src/db/dialect.ts`
- Create: `packages/backend/src/db/kysely.ts`
- Test: `packages/backend/tests/db/kysely.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/backend/tests/db/kysely.test.ts
import { describe, it, expect } from 'vitest'
import { db, rawQuery } from '../../src/db/kysely.js'

describe('kysely db', () => {
  it('connects and runs a simple select', async () => {
    const result = await rawQuery<{ val: number }>('SELECT 1 AS val')
    expect(result[0].val).toBe(1)
  })

  it('can query config table via Kysely builder', async () => {
    const rows = await db.selectFrom('config').selectAll().limit(1).execute()
    expect(Array.isArray(rows)).toBe(true)
  })
})
```

- [ ] **Step 2: Create packages/backend/.env with your real DB credentials**

- [ ] **Step 3: Run test — expect FAIL (module not found)**

- [ ] **Step 4: Implement dialect.ts — the one-file migration toggle**

```ts
// packages/backend/src/db/dialect.ts
import { config } from '../config.js'
import type { Dialect } from 'kysely'

export async function createDialect(): Promise<Dialect> {
  if (config.DB_TYPE === 'mysql') {
    // mysql2 only needed when DB_TYPE=mysql — install with: pnpm add mysql2
    const { createPool } = await import('mysql2/promise')
    const { MysqlDialect } = await import('kysely')
    return new MysqlDialect({ pool: createPool(config.DATABASE_URL) })
  }

  // Default: PostgreSQL
  const pg = await import('pg')
  const { PostgresDialect } = await import('kysely')
  return new PostgresDialect({
    pool: new pg.default.Pool({ connectionString: config.DATABASE_URL, max: 10 }),
  })
}
```

- [ ] **Step 5: Add DB_TYPE to config.ts schema**

Add this line to the zod schema in `packages/backend/src/config.ts`:

```ts
DB_TYPE: z.enum(['postgres', 'mysql']).default('postgres'),
```

- [ ] **Step 6: Implement kysely.ts (shared Kysely instance + Database type)**

```ts
// packages/backend/src/db/kysely.ts
import { Kysely, sql as ksql } from 'kysely'
import { createDialect } from './dialect.js'

// Minimal type definitions for tables used in predefined queries
interface ConfigTable    { name: string; value: string | null }
interface MstLedger      { name: string; parent: string; closing_balance: number; gstn: string | null }
interface MstGroup       { name: string; parent: string | null; is_revenue: number }
interface MstStockItem   { name: string; uom: string; closing_balance: number; closing_value: number }
interface TrnVoucher     { guid: string; date: Date; voucher_type: string; party_name: string | null }
interface TrnAccounting  { guid: string; ledger: string; amount: number }
interface TrnInventory   { guid: string; item: string; quantity: number; amount: number }
interface TrnBill        { guid: string; ledger: string; amount: number; billtype: string | null }

export interface Database {
  config: ConfigTable
  mst_ledger: MstLedger
  mst_group: MstGroup
  mst_stock_item: MstStockItem
  trn_voucher: TrnVoucher
  trn_accounting: TrnAccounting
  trn_inventory: TrnInventory
  trn_bill: TrnBill
}

const dialect = await createDialect()
export const db = new Kysely<Database>({ dialect })

// Executes LLM-generated raw SQL through Kysely (so dialect's connection pool is reused)
export async function rawQuery<T extends Record<string, unknown>>(
  sqlString: string
): Promise<T[]> {
  const result = await ksql<T>`${ksql.raw(sqlString)}`.execute(db)
  return result.rows
}
```

- [ ] **Step 7: Run test — expect PASS**

```bash
pnpm test tests/db/kysely.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add packages/backend/src/db/ packages/backend/tests/db/
git commit -m "feat(backend): Kysely DB layer with postgres/mysql dialect abstraction"
```

> **To migrate to MySQL later:** `pnpm add mysql2`, set `DB_TYPE=mysql`, update `DATABASE_URL`. Zero query code changes.

---

## ✅ REVIEW CHECKPOINT — After Chunk 1

**Stop here and show the user:**
- [ ] All packages installed (`pnpm install` succeeded)
- [ ] `pnpm test` — config + kysely tests pass
- [ ] Backend starts: `pnpm dev` in `packages/backend/`
- [ ] DB connects: `GET http://localhost:3001/health` returns `{"status":"ok"}`

**Ask:** "Chunk 1 (monorepo setup + DB layer) is complete. All tests passing and the backend is running. Shall I proceed to Chunk 2 (SQL validator + LLM integration)?"

---

## Chunk 2: SQL Safety + LLM Integration

### Task 4: SQL Safety Validator

**Files:**
- Create: `packages/backend/src/sql-safety/validator.ts`
- Test: `packages/backend/tests/sql-safety/validator.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/backend/tests/sql-safety/validator.test.ts
import { describe, it, expect } from 'vitest'
import { validateSql, SqlValidationError } from '../../src/sql-safety/validator.js'

describe('SQL validator', () => {
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
})
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement validator.ts**

```ts
// packages/backend/src/sql-safety/validator.ts
import { Parser } from 'node-sql-parser'

export class SqlValidationError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'SqlValidationError'
  }
}

const ALLOWED_TABLES = new Set([
  'config',
  'mst_group', 'mst_ledger', 'mst_vouchertype', 'mst_uom',
  'mst_godown', 'mst_stock_category', 'mst_stock_group', 'mst_stock_item',
  'mst_cost_category', 'mst_cost_centre', 'mst_attendance_type',
  'mst_employee', 'mst_payhead', 'mst_gst_effective_rate',
  'mst_opening_batch_allocation', 'mst_opening_bill_allocation',
  'mst_stockitem_standard_cost', 'mst_stockitem_standard_price',
  'trn_voucher', 'trn_accounting', 'trn_inventory', 'trn_cost_centre',
  'trn_cost_category_centre', 'trn_cost_inventory_category_centre',
  'trn_bill', 'trn_bank', 'trn_batch', 'trn_inventory_additional_cost',
  'trn_employee', 'trn_payhead', 'trn_attendance', 'trn_closingstock_ledger',
])

const parser = new Parser()

export function validateSql(sql: string): void {
  if (sql.includes(';')) {
    throw new SqlValidationError('Multiple statements not allowed')
  }

  let ast: ReturnType<typeof parser.astify>
  try {
    ast = parser.astify(sql, { database: 'PostgresQL' })
  } catch (e) {
    throw new SqlValidationError(`SQL parse error: ${(e as Error).message}`)
  }

  const stmt = Array.isArray(ast) ? ast[0] : ast
  if ((stmt as any).type !== 'select') {
    throw new SqlValidationError(`Only SELECT allowed. Got: ${(stmt as any).type}`)
  }

  const tableRefs = parser.tableList(sql, { database: 'PostgresQL' })
  for (const ref of tableRefs) {
    const table = ref.split('::')[2]
    if (table && !ALLOWED_TABLES.has(table)) {
      throw new SqlValidationError(`Table not permitted: ${table}`)
    }
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test tests/sql-safety/validator.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/sql-safety/validator.ts packages/backend/tests/sql-safety/validator.test.ts
git commit -m "feat(backend): SQL safety validator — SELECT-only with table allowlist"
```

---

### Task 5: LLM Client + Dynamic Schema Loader

**How Qwen learns the schema:** Instead of hardcoding the schema in a static file, we query `information_schema` at backend startup and dynamically build the system prompt. This means:
- **Today**: Qwen knows all current Tally tables/columns
- **You add a new table**: restart the backend → Qwen automatically knows the new table
- **You add a column**: restart the backend → Qwen knows the new column
- **Zero manual maintenance** of the schema prompt

**Files:**
- Create: `packages/backend/src/llm/client.ts`
- Create: `packages/backend/src/llm/schema-loader.ts` ← replaces static schema-prompt.ts
- Create: `packages/backend/src/llm/sql-generator.ts`
- Test: `packages/backend/tests/llm/schema-loader.test.ts`
- Test: `packages/backend/tests/llm/sql-generator.test.ts`

- [ ] **Step 1: Implement llm/client.ts**

```ts
// packages/backend/src/llm/client.ts
import OpenAI from 'openai'
import { config } from '../config.js'

export const llmClient = new OpenAI({
  baseURL: config.LLM_BASE_URL,
  apiKey: 'lm-studio', // LM Studio ignores this but openai package requires it
})
```

- [ ] **Step 2: Write failing test for schema-loader**

```ts
// packages/backend/tests/llm/schema-loader.test.ts
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../../src/llm/schema-loader.js'

describe('schema loader', () => {
  it('builds a system prompt that includes table names', async () => {
    const prompt = await buildSystemPrompt()
    expect(prompt).toContain('trn_voucher')
    expect(prompt).toContain('mst_ledger')
    expect(prompt).toContain('SELECT')
  })

  it('includes column names for key tables', async () => {
    const prompt = await buildSystemPrompt()
    expect(prompt).toContain('voucher_type')
    expect(prompt).toContain('party_name')
  })

  it('caches: calling twice returns the same string', async () => {
    const p1 = await buildSystemPrompt()
    const p2 = await buildSystemPrompt()
    expect(p1).toBe(p2)
  })
})
```

- [ ] **Step 3: Run test — expect FAIL**

- [ ] **Step 4: Implement schema-loader.ts**

```ts
// packages/backend/src/llm/schema-loader.ts
import { rawQuery } from '../db/kysely.js'
import { config } from '../config.js'

// Cached system prompt — built once at startup, stays in memory
let cachedPrompt: string | null = null

interface ColumnRow {
  table_name: string
  column_name: string
  data_type: string
}

export async function buildSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt

  // Read all columns for all Tally tables from the live database
  const schemaQuery = config.DB_TYPE === 'mysql'
    ? `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
       ORDER BY table_name, ordinal_position`
    : `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`

  const columns = await rawQuery<ColumnRow>(schemaQuery)

  // Group columns by table
  const tables = new Map<string, string[]>()
  for (const col of columns) {
    if (!tables.has(col.table_name)) tables.set(col.table_name, [])
    tables.get(col.table_name)!.push(`${col.column_name} (${col.data_type})`)
  }

  // Build schema section
  const schemaLines: string[] = ['## Live Database Schema\n']
  for (const [table, cols] of tables.entries()) {
    schemaLines.push(`**${table}**`)
    schemaLines.push(`  Columns: ${cols.join(', ')}`)
    schemaLines.push('')
  }

  const dbDialect = config.DB_TYPE === 'mysql' ? 'MySQL' : 'PostgreSQL'

  cachedPrompt = `You are a SQL expert for a Tally Prime accounting database (${dbDialect}).

## Your job
Convert the user's natural language question into a single valid ${dbDialect} SELECT query.

## Rules
- Return ONLY the SQL query. No explanations, no markdown, no code blocks.
- Only use SELECT statements. Never INSERT, UPDATE, DELETE, DROP, or any DDL.
- Use actual date literals (e.g. '2024-01-01') not parameters.
- Indian fiscal year: April to March (FY 2024-25 = 2024-04-01 to 2025-03-31).
- "This month" = from DATE_TRUNC('month', CURRENT_DATE) for PostgreSQL, DATE_FORMAT(NOW(),'%Y-%m-01') for MySQL.
- "Current FY" = calculate Indian fiscal year start from current date.
- Use ILIKE (PostgreSQL) or LIKE (MySQL) for case-insensitive text matching.
- Add LIMIT 100 if the result could be large and no LIMIT is specified.

## Key Relationships (by name, no foreign keys)
- trn_accounting.ledger → mst_ledger.name
- trn_accounting.guid → trn_voucher.guid (many entries per voucher)
- trn_inventory.item → mst_stock_item.name
- trn_inventory.guid → trn_voucher.guid
- trn_bill.ledger → mst_ledger.name
- mst_ledger.parent → mst_group.name
- For sales revenue: trn_accounting.amount < 0 (credit side)
- For purchases: trn_accounting.amount > 0 (debit side)
- Common voucher_type values: 'Sales', 'Purchase', 'Payment', 'Receipt', 'Journal', 'Contra', 'Credit Note', 'Debit Note'
- Receivables: mst_ledger.parent ILIKE '%Sundry Debtor%'
- Payables: mst_ledger.parent ILIKE '%Sundry Creditor%'

${schemaLines.join('\n')}

Now answer the user's question with ONLY a SQL query.`

  return cachedPrompt
}

// Call this when you know the DB schema has changed (e.g. after a sync)
export function invalidateSchemaCache(): void {
  cachedPrompt = null
}
```

> **Context size note:** The schema prompt is ~2,000-3,000 tokens. Qwen 3.5 in LM Studio has a 32K context window — this is well within limits. LM Studio also supports **KV-cache prefix reuse**: since our system prompt is identical across all requests (same cached string), the GPU reuses cached attention computation from the previous request. This means the effective cost per request is just the new user question tokens, not the full schema. This happens automatically with no extra configuration.

- [ ] **Step 5: Run schema-loader tests — expect PASS**

```bash
pnpm test tests/llm/schema-loader.test.ts
```

- [ ] **Step 3: Write failing test for sql-generator**

```ts
// packages/backend/tests/llm/sql-generator.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock the LLM client so tests don't need LM Studio running
vi.mock('../../src/llm/client.js', () => ({
  llmClient: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "SELECT SUM(ABS(a.amount)) FROM trn_voucher v JOIN trn_accounting a ON a.guid = v.guid WHERE v.voucher_type = 'Sales'" } }]
        })
      }
    }
  }
}))

import { generateSql } from '../../src/llm/sql-generator.js'

describe('generateSql', () => {
  it('returns a SQL string from the LLM response', async () => {
    const sql = await generateSql('What are my total sales?', [])
    expect(typeof sql).toBe('string')
    expect(sql.toUpperCase()).toContain('SELECT')
  })

  it('strips markdown code fences if LLM adds them', async () => {
    const { llmClient } = await import('../../src/llm/client.js')
    vi.mocked(llmClient.chat.completions.create).mockResolvedValueOnce({
      choices: [{ message: { content: '```sql\nSELECT 1\n```' } }]
    } as any)
    const sql = await generateSql('test', [])
    expect(sql).not.toContain('```')
  })
})
```

- [ ] **Step 4: Run test — expect FAIL**

- [ ] **Step 5: Implement sql-generator.ts**

```ts
// packages/backend/src/llm/sql-generator.ts
import { llmClient } from './client.js'
import { buildSystemPrompt } from './schema-loader.js'
import { config } from '../config.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function generateSql(
  question: string,
  history: ChatMessage[]
): Promise<string> {
  const systemPrompt = await buildSystemPrompt() // cached after first call

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.slice(-6), // last 3 exchanges for context
    { role: 'user' as const, content: question },
  ]

  const response = await llmClient.chat.completions.create({
    model: config.LLM_MODEL,
    messages,
    max_tokens: config.LLM_MAX_TOKENS,
    temperature: config.LLM_TEMPERATURE,
  })

  const raw = response.choices[0]?.message?.content ?? ''
  return cleanSql(raw)
}

function cleanSql(raw: string): string {
  // Strip markdown code fences that LLMs sometimes add
  return raw
    .replace(/^```sql\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
pnpm test tests/llm/sql-generator.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/llm/ packages/backend/tests/llm/
git commit -m "feat(backend): LM Studio LLM client + schema prompt + SQL generator"
```

---

## ✅ REVIEW CHECKPOINT — After Chunk 2

**Stop here and show the user:**
- [ ] `pnpm test` — SQL validator tests + sql-generator tests all pass
- [ ] LM Studio is running and the LLM client can connect (test manually):
  ```bash
  curl http://localhost:1234/v1/models
  ```
- [ ] Manually test SQL generation via a quick script or with `tsx`:
  ```ts
  import { generateSql } from './src/llm/sql-generator.js'
  console.log(await generateSql('What are my total sales this month?', []))
  ```

**Ask:** "Chunk 2 (SQL validator + LLM integration) is complete. The validator blocks unsafe SQL and Qwen 3.5 is generating queries. Shall I proceed to Chunk 3 (result formatter + full chat API endpoint)?"

---

## Chunk 3: Result Formatter + Chat Route

### Task 6: Result Formatter

**Files:**
- Create: `packages/backend/src/formatters/result.ts`
- Test: `packages/backend/tests/formatters/result.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/backend/tests/formatters/result.test.ts
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
```

- [ ] **Step 2: Implement result.ts**

```ts
// packages/backend/src/formatters/result.ts

const MAX_ROWS = 50

export function formatRows(rows: Record<string, unknown>[], maxRows = MAX_ROWS): string {
  if (rows.length === 0) return 'No results found.'

  const display = rows.slice(0, maxRows)
  const keys = Object.keys(rows[0])
  const header = `| ${keys.join(' | ')} |`
  const divider = `| ${keys.map(() => '---').join(' | ')} |`
  const body = display.map(r =>
    `| ${keys.map(k => String(r[k] ?? '')).join(' | ')} |`
  ).join('\n')

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
```

- [ ] **Step 3: Run test — expect PASS**

```bash
pnpm test tests/formatters/result.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/formatters/result.ts packages/backend/tests/formatters/result.test.ts
git commit -m "feat(backend): result formatter for markdown tables and INR currency"
```

---

### Task 7: Chat Route (Core Orchestration)

This is the central piece — it receives a user message, decides whether to use a predefined query or call the LLM, executes the SQL, and returns the formatted response.

**Files:**
- Create: `packages/backend/src/routes/chat.ts`
- Test: `packages/backend/tests/routes/chat.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/backend/tests/routes/chat.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/llm/sql-generator.js', () => ({
  generateSql: vi.fn().mockResolvedValue("SELECT 1 AS result")
}))
vi.mock('../../src/db/kysely.js', () => ({
  rawQuery: vi.fn().mockResolvedValue([{ result: 1 }]),
  db: {},
}))

import { processChatMessage } from '../../src/routes/chat.js'

describe('processChatMessage', () => {
  it('returns a non-empty response string', async () => {
    const result = await processChatMessage('What are my sales?', [])
    expect(typeof result.answer).toBe('string')
    expect(result.answer.length).toBeGreaterThan(0)
  })

  it('returns sql in the response metadata', async () => {
    const result = await processChatMessage('What are my sales?', [])
    expect(result.sql).toBeDefined()
  })

  it('returns an error message if SQL is invalid', async () => {
    const { generateSql } = await import('../../src/llm/sql-generator.js')
    vi.mocked(generateSql).mockResolvedValueOnce("DELETE FROM config")
    const result = await processChatMessage('delete everything', [])
    expect(result.answer).toContain('could not')
    expect(result.error).toBe(true)
  })
})
```

- [ ] **Step 2: Implement routes/chat.ts**

```ts
// packages/backend/src/routes/chat.ts
import { generateSql, type ChatMessage } from '../llm/sql-generator.js'
import { validateSql, SqlValidationError } from '../sql-safety/validator.js'
import { rawQuery } from '../db/kysely.js'
import { formatRows } from '../formatters/result.js'

export interface ChatResult {
  answer: string
  sql?: string
  error?: boolean
}

export async function processChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatResult> {
  // Step 1: Generate SQL from LLM
  let sql: string
  try {
    sql = await generateSql(message, history)
  } catch (e) {
    return {
      answer: 'Sorry, I could not connect to the AI model. Please ensure LM Studio is running.',
      error: true,
    }
  }

  // Step 2: Validate SQL
  try {
    validateSql(sql)
  } catch (e) {
    if (e instanceof SqlValidationError) {
      return {
        answer: `I could not generate a safe query for that question. (${e.message})`,
        sql,
        error: true,
      }
    }
    throw e
  }

  // Step 3: Execute via Kysely rawQuery (works with both PostgreSQL and MySQL)
  let rows: Record<string, unknown>[]
  try {
    rows = await rawQuery(sql)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      answer: `The query could not be executed: ${msg}`,
      sql,
      error: true,
    }
  }

  // Step 4: Format and return
  return {
    answer: formatRows(rows),
    sql,
  }
}
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
pnpm test tests/routes/chat.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/routes/chat.ts packages/backend/tests/routes/chat.test.ts
git commit -m "feat(backend): chat route orchestrator (LLM → validate → execute → format)"
```

---

### Task 8: Fastify Server + HTTP Endpoint

**Files:**
- Create: `packages/backend/src/server.ts`
- Create: `packages/backend/src/index.ts`

- [ ] **Step 1: Implement server.ts**

```ts
// packages/backend/src/server.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import { config } from './config.js'
import { processChatMessage } from './routes/chat.js'
import type { ChatMessage } from './llm/sql-generator.js'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
})

export async function buildServer() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: config.CORS_ORIGIN })

  app.post('/api/chat', async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message })
    }

    const { message, history } = parsed.data
    const result = await processChatMessage(message, history as ChatMessage[])

    return reply.send(result)
  })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

- [ ] **Step 2: Implement index.ts**

```ts
// packages/backend/src/index.ts
import { buildServer } from './server.js'
import { config } from './config.js'

const app = await buildServer()
await app.listen({ port: config.PORT, host: '0.0.0.0' })
console.log(`Tally Chat backend running on port ${config.PORT}`)
```

- [ ] **Step 3: Start the dev server**

```bash
cd packages/backend && pnpm dev
```

Expected output: `Tally Chat backend running on port 3001`

- [ ] **Step 4: Test the endpoint manually**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message": "What are my total sales this month?", "history": []}'
```

Expected: JSON with `answer` containing a markdown table or number.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/server.ts packages/backend/src/index.ts
git commit -m "feat(backend): Fastify HTTP server with /api/chat endpoint"
```

---

## ✅ REVIEW CHECKPOINT — After Chunk 3

**Stop here and show the user:**
- [ ] `pnpm test` — all backend tests pass (formatter + chat route)
- [ ] Test the full backend pipeline with curl:
  ```bash
  curl -X POST http://localhost:3001/api/chat \
    -H 'Content-Type: application/json' \
    -d '{"message": "What are my total sales this month?", "history": []}'
  ```
  Expected: `{"answer": "| ... markdown table ... |", "sql": "SELECT ..."}`
- [ ] Verify unsafe SQL is blocked:
  ```bash
  curl -X POST http://localhost:3001/api/chat \
    -H 'Content-Type: application/json' \
    -d '{"message": "delete all my data", "history": []}'
  ```
  Expected: `{"answer": "I could not generate a safe query...", "error": true}`

**Ask:** "Chunk 3 is complete. The full backend pipeline works end-to-end — you can test it with curl right now. Shall I proceed to Chunk 4 (SolidJS chat frontend)?"

---

## Chunk 4: SolidJS Frontend

### Task 9: Vite + SolidJS Setup

**Files:**
- Create: `packages/frontend/vite.config.ts`
- Create: `packages/frontend/tsconfig.json`
- Create: `packages/frontend/index.html`
- Create: `packages/frontend/src/index.tsx`

- [ ] **Step 1: Create vite.config.ts**

```ts
// packages/frontend/vite.config.ts
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  server: { port: 3000 },
  build: { target: 'esnext' },
})
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tally Chat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create src/index.tsx**

```tsx
// packages/frontend/src/index.tsx
import { render } from 'solid-js/web'
import App from './App.js'

render(() => <App />, document.getElementById('root')!)
```

- [ ] **Step 5: Start frontend dev server**

```bash
cd packages/frontend && pnpm dev
```

Expected: Vite dev server on port 3000.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/
git commit -m "feat(frontend): SolidJS + Vite project scaffold"
```

---

### Task 10: API Client

**Files:**
- Create: `packages/frontend/src/api/chat.ts`

- [ ] **Step 1: Implement chat.ts**

```ts
// packages/frontend/src/api/chat.ts

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  answer: string
  sql?: string
  error?: boolean
}

export async function sendMessage(
  message: string,
  history: Message[]
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  return res.json() as Promise<ChatResponse>
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/api/chat.ts
git commit -m "feat(frontend): API client for /api/chat"
```

---

### Task 11: Chat UI Components

**Files:**
- Create: `packages/frontend/src/App.tsx`
- Create: `packages/frontend/src/components/ChatWindow.tsx`
- Create: `packages/frontend/src/components/MessageBubble.tsx`
- Create: `packages/frontend/src/components/QueryInput.tsx`

- [ ] **Step 1: Implement MessageBubble.tsx**

```tsx
// packages/frontend/src/components/MessageBubble.tsx
import { Component } from 'solid-js'
import type { Message } from '../api/chat.js'

interface Props { message: Message; isLoading?: boolean }

export const MessageBubble: Component<Props> = (props) => {
  const isUser = () => props.message.role === 'user'

  return (
    <div style={{
      display: 'flex',
      'justify-content': isUser() ? 'flex-end' : 'flex-start',
      margin: '8px 16px',
    }}>
      <div style={{
        'max-width': '75%',
        padding: '12px 16px',
        'border-radius': isUser() ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser() ? '#2563eb' : '#f3f4f6',
        color: isUser() ? '#fff' : '#111',
        'font-size': '14px',
        'line-height': '1.5',
        'white-space': 'pre-wrap',
        'font-family': props.message.role === 'assistant' ? 'monospace' : 'inherit',
      }}>
        {props.isLoading ? '...' : props.message.content}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement QueryInput.tsx**

```tsx
// packages/frontend/src/components/QueryInput.tsx
import { Component, createSignal } from 'solid-js'

interface Props { onSend: (message: string) => void; disabled: boolean }

export const QueryInput: Component<Props> = (props) => {
  const [text, setText] = createSignal('')

  const handleSend = () => {
    const msg = text().trim()
    if (!msg || props.disabled) return
    props.onSend(msg)
    setText('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '16px', 'border-top': '1px solid #e5e7eb' }}>
      <textarea
        value={text()}
        onInput={(e) => setText(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your Tally data... (e.g. What were my sales this month?)"
        disabled={props.disabled}
        rows={2}
        style={{
          flex: 1,
          padding: '10px 14px',
          'border-radius': '12px',
          border: '1px solid #d1d5db',
          resize: 'none',
          'font-size': '14px',
          outline: 'none',
        }}
      />
      <button
        onClick={handleSend}
        disabled={props.disabled || !text().trim()}
        style={{
          padding: '10px 20px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          'border-radius': '12px',
          cursor: 'pointer',
          'font-size': '14px',
          'align-self': 'flex-end',
          opacity: props.disabled ? '0.5' : '1',
        }}
      >
        Send
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Implement App.tsx (main chat state)**

```tsx
// packages/frontend/src/App.tsx
import { Component, createSignal, For, onMount } from 'solid-js'
import { sendMessage, type Message } from './api/chat.js'
import { MessageBubble } from './components/MessageBubble.js'
import { QueryInput } from './components/QueryInput.js'

const App: Component = () => {
  const [messages, setMessages] = createSignal<Message[]>([{
    role: 'assistant',
    content: 'Hello! Ask me anything about your Tally accounting data.\n\nExamples:\n- What were my total sales this month?\n- Show top 10 customers by revenue\n- What is my outstanding receivables?',
  }])
  const [loading, setLoading] = createSignal(false)
  let bottomRef: HTMLDivElement | undefined

  const scrollToBottom = () => bottomRef?.scrollIntoView({ behavior: 'smooth' })

  const handleSend = async (text: string) => {
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    scrollToBottom()

    try {
      const response = await sendMessage(text, messages().slice(-10))
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${e instanceof Error ? e.message : String(e)}`,
      }])
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100vh', 'max-width': '900px', margin: '0 auto' }}>
      <header style={{ padding: '16px', 'border-bottom': '1px solid #e5e7eb', 'font-weight': 'bold', 'font-size': '18px' }}>
        Tally Chat
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        <For each={messages()}>
          {(msg) => <MessageBubble message={msg} />}
        </For>
        {loading() && <MessageBubble message={{ role: 'assistant', content: '' }} isLoading />}
        <div ref={bottomRef} />
      </div>

      <QueryInput onSend={handleSend} disabled={loading()} />
    </div>
  )
}

export default App
```

- [ ] **Step 4: Create packages/frontend/.env**

```env
VITE_API_URL=http://localhost:3001
```

- [ ] **Step 5: Run both services**

```bash
# Terminal 1
cd packages/backend && pnpm dev

# Terminal 2
cd packages/frontend && pnpm dev
```

- [ ] **Step 6: Open http://localhost:3000 and test end-to-end**

Test questions:
- "What were my total sales this month?"
- "Show me top 5 customers by revenue in 2024"
- "What is my outstanding receivables?"
- "Which product sold the most last year?"

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/
git commit -m "feat(frontend): SolidJS chat UI with message history"
```

---

## ✅ REVIEW CHECKPOINT — After Chunk 4

**Stop here and show the user:**
- [ ] Open `http://localhost:3000` in a browser
- [ ] Type: "What were my total sales this month?" → should see a table or amount
- [ ] Type: "Show my top 5 customers" → should see a table with customer names
- [ ] Type a follow-up: "What about last month?" → should use context from previous exchange
- [ ] Verify UI: messages appear in a chat bubble layout, loading state shows while waiting

**Ask:** "Chunk 4 is complete. The full web app is working — SolidJS frontend is live and chatting with Tally data. Shall I proceed to Chunk 5 (security hardening + production deployment config)?"

---

## Chunk 5: Security + Production Config

### Task 12: Read-Only PostgreSQL User

- [ ] **Step 1: Create read-only DB user (run as postgres superuser)**

```sql
CREATE USER tally_readonly WITH PASSWORD 'strong_unique_password';
GRANT CONNECT ON DATABASE tally TO tally_readonly;
GRANT USAGE ON SCHEMA public TO tally_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tally_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tally_readonly;
```

- [ ] **Step 2: Verify the user cannot write**

```bash
psql "postgres://tally_readonly:password@localhost/tally" -c "INSERT INTO config VALUES ('x','y')"
```

Expected: `ERROR: permission denied for table config`

- [ ] **Step 3: Update DATABASE_URL in .env to use tally_readonly**

- [ ] **Step 4: Commit documentation**

```bash
git add docs/
git commit -m "docs: read-only PostgreSQL user setup for security"
```

---

### Task 13: Production Environment Config

For production, only env vars change — no code changes needed.

| Variable | Dev value | Prod value |
|---|---|---|
| `DATABASE_URL` | `postgres://...@localhost:5432/tally` | `postgres://...@db-server:5432/tally` |
| `LLM_BASE_URL` | `http://localhost:1234/v1` | `http://llm-server:1234/v1` |
| `CORS_ORIGIN` | `http://localhost:3000` | `https://your-frontend.com` |
| `VITE_API_URL` | `http://localhost:3001` | `https://your-backend.com` |

- [ ] **Step 1: Build the backend**

```bash
cd packages/backend && pnpm build
```

- [ ] **Step 2: Build the frontend**

```bash
cd packages/frontend && pnpm build
```

- [ ] **Step 3: Test the production build locally**

```bash
cd packages/backend && node dist/index.js
# frontend: serve packages/frontend/dist with nginx or similar
```

---

## Incremental Milestones

| After Task | What Works |
|---|---|
| Task 3 | DB connects, reads data |
| Task 4 | SQL injection protection in place |
| Task 5 | LLM generates SQL from natural language (test with curl) |
| Task 7 | Full pipeline working: question → SQL → DB → answer (curl testable) |
| Task 8 | HTTP API live on port 3001 |
| Task 11 | Full web app: business owner can chat with Tally data |
| Task 12 | Production-safe read-only DB user |
| Task 13 | Deployable to separate servers |

---

## Future Roadmap (Post-MVP)

1. **Predefined query shortcuts** — Match "sales this month" patterns before hitting LLM for speed + reliability
2. **Two-step table selection** — If schema grows very large (50+ tables), first ask Qwen "which tables are needed for this question?" then send only those tables' columns. Reduces tokens from ~3K to ~500 per request.
3. **SQL display toggle** — Show the generated SQL in the UI (transparency for power users)
3. **Conversation memory** — Persist chat history per user (PostgreSQL or Redis)
4. **Multi-company support** — URL param `/company/:id` + schema-per-company in DB
5. **Streaming responses** — Server-Sent Events for real-time typing effect
6. **Charts** — Recharts or Chart.js for sales trends, pie charts for expense breakdown
7. **Export** — Download results as CSV
8. **Auth** — JWT-based login so multiple business owners use the same deployment
9. **Qwen fine-tuning** — Fine-tune on Tally-specific SQL examples for better accuracy

---

## Verification Checklist

- [ ] `pnpm test` (run from repo root) — all tests pass
- [ ] `pnpm build` — both backend and frontend compile without errors
- [ ] `pnpm dev` — both services start
- [ ] GET `http://localhost:3001/health` → `{"status":"ok"}`
- [ ] POST `/api/chat` with "What are my total sales this month?" → returns answer with ₹ figure
- [ ] POST `/api/chat` with "DELETE FROM config" → returns error message, no DB change
- [ ] Frontend: open `http://localhost:3000`, send a question, receive a formatted answer
- [ ] Frontend: multi-turn conversation works (follow-up questions use context)
- [ ] LM Studio: model is loaded and responding at `http://localhost:1234/v1`
