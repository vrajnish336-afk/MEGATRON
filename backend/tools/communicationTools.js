import { toolRegistry } from './toolRegistry.js';
import { PERMISSIONS } from '../permissions/permissionsMatrix.js';

export function registerCommunicationTools() {
  // Generate Draft (Safe action)
  toolRegistry.register('prepare_communication_draft', {
    description: 'Prepare an email or messaging draft for customer follow-up (does not send)',
    parameters: {
      type: 'object',
      required: ['recipientName', 'purpose'],
      properties: {
        recipientName: { type: 'string' },
        recipientEmail: { type: 'string' },
        company: { type: 'string' },
        purpose: { type: 'string' },
        keyPoints: { type: 'array', items: { type: 'string' } },
        tone: { type: 'string', enum: ['professional', 'friendly', 'urgent', 'formal'], default: 'professional' },
      },
    },
    requiredPermission: PERMISSIONS.AI_USE,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const draft = {
        subject: `Follow up regarding ${params.company || params.recipientName} - Next Steps`,
        recipient: params.recipientEmail || params.recipientName,
        tone: params.tone || 'professional',
        body: `Dear ${params.recipientName},\n\nI hope this message finds you well.\n\nRegarding our discussion on ${params.purpose}, I wanted to follow up and see how we can assist you with your upcoming milestones.\n\n${(params.keyPoints || []).map(p => `• ${p}`).join('\n')}\n\nPlease let me know when you are available for a brief conversation.\n\nBest regards,\n${context.user?.name || 'MEGADRONE Business Operations'}`,
        status: 'DRAFT_GENERATED',
      };
      return { message: 'Draft generated successfully (requires user approval to send)', draft };
    }
  });

  // Send Communication (HIGH RISK -> requires approval)
  toolRegistry.register('send_external_communication', {
    description: 'Dispatch an approved message or email to an external customer or lead',
    parameters: {
      type: 'object',
      required: ['recipientEmail', 'subject', 'body'],
      properties: {
        recipientEmail: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
    },
    requiredPermission: PERMISSIONS.AI_USE,
    riskLevel: 'HIGH',
    execute: async (params, context) => {
      // In production, integration with SMTP / SendGrid / Postmark
      return {
        success: true,
        message: `Communication successfully dispatched to ${params.recipientEmail}`,
        dispatchedAt: new Date().toISOString(),
      };
    }
  });
}
