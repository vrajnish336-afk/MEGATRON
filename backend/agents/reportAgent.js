import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';

export class ReportAgent extends BaseAgent {
  constructor() {
    super('ReportAgent', 'Generates natural language explanations of reports and metrics', TASK_TYPES.REPORT_GENERATION);
  }

  async explainReport({ reportTitle, metrics, userQuestion = null }, context = {}) {
    const prompt = `Analyze and explain the following business report:
Report Title: ${reportTitle}
Live Verified Data:
${JSON.stringify(metrics, null, 2)}
${userQuestion ? `User Specific Question: "${userQuestion}"` : 'Explain key patterns, anomalies, and operational insights.'}

Rules:
1. Ground every statement strictly in the provided metrics.
2. If data for a specific aspect is missing, explicitly state "Data unavailable."
3. Do not invent financial or traffic numbers.

Return natural language markdown text with clear headings and bullet points.`;

    const result = await this.run({
      prompt,
      systemPrompt: 'You are the Chief Analytics Officer for MEGADRONE Business OS.',
      taskType: TASK_TYPES.REPORT_GENERATION,
      context,
    });

    if (result.success && result.content) {
      return result.content;
    }

    // Deterministic fallback explanation
    return `### ${reportTitle} Analysis\n\n- **Summary**: Operational overview compiled from live system data.\n- **Data Points Evaluated**: ${Object.keys(metrics || {}).length} metric categories.\n- **Note**: AI reasoning provider offline or unavailable. Showing direct verified metrics without speculative extrapolation.`;
  }
}

export const reportAgent = new ReportAgent();
