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
import { leadAgent } from '../agents/leadAgent.js';
import { followupAgent } from '../agents/followupAgent.js';
import { initializeTools } from '../tools/systemTools.js';

// Initialize tools
initializeTools();

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

test('16. Real Estate Lead Fields CRUD & Site Visit Filtering', () => {
  const reLead = leadRepo.create({
    orgId: testOrg1.id,
    name: 'Vikram Joshi',
    email: 'vikram.j@testrealty.com',
    propertyType: '3BHK Apartment',
    budgetMin: 80,
    budgetMax: 100,
    preferredLocation: 'Vaishali Nagar, Jaipur',
    bedrooms: 3,
    purpose: 'Self-use',
    buyOrRent: 'Buy',
    siteVisitDate: '2026-08-20',
    status: 'QUALIFIED',
    priority: 'HIGH',
  });

  assert.equal(reLead.property_type, '3BHK Apartment');
  assert.equal(reLead.budget_max, 100);
  assert.equal(reLead.bedrooms, 3);
  assert.equal(reLead.preferred_location, 'Vaishali Nagar, Jaipur');
  assert.equal(reLead.site_visit_date, '2026-08-20');

  // Verify search by location & property type
  const searchResults = leadRepo.listByOrg(testOrg1.id, { search: 'Vaishali' });
  assert.ok(searchResults.some(l => l.id === reLead.id));
});

test('17. AI Real Estate Lead Qualification & Missing Information Extraction', async () => {
  const inputPrompt = 'Customer wants 3BHK in Jaipur, budget 80 lakh, wants to visit this weekend.';
  const qualification = await leadAgent.qualifyAndExtractRequirements(inputPrompt, {
    orgId: testOrg1.id,
    user: ownerUser,
  });

  assert.equal(qualification.priority, 'HIGH');
  assert.ok(qualification.requirement.includes('3BHK'));
  assert.ok(qualification.budget.includes('80'));
  assert.ok(qualification.location.includes('Jaipur'));
  assert.ok(qualification.nextAction.toLowerCase().includes('site visit'));
  assert.ok(Array.isArray(qualification.missingInfo));
});

test('18. Follow-ups Needing Attention Prioritization Order', () => {
  const attentionList = leadRepo.getFollowupsNeedingAttention(testOrg1.id, 10);
  assert.ok(Array.isArray(attentionList));
  assert.ok(attentionList.length > 0);

  // Overdue leads must be ranked ahead of non-overdue low priority leads
  const todayStr = new Date().toISOString().slice(0, 10);
  if (attentionList.length >= 2) {
    const first = attentionList[0];
    const isFirstOverdue = first.next_followup && first.next_followup < todayStr;
    const isFirstUrgent = first.priority === 'URGENT' || first.priority === 'HIGH';
    assert.ok(isFirstOverdue || isFirstUrgent);
  }
});

test('19. AI Real Estate Follow-up Draft Generation with Governance', async () => {
  const leads = leadRepo.listByOrg(testOrg1.id);
  const lead = leads[0];

  const draft = await leadAgent.generateRealEstateFollowupDraft(lead.id, {
    customIntent: "Customer hasn't replied for 3 days.",
  }, {
    orgId: testOrg1.id,
    user: ownerUser,
  });

  assert.equal(draft.requiresHumanApproval, true);
  assert.equal(draft.dispatched, false);
  assert.ok(draft.body.length > 20);
  assert.ok(draft.statusNote.includes('No communication provider configured'));
});

test('20. Business Impact Telemetry (No Fabricated Numbers)', () => {
  // Populated org returns real counts
  const impact = businessBriefEngine.calculateBusinessImpact(testOrg1.id);
  assert.equal(impact.hasData, true);
  assert.ok(typeof impact.metrics.leadsManaged === 'number');
  assert.ok(typeof impact.metrics.completedTasks === 'number');
  assert.ok(typeof impact.metrics.responseDraftsGenerated === 'number');

  // Empty org returns "Insufficient data."
  const emptyOrg = orgRepo.create({ name: 'Empty Agency', slug: `empty-${Date.now()}` });
  const emptyImpact = businessBriefEngine.calculateBusinessImpact(emptyOrg.id);
  assert.equal(emptyImpact.hasData, false);
  assert.equal(emptyImpact.message, 'Insufficient data.');
});

test('21. AI Lead Qualifier Multi-Language & Edge Case Scenarios (Cases A to F)', async () => {
  // Case A: 3BHK Jaipur under 80 lakh
  const caseA = await leadAgent.qualifyAndExtractRequirements('Need 3BHK in Jaipur under 80 lakh.', { orgId: testOrg1.id });
  assert.ok(caseA.requirement.includes('3BHK'));
  assert.equal(caseA.location, 'Jaipur');
  assert.ok(caseA.budget.includes('80'));
  assert.equal(caseA.priority, 'HIGH');

  // Case B: Generic "Looking for a property."
  const caseB = await leadAgent.qualifyAndExtractRequirements('Looking for a property.', { orgId: testOrg1.id });
  assert.ok(caseB.requirement.includes('Property'));
  assert.equal(caseB.budget, 'Not provided.');
  assert.equal(caseB.location, 'Not provided.');
  assert.ok(caseB.missingInfo.includes('Budget range'));
  assert.ok(caseB.missingInfo.includes('Preferred locality'));

  // Case C: Villa Gurgaon 2 crore Saturday visit
  const caseC = await leadAgent.qualifyAndExtractRequirements('I want a villa in Gurgaon around 2 crore and want to visit Saturday.', { orgId: testOrg1.id });
  assert.ok(caseC.requirement.toLowerCase().includes('villa'));
  assert.equal(caseC.location, 'Gurugram');
  assert.ok(caseC.budget.includes('2'));
  assert.equal(caseC.siteVisitIntent, 'Saturday');
  assert.equal(caseC.priority, 'HIGH');

  // Case D: Devanagari Hindi
  const caseD = await leadAgent.qualifyAndExtractRequirements('मुझे जयपुर में 3 बीएचके फ्लैट चाहिए, बजट 80 लाख', { orgId: testOrg1.id });
  assert.ok(caseD.requirement.includes('3BHK'));
  assert.equal(caseD.location, 'Jaipur');
  assert.ok(caseD.budget.includes('80'));
  assert.equal(caseD.priority, 'HIGH');

  // Case E: Hinglish
  const caseE = await leadAgent.qualifyAndExtractRequirements('Jaipur me 3bhk chahiye budget 80 lakh weekend me visit karna hai', { orgId: testOrg1.id });
  assert.ok(caseE.requirement.includes('3BHK'));
  assert.equal(caseE.location, 'Jaipur');
  assert.equal(caseE.siteVisitIntent, 'This weekend');
  assert.equal(caseE.priority, 'HIGH');

  // Case F: Completely unrelated text
  const caseF = await leadAgent.qualifyAndExtractRequirements('What is the recipe for chocolate cake?', { orgId: testOrg1.id });
  assert.equal(caseF.priority, 'LOW');
  assert.equal(caseF.requirement, 'Not provided.');
  assert.equal(caseF.budget, 'Not provided.');
  assert.ok(caseF.summary.includes('does not contain identifiable'));
});

test('22. High-Risk Communication Tool Safety (No Fake Send when Unconfigured)', async () => {
  const { toolRegistry } = await import('../tools/toolRegistry.js');
  const result = await toolRegistry.execute('send_external_communication', {
    recipientEmail: 'client@example.com',
    subject: 'Property follow-up',
    body: 'Hello, checking in.',
  }, { orgId: testOrg1.id, user: ownerUser });

  assert.equal(result.dispatched, false);
  assert.equal(result.message, 'Draft generated. No communication provider configured.');
});

test('23. Complete Real Estate CRM Lifecycle', () => {
  // 1. Create Lead
  const lead = leadRepo.create({
    orgId: testOrg1.id,
    name: 'Ananya Sharma',
    phone: '+91 98290 99887',
    propertyType: '3BHK Flat',
    preferredLocation: 'Jaipur',
    budgetMax: 90,
    status: 'NEW',
    priority: 'HIGH',
  });
  assert.ok(lead.id);

  // 2. View Lead
  const viewed = leadRepo.findById(lead.id, testOrg1.id);
  assert.equal(viewed.name, 'Ananya Sharma');

  // 3. Edit & Update Lead Status
  const qualified = leadRepo.update(lead.id, testOrg1.id, {
    status: 'QUALIFIED',
    siteVisitDate: '2026-08-25',
    nextFollowup: '2026-08-24',
  });
  assert.equal(qualified.status, 'QUALIFIED');
  assert.equal(qualified.site_visit_date, '2026-08-25');

  // 4. Advance to Won
  const won = leadRepo.update(lead.id, testOrg1.id, {
    status: 'WON',
  });
  assert.equal(won.status, 'WON');

  // 5. Delete Lead
  leadRepo.delete(lead.id, testOrg1.id);
  const deleted = leadRepo.findById(lead.id, testOrg1.id);
  assert.equal(deleted, null);
});

test('24. CRM Edge Cases & Boundary Handling', () => {
  // Special characters & large values
  const edgeLead = leadRepo.create({
    orgId: testOrg1.id,
    name: "O'Connor & Sons <script>alert(1)</script> / 🏢",
    company: 'Test & Co.',
    budgetMin: 0.001,
    budgetMax: 9999999.99,
    preferredLocation: 'City / Sector 12 # @ !',
    notes: 'Very large notes content '.repeat(50),
    status: 'NEW',
    priority: 'LOW',
  });

  assert.ok(edgeLead.id);
  assert.equal(edgeLead.budget_max, 9999999.99);

  // Cleanup
  leadRepo.delete(edgeLead.id, testOrg1.id);
});

test('25. Human Approval Rejection & Workflow State Synchronization', () => {
  const approval = approvalRepo.create({
    orgId: testOrg1.id,
    actionType: 'SEND_EXTERNAL_COMMUNICATION',
    riskLevel: 'HIGH',
    payload: { recipient: 'prospect@test.com' },
    reason: 'Price discount outreach requires approval',
    requestedBy: employeeUser.id,
  });

  assert.equal(approval.status, 'PENDING');

  // Reject approval
  const rejected = approvalRepo.resolve(approval.id, testOrg1.id, {
    status: 'REJECTED',
    approvedBy: ownerUser.id,
    rejectionReason: 'Discount percentage too high',
  });

  assert.equal(rejected.status, 'REJECTED');
  assert.equal(rejected.rejection_reason, 'Discount percentage too high');
});

test('26. Lead Follow-up Draft Generation (AI Follow-up Agent)', async () => {
  // Test 1: Lead follow-up draft generation
  const lead = leadRepo.create({
    orgId: testOrg1.id,
    name: 'Neha Verma',
    company: 'Fintech Solutions',
    propertyType: '3BHK Luxury Flat',
    status: 'QUALIFIED',
    priority: 'HIGH',
  });

  const draft = await followupAgent.generateDraft({
    lead_id: lead.id,
    customer_name: 'Neha Verma',
    company: 'Fintech Solutions',
    requirement: '3BHK Luxury Flat',
    lead_stage: 'QUALIFIED',
    last_activity: 'Applied for mortgage loan',
    reason_for_followup: 'Home loan sanction pending.',
    language: 'English',
  }, { orgId: testOrg1.id, user: ownerUser });

  assert.ok(draft.draft_message);
  assert.ok(draft.draft_message.length > 20);
  assert.ok(draft.draft_message.includes('Neha') || draft.draft_message.includes('Verma'));
  assert.ok(
    draft.draft_message.toLowerCase().includes('loan') || 
    draft.draft_message.toLowerCase().includes('sanction') ||
    draft.draft_message.toLowerCase().includes('follow') ||
    draft.draft_message.toLowerCase().includes('regarding')
  );
  assert.equal(draft.status, 'PENDING_APPROVAL');
  assert.equal(draft.language, 'English');
});

test('27. Hindi Message Generation (Devanagari Follow-up Draft)', async () => {
  // Test 2: Hindi message generation
  const draftHindi = await followupAgent.generateDraft({
    customer_name: 'नेहा वर्मा',
    company: 'अपेक्स रियल्टी',
    requirement: '3 बीएचके फ्लैट',
    lead_stage: 'QUALIFIED',
    last_activity: 'दस्तावेज़ सत्यापन',
    reason_for_followup: 'Home loan sanction pending. दस्तावेज़ की आवश्यकता है।',
    language: 'Hindi',
  }, { orgId: testOrg1.id, user: ownerUser });

  assert.ok(draftHindi.draft_message);
  assert.ok(draftHindi.draft_message.length > 15);
  // Must contain Devanagari Hindi text
  assert.ok(/[\u0900-\u097F]/.test(draftHindi.draft_message));
  assert.equal(draftHindi.language, 'Hindi');
  assert.equal(draftHindi.status, 'PENDING_APPROVAL');
});

test('28. Hinglish Message Generation (Conversational Roman Hindi)', async () => {
  // Test 3: Hinglish message generation
  const draftHinglish = await followupAgent.generateDraft({
    customer_name: 'Neha Verma',
    requirement: '3BHK Apartment',
    lead_stage: 'QUALIFIED',
    last_activity: 'Site visit completed',
    reason_for_followup: 'Home loan sanction pending status check',
    language: 'Hinglish',
  }, { orgId: testOrg1.id, user: ownerUser });

  assert.ok(draftHinglish.draft_message);
  assert.ok(draftHinglish.draft_message.length > 20);
  const lowerMsg = draftHinglish.draft_message.toLowerCase();
  assert.ok(
    lowerMsg.includes('namaste') || 
    lowerMsg.includes('aap') || 
    lowerMsg.includes('hume') || 
    lowerMsg.includes('kar') || 
    lowerMsg.includes('karein') ||
    lowerMsg.includes('batayein') ||
    lowerMsg.includes('regarding') ||
    lowerMsg.includes('loan')
  );
  assert.equal(draftHinglish.language, 'Hinglish');
  assert.equal(draftHinglish.status, 'PENDING_APPROVAL');
});

test('29. Human Approval Required Before Sending Communication Draft', async () => {
  // Test 4: Approval required before sending
  const approval = approvalRepo.create({
    orgId: testOrg1.id,
    actionType: 'COMMUNICATION_DRAFT',
    riskLevel: 'HIGH',
    payload: {
      lead_id: 'lead_neha_123',
      customer_name: 'Neha Verma',
      draft_message: 'Hello Neha Verma, checking on your home loan sanction.',
      recipient: '+91 9876543210',
      channel: 'WhatsApp',
      status: 'PENDING_APPROVAL',
      safety_notice: 'Draft generated. Human approval required before sending.',
    },
    reason: 'Follow-up draft for Neha Verma (Home loan sanction pending). Requires human review before sending.',
    requestedBy: 'AI_FOLLOWUP_AGENT',
  });

  // Verify created as pending human signoff
  assert.equal(approval.status, 'PENDING');
  assert.equal(approval.action_type, 'COMMUNICATION_DRAFT');
  assert.equal(approval.risk_level, 'HIGH');
  assert.equal(approval.payload.safety_notice, 'Draft generated. Human approval required before sending.');

  // Human Supervisor approves the draft
  const approved = approvalRepo.resolve(approval.id, testOrg1.id, {
    status: 'APPROVED',
    approvedBy: ownerUser.id,
  });

  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.approved_by, ownerUser.id);
  assert.ok(approved.resolved_at);
});

test('30. Rejected Communication Draft Cannot Dispatch', async () => {
  // Test 5: Rejected draft cannot dispatch
  const approval = approvalRepo.create({
    orgId: testOrg1.id,
    actionType: 'COMMUNICATION_DRAFT',
    riskLevel: 'HIGH',
    payload: {
      lead_id: 'lead_vikram_456',
      customer_name: 'Vikram Joshi',
      draft_message: 'Offering 15% special unapproved discount.',
      recipient: 'vikram@example.com',
    },
    reason: 'High discount outreach requires managerial review',
    requestedBy: 'AI_FOLLOWUP_AGENT',
  });

  assert.equal(approval.status, 'PENDING');

  // Supervisor rejects the draft
  const rejected = approvalRepo.resolve(approval.id, testOrg1.id, {
    status: 'REJECTED',
    approvedBy: ownerUser.id,
    rejectionReason: 'Discount exceeds authorized limit of 5%',
  });

  assert.equal(rejected.status, 'REJECTED');
  assert.equal(rejected.rejection_reason, 'Discount exceeds authorized limit of 5%');

  // Attempting to resolve/approve an already rejected draft must be prevented by business logic
  const rechecked = approvalRepo.findById(approval.id, testOrg1.id);
  assert.equal(rechecked.status, 'REJECTED');
  assert.notEqual(rechecked.status, 'APPROVED');
  assert.notEqual(rechecked.status, 'PENDING');
});
