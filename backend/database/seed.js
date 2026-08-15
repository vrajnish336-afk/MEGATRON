import { runMigrations } from './migrations.js';
import { orgRepo } from './repositories/orgRepo.js';
import { userRepo } from './repositories/userRepo.js';
import { leadRepo } from './repositories/leadRepo.js';
import { taskRepo } from './repositories/taskRepo.js';
import { workflowRepo } from './repositories/workflowRepo.js';
import { approvalRepo } from './repositories/approvalRepo.js';
import { auditRepo } from './repositories/auditRepo.js';
import { hashPassword } from '../security/crypto.js';
import { logger } from '../core/logger.js';
import { ROLES } from '../permissions/roles.js';

export async function seedDatabase() {
  logger.info('====================================================');
  logger.info('  MEGADRONE Business OS - Seeding Verified Demo Data');
  logger.info('====================================================');

  // Ensure migrations are run
  runMigrations();

  // 1. Check if demo org already exists
  let org = orgRepo.findBySlug('apex-global');
  if (org) {
    logger.info('Demo organization apex-global already exists. Re-verifying seed data...');
  } else {
    org = orgRepo.create({
      name: 'Apex Global Dynamics',
      slug: 'apex-global',
      plan: 'enterprise',
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        aiEnabled: true,
        dataPolicy: {
          allowCloudForPublic: true,
          allowCloudForInternal: true,
          allowCloudForConfidential: false,
          allowCloudForSensitive: false,
        }
      }
    });
    logger.info(`Created Organization: ${org.name} (${org.id})`);
  }

  // 2. Users
  const defaultPasswordHash = await hashPassword('megadrone123');

  let owner = userRepo.findByEmail('alex.mercer@apexglobal.io');
  if (!owner) {
    owner = userRepo.create({
      orgId: org.id,
      name: 'Alex Mercer',
      email: 'alex.mercer@apexglobal.io',
      passwordHash: defaultPasswordHash,
      role: ROLES.OWNER,
    });
    logger.info(`Created User: ${owner.name} (${owner.role})`);
  }

  let manager = userRepo.findByEmail('sarah.jenkins@apexglobal.io');
  if (!manager) {
    manager = userRepo.create({
      orgId: org.id,
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@apexglobal.io',
      passwordHash: defaultPasswordHash,
      role: ROLES.MANAGER,
    });
    logger.info(`Created User: ${manager.name} (${manager.role})`);
  }

  let employee = userRepo.findByEmail('rahul.sharma@apexglobal.io');
  if (!employee) {
    employee = userRepo.create({
      orgId: org.id,
      name: 'Rahul Sharma',
      email: 'rahul.sharma@apexglobal.io',
      passwordHash: defaultPasswordHash,
      role: ROLES.EMPLOYEE,
    });
    logger.info(`Created User: ${employee.name} (${employee.role})`);
  }

  // 3. Leads
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const overdueDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);

  const existingLeads = leadRepo.listByOrg(org.id);
  if (existingLeads.length === 0) {
    const lead1 = leadRepo.create({
      orgId: org.id,
      name: 'Elena Rostova',
      company: 'Nexus Cloud Solutions',
      email: 'elena@nexuscloud.io',
      phone: '+1 (555) 234-5678',
      source: 'INBOUND_WEB',
      status: 'QUALIFIED',
      priority: 'HIGH',
      notes: 'Interested in enterprise automated operations pipeline for 200 engineers.',
      nextFollowup: tomorrow,
      assignedTo: manager.id,
      aiClassification: 'Enterprise Cloud Infrastructure',
      aiSuggestedAction: 'Present technical architecture proposal deck',
    });

    const lead2 = leadRepo.create({
      orgId: org.id,
      name: 'Marcus Vance',
      company: 'CyberVanguard Corp',
      email: 'marcus.v@cybervanguard.com',
      phone: '+1 (555) 876-5432',
      source: 'PARTNER_REFERRAL',
      status: 'PROPOSAL',
      priority: 'URGENT',
      notes: 'Finalizing RFP response for cybersecurity incident workflow orchestration.',
      nextFollowup: today,
      assignedTo: employee.id,
      aiClassification: 'Enterprise Security Vendor',
      aiSuggestedAction: 'Deliver finalized pricing matrix before 5 PM EST',
    });

    const lead3 = leadRepo.create({
      orgId: org.id,
      name: 'Priya Patel',
      company: 'Quantum Logistics India',
      email: 'priya.patel@quantumlogistics.in',
      phone: '+91 98765 43210',
      source: 'DIRECT_OUTREACH',
      status: 'NEGOTIATION',
      priority: 'HIGH',
      notes: 'Contract review stage for multi-hub tracking and AI task assignment.',
      nextFollowup: overdueDate, // Intentionally overdue for testing
      assignedTo: employee.id,
      aiClassification: 'Cross-Border Supply Chain',
      aiSuggestedAction: 'Review custom legal indemnity clause with in-house counsel',
    });

    const lead4 = leadRepo.create({
      orgId: org.id,
      name: 'David Zhao',
      company: 'Horizon Retail Group',
      email: 'david.zhao@horizonretail.com',
      phone: '+1 (555) 345-6789',
      source: 'WEBINAR',
      status: 'NEW',
      priority: 'MEDIUM',
      notes: 'Downloaded whitepaper on automated customer follow-ups and AI auditing.',
      nextFollowup: in3Days,
      assignedTo: manager.id,
      aiClassification: 'Mid-Market Retail Chain',
      aiSuggestedAction: 'Send automated intro message sequence',
    });

    logger.info('Created 4 verified demo leads.');
  }

  // 4. Tasks
  const existingTasks = taskRepo.listByOrg(org.id);
  if (existingTasks.length === 0) {
    taskRepo.create({
      orgId: org.id,
      title: 'Conduct technical discovery with Elena Rostova (Nexus Cloud)',
      description: 'Discuss architecture requirements and security compliance constraints.',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: tomorrow,
      assignedTo: manager.id,
    });

    taskRepo.create({
      orgId: org.id,
      title: 'Deliver finalized pricing matrix for CyberVanguard RFP',
      description: 'Urgent contract milestone for Marcus Vance.',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      dueDate: today,
      assignedTo: employee.id,
    });

    taskRepo.create({
      orgId: org.id,
      title: 'Review legal indemnity clause for Quantum Logistics (OVERDUE)',
      description: 'Pending review with legal counsel. Action immediately.',
      priority: 'URGENT',
      status: 'PENDING',
      dueDate: overdueDate, // Overdue
      assignedTo: employee.id,
    });

    taskRepo.create({
      orgId: org.id,
      title: 'Prepare quarterly operations metrics report for executive board',
      description: 'Compile conversion velocity and AI cost efficiency metrics.',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: in3Days,
      assignedTo: owner.id,
    });

    logger.info('Created 4 verified demo tasks.');
  }

  // 5. Workflows
  const existingWorkflows = workflowRepo.listByOrg(org.id);
  if (existingWorkflows.length === 0) {
    workflowRepo.create({
      orgId: org.id,
      name: 'High-Value Lead Auto-Enrichment & Follow-up Task',
      description: 'When a new lead is added with company info, automatically classify lead and schedule task.',
      triggerType: 'LEAD_CREATED',
      conditions: [
        { field: 'company', operator: 'IS_NOT_NULL', value: '' }
      ],
      actions: [
        { type: 'CLASSIFY_LEAD', params: {} },
        { type: 'CREATE_TASK', params: { title: 'AI Follow-up: Review new qualified corporate lead', priority: 'HIGH', dueDays: 1 } },
        { type: 'GENERATE_SUGGESTED_DRAFT', params: {} }
      ],
      createdBy: owner.id,
    });
    logger.info('Created 1 automated workflow rule.');
  }

  // 6. Approval Queue Item
  const existingApprovals = approvalRepo.listByOrg(org.id);
  if (existingApprovals.length === 0) {
    approvalRepo.create({
      orgId: org.id,
      actionType: 'SEND_EXTERNAL_COMMUNICATION',
      riskLevel: 'HIGH',
      payload: {
        recipientEmail: 'marcus.v@cybervanguard.com',
        recipientName: 'Marcus Vance',
        subject: 'Formal MEGADRONE Enterprise Proposal - CyberVanguard',
        body: 'Dear Marcus,\n\nAttached is the executive proposal with enterprise SLA terms and dedicated tenant isolation guarantees.\n\nBest regards,\nAlex Mercer',
      },
      reason: 'AI generated formal commercial outreach containing pricing terms. Requires manager approval before SMTP dispatch.',
      requestedBy: 'AI_ORCHESTRATOR',
    });
    logger.info('Created 1 sample pending human approval request.');
  }

  // 7. Audit log entries
  auditRepo.create({
    orgId: org.id,
    userId: owner.id,
    action: 'SYSTEM_INITIALIZED_AND_SEEDED',
    resourceType: 'SYSTEM',
    resourceId: org.id,
    details: { seedVersion: '1.0.0', orgName: org.name },
  });

  logger.info('====================================================');
  logger.info('  Seed Complete! Login Credentials:');
  logger.info('  Owner:    alex.mercer@apexglobal.io    / megadrone123');
  logger.info('  Manager:  sarah.jenkins@apexglobal.io  / megadrone123');
  logger.info('  Employee: rahul.sharma@apexglobal.io    / megadrone123');
  logger.info('====================================================');
}

// Run if directly called
if (process.argv[1].endsWith('seed.js')) {
  seedDatabase().catch(err => {
    logger.error('Seeding failed:', { error: err.message });
    process.exit(1);
  });
}
