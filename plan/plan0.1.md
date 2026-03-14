# AI Architect Prompt — Build an AI Chat App for Tally Accounting Data

You are a **senior AI systems architect and backend engineer**.

Your task is to design a **production-grade AI chat application** that allows business owners using **Tally Prime** to query their accounting data using natural language.

Provide a **complete architecture and implementation plan**.

---

# 1. Project Overview

I want to build an **AI-powered chat interface** that allows business owners to ask questions about their **Tally accounting data** in natural language.

Examples of questions users might ask:

* What were my total sales this month?
* Show top 10 customers by revenue
* What is my outstanding receivables?
* Which product sold the most last month?
* What is the GST payable for this quarter?

The system should convert natural language questions into **SQL queries**, execute them on the database, and return results to the user.

---

# 2. Current Infrastructure

## Data Sync

I already have a **desktop application installed on the client’s machine**.

This application:

* Reads accounting data from **Tally Prime**
* Syncs the data to my **central server**
* Currenlty that data i have on my development machine in POSTGRESS SQL
* Check sql.md file for the sql database structure.

This sync process already works.

---

## Database

All Tally data is stored in a **PostgreSQL database**.

I already have:

* All tables created
* Proper schema with table relationships
* Accounting entities such as:

Examples include:

* ledgers
* vouchers
* transactions
* inventory
* customers
* suppliers
* sales
* purchases
* GST entries

I can provide the **entire database schema** to the LLM.

---

## LLM

I have **Qwen 3.5 installed locally** on my development machine.

The LLM will be responsible for:

* Understanding natural language queries
* Generating SQL queries

---

# 3. Target System Behavior

The final system should work like this:

User → Chat App → LLM → SQL Query → Database → Results → Chat Response

Example:

User question:

"What were my sales this month?"

LLM generates:

SELECT SUM(amount)
FROM vouchers
WHERE voucher_type='Sales'
AND date >= DATE_TRUNC('month', CURRENT_DATE)

Backend executes query and returns result.

---

# 4. What I Want You to Design

Provide a **complete engineering design** including the following.

---

# A. System Architecture

Describe the architecture including:

* Chat frontend
* Backend service
* LLM service
* Database access layer
* SQL validation layer
* Result formatting layer

Provide a **clear architecture diagram in text form**.

Example format:

User
↓
Frontend
↓
API Backend
↓
LLM Service
↓
SQL Validator
↓
PostgreSQL
↓
Response Formatter
↓
Chat UI

---

# B. Repository Structure

Provide a recommended **project folder structure**.

Example:

backend/
llm/
prompts/
db/
api/
frontend/
services/
tools/

Include purpose of each folder.

---

# C. Prompt Engineering Design

Design the **best prompt template** for converting natural language into SQL.

The prompt must include:

* Schema context
* Query generation rules
* Accounting assumptions
* Safety rules

Also explain how to reduce hallucinations.

---

# D. Schema Context Strategy

Explain the best approach for giving schema context to the LLM.

Options include:

1. Full schema in prompt
2. Schema retrieval (RAG)
3. Table selection before SQL generation

Recommend the best approach.

---

# E. SQL Safety Layer

Explain how to safely execute LLM-generated SQL.

Include:

* Restricting queries to SELECT
* Query parsing
* Query validation
* Preventing SQL injection

---

# F. Query Execution Layer

Design the component that:

* receives SQL from LLM
* validates SQL
* executes it on PostgreSQL
* returns structured results

Include recommended libraries.

---

# G. Response Formatting

Design how results should be returned to the user.

Examples:

Tables
Summaries
Charts
Key metrics

---

# H. Multi-Tenant Design

The system should eventually support **multiple businesses**.

Explain:

* tenant separation
* database strategy
* authentication

---

# I. Chat UX Design

Describe how the chat interface should behave.

Examples:

* follow-up questions
* query clarification
* result summaries
* charts

---

# J. Performance Optimization

Recommend strategies such as:

* query caching
* pre-aggregated metrics
* schema embeddings
* streaming responses

---

# K. Security Considerations

Include protections for:

* prompt injection
* malicious SQL
* data access control
* LLM hallucinations

---

# L. Implementation Plan

Provide a **step-by-step development roadmap**.

Example:

Phase 1 — Basic SQL generation
Phase 2 — Query execution layer
Phase 3 — Chat UI
Phase 4 — Safety layer
Phase 5 — Multi-tenant system

---

# M. Example End-to-End Flow

Provide a full example:

User Query → Prompt → LLM → SQL → DB → Result → Chat Response

---

# Goal

The final result should be a **production-grade AI accounting assistant** built on:

* PostgreSQL
* Local LLM (Qwen 3.5)
* Chat interface
* SQL generation pipeline
