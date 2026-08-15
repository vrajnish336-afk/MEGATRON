import { Router } from 'express';
import { leadRepo } from '../../database/repositories/leadRepo.js';
import { taskRepo } from '../../database/repositories/taskRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/summary', (req, res, next) => {
  try {
    const orgId = req.user.orgId;

    const leadStats = leadRepo.getStats(orgId);
    const taskStats = taskRepo.getStats(orgId);
    const todayTasks = taskRepo.getTodayTasks(orgId);
    const overdueTasks = taskRepo.getOverdueTasks(orgId);
    const upcomingFollowups = leadRepo.getUpcomingFollowups(orgId, 7);
    const overdueFollowups = leadRepo.getOverdueFollowups(orgId);
    const recentActivities = auditRepo.listByOrg(orgId, { limit: 10 });

    // Urgent action items
    const urgentItems = [
      ...overdueTasks.map(t => ({
        type: 'TASK_OVERDUE',
        title: `Overdue Task: ${t.title}`,
        due: t.due_date,
        priority: t.priority,
        linkId: t.id,
      })),
      ...overdueFollowups.map(l => ({
        type: 'FOLLOWUP_OVERDUE',
        title: `Overdue Follow-up: ${l.name} (${l.company || 'Direct'})`,
        due: l.next_followup,
        priority: l.priority,
        linkId: l.id,
      }))
    ];

    res.json({
      success: true,
      data: {
        metrics: {
          totalLeads: leadStats.total,
          qualifiedLeads: leadStats.byStatus.QUALIFIED || 0,
          wonLeads: leadStats.byStatus.WON || 0,
          proposalLeads: leadStats.byStatus.PROPOSAL || 0,
          totalTasks: taskStats.total,
          pendingTasks: (taskStats.byStatus.PENDING || 0) + (taskStats.byStatus.IN_PROGRESS || 0),
          overdueTasks: taskStats.overdue,
          dueTodayTasks: taskStats.dueToday,
        },
        leadStats,
        taskStats,
        todayTasks,
        upcomingFollowups,
        urgentItems,
        recentActivities,
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
