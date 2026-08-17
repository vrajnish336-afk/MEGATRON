import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../api/server.js';
import { orgRepo } from '../database/repositories/orgRepo.js';
import { userRepo } from '../database/repositories/userRepo.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { approvalRepo } from '../database/repositories/approvalRepo.js';
import { businessOperationsAgent } from '../agents/businessOperationsAgent.js';
import { hashPassword, generateToken } from '../security/crypto.js';
import { ROLES } from '../permissions/roles.js';
import { initializeTools } from '../tools/systemTools.js';

initializeTools();

let app;
let orgA;
let orgB;
let orgEmpty;
let ownerA;
let employeeA;
let ownerB;
let tokenOwnerA;
let tokenEmployeeA;
let tokenOwnerB;

let vipStalledLead;
let overdueFollowupLead;
let unassignedVipLead;
let highVelocityLead;
let overdueTask;
let pendingApproval;

test('Operations Manager Test Setup: Create Organizations, Personas & Live Deals', async () => {
  app = createApp();

  const ts = Date.now();
  orgA = orgRepo.create({ name: 'Apex Elite Holdings', slug: `ops-org-a-${ts}` });
  orgB = orgRepo.create({ name: 'Nexus Prime Properties', slug: `ops-org-b-${ts}` });
  orgEmpty = orgRepo.create({ name: 'Empty Operations Corp', slug: `ops-empty-${ts}` });

  const passwordHash = await hashPassword('Secret_Pass_123');

  ownerA = userRepo.create({
    orgId: orgA.id,
    name: 'Rajnish Verma (Principal Broker)',
    email: `broker_a_${ts}@test.io`,
    passwordHash,
    role: ROLES.OWNER,
  });

  employeeA = userRepo.create({
    orgId: orgA.id,
    name: 'Sales Agent A',
    email: `agent_a_${ts}@test.io`,
    passwordHash,
    role: ROLES.EMPLOYEE,
  });

  ownerB = userRepo.create({
    orgId: orgB.id,
    name: 'Nexus Owner B',
    email: `broker_b_${ts}@test.io`,
    passwordHash,
    role: ROLES.OWNER,
  });

  tokenOwnerA = generateToken({ userId: ownerA.id, orgId: orgA.id });
  tokenEmployeeA = generateToken({ userId: employeeA.id, orgId: orgA.id });
  tokenOwnerB = generateToken({ userId: ownerB.id, orgId: orgB.id });

  const today = new Date().toISOString().slice(0, 10);
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);

  // 1. Stalled VIP Negotiation Lead
  vipStalledLead = leadRepo.create({
    orgId: orgA.id,
    name: 'Vikramaditya Singhania',
    company: 'Singhania Logistics Ltd',
    status: 'NEGOTIATION',
    priority: 'URGENT',
    propertyType: 'Commercial Industrial Park (5000 sq yards)',
    budgetMax: 350, // ₹3.5 Cr
    budget: '₹3.50 Cr',
    assignedTo: ownerA.id,
    notes: 'Commercial terms under review; no update in 6 days.',
  });

  // 2. Overdue Follow-up Lead (High Priority)
  overdueFollowupLead = leadRepo.create({
    orgId: orgA.id,
    name: 'Dr. Radhika Nair',
    company: 'Nair Diagnostics',
    status: 'QUALIFIED',
    priority: 'HIGH',
    propertyType: '3BHK Penthouse',
    budgetMax: 120,
    budget: '₹1.20 Cr',
    nextFollowup: yesterday,
    assignedTo: employeeA.id,
  });

  // 3. Unassigned VIP Lead
  unassignedVipLead = leadRepo.create({
    orgId: orgA.id,
    name: 'Harshvardhan Kapoor',
    company: 'Kapoor Jewels',
    status: 'NEW',
    priority: 'URGENT',
    propertyType: '4BHK Ultra-Luxury Villa',
    budgetMax: 280,
    budget: '₹2.80 Cr',
    assignedTo: null,
  });

  // 4. High-Velocity Buyer (Site visit today)
  highVelocityLead = leadRepo.create({
    orgId: orgA.id,
    name: 'Suresh Menon',
    company: 'Menon Tech Labs',
    status: 'QUALIFIED',
    priority: 'MEDIUM',
    propertyType: '2BHK Luxury Studio',
    budgetMax: 65,
    siteVisitDate: today,
    assignedTo: employeeA.id,
  });

  // 5. Overdue Task
  overdueTask = taskRepo.create({
    orgId: orgA.id,
    leadId: vipStalledLead.id,
    title: 'Prepare Final Commercial Term Sheet',
    priority: 'URGENT',
    dueDate: yesterday,
    assignedTo: employeeA.id,
  });

  // 6. Pending Communication Approval
  pendingApproval = approvalRepo.create({
    orgId: orgA.id,
    actionType: 'COMMUNICATION_DRAFT',
    riskLevel: 'HIGH',
    reason: 'Price concession follow-up requires broker approval',
    payload: {
      recipientName: 'Vikramaditya Singhania',
      recipientPhone: '+91 98111 22334',
      draftMessage: 'Dear Mr. Singhania, final pricing revised to ₹3.40 Cr inclusive of parking.',
    },
    requestedBy: employeeA.name,
  });

  assert.ok(orgA.id);
  assert.ok(vipStalledLead.id);
  assert.ok(overdueTask.id);
  assert.ok(pendingApproval.id);
});

test('Operations Core: Operational Health Index calculation & component breakdown', () => {
  const health = businessOperationsAgent.calculateOperationalHealth(orgA.id);

  assert.equal(health.maxScore, 100);
  assert.equal(health.label, 'Operational Health Index');
  assert.ok(typeof health.score === 'number');
  assert.ok(health.score >= 0 && health.score <= 100);
  assert.ok(['OPTIMAL', 'STABLE', 'ATTENTION_REQUIRED', 'CRITICAL'].includes(health.status));

  // Check 4 component structures
  const comp = health.components;
  assert.ok(comp.pipelineVelocity);
  assert.equal(comp.pipelineVelocity.max_score, 25);
  assert.ok(typeof comp.pipelineVelocity.score === 'number');
  assert.ok(comp.pipelineVelocity.reason);
  assert.ok(comp.pipelineVelocity.raw_metrics);

  assert.ok(comp.taskSla);
  assert.equal(comp.taskSla.max_score, 25);
  assert.ok(typeof comp.taskSla.score === 'number');

  assert.ok(comp.followupSla);
  assert.equal(comp.followupSla.max_score, 25);
  assert.ok(typeof comp.followupSla.score === 'number');

  assert.ok(comp.approvalBacklog);
  assert.equal(comp.approvalBacklog.max_score, 25);
  assert.ok(typeof comp.approvalBacklog.score === 'number');
});

test('Operations Core: Empty database handles zero metrics safely without NaN', () => {
  const emptyHealth = businessOperationsAgent.calculateOperationalHealth(orgEmpty.id);

  assert.equal(emptyHealth.score, 100);
  assert.equal(emptyHealth.status, 'NO_DATA');
  assert.ok(emptyHealth.summary.includes('Data unavailable'));
  assert.equal(emptyHealth.components.pipelineVelocity.score, 25);
  assert.equal(emptyHealth.components.taskSla.score, 25);
  assert.equal(emptyHealth.components.followupSla.score, 25);
  assert.equal(emptyHealth.components.approvalBacklog.score, 25);
});

test('Operations Core: Opportunity & Risk Radar detects stalled VIP, SLA breaches, and unassigned leads', () => {
  const radar = businessOperationsAgent.detectOpportunitiesAndRisks(orgA.id);

  assert.ok(Array.isArray(radar.risks));
  assert.ok(Array.isArray(radar.opportunities));
  assert.ok(radar.risks.length >= 2);

  // Check for SLA breach risk
  const slaBreach = radar.risks.find(r => r.type === 'RISK_SLA_BREACH');
  assert.ok(slaBreach);
  assert.equal(slaBreach.customer_name, 'Dr. Radhika Nair');
  assert.ok(slaBreach.severity === 'CRITICAL' || slaBreach.severity === 'WARNING');
  assert.ok(slaBreach.next_action.includes('Call Dr. Radhika Nair'));

  // Check for Unassigned VIP risk
  const unassigned = radar.risks.find(r => r.type === 'RISK_UNASSIGNED_VIP');
  assert.ok(unassigned);
  assert.equal(unassigned.customer_name, 'Harshvardhan Kapoor');
  assert.equal(unassigned.severity, 'CRITICAL');

  // Check for High-Velocity Buyer opportunity
  const velocityOpp = radar.opportunities.find(o => o.type === 'OPP_HIGH_VELOCITY_BUYER');
  assert.ok(velocityOpp);
  assert.equal(velocityOpp.customer_name, 'Suresh Menon');
});

test('Operations Core: Explicit VIP deterministic rule validation', () => {
  // Test 1: Priority URGENT qualifies as VIP
  assert.equal(businessOperationsAgent.isVipLead({ priority: 'URGENT', budgetMax: 40 }), true);

  // Test 2: Budget >= 100 qualifies as VIP
  assert.equal(businessOperationsAgent.isVipLead({ priority: 'LOW', budgetMax: 150 }), true);

  // Test 3: Budget string with 'Cr' qualifies as VIP
  assert.equal(businessOperationsAgent.isVipLead({ priority: 'MEDIUM', budget: '₹2.5 Cr' }), true);

  // Test 4: Budget < 100 and non-urgent does NOT qualify as VIP
  assert.equal(businessOperationsAgent.isVipLead({ priority: 'MEDIUM', budgetMax: 45, budget: '₹45 Lakhs' }), false);
});

test('Operations Core: Daily Executive Action Plan generates 4-Quadrant operational structure', () => {
  const plan = businessOperationsAgent.getDailyExecutivePlan(orgA.id);

  assert.ok(plan.quadrants);
  assert.ok(Array.isArray(plan.quadrants.revenueProtection));
  assert.ok(Array.isArray(plan.quadrants.bottleneckRemoval));
  assert.ok(Array.isArray(plan.quadrants.teamDelegation));
  assert.ok(Array.isArray(plan.quadrants.governanceReview));

  // Check revenue protection item
  assert.ok(plan.quadrants.revenueProtection.length > 0);

  // Check bottleneck removal item from overdue task
  const bottleneck = plan.quadrants.bottleneckRemoval.find(b => b.task_id === overdueTask.id);
  assert.ok(bottleneck);
  assert.ok(bottleneck.title.includes('Prepare Final Commercial Term Sheet'));

  // Check team delegation item from unassigned VIP
  const delegation = plan.quadrants.teamDelegation.find(d => d.lead_id === unassignedVipLead.id);
  assert.ok(delegation);
  assert.ok(delegation.title.includes('Assign VIP Lead'));

  // Check governance review from pending approval
  const governance = plan.quadrants.governanceReview.find(g => g.approval_id === pendingApproval.id);
  assert.ok(governance);
  assert.equal(governance.requires_approval, true);
});

test('Operations Core: Proactive Alerts emit severity-based operational warnings', () => {
  const alerts = businessOperationsAgent.getProactiveAlerts(orgA.id);

  assert.ok(Array.isArray(alerts));
  assert.ok(alerts.length > 0);

  // Check every alert has required schema
  for (const alert of alerts) {
    assert.ok(alert.type);
    assert.ok(['CRITICAL', 'WARNING', 'INFO'].includes(alert.severity));
    assert.ok(alert.title);
    assert.ok(alert.reason);
    assert.ok(alert.evidence !== undefined);
    assert.ok(alert.recommended_action);
  }
});

test('Operations Core: Upgraded CEO Daily Brief contains ground-truth verified metrics', async () => {
  const brief = await businessOperationsAgent.getCeoBrief(orgA.id);

  assert.ok(brief.generatedAt);
  assert.ok(brief.health);
  assert.ok(brief.metrics);
  assert.ok(typeof brief.metrics.totalLeads === 'number');
  assert.ok(typeof brief.metrics.openTasksCount === 'number');
  assert.ok(typeof brief.metrics.pendingApprovalsCount === 'number');
  assert.ok(brief.narrative);
  assert.ok(brief.narrative.includes('Operational Health Index'));
});

test('API Test: GET /api/operations/health - Returns 200 with health index', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/operations/health`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenOwnerA}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.label, 'Operational Health Index');
    assert.ok(typeof json.data.score === 'number');
  } finally {
    server.close();
  }
});

test('API Test: GET /api/operations/executive-plan - Returns 200 with 4-quadrant plan', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/operations/executive-plan`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenOwnerA}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.quadrants.revenueProtection);
    assert.ok(json.data.quadrants.bottleneckRemoval);
    assert.ok(json.data.quadrants.teamDelegation);
    assert.ok(json.data.quadrants.governanceReview);
  } finally {
    server.close();
  }
});

test('API Test: GET /api/operations/opportunities - Returns 200 with radar items', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/operations/opportunities`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenOwnerA}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.risks));
    assert.ok(Array.isArray(json.data.opportunities));
  } finally {
    server.close();
  }
});

test('API Test: GET /api/operations/brief - Returns 200 with CEO brief', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/operations/brief`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenOwnerA}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.health);
    assert.ok(json.data.metrics);
  } finally {
    server.close();
  }
});

test('API Test: GET /api/operations/alerts - Returns 200 with proactive alerts', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/operations/alerts`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenOwnerA}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.alerts));
    assert.ok(typeof json.data.total === 'number');
  } finally {
    server.close();
  }
});

test('API Test: POST /api/operations/explain - Returns 200 with executive reasoning', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/operations/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOwnerA}`,
      },
      body: JSON.stringify({ query: 'What are the main operational bottlenecks today?' }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.answer);
    assert.ok(json.data.facts);
    assert.ok(json.data.provider);
  } finally {
    server.close();
  }
});

test('Security & Multi-Tenant Isolation: Org B cannot access Org A operations telemetry', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Org B requesting executive plan
    const resB = await fetch(`http://127.0.0.1:${port}/api/operations/executive-plan`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenOwnerB}` },
    });

    assert.equal(resB.status, 200);
    const jsonB = await resB.json();
    // Org B's action plan should not contain Org A's leads
    const foundOrgALead = jsonB.data.quadrants.revenueProtection.some(r => r.customer_name === 'Dr. Radhika Nair');
    assert.equal(foundOrgALead, false);

    // Unauthenticated call must be rejected with 401
    const unauthRes = await fetch(`http://127.0.0.1:${port}/api/operations/health`, {
      method: 'GET',
    });
    assert.equal(unauthRes.status, 401);
  } finally {
    server.close();
  }
});
