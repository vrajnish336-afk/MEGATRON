# MEGADRONE AI Routing & Privacy Policy Engine

## 1. AI Routing Objective
The MEGADRONE AI Router intelligently balances:
1. **Data Privacy**: Prohibiting confidential or sensitive business data from leaving the local infrastructure.
2. **Cost Efficiency**: Routing simple, repetitive classifications to zero-cost Local AI (Ollama).
3. **Reasoning Capacity**: Allocating long-context executive analysis or reports to Cloud AI models.
4. **Resilience**: Falling back gracefully if a provider is offline without crashing the application.

---

## 2. Decision Logic Flowchart

```
Task Request
     │
     ▼
Is Data Policy Restricting Cloud? (CONFIDENTIAL or SENSITIVE)
     ├── YES ──► Is Local Ollama Online?
     │                ├── YES ──► Execute via Ollama (Local)
     │                └── NO  ──► Block Cloud Transmission & Log Error
     │
     └── NO  ──► Is Routing Strategy Forced? (force_local / force_cloud)
                      ├── YES ──► Route to Configured Strategy
                      └── NO  ──► Evaluate Task Complexity:
                                       │
                ┌──────────────────────┴──────────────────────┐
                │ Simple Task                                 │ Complex Task
                ▼                                             ▼
       Prefer Local (Ollama)                         Prefer Cloud AI
          ├── Online ──► Ollama (Local)                 ├── Online ──► Cloud AI
          └── Offline ──► Fallback to Cloud             └── Offline ──► Fallback to Ollama
```

---

## 3. Data Privacy Classifications

- **`PUBLIC`**: Marketing text, public product descriptions, general documentation. Cloud AI allowed by default.
- **`INTERNAL`**: Operational task titles, general lead metadata. Cloud AI allowed with data minimization.
- **`CONFIDENTIAL`**: Private contracts, strategic pricing tiers, internal roadmap details. Local execution preferred.
- **`SENSITIVE`**: PII, credentials, sensitive contact lists. Cloud AI strictly forbidden.

---

## 4. Routing Decision Audit Log Example
Every routing decision is logged into `ai_usage_logs`:
```json
{
  "provider": "cloud",
  "model": "gpt-4o-mini",
  "task_type": "business_analysis",
  "routing_reason": "complex_task_business_analysis_routed_to_cloud",
  "prompt_tokens": 420,
  "completion_tokens": 180,
  "estimated_cost_usd": 0.000171,
  "latency_ms": 780,
  "success": 1
}
```
