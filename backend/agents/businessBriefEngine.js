import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { auditRepo } from '../database/repositories/auditRepo.js';
import { biAgent } from './businessIntelligenceAgent.js';

export const businessBriefEngine = {
  async generateDailyBrief(orgId, context = {}) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // 1. Live database queries
    const leadStats = leadRepo.getStats(orgId);
    const taskStats = taskRepo.getStats(orgId);
    const todayTasks = taskRepo.getTodayTasks(orgId);
    const overdueTasks = taskRepo.getOverdueTasks(orgId);
    const upcomingFollowups = leadRepo.getUpcomingFollowups(orgId, 3);
    const overdueFollowups = leadRepo.getOverdueFollowups(orgId);
    const recentActivities = auditRepo.listByOrg(orgId, { limit: 15 });

    // Filter recent new leads (from yesterday/today)
    const recentLeads = leadRepo.listByOrg(orgId, { limit: 10 });
    const newLeads = recentLeads.filter(l => l.status === 'NEW' || l.created_at.slice(0, 10) >= yesterday);
    const highPriorityLeads = recentLeads.filter(l => (l.priority === 'HIGH' || l.priority === 'URGENT') && !['WON', 'LOST'].includes(l.status));

    // High risk / urgent alerts
    const alerts = [];
    if (overdueTasks.length > 0) {
      alerts.push({
        severity: 'HIGH',
        message: `${overdueTasks.length} task(s) are overdue and require immediate attention.`
      });
    }
    if (overdueFollowups.length > 0) {
      alerts.push({
        severity: 'HIGH',
        message: `${overdueFollowups.length} client follow-up(s) are past their scheduled date.`
      });
    }

    const briefData = {
      date: today,
      metrics: {
        totalLeads: leadStats.total,
        newLeadsCount: newLeads.length,
        highPriorityLeadsCount: highPriorityLeads.length,
        pendingTasksCount: (taskStats.byStatus?.PENDING || 0) + (taskStats.byStatus?.IN_PROGRESS || 0),
        dueTodayTasksCount: todayTasks.length,
        overdueTasksCount: overdueTasks.length,
        upcomingFollowupsCount: upcomingFollowups.length,
        overdueFollowupsCount: overdueFollowups.length,
      },
      sections: {
        newLeads: newLeads.length > 0 ? newLeads : 'Data unavailable.',
        highPriorityLeads: highPriorityLeads.length > 0 ? highPriorityLeads : 'Data unavailable.',
        todayTasks: todayTasks.length > 0 ? todayTasks : 'Data unavailable.',
        overdueTasks: overdueTasks.length > 0 ? overdueTasks : 'Data unavailable.',
        upcomingFollowups: upcomingFollowups.length > 0 ? upcomingFollowups : 'Data unavailable.',
        recentActivities: recentActivities.length > 0 ? recentActivities : 'Data unavailable.',
      },
      alerts,
    };

    // AI Narrative Brief Generation (grounded strictly in data)
    const aiInsight = await biAgent.analyzeBusinessState({ orgId, ...context });

    return {
      success: true,
      data: {
        ...briefData,
        aiExecutiveSummary: aiInsight.summary || 'Operational briefing generated from current live system status.',
        healthScore: aiInsight.healthScore || 85,
        aiRecommendations: aiInsight.recommendedPriorities || [
          'Follow up with qualified prospects',
          'Resolve overdue operational tasks',
        ],
      }
    };
  }
};
