import { GuardrailViolationError } from '../core/errors.js';
import { logger } from '../core/logger.js';

const PROHIBITED_KEYWORDS = [
  'transfer money',
  'wire funds',
  'bank transfer',
  'send money',
  'credit card charge',
  'make payment',
  'execute financial trade',
  'withdraw funds',
  'crypto transfer',
];

export const guardrails = {
  validateUserIntent(intentText) {
    if (!intentText || typeof intentText !== 'string') return;
    const lower = intentText.toLowerCase();

    for (const phrase of PROHIBITED_KEYWORDS) {
      if (lower.includes(phrase)) {
        logger.error('Hard Guardrail Triggered: Prohibited financial action attempted', { text: intentText });
        throw new GuardrailViolationError(
          'Security Policy Violation: MEGADRONE Business OS strictly prohibits automated financial transactions or independent fund movement.'
        );
      }
    }
  },

  classifyRisk(toolOrAction) {
    const highRiskActions = [
      'send_external_communication',
      'delete_lead',
      'delete_task',
      'delete_user',
      'modify_permissions',
      'change_user_role',
    ];

    const mediumRiskActions = [
      'update_lead_status',
      'update_organization_settings',
      'prepare_communication_draft',
    ];

    if (highRiskActions.includes(toolOrAction)) return 'HIGH';
    if (mediumRiskActions.includes(toolOrAction)) return 'MEDIUM';
    return 'LOW';
  },

  requiresHumanApproval(toolOrAction) {
    const risk = this.classifyRisk(toolOrAction);
    return risk === 'HIGH';
  }
};
