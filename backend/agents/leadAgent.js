import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';
import { leadRepo } from '../database/repositories/leadRepo.js';

export class LeadAgent extends BaseAgent {
  constructor() {
    super('LeadAgent', 'Classifies leads, analyzes customer potential, and suggests next actions', TASK_TYPES.CLASSIFICATION);
  }

  async classifyAndEnrichLead(leadData, context = {}) {
    const prompt = `Analyze this business lead and output a JSON object with:
- "classification": string (e.g., "Enterprise Opportunity", "Mid-market SaaS", "Inbound Inquiry", "Unqualified")
- "priority": string (one of: "LOW", "MEDIUM", "HIGH", "URGENT")
- "suggestedAction": string (a concrete next business action)
- "suggestedFollowupDays": number (days from now to follow up, e.g. 1, 2, 5)
- "summary": string (1-2 sentence overview)

Lead Data:
${JSON.stringify(leadData, null, 2)}`;

    const result = await this.runStructured({
      prompt,
      systemPrompt: 'You are an expert enterprise sales and lead qualification AI for MEGADRONE Business OS.',
      taskType: TASK_TYPES.CLASSIFICATION,
      context,
    });

    if (result.success && result.data) {
      return result.data;
    }

    // Heuristic deterministic fallback
    const isUrgent = (leadData.notes || '').toLowerCase().includes('urgent') || (leadData.notes || '').toLowerCase().includes('asap');
    return {
      classification: leadData.company ? 'Corporate Prospect' : 'Direct Lead',
      priority: isUrgent ? 'URGENT' : (leadData.company ? 'HIGH' : 'MEDIUM'),
      suggestedAction: 'Schedule introductory discovery call',
      suggestedFollowupDays: isUrgent ? 1 : 3,
      summary: `${leadData.name} from ${leadData.company || 'Direct'} registered interest.`,
    };
  }

  async generateFollowupDraft(leadId, context = {}) {
    const lead = leadRepo.findById(leadId, context.orgId);
    if (!lead) return { error: 'Lead not found' };

    const prompt = `Write a polite, high-converting business follow-up email for:
Lead Name: ${lead.name}
Company: ${lead.company || 'N/A'}
Status: ${lead.status}
Notes: ${lead.notes || 'Interested in our solutions'}

Return JSON:
{
  "subject": "string",
  "body": "string",
  "tone": "professional"
}`;

    const result = await this.runStructured({
      prompt,
      systemPrompt: 'You are a professional business communication assistant.',
      taskType: TASK_TYPES.COMMUNICATION_DRAFT,
      context,
    });

    if (result.success && result.data) {
      return result.data;
    }

    return {
      subject: `Following up on our conversation - ${lead.company || lead.name}`,
      body: `Hi ${lead.name},\n\nI wanted to follow up regarding our previous discussion and see how we can assist ${lead.company || 'your team'} with your operational goals.\n\nWould you be open for a quick 10-minute check-in this week?\n\nBest regards,\nMEGADRONE Business Team`,
      tone: 'professional'
    };
  }
}

export const leadAgent = new LeadAgent();
