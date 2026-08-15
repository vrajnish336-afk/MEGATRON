import { guardrails } from '../security/guardrails.js';
import { dataPolicy, DATA_CLASSIFICATIONS } from '../ai/dataPolicy.js';
import { aiRouter, TASK_TYPES } from '../ai/router.js';
import { toolRegistry } from '../tools/toolRegistry.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { auditRepo } from '../database/repositories/auditRepo.js';
import { approvalRepo } from '../database/repositories/approvalRepo.js';
import { taskAgent } from '../agents/taskAgent.js';
import { leadAgent } from '../agents/leadAgent.js';
import { biAgent } from '../agents/businessIntelligenceAgent.js';
import { communicationAgent } from '../agents/communicationAgent.js';
import { reportAgent } from '../agents/reportAgent.js';
import { logger } from './logger.js';
import { ForbiddenError, ValidationError } from './errors.js';
import { hasPermission } from '../permissions/policyEvaluator.js';
import { PERMISSIONS } from '../permissions/permissionsMatrix.js';

export class MEGADRONEOrchestrator {
  /**
   * Process a natural language or structured user request
   */
  async processRequest({ query, user, orgId, ipAddress = null, dataClassification = DATA_CLASSIFICATIONS.INTERNAL }) {
    logger.info('MEGADRONE Orchestrator processing request', { query, userId: user.id, orgId });

    // Step 1: Guardrail Check (Hard safety bounds)
    guardrails.validateUserIntent(query);

    // Step 2: Permission Check for AI Use
    if (!hasPermission(user.role, PERMISSIONS.AI_USE)) {
      throw new ForbiddenError('Role not authorized for AI Operations');
    }

    const context = { user, orgId, ipAddress };
    const lower = (query || '').toLowerCase().trim();

    // Step 3: Intent Analysis & Task Planning
    
    // Pattern 3A: Task Agent (Tasks query, creation, overdue)
    if (
      lower.includes('task') || 
      lower.includes('due') || 
      lower.includes('remind') || 
      lower.includes('todo') ||
      lower.includes('today') ||
      lower.includes('कल') || // Hindi 'tomorrow' / 'yesterday'
      lower.includes('काम')   // Hindi 'task/work'
    ) {
      const taskResult = await taskAgent.parseAndExecuteCommand(query, context);
      
      auditRepo.create({
        orgId,
        userId: user.id,
        action: `ORCHESTRATOR_${taskResult.action}`,
        resourceType: 'TASK',
        details: { query, action: taskResult.action },
        ipAddress,
      });

      return {
        success: true,
        type: 'TASK_OPERATION',
        message: taskResult.message,
        data: taskResult.data,
        action: taskResult.action,
        approvalRequired: false,
      };
    }

    // Pattern 3B: Leads & Customer Inquiries (e.g., "आज मेरे सबसे important customers कौन हैं?", "Show top leads")
    if (
      lower.includes('lead') || 
      lower.includes('customer') || 
      lower.includes('client') || 
      lower.includes('ग्राहक') || // Hindi 'customer'
      lower.includes('important customer')
    ) {
      const highPriorityLeads = leadRepo.listByOrg(orgId, { priority: 'HIGH', limit: 10 });
      const urgentLeads = leadRepo.listByOrg(orgId, { priority: 'URGENT', limit: 10 });
      const qualifiedLeads = leadRepo.listByOrg(orgId, { status: 'QUALIFIED', limit: 10 });
      
      const allTop = [...urgentLeads, ...highPriorityLeads, ...qualifiedLeads];
      // Deduplicate
      const uniqueLeads = Array.from(new Map(allTop.map(l => [l.id, l])).values());

      let explanation = '';
      if (uniqueLeads.length === 0) {
        explanation = 'No high-priority or urgent leads are currently registered in your CRM.';
      } else {
        explanation = `Found ${uniqueLeads.length} top priority/qualified customer lead(s) in your CRM database.`;
      }

      auditRepo.create({
        orgId,
        userId: user.id,
        action: 'ORCHESTRATOR_QUERY_LEADS',
        resourceType: 'LEAD',
        details: { query, resultCount: uniqueLeads.length },
        ipAddress,
      });

      return {
        success: true,
        type: 'LEAD_QUERY',
        message: explanation,
        data: uniqueLeads,
        approvalRequired: false,
      };
    }

    // Pattern 3C: Follow-up Draft Preparation (e.g. "Prepare follow-up messages for these leads")
    if (
      lower.includes('draft') || 
      lower.includes('prepare message') || 
      lower.includes('follow-up message') || 
      lower.includes('email draft')
    ) {
      const pendingFollowups = leadRepo.getUpcomingFollowups(orgId, 7);
      const overdueFollowups = leadRepo.getOverdueFollowups(orgId);
      const leadsToDraft = [...overdueFollowups, ...pendingFollowups].slice(0, 3);

      const drafts = [];
      for (const lead of leadsToDraft) {
        const draft = await communicationAgent.draftMessage({
          recipientName: lead.name,
          company: lead.company,
          intent: `Follow up on ${lead.status} stage`,
          contextDescription: lead.notes || 'Previous business discussion',
        }, context);
        drafts.push({ leadId: lead.id, leadName: lead.name, ...draft });
      }

      auditRepo.create({
        orgId,
        userId: user.id,
        action: 'ORCHESTRATOR_GENERATE_DRAFTS',
        resourceType: 'COMMUNICATION',
        details: { query, draftsGenerated: drafts.length },
        ipAddress,
      });

      return {
        success: true,
        type: 'COMMUNICATION_DRAFT',
        message: `Prepared ${drafts.length} follow-up draft(s). These are drafts only and will not be dispatched without your approval.`,
        data: drafts,
        approvalRequired: false,
      };
    }

    // Pattern 3D: Dispatch external communication (Requires Approval Queue)
    if (lower.includes('send email') || lower.includes('send message') || lower.includes('dispatch communication')) {
      const approval = approvalRepo.create({
        orgId,
        actionType: 'SEND_EXTERNAL_COMMUNICATION',
        riskLevel: 'HIGH',
        payload: { command: query },
        reason: 'Automated dispatch of external communication to customers requires human sign-off.',
        requestedBy: user.id,
      });

      auditRepo.create({
        orgId,
        userId: user.id,
        action: 'APPROVAL_REQUESTED',
        resourceType: 'APPROVAL',
        resourceId: approval.id,
        status: 'APPROVAL_REQUIRED',
        details: { actionType: approval.action_type, riskLevel: approval.risk_level },
        ipAddress,
      });

      return {
        success: true,
        type: 'APPROVAL_REQUIRED',
        message: 'Action submitted to Human Approval Queue. High-risk actions will not execute without executive authorization.',
        approval,
        approvalRequired: true,
      };
    }

    // Pattern 3E: Business Intelligence & Operations Analysis (e.g., "Why did my business activity decrease this week?")
    const reportAnalysis = await reportAgent.explainReport({
      reportTitle: 'Operational Status & Activity',
      metrics: {
        leads: leadRepo.getStats(orgId),
        tasks: taskRepo.getStats(orgId),
        recentActivityCount: auditRepo.listByOrg(orgId, { limit: 20 }).length,
      },
      userQuestion: query,
    }, context);

    auditRepo.create({
      orgId,
      userId: user.id,
      action: 'ORCHESTRATOR_BI_QUERY',
      resourceType: 'REPORT',
      details: { query },
      ipAddress,
    });

    return {
      success: true,
      type: 'BUSINESS_ANALYSIS',
      message: reportAnalysis,
      data: {
        leads: leadRepo.getStats(orgId),
        tasks: taskRepo.getStats(orgId),
      },
      approvalRequired: false,
    };
  }
}

export const orchestrator = new MEGADRONEOrchestrator();
