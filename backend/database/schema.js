export const DDL_STATEMENTS = [
  // Organizations
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'business',
    settings TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Users
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Leads
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT NOT NULL CHECK(status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST')),
    priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    notes TEXT,
    next_followup TEXT,
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    ai_classification TEXT,
    ai_suggested_action TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Tasks
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    due_date TEXT,
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
    reminders TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Workflows
  `CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    conditions_json TEXT NOT NULL DEFAULT '[]',
    actions_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Workflow Runs
  `CREATE TABLE IF NOT EXISTS workflow_runs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trigger_event TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('RUNNING', 'COMPLETED', 'FAILED', 'WAITING_APPROVAL')),
    execution_steps_json TEXT NOT NULL DEFAULT '[]',
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
  );`,

  // Approvals Queue
  `CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_run_id TEXT REFERENCES workflow_runs(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    payload_json TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    requested_by TEXT NOT NULL,
    approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );`,

  // Audit Logs (Immutable-style audit trail)
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ai_provider TEXT,
    details_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILURE', 'DENIED', 'APPROVAL_REQUIRED')),
    ip_address TEXT,
    timestamp TEXT NOT NULL
  );`,

  // AI Usage & Cost Tracking Logs
  `CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd REAL NOT NULL DEFAULT 0.0,
    routing_reason TEXT,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );`,

  // Reports
  `CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    title TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    ai_analysis TEXT,
    generated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );`,

  // Indexes for high performance
  `CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);`,
  `CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(org_id, status);`,
  `CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(org_id, next_followup);`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(org_id, status);`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_org_due ON tasks(org_id, due_date);`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_org_status ON approvals(org_id, status);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_org_time ON audit_logs(org_id, timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage_logs(org_id, created_at);`
];
