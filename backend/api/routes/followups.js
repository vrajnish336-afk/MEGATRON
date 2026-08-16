import { Router } from 'express';
import { z } from 'zod';
import { followupAgent } from '../../agents/followupAgent.js';
import { leadRepo } from '../../database/repositories/leadRepo.js';
import { approvalRepo } from '../../database/repositories/approvalRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { toolRegistry } from '../../tools/toolRegistry.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { NotFoundError, BadRequestError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const GenerateDraftSchema = z.object({
  lead_id: z.string().optional(),
  leadId: z.string().optional(),
  reason: z.string().min(1).max(500).optional(),
  reason_for_followup: z.string().optional(),
  reasonForFollowup: z.string().optional(),
  customer_name: z.string().optional(),
  customerName: z.string().optional(),
  company: z.string().optional(),
  requirement: z.string().optional(),
  lead_stage: z.string().optional(),
  last_activity: z.string().optional(),
  language: z.string().optional(),
  tone: z.string().optional(),
});

const EditDraftSchema = z.object({
  message: z.string().min(5).max(4000),
  subject: z.string().optional(),
});

const RejectDraftSchema = z.object({
  reason: z.string().min(2).max(500),
});

/**
 * POST /api/followups/generate
 * Generates an AI follow-up message draft and registers it in the Human Approval Queue.
 */
router.post('/generate', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const data = GenerateDraftSchema.parse(req.body);
    const leadId = data.lead_id || data.leadId || null;
    const reason = data.reason || data.reason_for_followup || data.reasonForFollowup || 'General follow-up';

    let lead = null;
    if (leadId) {
      lead = leadRepo.findById(leadId, req.user.orgId);
      if (!lead) {
        throw new NotFoundError(`Lead with ID '${leadId}'`);
      }
    }

    // 1. Generate follow-up draft using FollowupAgent
    const draftInput = {
      lead_id: lead ? lead.id : leadId,
      customer_name: data.customer_name || data.customerName || (lead ? lead.name : 'Valued Customer'),
      company: data.company || (lead ? lead.company : ''),
      requirement: data.requirement || (lead ? (lead.property_type || (lead.bedrooms ? `${lead.bedrooms}BHK` : '') || lead.company) : ''),
      lead_stage: data.lead_stage || (lead ? lead.status : 'QUALIFIED'),
      last_activity: data.last_activity || (lead ? (lead.updated_at || lead.created_at) : new Date().toISOString()),
      reason_for_followup: reason,
      language: data.language,
      tone: data.tone || 'professional',
    };

    const draftResult = await followupAgent.generateDraft(draftInput, {
      orgId: req.user.orgId,
      user: req.user,
    });

    const draftMessage = draftResult.draft_message;
    const recipient = lead ? (lead.phone || lead.email || lead.name) : (draftInput.customer_name || 'Customer');

    // 2. Insert into Human Approval Queue (type: COMMUNICATION_DRAFT)
    const approval = approvalRepo.create({
      orgId: req.user.orgId,
      actionType: 'COMMUNICATION_DRAFT',
      riskLevel: 'HIGH',
      payload: {
        lead_id: lead ? lead.id : leadId,
        customer_name: draftInput.customer_name,
        company: draftInput.company,
        requirement: draftInput.requirement,
        lead_stage: draftInput.lead_stage,
        reason_for_followup: reason,
        draft_message: draftMessage,
        recipient,
        language: draftResult.language,
        tone: draftResult.tone,
        channel: 'WhatsApp / Direct Message',
        status: 'PENDING_APPROVAL',
        safety_notice: 'Draft generated. Human approval required before sending.',
      },
      reason: `Follow-up draft for ${draftInput.customer_name} (${reason}). Requires human review before sending.`,
      requestedBy: req.user.name || 'AI_FOLLOWUP_AGENT',
    });

    // 3. Log to audit trail
    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'FOLLOWUP_DRAFT_GENERATED',
      resourceType: 'APPROVAL',
      resourceId: approval.id,
      aiProvider: draftResult.provider || 'ollama',
      details: {
        leadId: lead ? lead.id : leadId,
        customerName: draftInput.customer_name,
        reason,
        language: draftResult.language,
        approvalId: approval.id,
      },
      ipAddress: req.ip,
      status: 'APPROVAL_REQUIRED',
    });

    // 4. Return strictly matching response schema
    res.status(201).json({
      success: true,
      draft_id: approval.id,
      message: draftMessage,
      status: 'PENDING_APPROVAL',
      draft: {
        id: approval.id,
        draft_message: draftMessage,
        language: draftResult.language,
        tone: draftResult.tone,
        status: 'PENDING_APPROVAL',
        customer_name: draftInput.customer_name,
        reason,
        lead_id: lead ? lead.id : leadId,
      },
      notice: 'Draft generated. Human approval required before sending.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/followups
 * Lists all generated follow-up drafts in the approval queue.
 */
router.get('/', requirePermission(PERMISSIONS.APPROVAL_READ), (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const approvals = approvalRepo.listByOrg(req.user.orgId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    const followups = approvals
      .filter(a => a.action_type === 'COMMUNICATION_DRAFT' || a.action_type === 'SEND_EXTERNAL_COMMUNICATION')
      .map(a => ({
        id: a.id,
        draft_id: a.id,
        status: a.status === 'PENDING' ? 'PENDING_APPROVAL' : a.status,
        raw_status: a.status,
        risk_level: a.risk_level,
        action_type: a.action_type,
        reason: a.reason,
        requested_by: a.requested_by,
        created_at: a.created_at,
        resolved_at: a.resolved_at,
        approved_by_name: a.approved_by_name,
        rejection_reason: a.rejection_reason,
        payload: a.payload,
        message: a.payload.draft_message || a.payload.message || a.payload.body || '',
        customer_name: a.payload.customer_name || a.payload.recipient || a.payload.leadName || '',
        lead_id: a.payload.lead_id || a.payload.leadId || null,
        language: a.payload.language || 'English',
        tone: a.payload.tone || 'professional',
      }));

    res.json({ success: true, data: followups });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/followups/:id
 * Retrieve details for a specific follow-up draft.
 */
router.get('/:id', requirePermission(PERMISSIONS.APPROVAL_READ), (req, res, next) => {
  try {
    const approval = approvalRepo.findById(req.params.id, req.user.orgId);
    if (!approval) throw new NotFoundError('Follow-up draft');

    res.json({
      success: true,
      data: {
        id: approval.id,
        draft_id: approval.id,
        status: approval.status === 'PENDING' ? 'PENDING_APPROVAL' : approval.status,
        raw_status: approval.status,
        message: approval.payload.draft_message || approval.payload.message || approval.payload.body || '',
        customer_name: approval.payload.customer_name || approval.payload.recipient || '',
        lead_id: approval.payload.lead_id || approval.payload.leadId || null,
        payload: approval.payload,
        created_at: approval.created_at,
        resolved_at: approval.resolved_at,
        approved_by_name: approval.approved_by_name,
        rejection_reason: approval.rejection_reason,
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/followups/:id
 * Edit the draft message content prior to approval.
 */
router.patch('/:id', requirePermission(PERMISSIONS.LEAD_UPDATE), (req, res, next) => {
  try {
    const data = EditDraftSchema.parse(req.body);
    const approval = approvalRepo.findById(req.params.id, req.user.orgId);
    if (!approval) throw new NotFoundError('Follow-up draft');

    if (approval.status !== 'PENDING' && approval.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError(`Cannot edit a draft that has already been ${approval.status.toLowerCase()}`);
    }

    const updatedPayload = {
      ...approval.payload,
      draft_message: data.message,
      edited_by: req.user.name,
      edited_at: new Date().toISOString(),
    };

    if (data.subject) {
      updatedPayload.subject = data.subject;
    }

    const updated = approvalRepo.updatePayload(req.params.id, req.user.orgId, updatedPayload);

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'FOLLOWUP_DRAFT_EDITED',
      resourceType: 'APPROVAL',
      resourceId: approval.id,
      details: {
        editedBy: req.user.name,
        updatedMessage: data.message,
      },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: 'Draft message updated successfully.',
      data: {
        draft_id: updated.id,
        message: data.message,
        status: updated.status === 'PENDING' ? 'PENDING_APPROVAL' : updated.status,
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/followups/:id/approve
 * Human supervisor approves the draft for dispatch.
 */
router.post('/:id/approve', requirePermission(PERMISSIONS.APPROVAL_ACTION), async (req, res, next) => {
  try {
    const approval = approvalRepo.findById(req.params.id, req.user.orgId);
    if (!approval) throw new NotFoundError('Follow-up draft');

    if (approval.status !== 'PENDING' && approval.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError(`Draft is already resolved as '${approval.status}'`);
    }

    const resolved = approvalRepo.resolve(req.params.id, req.user.orgId, {
      status: 'APPROVED',
      approvedBy: req.user.id,
    });

    // Execute through communication tool
    const executionResult = await toolRegistry.execute('send_external_communication', approval.payload, {
      orgId: req.user.orgId,
      user: req.user,
    });

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'FOLLOWUP_DRAFT_APPROVED',
      resourceType: 'APPROVAL',
      resourceId: approval.id,
      details: {
        approvedBy: req.user.name,
        executionResult,
      },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: 'Draft approved successfully.',
      data: {
        draft_id: resolved.id,
        status: 'APPROVED',
        executionResult,
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/followups/:id/reject
 * Human supervisor rejects the draft.
 */
router.post('/:id/reject', requirePermission(PERMISSIONS.APPROVAL_ACTION), (req, res, next) => {
  try {
    const data = RejectDraftSchema.parse(req.body);
    const approval = approvalRepo.findById(req.params.id, req.user.orgId);
    if (!approval) throw new NotFoundError('Follow-up draft');

    if (approval.status !== 'PENDING' && approval.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError(`Draft is already resolved as '${approval.status}'`);
    }

    const resolved = approvalRepo.resolve(req.params.id, req.user.orgId, {
      status: 'REJECTED',
      approvedBy: req.user.id,
      rejectionReason: data.reason,
    });

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'FOLLOWUP_DRAFT_REJECTED',
      resourceType: 'APPROVAL',
      resourceId: approval.id,
      details: {
        rejectedBy: req.user.name,
        reason: data.reason,
      },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: 'Draft rejected successfully.',
      data: {
        draft_id: resolved.id,
        status: 'REJECTED',
        rejection_reason: data.reason,
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
