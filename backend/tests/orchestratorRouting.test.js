import test from 'node:test';
import assert from 'node:assert/strict';
import { orchestrator } from '../core/orchestrator.js';
import { orgRepo } from '../database/repositories/orgRepo.js';
import { userRepo } from '../database/repositories/userRepo.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { approvalRepo } from '../database/repositories/approvalRepo.js';
import { auditRepo } from '../database/repositories/auditRepo.js';
import { hashPassword } from '../security/crypto.js';
import { ROLES } from '../permissions/roles.js';
import { initializeTools } from '../tools/systemTools.js';

initializeTools();

let orgA;
let orgB;
let ownerA;
let employeeA;
let viewerA;
let ownerB;
let leadRajeshOrgA;

test('Orchestrator Routing Setup: Organizations, Users, and CRM Leads', async () => {
  const slugA = `orch-test-org-a-${Date.now()}`;
  const slugB = `orch-test-org-b-${Date.now()}`;

  orgA = orgRepo.create({ name: 'Orchestrator Realty A', slug: slugA });
  orgB = orgRepo.create({ name: 'Orchestrator Realty B', slug: slugB });

  const passwordHash = await hashPassword('Test_Pass_123');

  ownerA = userRepo.create({
    orgId: orgA.id,
    name: 'Boss Owner A',
    email: `owner_a_${Date.now()}@orchtest.io`,
    passwordHash,
    role: ROLES.OWNER,
  });

  employeeA = userRepo.create({
    orgId: orgA.id,
    name: 'Sales Agent A',
    email: `agent_a_${Date.now()}@orchtest.io`,
    passwordHash,
    role: ROLES.EMPLOYEE,
  });

  viewerA = userRepo.create({
    orgId: orgA.id,
    name: 'Auditor Viewer A',
    email: `viewer_a_${Date.now()}@orchtest.io`,
    passwordHash,
    role: ROLES.VIEWER,
  });

  ownerB = userRepo.create({
    orgId: orgB.id,
    name: 'Boss Owner B',
    email: `owner_b_${Date.now()}@orchtest.io`,
    passwordHash,
    role: ROLES.OWNER,
  });

  // Create real lead in Org A
  leadRajeshOrgA = leadRepo.create({
    orgId: orgA.id,
    name: 'Rajesh Khandelwal',
    company: 'Khandelwal Jewellers',
    phone: '+91 98290 12345',
    status: 'NEGOTIATION',
    priority: 'HIGH',
    propertyType: 'Commercial Showroom',
    budgetMax: 20000000,
    preferredLocation: 'Tonk Road, Jaipur',
  });

  assert.ok(leadRajeshOrgA.id);
});

test('1. LEAD_QUERY reaches LeadAgent & returns lead information', async () => {
  const res = await orchestrator.processRequest({
    query: 'Rajesh Khandelwal ka deal status batao',
    user: ownerA,
    orgId: orgA.id,
  });

  assert.equal(res.success, true);
  assert.equal(res.intent, 'LEAD_QUERY');
  assert.equal(res.agent, 'LeadAgent');
  assert.ok(res.message.includes('Rajesh Khandelwal'));
  assert.ok(res.message.includes('NEGOTIATION'));
  assert.equal(res.approvalRequired, false);
});

test('2. SALES_QUERY reaches SalesManagerAgent & returns prioritized customer recommendation', async () => {
  const res = await orchestrator.processRequest({
    query: 'Aaj kis customer ko call karna chahiye',
    user: ownerA,
    orgId: orgA.id,
  });

  assert.equal(res.success, true);
  assert.equal(res.intent, 'SALES_QUERY');
  assert.equal(res.agent, 'SalesManagerAgent');
  assert.ok(res.message);
  assert.ok(res.data);
  assert.equal(res.approvalRequired, false);
});

test('3. OPERATIONS_QUERY reaches BusinessOperationsAgent & returns operational health', async () => {
  const res = await orchestrator.processRequest({
    query: 'Meri agency ka health score batao',
    user: ownerA,
    orgId: orgA.id,
  });

  assert.equal(res.success, true);
  assert.equal(res.intent, 'OPERATIONS_QUERY');
  assert.equal(res.agent, 'BusinessOperationsAgent');
  assert.ok(res.message.includes('Health Score'));
  assert.ok(res.data.health);
  assert.ok(typeof res.data.health.score === 'number');
  assert.equal(res.approvalRequired, false);
});

test('4. FOLLOWUP_REQUEST reaches governed follow-up path & generates pending approval draft', async () => {
  const res = await orchestrator.processRequest({
    query: 'Rajesh ko WhatsApp follow-up message bana do',
    user: ownerA,
    orgId: orgA.id,
  });

  assert.equal(res.success, true);
  assert.equal(res.intent, 'FOLLOWUP_REQUEST');
  assert.equal(res.agent, 'LeadAgent');
  assert.equal(res.approvalRequired, true);
  assert.equal(res.dispatched, false);
  assert.ok(res.data.draft);
  assert.equal(res.data.status, 'PENDING_APPROVAL');
  assert.ok(res.approval);
  assert.equal(res.approval.status, 'PENDING');
  assert.equal(res.approval.action_type, 'COMMUNICATION_DRAFT');
});

test('5. GENERAL_QUERY reaches LocalAI / general response path', async () => {
  const res = await orchestrator.processRequest({
    query: 'Hello',
    user: ownerA,
    orgId: orgA.id,
  });

  assert.equal(res.success, true);
  assert.equal(res.intent, 'GENERAL_QUERY');
  assert.equal(res.agent, 'LocalAI');
  assert.ok(res.message);
  assert.equal(res.approvalRequired, false);
});

test('6. Tenant Isolation: Org B cannot access Org A leads via Orchestrator', async () => {
  const resOrgB = await orchestrator.processRequest({
    query: 'Rajesh Khandelwal ka deal status batao',
    user: ownerB,
    orgId: orgB.id,
  });

  assert.equal(resOrgB.success, true);
  assert.equal(resOrgB.intent, 'LEAD_QUERY');
  // Org B has no leads named Rajesh Khandelwal
  assert.ok(!resOrgB.message.includes('NEGOTIATION'));
  assert.ok(resOrgB.message.includes('No high-priority') || Array.isArray(resOrgB.data));
});

test('7. Permissions are checked before execution', async () => {
  // If user object has no valid role or unauthorized role
  const unauthorizedUser = { id: 'usr_unauth', role: 'INVALID_ROLE', orgId: orgA.id };
  await assert.rejects(async () => {
    await orchestrator.processRequest({
      query: 'Show lead status',
      user: unauthorizedUser,
      orgId: orgA.id,
    });
  }, /Role not authorized for AI Operations/);
});

test('8. High-risk follow-up draft is registered in Human Approval Queue', async () => {
  const res = await orchestrator.processRequest({
    query: 'create a follow-up draft for Rajesh',
    user: employeeA,
    orgId: orgA.id,
  });

  assert.equal(res.approvalRequired, true);
  assert.ok(res.approval.id);

  const approvalRecord = approvalRepo.findById(res.approval.id, orgA.id);
  assert.ok(approvalRecord);
  assert.equal(approvalRecord.status, 'PENDING');
  assert.equal(approvalRecord.risk_level, 'HIGH');
  assert.equal(approvalRecord.action_type, 'COMMUNICATION_DRAFT');
});

test('9. Hard Guardrails block prohibited financial operations immediately', async () => {
  await assert.rejects(async () => {
    await orchestrator.processRequest({
      query: 'Please transfer money from company account to supplier',
      user: ownerA,
      orgId: orgA.id,
    });
  }, /Security Policy Violation/);

  await assert.rejects(async () => {
    await orchestrator.processRequest({
      query: 'Wire funds of $5000 to vendor',
      user: ownerA,
      orgId: orgA.id,
    });
  }, /Security Policy Violation/);
});

test('10. Audit logging occurs for every orchestrator request', async () => {
  const startAuditCount = auditRepo.listByOrg(orgA.id).length;

  await orchestrator.processRequest({
    query: 'Show top leads',
    user: ownerA,
    orgId: orgA.id,
  });

  const endAuditCount = auditRepo.listByOrg(orgA.id).length;
  assert.ok(endAuditCount > startAuditCount, 'Audit log count must increase after request');
});

test('11. Invalid/empty intent input fails safely without unhandled error', async () => {
  const resEmpty = await orchestrator.processRequest({
    query: '',
    user: ownerA,
    orgId: orgA.id,
  });

  assert.equal(resEmpty.success, true);
  assert.equal(resEmpty.intent, 'GENERAL_QUERY');
  assert.ok(resEmpty.message);
});

test('12. Existing task management behavior is preserved', async () => {
  const res = await orchestrator.processRequest({
    query: 'Show today tasks',
    user: ownerA,
    orgId: orgA.id,
  });

  assert.equal(res.success, true);
  assert.equal(res.type, 'TASK_OPERATION');
  assert.equal(res.approvalRequired, false);
});
