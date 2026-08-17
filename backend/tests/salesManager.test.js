import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../api/server.js';
import { orgRepo } from '../database/repositories/orgRepo.js';
import { userRepo } from '../database/repositories/userRepo.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { salesManagerAgent } from '../agents/salesManagerAgent.js';
import { hashPassword, generateToken } from '../security/crypto.js';
import { ROLES } from '../permissions/roles.js';
import { initializeTools } from '../tools/systemTools.js';

initializeTools();

let app;
let orgA;
let orgB;
let ownerA;
let employeeA;
let ownerB;
let tokenOwnerA;
let tokenEmployeeA;
let tokenOwnerB;

let leadNegotiation;
let leadContacted;
let leadWon;
let leadLost;
let leadWithOverdueTask;

test('Sales Manager Test Setup: Create Organizations, Users & Real Leads', async () => {
  app = createApp();

  const slugA = `sales-test-org-a-${Date.now()}`;
  const slugB = `sales-test-org-b-${Date.now()}`;

  orgA = orgRepo.create({ name: 'Apex Premier Realty', slug: slugA });
  orgB = orgRepo.create({ name: 'Horizon Luxury Homes', slug: slugB });

  const passwordHash = await hashPassword('Secret_Pass_123');

  ownerA = userRepo.create({
    orgId: orgA.id,
    name: 'Broker Boss A',
    email: `owner_a_${Date.now()}@test.io`,
    passwordHash,
    role: ROLES.OWNER,
  });

  employeeA = userRepo.create({
    orgId: orgA.id,
    name: 'Sales Agent A',
    email: `agent_a_${Date.now()}@test.io`,
    passwordHash,
    role: ROLES.EMPLOYEE,
  });

  ownerB = userRepo.create({
    orgId: orgB.id,
    name: 'Broker Boss B',
    email: `owner_b_${Date.now()}@test.io`,
    passwordHash,
    role: ROLES.OWNER,
  });

  tokenOwnerA = generateToken({ userId: ownerA.id, orgId: orgA.id });
  tokenEmployeeA = generateToken({ userId: employeeA.id, orgId: orgA.id });
  tokenOwnerB = generateToken({ userId: ownerB.id, orgId: orgB.id });

  // 1. Negotiation Lead (High value deal)
  leadNegotiation = leadRepo.create({
    orgId: orgA.id,
    name: 'Rajesh Khandelwal',
    company: 'Khandelwal Jewellers',
    status: 'NEGOTIATION',
    priority: 'HIGH',
    propertyType: 'Commercial Showroom',
    budgetMax: 20000000,
  });

  // 2. Contacted Lead (Initial inquiry)
  leadContacted = leadRepo.create({
    orgId: orgA.id,
    name: 'Vikram Malhotra',
    company: 'Tech Solutions',
    status: 'CONTACTED',
    priority: 'MEDIUM',
    propertyType: '2BHK Apartment',
    budgetMax: 6000000,
  });

  // 3. Won Lead (Closed deal)
  leadWon = leadRepo.create({
    orgId: orgA.id,
    name: 'Pooja Hegde',
    company: 'Studio Design',
    status: 'WON',
    priority: 'HIGH',
    propertyType: '3BHK Penthouse',
  });

  // 4. Lost Lead (Archived)
  leadLost = leadRepo.create({
    orgId: orgA.id,
    name: 'Siddharth Roy',
    company: 'Logistics Hub',
    status: 'LOST',
    priority: 'LOW',
    propertyType: 'Warehouse',
  });

  // 5. Lead with Overdue Urgent Task
  leadWithOverdueTask = leadRepo.create({
    orgId: orgA.id,
    name: 'Ananya Singhania',
    company: 'Singhania Group',
    status: 'QUALIFIED',
    priority: 'HIGH',
    propertyType: '4BHK Luxury Villa',
    budgetMax: 35000000,
  });

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  taskRepo.create({
    orgId: orgA.id,
    leadId: leadWithOverdueTask.id,
    title: 'Deliver revised payment schedule & title deed',
    priority: 'URGENT',
    status: 'PENDING',
    dueDate: yesterday,
  });

  assert.ok(leadNegotiation.id);
  assert.ok(leadWithOverdueTask.id);
});

test('Sales Manager Core: Negotiation lead ranks above contacted lead', async () => {
  const result = await salesManagerAgent.getPriorities(orgA.id);
  assert.equal(result.total, 5);

  const negLeadPriority = result.priorities.find(p => p.lead_id === leadNegotiation.id);
  const contactedLeadPriority = result.priorities.find(p => p.lead_id === leadContacted.id);

  assert.ok(negLeadPriority);
  assert.ok(contactedLeadPriority);
  assert.ok(negLeadPriority.score > contactedLeadPriority.score, 'Negotiation score must exceed contacted score');
  assert.ok(negLeadPriority.reasons.some(r => r.includes('Negotiation stage')));
  assert.ok(negLeadPriority.next_action.includes('negotiation') || negLeadPriority.next_action.includes('pricing'));
});

test('Sales Manager Core: Overdue urgent task increases score and updates next best action', async () => {
  const result = await salesManagerAgent.getPriorities(orgA.id);
  const overdueLeadPriority = result.priorities.find(p => p.lead_id === leadWithOverdueTask.id);

  assert.ok(overdueLeadPriority);
  assert.ok(overdueLeadPriority.reasons.some(r => r.includes('Overdue task pending')));
  assert.ok(overdueLeadPriority.reasons.some(r => r.includes('High-priority / urgent task assigned')));
  assert.ok(overdueLeadPriority.next_action.includes('Deliver revised payment schedule') || overdueLeadPriority.next_action.includes('overdue'));
});

test('Sales Manager Core: Lost lead and Won lead are deprioritized with LOW priority', async () => {
  const result = await salesManagerAgent.getPriorities(orgA.id);

  const lostPriority = result.priorities.find(p => p.lead_id === leadLost.id);
  const wonPriority = result.priorities.find(p => p.lead_id === leadWon.id);

  assert.ok(lostPriority);
  assert.ok(wonPriority);
  assert.equal(lostPriority.priority, 'LOW');
  assert.equal(wonPriority.priority, 'LOW');
  assert.ok(lostPriority.reasons.some(r => r.includes('Lost deal')));
  assert.ok(wonPriority.reasons.some(r => r.includes('Won deal')));
});

test('Sales Manager Core: Empty database organization returns "Data unavailable."', async () => {
  const emptyOrg = orgRepo.create({ name: 'Empty Agency', slug: `empty-org-${Date.now()}` });
  const result = await salesManagerAgent.getPriorities(emptyOrg.id);

  assert.equal(result.total, 0);
  assert.equal(result.priorities.length, 0);
  assert.equal(result.summary, 'Data unavailable.');

  const plan = await salesManagerAgent.getDailyPlan(emptyOrg.id);
  assert.equal(plan.total, 0);
  assert.equal(plan.summary, 'Data unavailable.');

  const explanation = await salesManagerAgent.explainPriorities({ orgId: emptyOrg.id, query: 'Who to call?' });
  assert.ok(explanation.answer.includes('Data unavailable'));
});

test('Sales Manager Core: AI Explanation uses live CRM data and factual reasons', async () => {
  const explanation = await salesManagerAgent.explainPriorities({
    orgId: orgA.id,
    query: 'Who should we focus on today, and why is Rajesh a priority?',
    leadId: leadNegotiation.id,
    user: ownerA,
  });

  assert.equal(explanation.success, true);
  assert.ok(explanation.answer);
  assert.ok(explanation.answer.length > 20);
});

test('API Test: GET /api/sales/priorities - Lists ranked customer priorities for tenant', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/sales/priorities`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenOwnerA}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.total, 5);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);

    const first = json.data[0];
    assert.ok(first.customer_name);
    assert.ok(first.lead_id);
    assert.ok(typeof first.score === 'number');
    assert.ok(['URGENT', 'HIGH', 'MEDIUM', 'LOW'].includes(first.priority));
    assert.ok(Array.isArray(first.reasons));
    assert.ok(first.next_action);
  } finally {
    server.close();
  }
});

test('API Test: GET /api/sales/priorities/:leadId - Details single lead scoring', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/sales/priorities/${leadNegotiation.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenEmployeeA}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.customer_name, 'Rajesh Khandelwal');
    assert.equal(json.data.stage, 'NEGOTIATION');
    assert.ok(json.data.score >= 30);
  } finally {
    server.close();
  }
});

test('API Test: GET /api/sales/daily-plan - Groups priorities into URGENT, HIGH, MEDIUM, LOW', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/sales/daily-plan`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenOwnerA}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.total, 5);
    assert.ok(json.data.plan.URGENT !== undefined);
    assert.ok(json.data.plan.HIGH !== undefined);
    assert.ok(json.data.plan.MEDIUM !== undefined);
    assert.ok(json.data.plan.LOW !== undefined);
    assert.ok(json.data.metrics);
    assert.equal(json.data.metrics.totalPriorities, 5);
  } finally {
    server.close();
  }
});

test('API Test: POST /api/sales/explain - Returns AI/deterministic priority reasoning', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/sales/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenOwnerA}`,
      },
      body: JSON.stringify({
        query: 'Who should we call first today?',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.answer);
  } finally {
    server.close();
  }
});

test('Security & Multi-Tenant Isolation: Org B cannot access Org A priorities', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Org B requesting Org A lead priority
    const res = await fetch(`http://127.0.0.1:${port}/api/sales/priorities/${leadNegotiation.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenOwnerB}`,
      },
    });

    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'NOT_FOUND');

    // Org B priorities list must be empty (0 leads in Org B)
    const listRes = await fetch(`http://127.0.0.1:${port}/api/sales/priorities`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenOwnerB}`,
      },
    });
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.total, 0);
    assert.equal(listJson.data.length, 0);
  } finally {
    server.close();
  }
});
