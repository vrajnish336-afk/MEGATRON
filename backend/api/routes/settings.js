import { Router } from 'express';
import { z } from 'zod';
import { aiRouter } from '../../ai/router.js';
import { config } from '../../core/config.js';
import { orgRepo } from '../../database/repositories/orgRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';

const router = Router();
router.use(authenticate);

// AI & System Health Status
router.get('/ai-status', requirePermission(PERMISSIONS.SETTINGS_READ), async (req, res, next) => {
  try {
    const [cloudOnline, ollamaOnline] = await Promise.all([
      aiRouter.cloudProvider.isAvailable(),
      aiRouter.ollamaProvider.isAvailable(),
    ]);

    res.json({
      success: true,
      data: {
        cloudAi: {
          configured: Boolean(config.cloudAi.apiKey),
          isAvailable: cloudOnline,
          baseUrl: config.cloudAi.baseUrl,
          model: config.cloudAi.model,
        },
        localOllama: {
          baseUrl: config.localAi.baseUrl,
          model: config.localAi.model,
          isAvailable: ollamaOnline,
        },
        routingStrategy: config.aiRouting.strategy,
        dataPolicy: {
          allowCloudForPublic: config.dataPolicy.allowCloudForPublic,
          allowCloudForInternal: config.dataPolicy.allowCloudForInternal,
          allowCloudForConfidential: config.dataPolicy.allowCloudForConfidential,
          allowCloudForSensitive: config.dataPolicy.allowCloudForSensitive,
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// Update Organization Settings
router.post('/privacy-policy', requirePermission(PERMISSIONS.SETTINGS_UPDATE), (req, res, next) => {
  try {
    const org = orgRepo.findById(req.user.orgId);
    const updatedSettings = {
      ...(org.settings || {}),
      dataPolicy: req.body,
    };
    orgRepo.update(req.user.orgId, { settings: updatedSettings });

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'PRIVACY_POLICY_UPDATED',
      resourceType: 'SETTINGS',
      details: req.body,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Privacy policy settings saved.', data: updatedSettings });
  } catch (err) {
    next(err);
  }
});

export default router;
