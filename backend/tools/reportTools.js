import { toolRegistry } from './toolRegistry.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { auditRepo } from '../database/repositories/auditRepo.js';
import { PERMISSIONS } from '../permissions/permissionsMatrix.js';

export function registerReportTools() {
  toolRegistry.register('get_business_metrics', {
    description: 'Fetch aggregated real business metrics across leads, tasks, and follow-ups',
    parameters: { type: 'object', properties: {} },
    requiredPermission: PERMISSIONS.REPORT_READ,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const leadStats = leadRepo.getStats(context.orgId);
      const taskStats = taskRepo.getStats(context.orgId);
      const overdueFollowups = leadRepo.getOverdueFollowups(context.orgId);

      return {
        leads: leadStats,
        tasks: taskStats,
        overdueFollowupsCount: overdueFollowups.length,
        timestamp: new Date().toISOString(),
      };
    }
  });

  toolRegistry.register('get_recent_audit_activity', {
    description: 'Fetch recent business operational activities and audit events',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10 },
      },
    },
    requiredPermission: PERMISSIONS.AUDIT_READ,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const logs = auditRepo.listByOrg(context.orgId, { limit: params.limit || 10 });
      return { count: logs.length, activities: logs };
    }
  });
}
