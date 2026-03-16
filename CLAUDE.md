# Project: Tally Chat Mcp

## 🎯 Goal
AI-powered chat interface for Tally Prime accounting data. Business owners ask natural language questions ("What were my sales this month?"), the system converts them to SQL via a local LLM (Qwen 3.5), executes safely against PostgreSQL, and returns formatted results in a chat UI.

## 🏗 Tech Stack

### Project Structure
- Two independent apps: `backend/` and `frontend/` — each has its own `node_modules`, no workspace linking
- Node.js >= 22.0.0
- TypeScript 5.5
- To add a new stack (e.g. Python): just create a new top-level directory (e.g. `backend-python/`)

### Backend (`backend/`)
- Fastify v4 — HTTP server
- @fastify/cors — CORS middleware
- Kysely — type-safe SQL query builder
- pg — PostgreSQL driver
- OpenAI SDK v4 — LLM client (Qwen 3.5 via OpenAI-compatible local API)
- Zod — schema validation
- node-sql-parser — SQL parsing and safety validation
- dotenv — environment variable loading
- tsx — TypeScript execution (dev)
- Vitest — unit testing

### Frontend (`frontend/`)
- SolidJS v1.8 — reactive UI framework
- Vite v5 — build tool and dev server
- vite-plugin-solid — SolidJS Vite integration
- Tailwind CSS v4 (`@tailwindcss/vite`) — utility-first CSS framework
- TypeScript 5.5
- Vitest — unit testing

### Database
- PostgreSQL — primary data store (Tally Prime accounting data)

### LLM
- Qwen2.5-Coder-7B-Instruct — local LLM via LM Studio (OpenAI-compatible API, 95.73% SQL accuracy, 80+ languages including Hindi)
- LM Studio context length must be set to **8192** to handle full system prompt + SQL output

## 📋 Coding Rules

### TypeScript (applies to both packages)
- `strict: true` always on — no exceptions
- No `any` types ever — use `unknown` and narrow, or define proper interfaces
- Explicit return types on all exported functions
- `interface` over `type` for object shapes; `type` only for unions/intersections
- All async functions must be typed with `Promise<T>` return type
- Use `satisfies` operator to validate object literals against types without widening

### Node.js / General
- `async`/`await` only — never callbacks or raw `.then()` chains
- `const` over `let`, never `var`
- Max function length 30 lines — extract helpers if longer
- All environment variables loaded via `dotenv` and validated with Zod at startup
- Never read `process.env` directly in app code — use a validated config object
- Error handling on every external call (DB, LLM, HTTP)

### Fastify (Backend)
- Register all routes in separate route files under `src/routes/`
- Use Fastify's built-in schema validation (JSON Schema or Zod via plugin) on every route
- Always set explicit HTTP status codes — never rely on defaults
- Use `fastify.log` for all logging — never `console.log` in production code
- Never expose raw DB or LLM errors to the client — map to safe error responses
- Use `preHandler` hooks for auth/validation, not inline logic in route handlers

### Kysely (SQL Query Builder)
- Never use raw `sql` template tag unless Kysely's typed API cannot express the query
- Always explicitly select columns — never `selectAll()` in production queries
- Use Kysely's transaction API for any multi-step writes
- Keep all DB query logic in `src/db/` — never inline queries in route handlers
- Type all table interfaces in a central `src/db/types.ts` file

### PostgreSQL
- Always use parameterized queries — Kysely enforces this, never bypass it
- Every foreign key column must have an index
- Use `EXPLAIN ANALYZE` before adding any new complex query to production
- Never run schema changes manually — use migration files (e.g. via `kysely-migration`)
- Add comments on all complex accounting queries explaining business logic

### Zod
- Define all API request/response schemas in `src/schemas/`
- Always `.parse()` (throws) at trust boundaries — never `.safeParse()` and silently ignore errors
- Use `.safeParse()` only where partial validation is intentional and the error is handled
- Infer TypeScript types from Zod schemas: `type MyType = z.infer<typeof MySchema>`
- Never duplicate a type definition that can be inferred from a Zod schema

### OpenAI SDK / LLM (Qwen 3.5)
- Never send raw user input directly to the LLM — always wrap in a structured prompt template
- Always set a `max_tokens` limit on every LLM call
- Validate and parse LLM output before using it — treat it as untrusted external input
- Wrap every LLM call in try/catch — network or model errors must not crash the server
- Log the generated SQL (before execution) for every request for auditability
- Never expose the raw LLM response to the client — only send the final formatted result

### node-sql-parser (SQL Safety)
- Every LLM-generated SQL must pass through the safety validator before execution
- Only `SELECT` statements are permitted — reject all others with a 400 error
- Parse SQL into AST and inspect the AST — do not rely on regex or string matching
- Maintain an allowlist of permitted tables — reject queries touching unlisted tables
- Log and alert on any rejected SQL attempts

### SolidJS (Frontend)
- Use signals (`createSignal`) for local reactive state — never plain variables
- Use `createMemo` for derived values — never recompute inside JSX
- Use `createEffect` for side effects — never call signal setters inside render
- Read signals by calling them as functions: `count()` not `count`
- Components should be small and focused — extract logic into custom primitives
- No direct DOM manipulation — use refs (`ref=`) only when strictly necessary

### Vite
- All environment variables must be prefixed `VITE_` to be exposed to the frontend
- Never put secrets in `VITE_` variables — they are bundled into the client
- Use `import.meta.env` to access env vars, never `process.env` in frontend code
- Keep `vite.config.ts` minimal — avoid custom plugins unless necessary

### Vitest (Testing)
- Every backend route must have at least one integration test
- Every SQL validator rule must have a unit test
- Every Zod schema must have tests for both valid and invalid inputs
- Use `vi.mock` only for external services (LLM, DB in unit tests) — prefer real DB in integration tests
- Test file naming: `*.test.ts` co-located with the source file

### pnpm
- Always run commands from inside the app directory: `cd backend && pnpm <cmd>` or `cd frontend && pnpm <cmd>`
- Never install a package with `npm` or `yarn` — always `pnpm`
- Each app has its own `pnpm-lock.yaml` — keep both committed

## 🚫 Never Do This (Universal)
- Never hardcode credentials
- Never skip error handling
- Never push directly to main
- Never commit .env files

## 📁 Key Files
[Add key files as the project grows]
- [e.g. src/main.py → Entry point]

## ✅ Current Status
- Started: 2026-03-14
- **Working end-to-end**: Backend chat pipeline + Frontend UI are both functional
- Full pipeline: User question → LLM (Qwen2.5-Coder via LM Studio) → SQL validator → PostgreSQL → formatted answer
- Hindi + English queries supported
- Migrated from pnpm monorepo to two independent apps (`backend/`, `frontend/`)
- Frontend redesigned to match `error/design.html` reference: Inter font, #135bec primary blue, white chat panel, avatar bubbles, timestamps, typing indicator
- Tailwind CSS v4 `@theme` token (`--color-primary`) confirmed working; base styles in `@layer base` to survive preflight
- Next up: Error display in UI, SQL preview toggle

## 🔄 Session History (Last 5 Only)
- 2026-03-15: Backend fixes — timing logs (LLM+DB), Hindi query fix (language rule + few-shot), model switched to qwen2.5-coder-7b-instruct, SQL truncation diagnosed (LM Studio context → 8192), model comparison doc saved to plan/
- 2026-03-15: Frontend UI modernization — Tailwind CSS v4, Roboto font, light slate-50 theme, indigo-600 header, color-coded message bubbles, slide-in animations, animated dot loader
- 2026-03-15: Migrated from pnpm workspace monorepo to two independent apps (backend/, frontend/) — fixes Tailwind v4 module graph scanning regression in workspaces
- 2026-03-16: Frontend redesign — matched error/design.html: Inter font, #135bec primary, white panel max-w-2xl, avatar+online dot header, received/sent bubble layout, timestamps, double-check icon, typing indicator, pill input bar, round send button; added timestamp field to Message interface
- 2026-03-16: Tailwind CSS fixes — removed inline style override in index.html, moved base styles into @layer base in index.css, replaced size-* with w-*/h-* for cross-element compatibility
