import { BaseAIProvider } from './baseProvider.js';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { AIProviderError } from '../../core/errors.js';
import { parseJsonSafely } from '../../utils/jsonParser.js';

export class OllamaProvider extends BaseAIProvider {
  constructor(options = {}) {
    super('ollama_local', 'local');
    this.baseUrl = (options.baseUrl || config.localAi.baseUrl).replace(/\/+$/, '');
    this.model = options.model || config.localAi.model;
    this.timeoutMs = options.timeoutMs || config.localAi.timeoutMs;
  }

  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateCompletion({
    prompt,
    systemPrompt = '',
    temperature = 0.3,
    maxTokens = 1500,
    stopSequences = [],
    format = null,
  }) {
    const isOnline = await this.isAvailable();
    if (!isOnline) {
      throw new AIProviderError(`Local Ollama service is not reachable at ${this.baseUrl}`);
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
        stop: stopSequences,
      },
    };

    if (format) {
      requestBody.format = format;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new AIProviderError(`Ollama error (${res.status}): ${errorText.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data.message?.content || '';
      const promptTokens = data.prompt_eval_count || Math.ceil((prompt.length + systemPrompt.length) / 4);
      const completionTokens = data.eval_count || Math.ceil(content.length / 4);

      return {
        content,
        promptTokens,
        completionTokens,
        model: this.model,
        provider: 'ollama',
        raw: data,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AIProviderError(`Ollama request timed out after ${this.timeoutMs}ms`);
      }
      throw new AIProviderError(`Ollama generation error: ${err.message}`);
    }
  }

  async generateStructured({ prompt, systemPrompt = '', schema = null, temperature = 0.1, maxTokens = 2048 }) {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object matching the requested schema.`;
    const result = await this.generateCompletion({
      prompt: jsonPrompt,
      systemPrompt: systemPrompt ? `${systemPrompt} You are a strict JSON output engine.` : 'You are a strict JSON output engine.',
      temperature,
      maxTokens,
      format: 'json',
    });

    const parsedResult = parseJsonSafely(result.content);

    if (!parsedResult.success) {
      logger.warn('Failed to parse Ollama response as JSON', { raw: result.content, error: parsedResult.error });
      throw new AIProviderError(`Ollama structured JSON parsing failed: ${parsedResult.error}`);
    }

    return {
      data: parsedResult.data,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      model: this.model,
      provider: 'ollama',
    };
  }
}
