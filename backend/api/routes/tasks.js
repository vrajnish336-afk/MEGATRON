import { Router } from 'express';
import { z } from 'zod';
import { taskRepo, TASK_STATUSES, TASK_PRIORITIES } from '../../database/repositories/taskRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { NotFoundError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  status: z.enum(TASK_STATUSES).default('PENDING'),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  reminders: z.array(z.string()).optional().default([]),
});

const UpdateTaskSchema = CreateTaskSchema.partial();

// List Tasks
router.get('/', requirePermission(PERMISSIONS.TASK_READ), (req, res, next) => {
  try {
    const { status, priority, assignedTo, leadId, search, limit, offset } = req.query;
    const tasks = taskRepo.listByOrg(req.user.orgId, {
      status,
      priority,
      assignedTo,
      leadId,
      search,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
});

// Task Stats
router.get('/stats', requirePermission(PERMISSIONS.TASK_READ), (req, res, next) => {
  try {
    const stats = taskRepo.getStats(req.user.orgId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// Today's & Overdue Tasks
router.get('/schedule', requirePermission(PERMISSIONS.TASK_READ), (req, res, next) => {
  try {
    const today = taskRepo.getTodayTasks(req.user.orgId);
    const overdue = taskRepo.getOverdueTasks(req.user.orgId);
    res.json({ success: true, data: { today, overdue } });
  } catch (err) {
    next(err);
  }
});

// Get Single Task
router.get('/:id', requirePermission(PERMISSIONS.TASK_READ), (req, res, next) => {
  try {
    const task = taskRepo.findById(req.params.id, req.user.orgId);
    if (!task) throw new NotFoundError('Task');
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// Create Task
router.post('/', requirePermission(PERMISSIONS.TASK_CREATE), (req, res, next) => {
  try {
    const data = CreateTaskSchema.parse(req.body);
    const task = taskRepo.create({
      orgId: req.user.orgId,
      ...data,
    });

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'TASK_CREATED',
      resourceType: 'TASK',
      resourceId: task.id,
      details: { title: task.title, priority: task.priority, dueDate: task.due_date },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// Update Task
router.patch('/:id', requirePermission(PERMISSIONS.TASK_UPDATE), (req, res, next) => {
  try {
    const data = UpdateTaskSchema.parse(req.body);
    const updated = taskRepo.update(req.params.id, req.user.orgId, data);
    if (!updated) throw new NotFoundError('Task');

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'TASK_UPDATED',
      resourceType: 'TASK',
      resourceId: updated.id,
      details: data,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Delete Task
router.delete('/:id', requirePermission(PERMISSIONS.TASK_DELETE), (req, res, next) => {
  try {
    const task = taskRepo.findById(req.params.id, req.user.orgId);
    if (!task) throw new NotFoundError('Task');

    taskRepo.delete(req.params.id, req.user.orgId);

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'TASK_DELETED',
      resourceType: 'TASK',
      resourceId: req.params.id,
      details: { title: task.title },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
