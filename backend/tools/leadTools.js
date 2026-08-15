import { toolRegistry } from './toolRegistry.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { PERMISSIONS } from '../permissions/permissionsMatrix.js';

export function registerLeadTools() {
  // Query Leads
  toolRegistry.register('query_leads', {
    description: 'Query and filter real customer leads from the business CRM',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        search: { type: 'string' },
        limit: { type: 'number', default: 20 },
      },
    },
    requiredPermission: PERMISSIONS.LEAD_READ,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const leads = leadRepo.listByOrg(context.orgId, params);
      return { count: leads.length, leads };
    }
  });

  // Create Lead
  toolRegistry.register('create_lead', {
    description: 'Create a new business lead record in the CRM',
    parameters: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        company: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        source: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        notes: { type: 'string' },
        nextFollowup: { type: 'string' },
      },
    },
    requiredPermission: PERMISSIONS.LEAD_CREATE,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const lead = leadRepo.create({
        orgId: context.orgId,
        ...params,
      });
      return { message: 'Lead created successfully', lead };
    }
  });

  // Update Lead Status
  toolRegistry.register('update_lead_status', {
    description: 'Update the pipeline stage status of an existing lead',
    parameters: {
      type: 'object',
      required: ['leadId', 'status'],
      properties: {
        leadId: { type: 'string' },
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
        notes: { type: 'string' },
      },
    },
    requiredPermission: PERMISSIONS.LEAD_UPDATE,
    riskLevel: 'MEDIUM',
    execute: async (params, context) => {
      const updated = leadRepo.update(params.leadId, context.orgId, {
        status: params.status,
        notes: params.notes,
      });
      return { message: 'Lead status updated', lead: updated };
    }
  });
}
