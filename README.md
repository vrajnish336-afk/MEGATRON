# MEGADRONE Business OS — Real Estate Edition

> **Production-Oriented AI Business Operations & Workflow Automation Platform Built for Real Estate Teams**

MEGADRONE Business OS is an operating layer engineered for real estate agencies, brokerage teams, and expanding business enterprises to manage buyer inquiries, property requirements, site visit schedules, event-driven workflows, executive reporting, and autonomous AI-assisted operations with **mandatory human approval guardrails**, **privacy-aware data policies**, and **hybrid local (Ollama) & cloud AI routing**.

---

## Key Highlights

- **Anti-Chatbot Architecture**: Built as an enterprise operating system for real business data and live CRM records, not a generic conversational wrapper.
- **Human-in-the-Loop Governance**: High-risk operations (outbound customer messaging, deletions, permission modifications) strictly require manual approval from a supervisor.
- **Dual AI Runtime & Smart Router**: Routes simple tasks (classification, command parsing) to zero-cost private Local AI (Ollama) and complex reasoning to Cloud AI.
- **Zero Fabricated Metrics**: Every metric on the executive dashboard maps 1:1 to live database ground truth. If data is absent, the system explicitly reports *"Data unavailable"*.
- **Multi-Tenant Organization Isolation**: Strict database scoping guarantees tenant data isolation.
- **Immutable Audit Trail**: Automatically redacts secrets, passwords, and sensitive tokens before persisting immutable operational records.
- **Hard Financial Guardrails**: Strictly prohibits autonomous financial transactions, fund movements, or payment executions.

---

## High-Level Architecture

```
MEGADRONE/
├── backend/
│   ├── api/             # REST APIs, routers, auth & tenant middleware
│   ├── core/            # Config, logger, errors, orchestrator
│   ├── agents/          # Business Intelligence, Lead, Task, Comm, Report agents
│   ├── tools/           # Secure tool registry & live DB tool handlers
│   ├── workflows/       # Event triggers, conditions & action executor
│   ├── ai/              # CloudAIProvider, OllamaProvider, AIRouter, DataPolicy
│   ├── permissions/     # Roles, RBAC permissions matrix, policy evaluator
│   ├── database/        # SQLite/Postgres unified access, DDL schemas, migrations, seed
│   ├── security/        # Secret sanitizer, bcrypt/JWT crypto, hard guardrails
│   └── tests/           # Automated test suite (25 unit & regression test suites)
│
├── frontend/
│   └── public/          # SPA Dashboard, Leads CRM, Tasks, Workflows, AI Console, Approvals
│
├── docs/                # PRE_SALES_CHECK.md, REAL_ESTATE_DEMO.md, BUG_AUDIT_REPORT.md, etc.
├── .env.example         # Centralized environment template
├── docker-compose.yml   # Multi-container production deployment
└── README.md
```

---

## Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v20.0.0+ (Tested on Node v24 LTS)
- **Ollama** (Optional for zero-cost local AI): [https://ollama.com/](https://ollama.com/)

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/your-org/megadrone-business-os.git
cd megadrone-business-os

# Install dependencies
npm install

# Initialize local environment variables
cp .env.example .env

# Seed verified 20-lead fictional real estate demo dataset
npm run seed
```

### 3. Start the Platform
```bash
npm start
```
Open your browser at **`http://localhost:5000`** (or **`http://localhost:5000/landing.html`** for the public product page).

### Demo Login Personas (Fictional Demo Dataset):
- **Principal Broker / Owner**: `rohit.sharma@apexrealty.demo` / `megadrone123`
- **Sales Manager**: `anjali.mehta@apexrealty.demo` / `megadrone123`
- **Senior Agent**: `vikram.singh@apexrealty.demo` / `megadrone123`

---

## Automated Test Suite

Run the full end-to-end unit, integration, and regression test suites:
```bash
npm test
```
*Coverage includes 25 test suites: Authentication, RBAC, Tenant Isolation, Lead CRUD, Task CRUD, AI Provider abstraction, Ollama offline detection, Cloud AI fallbacks, AI Router, Data Privacy Policies, Hard Financial Guardrails, Human Approval Queue, Workflow Engine, Daily Briefing, Real Estate Lead Qualification, Multi-Language Edge Cases (English, Hindi, Hinglish, Unrelated queries), and Boundary Handling.*

---

## 5-Minute Interactive Demonstration

Follow the step-by-step walkthrough in [docs/REAL_ESTATE_DEMO.md](file:///D:/megatron%20ai/docs/REAL_ESTATE_DEMO.md):
1. **Executive Dashboard**: Review Today's Real Estate Brief with live counts of New Leads, Site Visits, and Overdue Follow-ups.
2. **Prioritized Attention Queue**: Inspect overdue buyer follow-ups ranked deterministically.
3. **AI Lead Qualifier**: Paste unformatted inquiries (e.g. *"Customer wants 3BHK in Jaipur, budget 80 lakh, wants to visit this weekend"*) to extract requirements, priority, and missing information.
4. **Governed Follow-up Drafting**: Generate tailored property follow-ups with human-in-the-loop review.
5. **Human Approval Queue**: Inspect high-risk interception before dispatch.
6. **Multilingual AI Operations**: Query live database records in English or Hindi (*"आज मेरे सबसे important customers कौन हैं?"*).

---

## Security Model & Limitations

1. **Human-in-the-Loop Gate**: The platform does not autonomously send external customer messages or delete critical records without supervisor authorization.
2. **Financial Boundaries**: Strictly blocks any fund transfers, payments, card transactions, or bank instructions.
3. **Outbound Data Minimization**: Configurable data policies prohibit confidential/sensitive business data from leaving the local on-premise infrastructure.
4. **Integration Readiness**: External communication dispatches are safely prepared as reviewable drafts; live SendGrid / SMTP / WhatsApp API keys can be provided in environment variables for automated dispatch post-approval.
5. **PostgreSQL Compatibility**: SQLite WAL mode is default for local single-node operations; PostgreSQL connection pooling is supported when configured via `DATABASE_TYPE=postgres`.

---

## Documentation Directory

- [docs/PRE_SALES_CHECK.md](file:///D:/megatron%20ai/docs/PRE_SALES_CHECK.md) — Pre-sales GitHub safety and release readiness report.
- [docs/REAL_ESTATE_DEMO.md](file:///D:/megatron%20ai/docs/REAL_ESTATE_DEMO.md) — 5-minute sales demonstration script.
- [docs/BUG_AUDIT_REPORT.md](file:///D:/megatron%20ai/docs/BUG_AUDIT_REPORT.md) — Complete bug audit and regression verification report.
- [docs/BUILD_PROGRESS.md](file:///D:/megatron%20ai/docs/BUILD_PROGRESS.md) — Master build progress log.
- [ARCHITECTURE.md](file:///D:/megatron%20ai/ARCHITECTURE.md) — System architecture and component data flow.
- [SECURITY.md](file:///D:/megatron%20ai/SECURITY.md) — Security model, secret redaction, and hard guardrails.
- [AI_ROUTING.md](file:///D:/megatron%20ai/AI_ROUTING.md) — Hybrid local/cloud routing logic & privacy gates.
- [API.md](file:///D:/megatron%20ai/API.md) — REST API endpoints and schemas.
- [ENVIRONMENT.md](file:///D:/megatron%20ai/ENVIRONMENT.md) — Environment variable reference.

---

## License
Apache-2.0. MEGADRONE Systems.
