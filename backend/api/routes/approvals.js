import { Router } from 'express';
import { z } from 'zod';
import { approvalRepo } from '../../database/repositories/approvalRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { workflowRepo } from '../../database/repositories/workflowRepo.js';
import { toolRegistry } from '../../tools/toolRegistry.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { NotFoundError, BadRequestError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const RejectSchema = z.object({
  reason: z.string().min(2).max(500),
});

// List Approvals
router.get('/', requirePermission(PERMISSIONS.APPROVAL_READ), (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const approvals = approvalRepo.listByOrg(req.user.orgId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: approvals });
  } catch (err) {
    next(err);
  }
});

// Approve Pending Action
router.post('/:id/approve', requirePermission(PERMISSIONS.APPROVAL_ACTION), async (req, res, next) => {
  try {
    const approval = approvalRepo.findById(req.params.id, req.user.orgId);
    if (!approval) throw new NotFoundError('Approval request');

    if (approval.status !== 'PENDING') {
      throw new BadRequestError(`Approval is already resolved as '${approval.status}'`);
    }

    // Resolve in DB
    const resolved = approvalRepo.resolve(req.params.id, req.user.orgId, {
      status: 'APPROVED',
      approvedBy: req.user.id,
    });

    // Execute the approved underlying action if tool mapped
    let executionResult = { executed: true, message: 'Action approved and executed.' };
    if (approval.action_type === 'SEND_EXTERNAL_COMMUNICATION' || approval.action_type === 'SEND_EXTERNAL_MESSAGE') {
      executionResult = await toolRegistry.execute('send_external_communication', approval.payload, {
        orgId: req.user.orgId,
        user: req.user,
      });
    }

    // Resume workflow run if attached
    if (approval.workflow_run_id) {
      workflowRepo.updateRun(approval.workflow_run_id, req.user.orgId, {
        status: 'COMPLETED',
      });
    }

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'APPROVAL_GRANTED',
      resourceType: 'APPROVAL',
      resourceId: approval.id,
      details: {
        actionType: approval.action_type,
        approvedBy: req.user.name,
        result: executionResult,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Action approved and executed successfully.',
      data: {
        approval: resolved,
        executionResult,
      }
    });
  } catch (err) {
    next(err);
  }
});

// Reject Pending Action
router.post('/:id/reject', requirePermission(PERMISSIONS.APPROVAL_ACTION), (req, res, next) => {
  try {
    const data = RejectSchema.parse(req.body);
    const approval = approvalRepo.findById(req.params.id, req.user.orgId);
    if (!approval) throw new NotFoundError('Approval request');

    if (approval.status !== 'PENDING') {
      throw new BadRequestError(`Approval is already resolved as '${approval.status}'`);
    }

    const resolved = approvalRepo.resolve(req.params.id, req.user.orgId, {
      status: 'REJECTED',
      approvedBy: req.user.id,
      rejectionReason: data.reason,
    });

    // Fail workflow run if attached
    if (approval.workflow_run_id) {
      workflowRepo.updateRun(approval.workflow_run_id, req.user.orgId, {
        status: 'FAILED',
        errorMessage: `Rejected by human supervisor: ${data.reason}`,
      });
    }

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'APPROVAL_REJECTED',
      resourceType: 'APPROVAL',
      resourceId: approval.id,
      details: {
        actionType: approval.action_type,
        rejectedBy: req.user.name,
        reason: data.reason,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Action rejected successfully.',
      data: resolved,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
