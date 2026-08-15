# MEGADRONE REST API Reference

Base URL: `http://localhost:5000/api`

All authenticated endpoints require the header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication & Tenant
- `POST /api/auth/register` - Create new tenant organization and owner user
- `POST /api/auth/login` - Authenticate user and receive JWT session token
- `GET /api/auth/me` - Retrieve current user profile and organization details

## 2. Leads CRM
- `GET /api/leads` - List leads (Filters: `status`, `priority`, `search`, `limit`, `offset`)
- `GET /api/leads/stats` - Summary breakdown of leads by status and priority
- `GET /api/leads/followups` - List upcoming (next 7 days) and overdue follow-ups
- `GET /api/leads/:id` - Retrieve single lead by ID
- `POST /api/leads` - Create new customer lead record
- `PATCH /api/leads/:id` - Update lead fields or advance pipeline stage
- `DELETE /api/leads/:id` - Delete lead record

## 3. Task Governance
- `GET /api/tasks` - List tasks (Filters: `status`, `priority`, `search`, `limit`, `offset`)
- `GET /api/tasks/stats` - Total, pending, overdue, and due today task counts
- `GET /api/tasks/schedule` - Tasks scheduled for today and overdue tasks
- `GET /api/tasks/:id` - Retrieve single task
- `POST /api/tasks` - Create new task deliverable
- `PATCH /api/tasks/:id` - Update task (e.g. mark `COMPLETED`)
- `DELETE /api/tasks/:id` - Delete task

## 4. AI & Autonomous Assistant
- `POST /api/ai/assistant` - Execute natural language business command (Live DB queries, task actions, follow-up drafts)
- `GET /api/ai/daily-brief` - Generate verified Daily Business Brief (No fake data; "Data unavailable" fallback)
- `POST /api/ai/classify-lead` - Classify and enrich lead with priority and suggested action
- `GET /api/ai/leads/:id/draft` - Generate AI customer follow-up message draft
- `GET /api/ai/usage` - Retrieve token usage and cost telemetry

## 5. Automated Workflows
- `GET /api/workflows` - List active automation rules
- `GET /api/workflows/runs` - List recent execution run logs
- `POST /api/workflows` - Create new automation rule
- `PATCH /api/workflows/:id` - Update workflow rule
- `POST /api/workflows/:id/trigger` - Manually trigger workflow execution
- `DELETE /api/workflows/:id` - Delete workflow rule

## 6. Human Approval Queue
- `GET /api/approvals` - List pending and resolved human approval requests
- `POST /api/approvals/:id/approve` - Approve and execute high-risk action
- `POST /api/approvals/:id/reject` - Reject high-risk action with reason

## 7. Reports & Analytics
- `GET /api/reports/leads` - Lead conversion and pipeline velocity report
- `GET /api/reports/tasks` - Task execution velocity report
- `POST /api/reports/explain` - Grounded natural language interpretation of business data

## 8. Activities & Audit Trail
- `GET /api/activities` - Immutable audit log with user, timestamp, action, and sanitized parameters

## 9. System & Privacy Settings
- `GET /api/settings/ai-status` - Check Cloud AI and Local Ollama health
- `POST /api/settings/privacy-policy` - Update tenant outbound data privacy policy
