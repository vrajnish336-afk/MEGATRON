# MEGADRONE Business OS

> **Production-Oriented AI Business Operations & Workflow Automation Platform**

MEGADRONE Business OS is an operating layer engineered for small, medium, and enterprise businesses to manage customer relationships, operational deliverables, event-driven workflows, executive reporting, and autonomous AI-assisted operations with **mandatory human approval guardrails**, **privacy-aware data policies**, and **hybrid local (Ollama) & cloud AI routing**.

---

## Key Highlights

- **Anti-Chatbot Architecture**: Built as an enterprise operating system for real business data, not a generic conversational wrapper.
- **Human-in-the-Loop Governance**: High-risk actions (outbound customer messaging, deletions, permission modifications) strictly require manual approval from a supervisor.
- **Dual AI Runtime & Smart Router**: Routes simple tasks (classification, command parsing) to zero-cost private Local AI (Ollama) and complex reasoning to Cloud AI.
- **Multi-Tenant Organization Isolation**: Strict database scoping guarantees tenant data isolation.
- **Immutable Audit Trail**: Sanitizes secrets, passwords, and sensitive tokens automatically before persisting immutable operational records.
- **Verified Ground-Truth Daily Brief**: Summarizes real leads, tasks, and overdue items. If data is absent, the system explicitly reports *"Data unavailable"*.

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
│   └── tests/           # Automated test suite (15 unit & integration tests)
│
├── frontend/
│   └── public/          # SPA Dashboard, CRM, Tasks, Workflows, AI Console, Approvals
│
├── docs/                # BUILD_PROGRESS.md, ARCHITECTURE.md, SECURITY.md, etc.
├── .env.example         # Centralized environment template
├── docker-compose.yml   # Multi-container production deployment
└── README.md
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20.0.0+ (Tested on Node v24 LTS)
- **Ollama** (Optional for local AI): [https://ollama.com/](https://ollama.com/)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/megadrone-business-os.git
cd megadrone-business-os

# Install dependencies
npm install

# Initialize local environment variables
cp .env.example .env

# Seed verified demo enterprise dataset
npm run seed
```

### 3. Start the Platform
```bash
npm start
```
Open your browser at **`http://localhost:5000`**

### Demo Login Credentials:
- **Executive Owner**: `alex.mercer@apexglobal.io` / `megadrone123`
- **Operations Manager**: `sarah.jenkins@apexglobal.io` / `megadrone123`
- **Employee**: `rahul.sharma@apexglobal.io` / `megadrone123`

---

## Automated Test Suite

Run the full end-to-end and unit verification tests:
```bash
npm test
```
*Coverage includes: Authentication, RBAC, Tenant Isolation, Lead CRUD, Task CRUD, AI Provider abstraction, Ollama offline detection, Cloud AI fallbacks, AI Router, Data Privacy Policies, Hard Financial Guardrails, Human Approval Queue, Workflow Engine, and Daily Briefing.*

---

## Documentation Directory

- [ARCHITECTURE.md](file:///D:/megatron%20ai/ARCHITECTURE.md) - System architecture, components, and data flow.
- [SECURITY.md](file:///D:/megatron%20ai/SECURITY.md) - Security model, secret redaction, and hard guardrails.
- [AI_ROUTING.md](file:///D:/megatron%20ai/AI_ROUTING.md) - Hybrid local/cloud routing logic & privacy gates.
- [API.md](file:///D:/megatron%20ai/API.md) - Complete REST API reference.
- [DEVELOPMENT.md](file:///D:/megatron%20ai/DEVELOPMENT.md) - Local developer guide & coding conventions.
- [DEPLOYMENT.md](file:///D:/megatron%20ai/DEPLOYMENT.md) - Production deployment & Docker guide.
- [ENVIRONMENT.md](file:///D:/megatron%20ai/ENVIRONMENT.md) - Detailed environment variable specifications.
- [docs/BUILD_PROGRESS.md](file:///D:/megatron%20ai/docs/BUILD_PROGRESS.md) - Milestone execution log.

---

## License
Apache-2.0. MEGADRONE Systems.
