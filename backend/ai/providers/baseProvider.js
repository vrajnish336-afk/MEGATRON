/**
 * Base AI Provider Abstract Interface
 */
export class BaseAIProvider {
  constructor(name, type) {
    if (new.target === BaseAIProvider) {
      throw new TypeError('Cannot construct BaseAIProvider instances directly');
    }
    this.name = name;
    this.type = type; // 'cloud' | 'local' | 'custom'
  }

  async isAvailable() {
    throw new Error('isAvailable() must be implemented');
  }

  async generateCompletion({ prompt, systemPrompt = '', temperature = 0.3, maxTokens = 1500, stopSequences = [] }) {
    throw new Error('generateCompletion() must be implemented');
  }

  async generateStructured({ prompt, systemPrompt = '', schema = null, temperature = 0.1 }) {
    throw new Error('generateStructured() must be implemented');
  }

  estimateCost(promptTokens, completionTokens, model) {
    return 0.0;
  }
}
