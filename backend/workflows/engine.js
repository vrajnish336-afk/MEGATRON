import { workflowRepo } from '../database/repositories/workflowRepo.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { approvalRepo } from '../database/repositories/approvalRepo.js';
import { auditRepo } from '../database/repositories/auditRepo.js';
import { leadAgent } from '../agents/leadAgent.js';
import { communicationAgent } from '../agents/communicationAgent.js';
import { logger } from '../core/logger.js';

export const workflowEngine = {
  /**
   * Dispatches an event and executes all matching active workflows
   */
  async trigger(triggerType, eventData, orgId) {
    logger.info(`WorkflowEngine: Trigger event [${triggerType}] received`, { orgId });

    const workflows = workflowRepo.listByOrg(orgId, { triggerType, isActive: true });
    if (workflows.length === 0) {
      return { triggered: 0, runs: [] };
    }

    const runs = [];
    for (const workflow of workflows) {
      const run = await this.executeWorkflow(workflow, eventData, orgId);
      runs.push(run);
    }

    return { triggered: workflows.length, runs };
  },

  /**
   * Execute a single workflow instance
   */
  async executeWorkflow(workflow, eventData, orgId) {
    logger.info(`Executing workflow '${workflow.name}' (${workflow.id})`, { orgId });
    const run = workflowRepo.createRun({
      workflowId: workflow.id,
      orgId,
      triggerEvent: workflow.trigger_type,
    });

    const executionSteps = [];

    try {
      // 1. Evaluate Conditions
      const conditionsMet = this.evaluateConditions(workflow.conditions, eventData);
      executionSteps.push({
        step: 'EVALUATE_CONDITIONS',
        conditions: workflow.conditions,
        matched: conditionsMet,
        timestamp: new Date().toISOString(),
      });

      if (!conditionsMet) {
        workflowRepo.updateRun(run.id, orgId, {
          status: 'COMPLETED',
          executionSteps,
        });
        return { runId: run.id, status: 'SKIPPED_CONDITIONS_NOT_MET' };
      }

      // 2. Execute Actions
      for (const action of workflow.actions) {
        const stepResult = await this.executeAction(action, eventData, orgId, run.id);
        executionSteps.push({
          actionType: action.type,
          params: action.params,
          result: stepResult,
          timestamp: new Date().toISOString(),
        });

        if (stepResult.requiresApproval) {
          workflowRepo.updateRun(run.id, orgId, {
            status: 'WAITING_APPROVAL',
            executionSteps,
          });
          return { runId: run.id, status: 'WAITING_APPROVAL', approvalId: stepResult.approvalId };
        }
      }

      workflowRepo.updateRun(run.id, orgId, {
        status: 'COMPLETED',
        executionSteps,
      });

      auditRepo.create({
        orgId,
        action: 'WORKFLOW_EXECUTED',
        resourceType: 'WORKFLOW',
        resourceId: workflow.id,
        details: { runId: run.id, stepsCount: executionSteps.length },
      });

      return { runId: run.id, status: 'COMPLETED', steps: executionSteps };
    } catch (err) {
      logger.error(`Workflow '${workflow.name}' execution failed:`, { error: err.message, stack: err.stack });
      workflowRepo.updateRun(run.id, orgId, {
        status: 'FAILED',
        executionSteps,
        errorMessage: err.message,
      });
      return { runId: run.id, status: 'FAILED', error: err.message };
    }
  },

  /**
   * Evaluates if conditions match event data
   */
  evaluateConditions(conditions, eventData) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(cond => {
      const fieldVal = eventData[cond.field];
      switch (cond.operator) {
        case 'EQUALS':
        case '==':
          return String(fieldVal).toLowerCase() === String(cond.value).toLowerCase();
        case 'NOT_EQUALS':
        case '!=':
          return String(fieldVal).toLowerCase() !== String(cond.value).toLowerCase();
        case 'CONTAINS':
          return String(fieldVal || '').toLowerCase().includes(String(cond.value).toLowerCase());
        case 'IS_NOT_NULL':
          return fieldVal !== null && fieldVal !== undefined && fieldVal !== '';
        default:
          return true;
      }
    });
  },

  /**
   * Executes a single configured action
   */
  async executeAction(action, eventData, orgId, runId) {
    switch (action.type) {
      case 'CLASSIFY_LEAD': {
        const leadId = eventData.id || eventData.leadId;
        if (leadId) {
          const lead = leadRepo.findById(leadId, orgId);
          if (lead) {
            const enrichment = await leadAgent.classifyAndEnrichLead(lead, { orgId });
            leadRepo.update(leadId, orgId, {
              aiClassification: enrichment.classification,
              aiSuggestedAction: enrichment.suggestedAction,
              priority: enrichment.priority || lead.priority,
            });
            return { success: true, enrichment };
          }
        }
        return { success: false, reason: 'Lead not found' };
      }

      case 'CREATE_TASK': {
        const task = taskRepo.create({
          orgId,
          title: action.params?.title || `Follow up with ${eventData.name || 'new lead'}`,
          description: action.params?.description || `Automated follow-up triggered by workflow`,
          priority: action.params?.priority || 'MEDIUM',
          dueDate: action.params?.dueDays 
            ? new Date(Date.now() + action.params.dueDays * 86400000).toISOString().slice(0, 10)
            : new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          leadId: eventData.id || eventData.leadId || null,
          assignedTo: action.params?.assignedTo || eventData.assigned_to || null,
        });
        return { success: true, taskId: task.id, title: task.title };
      }

      case 'GENERATE_SUGGESTED_DRAFT': {
        const leadId = eventData.id || eventData.leadId;
        if (leadId) {
          const draft = await leadAgent.generateFollowupDraft(leadId, { orgId });
          return { success: true, draft };
        }
        return { success: false, reason: 'Lead ID missing' };
      }

      case 'SEND_EXTERNAL_MESSAGE': {
        // High risk action -> Enforces Human Approval Queue
        const approval = approvalRepo.create({
          orgId,
          workflowRunId: runId,
          actionType: 'SEND_EXTERNAL_MESSAGE',
          riskLevel: 'HIGH',
          payload: {
            recipientEmail: eventData.email,
            recipientName: eventData.name,
            template: action.params?.template || 'Welcome Sequence',
          },
          reason: `Workflow requested sending external communication to customer ${eventData.email}`,
          requestedBy: 'WORKFLOW_AUTOMATION',
        });

        return {
          requiresApproval: true,
          approvalId: approval.id,
          message: 'Action suspended pending human manager authorization.',
        };
      }

      default:
        return { success: true, message: `Action [${action.type}] executed.` };
    }
  }
};
