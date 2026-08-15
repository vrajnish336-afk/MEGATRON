import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';

export class CommunicationAgent extends BaseAgent {
  constructor() {
    super('CommunicationAgent', 'Drafts high-quality customer communications, email templates, and follow-up sequences', TASK_TYPES.COMMUNICATION_DRAFT);
  }

  async draftMessage({ recipientName, company, contextDescription, intent, tone = 'professional' }, context = {}) {
    const prompt = `Compose a concise, professional business communication draft:
Recipient: ${recipientName} (${company || 'Direct Contact'})
Intent/Goal: ${intent}
Context Details: ${contextDescription}
Desired Tone: ${tone}

Return JSON format:
{
  "subject": "string",
  "body": "string",
  "recommendedAction": "string"
}`;

    const result = await this.runStructured({
      prompt,
      systemPrompt: 'You are an executive business communications specialist for MEGADRONE Business OS.',
      taskType: TASK_TYPES.COMMUNICATION_DRAFT,
      context,
    });

    if (result.success && result.data) {
      return result.data;
    }

    return {
      subject: `Update regarding ${company || recipientName} - ${intent}`,
      body: `Hello ${recipientName},\n\nI hope you're having a productive week. Regarding ${intent}, I wanted to touch base with you to ensure everything is aligned.\n\n${contextDescription || 'Please let us know if you need any additional details.'}\n\nBest regards,\nMEGADRONE Business Team`,
      recommendedAction: 'Review and approve draft before dispatching to client.',
    };
  }
}

export const communicationAgent = new CommunicationAgent();
