import { Router } from 'express';
import { z } from 'zod';
import { workflowRepo } from '../../database/repositories/workflowRepo.js';
import { workflowEngine } from '../../workflows/engine.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { NotFoundError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const CreateWorkflowSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional().nullable(),
  triggerType: z.enum(['LEAD_CREATED', 'TASK_OVERDUE', 'STATUS_CHANGED', 'MANUAL']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any(),
  })).default([]),
  actions: z.array(z.object({
    type: z.string(),
    params: z.record(z.any()).optional().default({}),
  })).min(1),
  isActive: z.boolean().default(true),
});

const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

// List Workflows
router.get('/', requirePermission(PERMISSIONS.WORKFLOW_READ), (req, res, next) => {
  try {
    const workflows = workflowRepo.listByOrg(req.user.orgId);
    res.json({ success: true, data: workflows });
  } catch (err) {
    next(err);
  }
});

// List Workflow Runs
router.get('/runs', requirePermission(PERMISSIONS.WORKFLOW_READ), (req, res, next) => {
  try {
    const runs = workflowRepo.listRunsByOrg(req.user.orgId, { limit: 50 });
    res.json({ success: true, data: runs });
  } catch (err) {
    next(err);
  }
});

// Get Single Workflow
router.get('/:id', requirePermission(PERMISSIONS.WORKFLOW_READ), (req, res, next) => {
  try {
    const workflow = workflowRepo.findById(req.params.id, req.user.orgId);
    if (!workflow) throw new NotFoundError('Workflow');
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// Create Workflow
router.post('/', requirePermission(PERMISSIONS.WORKFLOW_CREATE), (req, res, next) => {
  try {
    const data = CreateWorkflowSchema.parse(req.body);
    const workflow = workflowRepo.create({
      orgId: req.user.orgId,
      createdBy: req.user.id,
      ...data,
    });

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'WORKFLOW_CREATED',
      resourceType: 'WORKFLOW',
      resourceId: workflow.id,
      details: { name: workflow.name, triggerType: workflow.trigger_type },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// Update Workflow
router.patch('/:id', requirePermission(PERMISSIONS.WORKFLOW_UPDATE), (req, res, next) => {
  try {
    const data = UpdateWorkflowSchema.parse(req.body);
    const updated = workflowRepo.update(req.params.id, req.user.orgId, data);
    if (!updated) throw new NotFoundError('Workflow');

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'WORKFLOW_UPDATED',
      resourceType: 'WORKFLOW',
      resourceId: updated.id,
      details: data,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Trigger Workflow Manually
router.post('/:id/trigger', requirePermission(PERMISSIONS.WORKFLOW_EXECUTE), async (req, res, next) => {
  try {
    const workflow = workflowRepo.findById(req.params.id, req.user.orgId);
    if (!workflow) throw new NotFoundError('Workflow');

    const result = await workflowEngine.executeWorkflow(workflow, req.body || {}, req.user.orgId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Delete Workflow
router.delete('/:id', requirePermission(PERMISSIONS.WORKFLOW_DELETE), (req, res, next) => {
  try {
    const workflow = workflowRepo.findById(req.params.id, req.user.orgId);
    if (!workflow) throw new NotFoundError('Workflow');

    workflowRepo.delete(req.params.id, req.user.orgId);

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'WORKFLOW_DELETED',
      resourceType: 'WORKFLOW',
      resourceId: req.params.id,
      details: { name: workflow.name },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Workflow deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
