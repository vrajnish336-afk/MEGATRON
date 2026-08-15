# MEGADRONE Architecture Specification

## 1. Architectural Philosophy
MEGADRONE Business OS follows a layered, modular domain-driven architecture designed to prevent tight coupling between AI models, business data storage, and user interfaces.

```
                          ┌──────────────────────────┐
                          │   Frontend SPA Layer     │
                          │   (Vanilla ES Modules)   │
                          └─────────────┬────────────┘
                                        │ (REST / JSON)
                          ┌─────────────▼────────────┐
                          │    Express API Layer     │
                          │ (Auth, RBAC, Rate-Limit) │
                          └─────────────┬────────────┘
                                        │
           ┌────────────────────────────┼───────────────────────────┐
           │                            │                           │
┌──────────▼──────────┐      ┌──────────▼──────────┐     ┌──────────▼──────────┐
│   Database Layer    │      │    Orchestrator     │     │   Workflow Engine   │
│ (SQLite / Postgres) │      │  (Intent & Safety)  │     │ (Event Trigger Bus) │
└─────────────────────┘      └──────────┬──────────┘     └──────────┬──────────┘
                                        │                           │
                             ┌──────────▼──────────┐                │
                             │     Agent Layer     │◄───────────────┘
                             │(BI, Lead, Task, etc)│
                             └──────────┬──────────┘
                                        │
                             ┌──────────▼──────────┐
                             │     AI Router       │
                             │ (Privacy + Bounds)  │
                             └────┬──────────────┬─┘
                                  │              │
                       ┌──────────▼───┐      ┌───▼──────────┐
                       │  Local AI    │      │   Cloud AI   │
                       │   (Ollama)   │      │  (OpenAI/etc)│
                       └──────────────┘      └──────────────┘
```

---

## 2. Core Subsystems

### 2.1 The Central Orchestrator
The central orchestrator does not blindly delegate user input to an LLM. Instead, it follows a deterministic sequence:
1. **Hard Guardrail Check**: Detects prohibited operations (such as moving funds or executing financial transactions) and rejects them immediately.
2. **Permission Check**: Verifies that caller role possesses `ai:use` permissions.
3. **Intent Detection & Task Planning**: Analyzes query keywords or natural language structure to identify required domain tools (Tasks, Leads, Reports, Communications).
4. **Data Policy Check**: Evaluates if context data is PUBLIC, INTERNAL, CONFIDENTIAL, or SENSITIVE.
5. **AI Routing**: Selects Local Ollama or Cloud AI based on complexity and privacy policies.
6. **Risk Assessment**: If action risk is HIGH (e.g., dispatching email), creates an approval queue record rather than taking irreversible actions.
7. **Audit Logging**: Persists sanitized execution record into `audit_logs`.

### 2.2 Dual AI Provider Abstraction
All AI operations target the `AIProvider` base interface:
- **`CloudAIProvider`**: Handles standard OpenAI/Gemini/Anthropic chat completion formats, exponential retries, rate-limiting, and cost estimation.
- **`OllamaProvider`**: Connects to local Ollama on port 11434 with health check pings and offline fallback handling.

### 2.3 Workflow Automation Engine
Evaluates event-driven rules:
- **Triggers**: `LEAD_CREATED`, `TASK_OVERDUE`, `STATUS_CHANGED`, `MANUAL`.
- **Conditions**: Evaluates field equalities, thresholds, and null checks.
- **Actions**: `CLASSIFY_LEAD`, `CREATE_TASK`, `GENERATE_SUGGESTED_DRAFT`, `SEND_EXTERNAL_MESSAGE` (interception gate).

### 2.4 Multi-Tenant Storage Layer
Every domain entity (`leads`, `tasks`, `workflows`, `approvals`, `audit_logs`, `ai_usage_logs`, `reports`) includes a mandatory `org_id` column. Repositories enforce row-level scoping so cross-tenant leakage is impossible.
