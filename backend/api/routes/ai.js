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

const ClassifyLeadSchema = z.object({
  name: z.string(),
  company: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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

// Generate Real Business Daily Brief
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

// Classify & Enrich a Lead
router.post('/classify-lead', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const data = ClassifyLeadSchema.parse(req.body);
    const enrichment = await leadAgent.classifyAndEnrichLead(data, {
      orgId: req.user.orgId,
      user: req.user,
    });
    res.json({ success: true, data: enrichment });
  } catch (err) {
    next(err);
  }
});

// Generate Follow-up Draft for Lead
router.get('/leads/:id/draft', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const draft = await leadAgent.generateFollowupDraft(req.params.id, {
      orgId: req.user.orgId,
      user: req.user,
    });
    res.json({ success: true, data: draft });
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
