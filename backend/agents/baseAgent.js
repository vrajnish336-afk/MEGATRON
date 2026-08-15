import { aiRouter } from '../ai/router.js';
import { costTracker } from '../ai/costTracker.js';
import { logger } from '../core/logger.js';
import { DATA_CLASSIFICATIONS } from '../ai/dataPolicy.js';

export class BaseAgent {
  constructor(name, description, defaultTaskType) {
    this.name = name;
    this.description = description;
    this.defaultTaskType = defaultTaskType;
  }

  async run({ prompt, systemPrompt = '', taskType = null, dataClassification = DATA_CLASSIFICATIONS.INTERNAL, context = {} }) {
    const activeTaskType = taskType || this.defaultTaskType;
    const startTime = Date.now();

    // 1. Route AI provider
    const route = await aiRouter.route({
      taskType: activeTaskType,
      dataClassification,
    });

    if (!route.provider) {
      logger.warn(`Agent [${this.name}] has no available AI provider. Proceeding with deterministic execution fallback.`, {
        reason: route.reason
      });
      return {
        success: false,
        fallback: true,
        reason: route.reason,
        content: null,
      };
    }

    try {
      const response = await route.provider.generateCompletion({
        prompt,
        systemPrompt,
      });

      const latencyMs = Date.now() - startTime;

      // Track usage & cost
      if (context.orgId) {
        costTracker.recordUsage({
          orgId: context.orgId,
          userId: context.user?.id,
          provider: response.provider,
          model: response.model,
          taskType: activeTaskType,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          routingReason: route.reason,
          latencyMs,
          success: true,
        });
      }

      return {
        success: true,
        content: response.content,
        provider: response.provider,
        model: response.model,
        routingReason: route.reason,
        latencyMs,
      };
    } catch (err) {
      logger.error(`Agent [${this.name}] execution error:`, { error: err.message });
      return {
        success: false,
        error: err.message,
        provider: route.providerType,
      };
    }
  }

  async runStructured({ prompt, systemPrompt = '', schema = null, taskType = null, dataClassification = DATA_CLASSIFICATIONS.INTERNAL, context = {} }) {
    const activeTaskType = taskType || this.defaultTaskType;
    const startTime = Date.now();

    const route = await aiRouter.route({
      taskType: activeTaskType,
      dataClassification,
    });

    if (!route.provider) {
      return {
        success: false,
        fallback: true,
        reason: route.reason,
        data: null,
      };
    }

    try {
      const response = await route.provider.generateStructured({
        prompt,
        systemPrompt,
        schema,
      });

      const latencyMs = Date.now() - startTime;

      if (context.orgId) {
        costTracker.recordUsage({
          orgId: context.orgId,
          userId: context.user?.id,
          provider: response.provider,
          model: response.model,
          taskType: activeTaskType,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          routingReason: route.reason,
          latencyMs,
          success: true,
        });
      }

      return {
        success: true,
        data: response.data,
        provider: response.provider,
        model: response.model,
        routingReason: route.reason,
      };
    } catch (err) {
      logger.error(`Agent [${this.name}] structured execution error:`, { error: err.message });
      return {
        success: false,
        error: err.message,
        provider: route.providerType,
      };
    }
  }
}
