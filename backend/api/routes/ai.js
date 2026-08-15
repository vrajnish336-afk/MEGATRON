import { Router } from 'express';
import { z } from 'zod';
import { orchestrator } from '../../core/orchestrator.js';
import { leadAgent } from '../../agents/leadAgent.js';
import { businessBriefEngine } from '../../agents/businessBriefEngine.js';
import { costTracker } from '../../ai/costTracker.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';

const router = Router();
router.use(authenticate);

const AssistantQuerySchema = z.object({
  query: z.string().min(1).max(1000),
});

const QualifyRequirementSchema = z.object({
  text: z.string().min(1).max(1000),
});

const DraftRequestSchema = z.object({
  scenario: z.string().optional().nullable(),
});

// Process Natural Language Assistant Query
router.post('/assistant', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const data = AssistantQuerySchema.parse(req.body);
    const result = await orchestrator.processRequest({
      query: data.query,
      user: req.user,
      orgId: req.user.orgId,
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Generate Real Estate Business Daily Brief
router.get('/daily-brief', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const brief = await businessBriefEngine.generateDailyBrief(req.user.orgId, {
      user: req.user,
    });
    res.json(brief);
  } catch (err) {
    next(err);
  }
});

// Real Estate Lead Requirement Extraction & Qualification
router.post('/qualify-requirement', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const data = QualifyRequirementSchema.parse(req.body);
    const qualification = await leadAgent.qualifyAndExtractRequirements(data.text, {
      orgId: req.user.orgId,
      user: req.user,
    });
    res.json({ success: true, data: qualification });
  } catch (err) {
    next(err);
  }
});

// Generate Real Estate Follow-up Draft
router.post('/leads/:id/followup-draft', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const body = DraftRequestSchema.parse(req.body || {});
    const draft = await leadAgent.generateRealEstateFollowupDraft(req.params.id, {
      customIntent: body.scenario,
    }, {
      orgId: req.user.orgId,
      user: req.user,
    });
    res.json({ success: true, data: draft });
  } catch (err) {
    next(err);
  }
});

// Business Impact Metrics (No fabricated numbers)
router.get('/business-impact', requirePermission(PERMISSIONS.AI_USE), (req, res, next) => {
  try {
    const impact = businessBriefEngine.calculateBusinessImpact(req.user.orgId);
    res.json({ success: true, data: impact });
  } catch (err) {
    next(err);
  }
});

// AI Usage & Cost Summary
router.get('/usage', requirePermission(PERMISSIONS.AI_USE), (req, res, next) => {
  try {
    const summary = costTracker.getUsageSummary(req.user.orgId, 30);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

export default router;
