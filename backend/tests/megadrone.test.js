import test from 'node:test';
import assert from 'node:assert/strict';
import { orgRepo } from '../database/repositories/orgRepo.js';
import { userRepo } from '../database/repositories/userRepo.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { workflowRepo } from '../database/repositories/workflowRepo.js';
import { approvalRepo } from '../database/repositories/approvalRepo.js';
import { auditRepo } from '../database/repositories/auditRepo.js';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../security/crypto.js';
import { hasPermission, validateTenantAccess } from '../permissions/policyEvaluator.js';
import { PERMISSIONS } from '../permissions/permissionsMatrix.js';
import { ROLES } from '../permissions/roles.js';
import { dataPolicy, DATA_CLASSIFICATIONS } from '../ai/dataPolicy.js';
import { aiRouter, TASK_TYPES } from '../ai/router.js';
import { CloudAIProvider } from '../ai/providers/cloudProvider.js';
import { OllamaProvider } from '../ai/providers/ollamaProvider.js';
import { guardrails } from '../security/guardrails.js';
import { workflowEngine } from '../workflows/engine.js';
import { orchestrator } from '../core/orchestrator.js';
import { businessBriefEngine } from '../agents/businessBriefEngine.js';

// Setup Test Tenant
let testOrg1;
let testOrg2;
let ownerUser;
let employeeUser;

test('1. Database Setup & Tenant Creation', () => {
  const slug1 = `test-org-${Date.now()}`;
  testOrg1 = orgRepo.create({ name: 'Acme Test Org 1', slug: slug1 });
  assert.ok(testOrg1.id.startsWith('org_'));
  assert.equal(testOrg1.name, 'Acme Test Org 1');

  const slug2 = `test-org2-${Date.now()}`;
  testOrg2 = orgRepo.create({ name: 'Acme Test Org 2', slug: slug2 });
  assert.ok(testOrg2.id.startsWith('org_'));
});

test('2. Authentication & Password Hashing', async () => {
  const hash = await hashPassword('secure_password_123');
  assert.ok(hash.startsWith('$2'));

  const isMatch = await comparePassword('secure_password_123', hash);
  assert.equal(isMatch, true);

  const isWrong = await comparePassword('wrong_password', hash);
  assert.equal(isWrong, false);

  ownerUser = userRepo.create({
    orgId: testOrg1.id,
    name: 'Test Owner',
    email: `owner_${Date.now()}@test.io`,
    passwordHash: hash,
    role: ROLES.OWNER,
  });
  assert.ok(ownerUser.id.startsWith('usr_'));

  employeeUser = userRepo.create({
    orgId: testOrg1.id,
    name: 'Test Employee',
    email: `emp_${Date.now()}@test.io`,
    passwordHash: hash,
    role: ROLES.EMPLOYEE,
  });

  const token = generateToken({ userId: ownerUser.id, orgId: testOrg1.id });
  const verified = verifyToken(token);
  assert.equal(verified.userId, ownerUser.id);
  assert.equal(verified.orgId, testOrg1.id);
});

test('3. RBAC & Permission Matrix Evaluation', () => {
  // Owner has all permissions
  assert.equal(hasPermission(ROLES.OWNER, PERMISSIONS.LEAD_DELETE), true);
  assert.equal(hasPermission(ROLES.OWNER, PERMISSIONS.APPROVAL_ACTION), true);

  // Employee can read/create/update leads and tasks, but cannot delete leads or take approval actions
  assert.equal(hasPermission(ROLES.EMPLOYEE, PERMISSIONS.LEAD_READ), true);
  assert.equal(hasPermission(ROLES.EMPLOYEE, PERMISSIONS.LEAD_CREATE), true);
  assert.equal(hasPermission(ROLES.EMPLOYEE, PERMISSIONS.LEAD_DELETE), false);
  assert.equal(hasPermission(ROLES.EMPLOYEE, PERMISSIONS.APPROVAL_ACTION), false);

  // Viewer cannot create leads or tasks
  assert.equal(hasPermission(ROLES.VIEWER, PERMISSIONS.LEAD_CREATE), false);
  assert.equal(hasPermission(ROLES.VIEWER, PERMISSIONS.TASK_CREATE), false);
});

test('4. Multi-Tenant Organization Isolation', () => {
  // Create lead in Org 1
  const leadOrg1 = leadRepo.create({
    orgId: testOrg1.id,
    name: 'Org1 Customer',
    status: 'NEW',
    priority: 'HIGH',
  });

  // Querying from Org 1 should find it
  const foundInOrg1 = leadRepo.findById(leadOrg1.id, testOrg1.id);
  assert.ok(foundInOrg1);
  assert.equal(foundInOrg1.name, 'Org1 Customer');

  // Querying with Org 2 context MUST return null
  const foundInOrg2 = leadRepo.findById(leadOrg1.id, testOrg2.id);
  assert.equal(foundInOrg2, null);

  // List in Org 2 must not contain Org 1 lead
  const listOrg2 = leadRepo.listByOrg(testOrg2.id);
  const leaked = listOrg2.find(l => l.id === leadOrg1.id);
  assert.equal(leaked, undefined);

  // Validate tenant access helper
  assert.equal(validateTenantAccess(testOrg1.id, testOrg1.id), true);
  assert.equal(validateTenantAccess(testOrg1.id, testOrg2.id), false);
});

test('5. Lead Management CRUD & Follow-ups', () => {
  const lead = leadRepo.create({
    orgId: testOrg1.id,
    name: 'Valued Client',
    company: 'Enterprise Inc',
    email: 'client@enterprise.com',
    status: 'NEW',
    priority: 'URGENT',
    nextFollowup: '2026-08-20',
  });

  assert.equal(lead.company, 'Enterprise Inc');
  assert.equal(lead.priority, 'URGENT');

  // Update
  const updated = leadRepo.update(lead.id, testOrg1.id, { status: 'QUALIFIED', priority: 'HIGH' });
  assert.equal(updated.status, 'QUALIFIED');
  assert.equal(updated.priority, 'HIGH');

  // Stats
  const stats = leadRepo.getStats(testOrg1.id);
  assert.ok(stats.total >= 2);
  assert.ok(stats.byStatus.QUALIFIED >= 1);
});

test('6. Task Management CRUD & Overdue Tracking', () => {
  const pastDate = '2026-01-01';
  const overdueTask = taskRepo.create({
    orgId: testOrg1.id,
    title: 'Overdue Project Deliverable',
    priority: 'URGENT',
    dueDate: pastDate,
  });

  assert.equal(overdueTask.status, 'PENDING');

  const overdueList = taskRepo.getOverdueTasks(testOrg1.id);
  const found = overdueList.find(t => t.id === overdueTask.id);
  assert.ok(found, 'Task should be classified as overdue');

  const stats = taskRepo.getStats(testOrg1.id);
  assert.ok(stats.overdue >= 1);

  // Complete task
  const completed = taskRepo.update(overdueTask.id, testOrg1.id, { status: 'COMPLETED' });
  assert.equal(completed.status, 'COMPLETED');

  // Completed task is no longer in overdue list
  const overdueAfter = taskRepo.getOverdueTasks(testOrg1.id);
  assert.equal(overdueAfter.find(t => t.id === overdueTask.id), undefined);
});

test('7. Data Privacy Policy Enforcement', () => {
  // Public data can go to cloud
  assert.equal(dataPolicy.isProviderAllowed(DATA_CLASSIFICATIONS.PUBLIC, 'cloud'), true);

  // Local AI is allowed for all data classifications
  assert.equal(dataPolicy.isProviderAllowed(DATA_CLASSIFICATIONS.SENSITIVE, 'local'), true);
  assert.equal(dataPolicy.isProviderAllowed(DATA_CLASSIFICATIONS.CONFIDENTIAL, 'local'), true);

  // Enforce throws on prohibited outbound
  assert.throws(() => {
    dataPolicy.enforce(DATA_CLASSIFICATIONS.SENSITIVE, 'cloud');
  }, /Data Privacy Policy Violation/);
});

test('8. AI Provider Abstraction & Graceful Failures', async () => {
  // Cloud provider without API key reports unavailable
  const cloudNoKey = new CloudAIProvider({ apiKey: '' });
  const cloudAvail = await cloudNoKey.isAvailable();
  assert.equal(cloudAvail, false);

  // Ollama provider on non-existent port reports unavailable without crashing
  const ollamaOffline = new OllamaProvider({ baseUrl: 'http://127.0.0.1:59999' });
  const ollamaAvail = await ollamaOffline.isAvailable();
  assert.equal(ollamaAvail, false);

  // Generating completion with unavailable provider fails gracefully
  await assert.rejects(async () => {
    await cloudNoKey.generateCompletion({ prompt: 'test' });
  }, /not configured/);
});

test('9. AI Router & Dynamic Routing Decision', async () => {
  const decision = await aiRouter.route({
    taskType: TASK_TYPES.CLASSIFICATION,
    dataClassification: DATA_CLASSIFICATIONS.INTERNAL,
  });

  assert.ok(decision.reason);
  assert.ok(typeof decision.providerType === 'string');
});

test('10. Hard Guardrails (Prohibited Financial Operations)', () => {
  // Prohibited financial operations must be blocked immediately
  assert.throws(() => {
    guardrails.validateUserIntent('Please transfer money from company account to supplier');
  }, /Security Policy Violation/);

  assert.throws(() => {
    guardrails.validateUserIntent('Wire funds of $5000 to vendor');
  }, /Security Policy Violation/);

  // Safe business operations should pass
  assert.doesNotThrow(() => {
    guardrails.validateUserIntent('Show today overdue follow-ups');
  });
});

test('11. Human Approval System Workflow', () => {
  // Create pending approval
  const approval = approvalRepo.create({
    orgId: testOrg1.id,
    actionType: 'SEND_EXTERNAL_COMMUNICATION',
    riskLevel: 'HIGH',
    payload: { recipient: 'boss@client.com', message: 'Contract proposal' },
    reason: 'High risk external dispatch requires human sign-off.',
    requestedBy: 'AI_ORCHESTRATOR',
  });

  assert.equal(approval.status, 'PENDING');
  assert.equal(approval.risk_level, 'HIGH');

  // Resolve approval as APPROVED
  const approved = approvalRepo.resolve(approval.id, testOrg1.id, {
    status: 'APPROVED',
    approvedBy: ownerUser.id,
  });
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.approved_by, ownerUser.id);
});

test('12. Workflow Engine Execution', async () => {
  // Create real lead in DB first
  const lead = leadRepo.create({
    orgId: testOrg1.id,
    name: 'New Corporate Prospect',
    company: 'Alpha Innovations',
    email: 'contact@alpha.com',
  });

  // Create workflow
  const wf = workflowRepo.create({
    orgId: testOrg1.id,
    name: 'Auto-Task on Lead',
    triggerType: 'LEAD_CREATED',
    conditions: [{ field: 'company', operator: 'IS_NOT_NULL', value: '' }],
    actions: [
      { type: 'CREATE_TASK', params: { title: 'Workflow generated task', priority: 'HIGH' } }
    ],
    createdBy: ownerUser.id,
  });

  const eventData = {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    email: lead.email,
  };

  const result = await workflowEngine.executeWorkflow(wf, eventData, testOrg1.id);
  assert.equal(result.status, 'COMPLETED');
  assert.ok(result.steps.length >= 2);
});

test('13. Business Daily Brief & Ground-Truth Verification', async () => {
  const brief = await businessBriefEngine.generateDailyBrief(testOrg1.id, {
    user: ownerUser,
  });

  assert.equal(brief.success, true);
  assert.ok(brief.data.metrics);
  assert.ok(brief.data.sections);
  assert.ok(typeof brief.data.aiExecutiveSummary === 'string');
});

test('14. Immutable-Style Audit Logging', () => {
  const audit = auditRepo.create({
    orgId: testOrg1.id,
    userId: ownerUser.id,
    action: 'TEST_AUDIT_ACTION',
    resourceType: 'TEST_RESOURCE',
    resourceId: 'res_123',
    details: { password: 'secret_to_redact', note: 'safe info' },
    status: 'SUCCESS',
  });

  assert.ok(audit.id.startsWith('aud_'));
  assert.equal(audit.details.password, '[REDACTED]');
  assert.equal(audit.details.note, 'safe info');
});

test('15. Central Orchestrator End-to-End Flow', async () => {
  const res = await orchestrator.processRequest({
    query: 'Show today tasks',
    user: ownerUser,
    orgId: testOrg1.id,
  });

  assert.equal(res.success, true);
  assert.equal(res.type, 'TASK_OPERATION');
  assert.equal(res.approvalRequired, false);
});
