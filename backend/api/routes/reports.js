import { Router } from 'express';
import { z } from 'zod';
import { reportRepo } from '../../database/repositories/reportRepo.js';
import { leadRepo } from '../../database/repositories/leadRepo.js';
import { taskRepo } from '../../database/repositories/taskRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { reportAgent } from '../../agents/reportAgent.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';

const router = Router();
router.use(authenticate);

const ExplainQuerySchema = z.object({
  question: z.string().min(2).max(500),
  reportType: z.string().default('OPERATIONS_SUMMARY'),
});

// List saved reports
router.get('/', requirePermission(PERMISSIONS.REPORT_READ), (req, res, next) => {
  try {
    const reports = reportRepo.listByOrg(req.user.orgId);
    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
});

// Real-time Lead Analytics Report
router.get('/leads', requirePermission(PERMISSIONS.REPORT_READ), (req, res, next) => {
  try {
    const stats = leadRepo.getStats(req.user.orgId);
    const leads = leadRepo.listByOrg(req.user.orgId, { limit: 100 });
    
    // Grouping by source
    const bySource = {};
    for (const l of leads) {
      const src = l.source || 'DIRECT';
      bySource[src] = (bySource[src] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        title: 'Lead Pipeline & Conversion Report',
        totalLeads: stats.total,
        byStatus: stats.byStatus,
        byPriority: stats.byPriority,
        bySource,
        generatedAt: new Date().toISOString(),
      }
    });
  } catch (err) {
    next(err);
  }
});

// Real-time Task Velocity Report
router.get('/tasks', requirePermission(PERMISSIONS.REPORT_READ), (req, res, next) => {
  try {
    const stats = taskRepo.getStats(req.user.orgId);
    const overdue = taskRepo.getOverdueTasks(req.user.orgId);
    const today = taskRepo.getTodayTasks(req.user.orgId);

    res.json({
      success: true,
      data: {
        title: 'Task Execution & Velocity Report',
        totalTasks: stats.total,
        byStatus: stats.byStatus,
        byPriority: stats.byPriority,
        overdueCount: stats.overdue,
        dueTodayCount: stats.dueToday,
        overdueList: overdue,
        todayList: today,
        generatedAt: new Date().toISOString(),
      }
    });
  } catch (err) {
    next(err);
  }
});

// Ask AI to Explain Real Business Reports (Natural Language Q&A)
router.post('/explain', requirePermission(PERMISSIONS.REPORT_READ), async (req, res, next) => {
  try {
    const data = ExplainQuerySchema.parse(req.body);
    const leadStats = leadRepo.getStats(req.user.orgId);
    const taskStats = taskRepo.getStats(req.user.orgId);
    const recentActivity = auditRepo.listByOrg(req.user.orgId, { limit: 20 });

    const liveData = {
      leads: leadStats,
      tasks: taskStats,
      recentActivityEvents: recentActivity.length,
    };

    const explanation = await reportAgent.explainReport({
      reportTitle: 'Weekly Business Operations',
      metrics: liveData,
      userQuestion: data.question,
    }, {
      orgId: req.user.orgId,
      user: req.user,
    });

    res.json({
      success: true,
      data: {
        question: data.question,
        explanation,
        verifiedData: liveData,
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
