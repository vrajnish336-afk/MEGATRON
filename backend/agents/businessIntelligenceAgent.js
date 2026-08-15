import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';

export class BusinessIntelligenceAgent extends BaseAgent {
  constructor() {
    super('BusinessIntelligenceAgent', 'Analyzes operational trends, pipeline health, and bottleneck detection', TASK_TYPES.BUSINESS_ANALYSIS);
  }

  async analyzeBusinessState(context = {}) {
    const leadStats = leadRepo.getStats(context.orgId);
    const taskStats = taskRepo.getStats(context.orgId);
    const overdueFollowups = leadRepo.getOverdueFollowups(context.orgId);
    const overdueTasks = taskRepo.getOverdueTasks(context.orgId);

    const dataSummary = {
      leads: leadStats,
      tasks: taskStats,
      overdueFollowupCount: overdueFollowups.length,
      overdueTaskCount: overdueTasks.length,
    };

    const prompt = `Perform a high-level executive business operations analysis based on this live verified data:
${JSON.stringify(dataSummary, null, 2)}

Provide a concise analysis explaining:
1. Pipeline health and lead velocity.
2. Operational bottlenecks (e.g. overdue tasks or follow-ups).
3. Strategic recommendations for today.

Return JSON:
{
  "summary": "string",
  "healthScore": number (1-100),
  "criticalAlerts": ["string"],
  "recommendedPriorities": ["string"]
}`;

    const result = await this.runStructured({
      prompt,
      systemPrompt: 'You are an executive Chief of Staff / Business Intelligence AI for MEGADRONE. Base all commentary strictly on provided numbers. Never invent statistics.',
      taskType: TASK_TYPES.BUSINESS_ANALYSIS,
      context,
    });

    if (result.success && result.data) {
      return { ...result.data, rawMetrics: dataSummary };
    }

    // Deterministic fallback
    const totalLeads = leadStats.total;
    const wonCount = leadStats.byStatus?.WON || 0;
    const conversion = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;
    const alerts = [];
    if (overdueTasks.length > 0) alerts.push(`${overdueTasks.length} task(s) are overdue.`);
    if (overdueFollowups.length > 0) alerts.push(`${overdueFollowups.length} customer follow-up(s) are past due date.`);

    return {
      summary: `Business operations tracking ${totalLeads} total leads with ${conversion}% conversion rate. ${taskStats.pendingTasks || 0} active tasks in progress.`,
      healthScore: Math.max(20, 100 - (overdueTasks.length * 10) - (overdueFollowups.length * 5)),
      criticalAlerts: alerts.length > 0 ? alerts : ['No urgent operational bottlenecks detected.'],
      recommendedPriorities: [
        'Review and action overdue follow-ups',
        'Prioritize high-value proposals currently in negotiation',
      ],
      rawMetrics: dataSummary,
    };
  }
}

export const biAgent = new BusinessIntelligenceAgent();
