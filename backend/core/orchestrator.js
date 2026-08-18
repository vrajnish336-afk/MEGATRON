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
import { salesManagerAgent } from '../agents/salesManagerAgent.js';
import { businessOperationsAgent } from '../agents/businessOperationsAgent.js';
import { followupAgent } from '../agents/followupAgent.js';
import { biAgent } from '../agents/businessIntelligenceAgent.js';
import { communicationAgent } from '../agents/communicationAgent.js';
import { reportAgent } from '../agents/reportAgent.js';
import { intentRouter } from './intentRouter.js';
import { logger } from './logger.js';
import { ForbiddenError, ValidationError } from './errors.js';
import { hasPermission } from '../permissions/policyEvaluator.js';
import { PERMISSIONS } from '../permissions/permissionsMatrix.js';

export class MEGADRONEOrchestrator {
  /**
   * Process a natural language or structured user request
   * 
   * Orchestrator Flow:
   * User Request -> Authentication / Tenant Context -> Hard Guardrails -> Permission Check -> Intent Router -> Execution -> Approval Queue if needed -> Audit Logging -> Response
   */
  async processRequest({ query, user, orgId, ipAddress = null, dataClassification = DATA_CLASSIFICATIONS.INTERNAL }) {
    logger.info('MEGADRONE Orchestrator processing request', { query, userId: user.id, orgId });

    // Step 1: Guardrail Check (Hard safety bounds & financial operations check)
    guardrails.validateUserIntent(query);

    // Step 2: Permission Check for AI Use
    if (!hasPermission(user.role, PERMISSIONS.AI_USE)) {
      throw new ForbiddenError('Role not authorized for AI Operations');
    }

    const context = { user, orgId, ipAddress };
    const lower = (query || '').toLowerCase().trim();

    // Step 3: Intent Classification via IntentRouter
    const routingDecision = intentRouter.route(query);
    const intent = routingDecision.intent;
    const targetAgentName = routingDecision.agent;

    logger.info('MEGADRONE Intent Router classified intent', {
      query,
      intent,
      targetAgent: targetAgentName,
      orgId,
    });

    // Step 4: High-Risk Direct Dispatch Command Detection (Requires Human Approval Queue)
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
        details: { actionType: approval.action_type, riskLevel: approval.risk_level, intent },
        ipAddress,
      });

      return {
        success: true,
        type: 'APPROVAL_REQUIRED',
        intent,
        message: 'Action submitted to Human Approval Queue. High-risk actions will not execute without executive authorization.',
        approval,
        approvalRequired: true,
      };
    }

    // Step 5: Task Management Commands (Tasks query, creation, overdue)
    if (
      (lower.includes('task') || lower.includes('due') || lower.includes('remind') || lower.includes('todo') || lower.includes('कल') || lower.includes('काम')) &&
      intent === 'GENERAL_QUERY'
    ) {
      const taskResult = await taskAgent.parseAndExecuteCommand(query, context);

      auditRepo.create({
        orgId,
        userId: user.id,
        action: `ORCHESTRATOR_${taskResult.action}`,
        resourceType: 'TASK',
        details: { query, action: taskResult.action, intent },
        ipAddress,
      });

      return {
        success: true,
        type: 'TASK_OPERATION',
        intent: 'TASK_OPERATION',
        agent: 'TaskAgent',
        message: taskResult.message,
        data: taskResult.data,
        action: taskResult.action,
        approvalRequired: false,
      };
    }

    // Step 6: Route Execution by Intent Category

    // 6A. FOLLOWUP_REQUEST -> Governed Follow-up Generation & Human Approval Queue
    if (intent === 'FOLLOWUP_REQUEST') {
      const allOrgLeads = leadRepo.listByOrg(orgId, { limit: 100 });
      let matchedLead = null;

      for (const l of allOrgLeads) {
        if (l.name && lower.includes(l.name.toLowerCase())) {
          matchedLead = l;
          break;
        }
      }

      if (!matchedLead) {
        for (const l of allOrgLeads) {
          const firstName = l.name?.split(' ')[0];
          if (firstName && firstName.length > 2 && lower.includes(firstName.toLowerCase())) {
            matchedLead = l;
            break;
          }
        }
      }

      const draftInput = {
        lead_id: matchedLead ? matchedLead.id : null,
        customer_name: matchedLead ? matchedLead.name : 'Valued Customer',
        company: matchedLead ? matchedLead.company : '',
        requirement: matchedLead ? (matchedLead.property_type || (matchedLead.bedrooms ? `${matchedLead.bedrooms}BHK` : '') || 'Property requirement') : 'Property requirement',
        lead_stage: matchedLead ? matchedLead.status : 'QUALIFIED',
        last_activity: matchedLead ? (matchedLead.updated_at || matchedLead.created_at) : new Date().toISOString(),
        reason_for_followup: query,
      };

      const draftResult = await followupAgent.generateDraft(draftInput, context);
      const recipient = matchedLead ? (matchedLead.phone || matchedLead.email || matchedLead.name) : draftInput.customer_name;
      const channel = lower.includes('whatsapp') ? 'WhatsApp' : (lower.includes('email') ? 'Email' : 'WhatsApp');

      const approval = approvalRepo.create({
        orgId,
        actionType: 'COMMUNICATION_DRAFT',
        riskLevel: 'HIGH',
        payload: {
          lead_id: matchedLead ? matchedLead.id : null,
          customer_name: draftInput.customer_name,
          company: draftInput.company,
          requirement: draftInput.requirement,
          lead_stage: draftInput.lead_stage,
          draft_message: draftResult.draft_message,
          recipient,
          channel,
          status: 'PENDING_APPROVAL',
          safety_notice: 'Draft generated. Human approval required before sending.',
        },
        reason: `Follow-up draft for ${draftInput.customer_name} generated via AI assistant. Requires human review before sending.`,
        requestedBy: user.id,
      });

      auditRepo.create({
        orgId,
        userId: user.id,
        action: 'APPROVAL_REQUESTED',
        resourceType: 'APPROVAL',
        resourceId: approval.id,
        status: 'APPROVAL_REQUIRED',
        details: { actionType: approval.action_type, riskLevel: approval.risk_level, leadId: matchedLead?.id, query, intent },
        ipAddress,
      });

      return {
        success: true,
        type: 'FOLLOWUP_REQUEST',
        intent: 'FOLLOWUP_REQUEST',
        agent: 'LeadAgent',
        message: `Follow-up draft generated for ${draftInput.customer_name} and queued for human approval (PENDING_APPROVAL). Automatic dispatch is blocked.`,
        data: {
          draft: draftResult.draft_message,
          lead: matchedLead ? { id: matchedLead.id, name: matchedLead.name, status: matchedLead.status } : null,
          approvalId: approval.id,
          status: 'PENDING_APPROVAL',
          language: draftResult.language,
          tone: draftResult.tone,
        },
        approval,
        approvalRequired: true,
        dispatched: false,
      };
    }

    // 6B. SALES_QUERY -> SalesManagerAgent
    if (intent === 'SALES_QUERY') {
      const prioritiesData = await salesManagerAgent.getPriorities(orgId);
      const priorities = prioritiesData.priorities || [];

      let explanation = '';
      if (priorities.length === 0) {
        explanation = 'Data unavailable. No active customer leads found to prioritize.';
      } else {
        const top = priorities[0];
        explanation = `Top priority customer to call today is ${top.customer_name} (Priority: ${top.priority}, Score: ${top.score}). Recommended Next Action: ${top.next_action}. Reasons: ${top.reasons.join(', ')}.`;
      }

      auditRepo.create({
        orgId,
        userId: user.id,
        action: 'ORCHESTRATOR_SALES_QUERY',
        resourceType: 'SALES',
        details: { query, totalPriorities: priorities.length, intent },
        ipAddress,
      });

      return {
        success: true,
        type: 'SALES_QUERY',
        intent: 'SALES_QUERY',
        agent: 'SalesManagerAgent',
        message: explanation,
        data: prioritiesData,
        approvalRequired: false,
      };
    }

    // 6C. OPERATIONS_QUERY -> BusinessOperationsAgent
    if (intent === 'OPERATIONS_QUERY') {
      const health = businessOperationsAgent.calculateOperationalHealth(orgId);
      const radar = businessOperationsAgent.detectOpportunitiesAndRisks(orgId);

      let message = '';
      if (lower.includes('risk') || lower.includes('radar')) {
        message = `Opportunity & Risk Radar: Found ${radar.risks?.length || 0} active operational risk(s) and ${radar.opportunities?.length || 0} opportunity item(s). Health Score: ${health.score}/${health.maxScore} (${health.status}).`;
      } else {
        message = `Agency Operational Health Score is ${health.score}/${health.maxScore} (${health.status}). ${health.summary}`;
      }

      auditRepo.create({
        orgId,
        userId: user.id,
        action: 'ORCHESTRATOR_OPERATIONS_QUERY',
        resourceType: 'OPERATIONS',
        details: { query, healthScore: health.score, totalRisks: radar.risks?.length || 0, intent },
        ipAddress,
      });

      return {
        success: true,
        type: 'OPERATIONS_QUERY',
        intent: 'OPERATIONS_QUERY',
        agent: 'BusinessOperationsAgent',
        message,
        data: {
          health,
          radar,
        },
        approvalRequired: false,
      };
    }

    // 6D. LEAD_QUERY -> LeadAgent
    if (intent === 'LEAD_QUERY') {
      const allOrgLeads = leadRepo.listByOrg(orgId, { limit: 100 });
      let matchedLead = null;

      for (const l of allOrgLeads) {
        if (l.name && lower.includes(l.name.toLowerCase())) {
          matchedLead = l;
          break;
        }
      }

      if (!matchedLead) {
        for (const l of allOrgLeads) {
          const firstName = l.name?.split(' ')[0];
          if (firstName && firstName.length > 2 && lower.includes(firstName.toLowerCase())) {
            matchedLead = l;
            break;
          }
        }
      }

      let message = '';
      let data = null;

      if (matchedLead) {
        message = `Lead details for ${matchedLead.name}: Status is ${matchedLead.status}, Priority is ${matchedLead.priority || 'NORMAL'}${matchedLead.property_type ? `, Property: ${matchedLead.property_type}` : ''}${matchedLead.budget_max ? `, Budget: ₹${matchedLead.budget_max}` : ''}${matchedLead.preferred_location ? `, Location: ${matchedLead.preferred_location}` : ''}.`;
        data = matchedLead;
      } else {
        const highPriorityLeads = leadRepo.listByOrg(orgId, { priority: 'HIGH', limit: 10 });
        const urgentLeads = leadRepo.listByOrg(orgId, { priority: 'URGENT', limit: 10 });
        const qualifiedLeads = leadRepo.listByOrg(orgId, { status: 'QUALIFIED', limit: 10 });
        const allTop = [...urgentLeads, ...highPriorityLeads, ...qualifiedLeads];
        const uniqueLeads = Array.from(new Map(allTop.map(l => [l.id, l])).values());

        if (uniqueLeads.length === 0) {
          message = 'No high-priority or urgent leads are currently registered in your CRM.';
        } else {
          message = `Found ${uniqueLeads.length} top priority/qualified customer lead(s) in your CRM database.`;
        }
        data = uniqueLeads;
      }

      auditRepo.create({
        orgId,
        userId: user.id,
        action: 'ORCHESTRATOR_QUERY_LEADS',
        resourceType: 'LEAD',
        details: { query, matchedLeadId: matchedLead?.id, resultCount: Array.isArray(data) ? data.length : 1, intent },
        ipAddress,
      });

      return {
        success: true,
        type: 'LEAD_QUERY',
        intent: 'LEAD_QUERY',
        agent: 'LeadAgent',
        message,
        data,
        approvalRequired: false,
      };
    }

    // 6E. GENERAL_QUERY -> LocalAI / General response path
    let responseText = 'Hello! I am MEGADRONE Business AI. How can I help you manage your leads, sales priorities, follow-ups, or operations today?';

    const route = await aiRouter.route({
      taskType: TASK_TYPES.COMMAND_PARSING,
      dataClassification,
    });

    if (route.provider) {
      try {
        const completion = await route.provider.generateCompletion({
          prompt: query,
          systemPrompt: 'You are the MEGADRONE Business OS executive assistant. Provide helpful, concise, professional answers to the user inquiry.',
        });
        if (completion && completion.content) {
          responseText = completion.content;
        }
      } catch (err) {
        logger.warn('LocalAI completion fallback to friendly assistant greeting', { error: err.message });
      }
    }

    auditRepo.create({
      orgId,
      userId: user.id,
      action: 'ORCHESTRATOR_GENERAL_QUERY',
      resourceType: 'ASSISTANT',
      details: { query, intent },
      ipAddress,
    });

    return {
      success: true,
      type: 'GENERAL_QUERY',
      intent: 'GENERAL_QUERY',
      agent: 'LocalAI',
      message: responseText,
      data: null,
      approvalRequired: false,
    };
  }
}

export const orchestrator = new MEGADRONEOrchestrator();
