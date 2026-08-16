import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../api/server.js';
import { orgRepo } from '../database/repositories/orgRepo.js';
import { userRepo } from '../database/repositories/userRepo.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { approvalRepo } from '../database/repositories/approvalRepo.js';
import { hashPassword, generateToken } from '../security/crypto.js';
import { ROLES } from '../permissions/roles.js';
import { initializeTools } from '../tools/systemTools.js';

initializeTools();

let app;
let testOrg;
let ownerUser;
let employeeUser;
let ownerToken;
let employeeToken;
let testLead;

test('API Setup: Bootstrap App & Users for Follow-up API Tests', async () => {
  app = createApp();
  const slug = `followup-test-org-${Date.now()}`;
  testOrg = orgRepo.create({ name: 'Followup Test Realty', slug });

  const passwordHash = await hashPassword('Secret_Pass_123');
  ownerUser = userRepo.create({
    orgId: testOrg.id,
    name: 'Broker Admin',
    email: `broker_${Date.now()}@test.io`,
    passwordHash,
    role: ROLES.OWNER,
  });

  employeeUser = userRepo.create({
    orgId: testOrg.id,
    name: 'Sales Agent',
    email: `agent_${Date.now()}@test.io`,
    passwordHash,
    role: ROLES.EMPLOYEE,
  });

  ownerToken = generateToken({ userId: ownerUser.id, orgId: testOrg.id });
  employeeToken = generateToken({ userId: employeeUser.id, orgId: testOrg.id });

  testLead = leadRepo.create({
    orgId: testOrg.id,
    name: 'Neha Verma',
    company: 'Fintech Corp',
    phone: '+91 9876543210',
    propertyType: '3BHK Flat',
    preferredLocation: 'Jaipur',
    status: 'QUALIFIED',
    priority: 'HIGH',
  });

  assert.ok(testLead.id);
});

test('API Test 1: POST /api/followups/generate - Generates draft & enters approval queue', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/followups/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        lead_id: testLead.id,
        reason: 'Home loan sanction pending',
        language: 'English',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.draft_id);
    assert.ok(json.message);
    assert.equal(json.status, 'PENDING_APPROVAL');
    assert.equal(json.notice, 'Draft generated. Human approval required before sending.');

    // Verify approval record in DB
    const approval = approvalRepo.findById(json.draft_id, testOrg.id);
    assert.ok(approval);
    assert.equal(approval.action_type, 'COMMUNICATION_DRAFT');
    assert.equal(approval.status, 'PENDING');
  } finally {
    server.close();
  }
});

test('API Test 2: POST /api/followups/generate with Hindi language', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/followups/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        lead_id: testLead.id,
        reason: 'Site visit reminder',
        language: 'Hindi',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.draft_id);
    assert.ok(/[\u0900-\u097F]/.test(json.message));
    assert.equal(json.status, 'PENDING_APPROVAL');
  } finally {
    server.close();
  }
});

test('API Test 3: Approval Workflow & Safety Notice Enforcement', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. Generate Draft
    const genRes = await fetch(`http://127.0.0.1:${port}/api/followups/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        lead_id: testLead.id,
        reason: 'Negotiation follow-up',
        language: 'Hinglish',
      }),
    });

    const genJson = await genRes.json();
    const draftId = genJson.draft_id;

    // 2. Employee cannot approve (RBAC check)
    const empApproveRes = await fetch(`http://127.0.0.1:${port}/api/followups/${draftId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`,
      },
    });
    assert.equal(empApproveRes.status, 403);

    // 3. Edit draft as agent
    const editRes = await fetch(`http://127.0.0.1:${port}/api/followups/${draftId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        message: 'Hello Neha Verma ji, customized edited draft message.',
      }),
    });
    assert.equal(editRes.status, 200);

    // 4. Owner approves draft
    const ownerApproveRes = await fetch(`http://127.0.0.1:${port}/api/followups/${draftId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
    });
    assert.equal(ownerApproveRes.status, 200);
    const approvedJson = await ownerApproveRes.json();
    assert.equal(approvedJson.data.status, 'APPROVED');

    // 5. Approving again returns 400
    const secondApproveRes = await fetch(`http://127.0.0.1:${port}/api/followups/${draftId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
    });
    assert.equal(secondApproveRes.status, 400);
  } finally {
    server.close();
  }
});

test('API Test 4: Rejection Workflow Prevents Execution', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const genRes = await fetch(`http://127.0.0.1:${port}/api/followups/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        lead_id: testLead.id,
        reason: 'Document request',
      }),
    });

    const genJson = await genRes.json();
    const draftId = genJson.draft_id;

    // Owner rejects draft
    const rejectRes = await fetch(`http://127.0.0.1:${port}/api/followups/${draftId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        reason: 'Document list is outdated. Please re-generate.',
      }),
    });

    assert.equal(rejectRes.status, 200);
    const rejectJson = await rejectRes.json();
    assert.equal(rejectJson.data.status, 'REJECTED');
    assert.equal(rejectJson.data.rejection_reason, 'Document list is outdated. Please re-generate.');

    // Attempt to approve rejected draft must fail with 400
    const approveRejectedRes = await fetch(`http://127.0.0.1:${port}/api/followups/${draftId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
    });
    assert.equal(approveRejectedRes.status, 400);
  } finally {
    server.close();
  }
});
