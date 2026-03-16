# Model Comparison: SQLCoder-7b-2 vs Qwen3.5 for Tally Chat

## TL;DR
**SQLCoder-7b-2 is NOT a good fit for this project.** It has no Hindi support. For a bilingual (Hindi + English) chat interface, Qwen3.5 is actually better suited — or we upgrade to Qwen2.5-Coder which is both more accurate on SQL AND multilingual.

---

## SQLCoder-7b-2 — What It Is

| Property | Value |
|---|---|
| Base model | CodeLlama-7B |
| Fine-tuned on | 20,000+ English text-to-SQL pairs |
| SQL benchmark | ~71% (SQL-Eval), 97.1% on joins |
| Languages | **English only** |
| Released | Feb 2024 |
| Size | 7B parameters |

**Strengths:**
- Laser-focused on SQL — no reasoning preamble, no markdown, just SQL
- Very fast output (no `<think>` blocks, no chain-of-thought)
- Excellent join accuracy (97.1%)
- Runs well on consumer hardware (4-bit quantized ~4GB VRAM)

**Weaknesses (critical for this project):**
- **Zero Hindi support** — CodeLlama base was trained almost entirely on English code/text. Hindi queries will either fail silently or produce garbage SQL.
- Frozen to training-time schemas — relies heavily on prompt schema injection (same as our current setup)
- Older model (Feb 2024), no updates since
- No reasoning ability for ambiguous queries

---

## Current Model: Qwen3.5-9B

| Property | Value |
|---|---|
| Base model | Qwen3 series (Alibaba) |
| Languages | **119 languages** including Hindi, Bengali, Gujarati, Marathi |
| SQL capability | Strong (Qwen2.5-Coder achieves 95.73% on SQL benchmarks) |
| Reasoning | Thinking mode (`<think>` blocks) + `/no_think` mode |
| Released | 2025 |

**Strengths:**
- Native Hindi support — understands and processes Hindi queries correctly
- More recent training data, better general reasoning
- Can handle ambiguous questions by reasoning through them
- Actively maintained model family

**Current issues (all fixable in code, not model limitations):**
- Generates `<think>` blocks despite `/no_think` → already fixed in `sql-generator.ts`
- Context window limitation in LM Studio → fix: set context to 8192
- Table alias inconsistency → already fixed via prompt rule

---

## Head-to-Head: This Project's Requirements

| Requirement | SQLCoder-7b-2 | Qwen3.5-9B |
|---|---|---|
| English queries | ✅ Excellent | ✅ Good (improving with prompts) |
| Hindi queries | ❌ Will not work | ✅ Native support |
| Complex CTEs (outstanding bills) | ✅ Good | ✅ Good |
| No alias / consistent SQL | ✅ Reliable | ⚠️ Needs prompt enforcement |
| Speed | ✅ Faster (no thinking) | ⚠️ Slower (think blocks even with /no_think) |
| Schema awareness | ✅ Via prompt | ✅ Via prompt |

---

## The Multi-Model Approach (If We Want SQLCoder)

One option is to chain two models:
```
User (Hindi) → Qwen3.5 [translate to English] → SQLCoder [generate SQL] → DB
```

**Problems:**
- Two LLM calls = 2x latency (already slow at 8-30 seconds per query)
- Two models running = more VRAM needed
- Translation errors compound SQL errors
- More complexity, more points of failure

**Verdict: Not worth it** for a local setup.

---

## Recommended Path: Upgrade to Qwen2.5-Coder

If SQL accuracy is the goal, the better upgrade is **Qwen2.5-Coder-7B** (not SQLCoder):

| Model | SQL Accuracy | Hindi | Speed | Size |
|---|---|---|---|---|
| SQLCoder-7b-2 | 71% | ❌ | Fast | 7B |
| Qwen3.5-9B (current) | ~80-85% (estimated) | ✅ | Medium | 9B |
| **Qwen2.5-Coder-7B** | **95.73%** | ✅ | Fast | 7B |

Qwen2.5-Coder was specifically trained for code + SQL tasks AND retains the multilingual capability of the Qwen base. It outperforms SQLCoder significantly on diverse SQL tasks.

### Model Details

| Property | Value |
|---|---|
| Released | **September 2024**, updated January 2025 |
| Context window | 128K tokens (no context length issues) |
| Training | 5.5 trillion tokens including source code + synthetic SQL data |
| Languages | 80+ languages including Hindi |

### How to Download in LM Studio

LM Studio has an official community GGUF — searchable directly inside the app:

- **Search in LM Studio:** `lmstudio-community/Qwen2.5-Coder-7B-Instruct-GGUF`
- **HuggingFace (GGUF):** [Qwen/Qwen2.5-Coder-7B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF)
- **Community GGUF (bartowski):** [bartowski/Qwen2.5-Coder-7B-Instruct-GGUF](https://huggingface.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF)

Recommended quantization: **Q4_K_M** (~4.5GB download) — good balance of quality and speed.

### Code Change After Switching

Only one line in `packages/backend/.env`:
```
LLM_MODEL=qwen2.5-coder-7b-instruct   # replace qwen/qwen3.5-9b
```

No other code changes needed.

---

## Qwen3-Coder-30B-A3B (Premium Option)

This is the model at [lmstudio.ai/models/qwen/qwen3-coder-30b](https://lmstudio.ai/models/qwen/qwen3-coder-30b). Key facts:

| Property | Value |
|---|---|
| Released | **July 31, 2025** (very new) |
| Architecture | MoE — 30B total params, **only 3.3B active per token** |
| Context window | 160K tokens (massive — no context cutoff issues) |
| Languages | 119 languages including Hindi |
| GGUF (Q4_K_M) | **~18.6GB** file size |
| VRAM needed | **~17.5-20GB** |
| LM Studio | `lmstudio-community/Qwen3-Coder-30B-A3B-Instruct-GGUF` |

**What MoE means for you:** Despite having 30B parameters, only 3.3B activate per token — so inference speed is similar to a 3-4B model. You get the intelligence of a large model at the speed of a small one.

**The catch:** Needs ~18-20GB VRAM/unified memory to run.

---

## Full 4-Way Comparison

| Model | Released | SQL Accuracy | Hindi | VRAM (Q4) | Speed | Verdict |
|---|---|---|---|---|---|---|
| SQLCoder-7b-2 | Feb 2024 | 71% | ❌ | ~4.5GB | Fast | ❌ No Hindi |
| Qwen3.5-9B (current) | 2025 | ~80-85% | ✅ | ~5GB | Medium | OK baseline |
| Qwen2.5-Coder-7B | Sep 2024 | **95.73%** | ✅ | ~4.5GB | Fast | ✅ Best for low-VRAM |
| **Qwen3-Coder-30B-A3B** | Jul 2025 | **Best (newest)** | ✅ | ~18.6GB | Fast (MoE) | ✅ Best overall if you have 20GB+ |

---

## Decision Summary — Pick Based on Your Hardware

| Your hardware | Recommended model | Why |
|---|---|---|
| Mac M2/M3 Pro/Max with 32GB+ | **Qwen3-Coder-30B-A3B** | Most capable, MoE is fast, 160K context, very new |
| Mac with 16GB or GPU with 8-12GB | **Qwen2.5-Coder-7B-Instruct** | 95.73% SQL accuracy, Hindi, same VRAM as current |
| Keep current setup | Qwen3.5-9B (already running) | Fix LM Studio context → 8192 first, costs nothing |
| SQLCoder-7b-2 | ❌ Skip | Hindi doesn't work |

---

## How to Check Your Hardware

On Mac: Apple menu → About This Mac → Memory (look for "32GB" or "16GB")

---

## Sources
- [defog/sqlcoder-7b-2 — Hugging Face](https://huggingface.co/defog/sqlcoder-7b-2)
- [SQLCoder-7b-2 is live — float16 blog](https://blog.float16.cloud/sqlcoder-7b-2/)
- [GitHub — defog-ai/sqlcoder](https://github.com/defog-ai/sqlcoder)
- [Text-to-SQL Performance: Llama 3.1, Qwen 2.5, GPT-4.5 — LeadingTorch](https://www.leadingtorch.com/2025/12/09/text-to-sql-performance-a-head-to-head-comparison-of-llama-3-1-qwen-2-5-and-gpt-4-5-turbo/)
- [Qwen3 Blog — 119 language support](https://qwenlm.github.io/blog/qwen3/)
- [Qwen2.5-Coder Technical Report — arXiv](https://arxiv.org/pdf/2409.12186)
- [Qwen2.5-Coder-7B-Instruct — HuggingFace](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct)
- [Qwen2.5-Coder-7B-Instruct GGUF — HuggingFace](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF)
- [lmstudio-community GGUF — HuggingFace](https://huggingface.co/lmstudio-community/Qwen2.5-Coder-7B-Instruct-GGUF)
- [Qwen3-Coder-30B — LM Studio](https://lmstudio.ai/models/qwen/qwen3-coder-30b)
- [Qwen3-Coder GitHub](https://github.com/QwenLM/Qwen3-Coder)
- [Qwen3-Coder-30B-A3B GGUF — lmstudio-community](https://huggingface.co/lmstudio-community/Qwen3-Coder-30B-A3B-Instruct-GGUF)
- [Qwen3-Coder hardware requirements — arsturn](https://www.arsturn.com/blog/running-qwen3-coder-30b-at-full-context-memory-requirements-performance-tips)
- [Text-to-SQL LLM Accuracy 2026 — AIMultiple](https://research.aimultiple.com/text-to-sql/)
