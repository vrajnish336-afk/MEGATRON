import { CloudAIProvider } from './providers/cloudProvider.js';
import { OllamaProvider } from './providers/ollamaProvider.js';
import { dataPolicy, DATA_CLASSIFICATIONS } from './dataPolicy.js';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { AIProviderError } from '../core/errors.js';

export const TASK_TYPES = {
  CLASSIFICATION: 'classification',
  COMMAND_PARSING: 'command_parsing',
  SUMMARIZATION_BASIC: 'summarization_basic',
  COMPLEX_REASONING: 'complex_reasoning',
  BUSINESS_ANALYSIS: 'business_analysis',
  REPORT_GENERATION: 'report_generation',
  COMMUNICATION_DRAFT: 'communication_draft',
};

export class AIRouter {
  constructor() {
    this.cloudProvider = new CloudAIProvider();
    this.ollamaProvider = new OllamaProvider();
  }

  /**
   * Determine the optimal AI provider based on task complexity, data sensitivity, and live availability
   */
  async route({ taskType = TASK_TYPES.COMMAND_PARSING, dataClassification = DATA_CLASSIFICATIONS.INTERNAL }) {
    const strategy = config.aiRouting.strategy;
    const isCloudAllowed = dataPolicy.isProviderAllowed(dataClassification, 'cloud');
    const isLocalAllowed = dataPolicy.isProviderAllowed(dataClassification, 'local');

    const [cloudOnline, localOnline] = await Promise.all([
      this.cloudProvider.isAvailable(),
      this.ollamaProvider.isAvailable(),
    ]);

    let selectedProvider = null;
    let routingReason = '';
    let isFallback = false;

    // 1. Data Sensitivity Constraints: If data is restricted from cloud
    if (!isCloudAllowed) {
      if (localOnline) {
        selectedProvider = this.ollamaProvider;
        routingReason = `privacy_restricted_data_${dataClassification.toLowerCase()}_local_only`;
      } else {
        routingReason = `privacy_restricted_data_local_unavailable`;
        logger.warn('AI Router: Sensitive data cannot be sent to cloud and local AI is offline', {
          dataClassification,
          taskType
        });
        return {
          provider: null,
          providerType: 'none',
          reason: routingReason,
          error: 'Local AI is offline and data privacy policy prohibits cloud processing for this classification.'
        };
      }
    }

    // 2. Forced Strategies
    if (!selectedProvider) {
      if (strategy === 'force_local' && localOnline) {
        selectedProvider = this.ollamaProvider;
        routingReason = 'forced_local_strategy';
      } else if (strategy === 'force_cloud' && isCloudAllowed && cloudOnline) {
        selectedProvider = this.cloudProvider;
        routingReason = 'forced_cloud_strategy';
      }
    }

    // 3. Dynamic Complexity-based Routing
    if (!selectedProvider) {
      const preferLocalTasks = [
        TASK_TYPES.CLASSIFICATION,
        TASK_TYPES.COMMAND_PARSING,
        TASK_TYPES.SUMMARIZATION_BASIC,
      ];

      const isSimpleTask = preferLocalTasks.includes(taskType);

      if (isSimpleTask) {
        if (localOnline) {
          selectedProvider = this.ollamaProvider;
          routingReason = `simple_task_${taskType}_routed_to_local`;
        } else if (cloudOnline && isCloudAllowed) {
          selectedProvider = this.cloudProvider;
          routingReason = `local_offline_fallback_to_cloud_for_${taskType}`;
          isFallback = true;
        }
      } else {
        // Complex task
        if (cloudOnline && isCloudAllowed) {
          selectedProvider = this.cloudProvider;
          routingReason = `complex_task_${taskType}_routed_to_cloud`;
        } else if (localOnline) {
          selectedProvider = this.ollamaProvider;
          routingReason = `cloud_unavailable_fallback_to_local_for_${taskType}`;
          isFallback = true;
        }
      }
    }

    // 4. Final Fallback if no LLM is online
    if (!selectedProvider) {
      if (localOnline) {
        selectedProvider = this.ollamaProvider;
        routingReason = 'fallback_to_local_any';
      } else if (cloudOnline && isCloudAllowed) {
        selectedProvider = this.cloudProvider;
        routingReason = 'fallback_to_cloud_any';
      } else {
        routingReason = 'no_ai_provider_available';
      }
    }

    logger.info('AI Router Decision', {
      provider: selectedProvider ? selectedProvider.name : 'none',
      providerType: selectedProvider ? selectedProvider.type : 'none',
      taskType,
      dataClassification,
      reason: routingReason,
      isFallback,
    });

    return {
      provider: selectedProvider,
      providerType: selectedProvider ? selectedProvider.type : 'none',
      reason: routingReason,
      isFallback,
    };
  }
}

export const aiRouter = new AIRouter();
