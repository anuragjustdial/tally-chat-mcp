# Feature Log: Tally Chat Mcp
# Max 15 features — run /archive-now when it exceeds this

---
## [FEATURE-001] Initial Setup
- **Status**: ✅ Complete
- **Date**: 2026-03-14
- **Files**: CLAUDE.md, FEATURE_LOG.md, docs/, archive/, .claude/
- **How it works**: Project scaffolded with Claude Code setup
- **Known issues**: None

---
## [FEATURE-002] Project Configuration & Coding Standards
- **Status**: ✅ Complete
- **Date**: 2026-03-14
- **Files**: CLAUDE.md
- **How it works**: Goal, Tech Stack, and Coding Rules sections fully populated in CLAUDE.md. Rules cover all 11 technologies: TypeScript, Node.js, Fastify, Kysely, PostgreSQL, Zod, OpenAI SDK, node-sql-parser, SolidJS, Vite, Vitest, pnpm.
- **Known issues**: None

---
## [FEATURE-003] Backend Chat Pipeline
- **Status**: ✅ Complete
- **Date**: 2026-03-15
- **Files**: `packages/backend/src/llm/client.ts`, `schema-loader.ts`, `sql-generator.ts`, `sql-safety/validator.ts`, `formatters/result.ts`, `routes/chat.ts`, `server.ts`
- **How it works**: Fastify POST `/api/chat` receives `{message, history}` → LLM generates SQL → validator allows only SELECT on allowlisted tables → PostgreSQL executes → `formatRows()` returns markdown table answer
- **Known issues**: None

---
## [FEATURE-004] Backend Timing Logs
- **Status**: ✅ Complete
- **Date**: 2026-03-15
- **Files**: `packages/backend/src/routes/chat.ts`
- **How it works**: `performance.now()` wraps LLM and DB calls separately; logs `[TIMING] question="..." | LLM: Xms | DB: Xms | Total: Xms` to stdout after each successful request
- **Known issues**: None

---
## [FEATURE-005] Hindi Query Support
- **Status**: ✅ Complete
- **Date**: 2026-03-15
- **Files**: `packages/backend/src/llm/schema-loader.ts`
- **How it works**: Added rule "questions in Hindi — always return ONLY the SQL query" + Hindi few-shot example (`mere kitne stock groups hai` → `SELECT COUNT(*) AS total_stock_groups FROM mst_stock_group`) to system prompt. Prevents model from returning direct answers for Hindi input.
- **Known issues**: Backend restart required to invalidate in-memory `cachedPrompt` after any prompt change

---
## [FEATURE-006] Model Upgrade to Qwen2.5-Coder-7B
- **Status**: ✅ Complete
- **Date**: 2026-03-15
- **Files**: `packages/backend/.env`
- **How it works**: Switched `LLM_MODEL` from `qwen/qwen3.5-9b` to `qwen2.5-coder-7b-instruct`. 95.73% SQL accuracy on benchmarks, 80+ languages including Hindi, 128K context window (no truncation), ~4.5GB VRAM.
- **Known issues**: LM Studio context window must be set to 8192 manually to avoid SQL truncation on complex CTE queries

---
## [FEATURE-007] Frontend UI Modernization
- **Status**: ✅ Complete
- **Date**: 2026-03-15
- **Files**: `packages/frontend/vite.config.ts`, `src/index.css` (new), `src/index.tsx`, `src/App.tsx`, `src/components/MessageBubble.tsx`, `src/components/QueryInput.tsx`, `package.json`
- **How it works**: Replaced inline styles with Tailwind CSS v4 (`@tailwindcss/vite`). Dark `slate-900` background, indigo→purple gradient header with live "Connected" dot. User messages: right-aligned indigo-600 bubble with slide-in-right animation. Bot messages: left-aligned slate-700 bubble with slide-in-left animation + robot avatar. Loading: 3-dot bounce animation. Input bar: dark slate-800, gradient send button with icon. Roboto font (300/400/500/700) via Google Fonts.
- **Known issues**: None

---
## [FEATURE-008] Frontend Redesign — Match error/design.html
- **Status**: ✅ Complete
- **Date**: 2026-03-16
- **Files**: `frontend/src/App.tsx`, `frontend/src/components/MessageBubble.tsx`, `frontend/src/components/QueryInput.tsx`, `frontend/src/index.css`, `frontend/src/api/chat.ts`, `frontend/index.html`
- **How it works**: Full visual redesign to match `error/design.html` reference. Inter font (Google Fonts). Primary color `#135bec` via Tailwind v4 `@theme` token. White `max-w-2xl` chat panel with `border-x` on `#f6f6f8` background. Header: bot avatar circle with green online dot overlay, "Tally Chat" title, "Online" subtitle, right-side "Connected" indicator. Message area: "Today" date separator pill. Received (assistant) bubbles: left-aligned `bg-slate-100 rounded-bl-none` with robot avatar and timestamp below-left. Sent (user) bubbles: right-aligned `bg-primary rounded-br-none` with timestamp + double-checkmark below-right. Typing indicator: three staggered bouncing dots in slate pill. Footer: pill-shaped `bg-slate-100` textarea wrapper with `focus-within` border highlight; round `w-11 h-11` primary send button. Added `timestamp?: string` field to `Message` interface, stamped at message creation time.
- **Known issues**: None

---
## [FEATURE-010] Table Horizontal Scroll
- **Status**: ✅ Complete
- **Date**: 2026-03-16
- **Files**: `frontend/src/components/MessageBubble.tsx`, `frontend/src/index.css`
- **How it works**: Three-part solution. (1) `wrapTables()` helper in `MessageBubble.tsx` wraps every `<table>` in `<div class="table-wrap">` before injecting via `innerHTML`. (2) `.prose .table-wrap` in `index.css` is the scroll container (`overflow-x: auto; width: 100%`). (3) The assistant bubble's outer flex wrapper gets `min-w-0` (allows flex item to shrink below content size) and the bubble div gets `overflow-hidden` (creates the hard width boundary that `overflow-x: auto` needs to work). Without `min-w-0` + `overflow-hidden`, `max-w-[85%]` is overridden by the table's intrinsic width in flex layout, causing the whole page to scroll. The table itself has `white-space: nowrap; width: auto` so columns render at natural width. Only the table scrolls — chat panel, other bubbles, user messages are unaffected.
- **Known issues**: `white-space: nowrap` means very long cell text (e.g. narration fields) will make that column wide rather than wrapping — acceptable for accounting data.
- **Enhancement**: First column is sticky (`position: sticky; left: 0`) so users always see the row label while scrolling wide tables. Uses `border-collapse: separate; border-spacing: 0` (required for sticky to work) with explicit `background-color` and `box-shadow` on `th/td:first-child` to maintain visual separation.

---
## [FEATURE-011] Remove Dead Backend Code
- **Status**: ✅ Complete
- **Date**: 2026-03-16
- **Files deleted (src)**: `backend/src/llm/client.ts`, `backend/src/llm/schema-loader.ts`, `backend/src/llm/sql-generator.ts`, `backend/src/sql-safety/validator.ts`, `backend/src/db/kysely.ts`, `backend/src/db/dialect.ts`
- **Files deleted (tests)**: `backend/tests/llm/sql-generator.test.ts`, `backend/tests/llm/schema-loader.test.ts`, `backend/tests/db/kysely.test.ts`, `backend/tests/sql-safety/validator.test.ts`
- **Files updated**: `backend/tests/routes/chat.test.ts` (rewritten to mock `fetch` and test all 5 `PythonServiceResponse` status cases + network/HTTP errors), `backend/tests/formatters/result.test.ts` (replaced `formatRows` tests with `formatPythonResponse` tests)
- **How it works**: The Node.js backend was migrated to delegate all LLM + SQL work to a Python service. The old pipeline (OpenAI SDK → Kysely → node-sql-parser) was never called by the live `routes/chat.ts` but its files remained, adding maintenance burden. All 6 source files and 4 test files for the dead pipeline were removed. Test coverage was updated to reflect the current delegation architecture: `routes/chat.ts` calls `PYTHON_SERVICE_URL/query` via `fetch` and handles five response statuses (`success`, `non_sql`, `max_retries`, `api_error`, network failure, HTTP error).
- **Known issues**: None

---
## [FEATURE-009] Tailwind CSS v4 Runtime Fixes
- **Status**: ✅ Complete
- **Date**: 2026-03-16
- **Files**: `frontend/index.html`, `frontend/src/index.css`, `frontend/src/App.tsx`, `frontend/src/components/MessageBubble.tsx`, `frontend/src/components/QueryInput.tsx`
- **How it works**: Fixed two root causes preventing Tailwind styles from rendering. (1) Removed inline `<style>` block from `index.html` that overrode `body { font-family }` and `body { background }` with wrong values. (2) Moved `html, body, #root` and `*` reset rules into `@layer base {}` in `index.css` so they are placed in Tailwind's base cascade layer and win over preflight resets. (3) Replaced all `size-*` utility classes with explicit `w-* h-*` pairs (added `inline-block` where needed on `<span>` elements) for cross-element compatibility.
- **Known issues**: None
