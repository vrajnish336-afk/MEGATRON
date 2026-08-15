import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { logger } from '../core/logger.js';

// Price per 1,000,000 tokens (USD)
const PRICING_TABLE = {
  'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
  'gpt-4o': { prompt: 2.50, completion: 10.00 },
  'claude-3-5-sonnet': { prompt: 3.00, completion: 15.00 },
  'gemini-1.5-flash': { prompt: 0.075, completion: 0.30 },
  'ollama': { prompt: 0.0, completion: 0.0 }, // Local AI is free
};

export function estimateCostUSD(modelName, promptTokens = 0, completionTokens = 0) {
  const modelKey = Object.keys(PRICING_TABLE).find(k => modelName.toLowerCase().includes(k)) || 'gpt-4o-mini';
  const pricing = PRICING_TABLE[modelKey] || { prompt: 0.15, completion: 0.60 };

  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  return Number((promptCost + completionCost).toFixed(6));
}

export const costTracker = {
  recordUsage({ orgId, userId = null, provider, model, taskType, promptTokens = 0, completionTokens = 0, routingReason = null, latencyMs = 0, success = true }) {
    try {
      const id = `aiu_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const cost = provider === 'ollama' ? 0.0 : estimateCostUSD(model, promptTokens, completionTokens);
      const now = new Date().toISOString();

      db.execute(
        `INSERT INTO ai_usage_logs (id, org_id, user_id, provider, model, task_type, prompt_tokens, completion_tokens, estimated_cost_usd, routing_reason, latency_ms, success, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, orgId, userId, provider, model, taskType, promptTokens, completionTokens, cost, routingReason, latencyMs, success ? 1 : 0, now]
      );

      return { id, estimatedCostUsd: cost };
    } catch (err) {
      logger.error('Failed to log AI usage:', { error: err.message });
      return null;
    }
  },

  getUsageSummary(orgId, days = 30) {
    const sinceDate = new Date(Date.now() - days * 86400000).toISOString();

    const totals = db.queryOne(
      `SELECT 
         COUNT(*) as total_requests,
         SUM(prompt_tokens) as total_prompt_tokens,
         SUM(completion_tokens) as total_completion_tokens,
         SUM(estimated_cost_usd) as total_cost_usd,
         AVG(latency_ms) as avg_latency_ms
       FROM ai_usage_logs
       WHERE org_id = ? AND created_at >= ?`,
      [orgId, sinceDate]
    ) || {};

    const byProvider = db.queryAll(
      `SELECT provider, COUNT(*) as count, SUM(estimated_cost_usd) as cost, SUM(prompt_tokens + completion_tokens) as total_tokens
       FROM ai_usage_logs
       WHERE org_id = ? AND created_at >= ?
       GROUP BY provider`,
      [orgId, sinceDate]
    );

    const byTaskType = db.queryAll(
      `SELECT task_type, COUNT(*) as count, SUM(estimated_cost_usd) as cost
       FROM ai_usage_logs
       WHERE org_id = ? AND created_at >= ?
       GROUP BY task_type`,
      [orgId, sinceDate]
    );

    return {
      totalRequests: totals.total_requests || 0,
      totalPromptTokens: totals.total_prompt_tokens || 0,
      totalCompletionTokens: totals.total_completion_tokens || 0,
      totalCostUsd: Number((totals.total_cost_usd || 0).toFixed(4)),
      avgLatencyMs: Math.round(totals.avg_latency_ms || 0),
      byProvider,
      byTaskType,
    };
  }
};
