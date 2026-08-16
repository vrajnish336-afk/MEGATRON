import { BaseAIProvider } from './baseProvider.js';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { AIProviderError } from '../../core/errors.js';

export class CloudAIProvider extends BaseAIProvider {
  constructor(options = {}) {
    super('cloud_ai', 'cloud');
    this.apiKey = options.apiKey || config.cloudAi.apiKey;
    this.baseUrl = (options.baseUrl || config.cloudAi.baseUrl).replace(/\/+$/, '');
    this.model = options.model || config.cloudAi.model;
    this.timeoutMs = options.timeoutMs || config.cloudAi.timeoutMs;
    this.maxRetries = options.maxRetries || config.cloudAi.maxRetries;
  }

  async isAvailable() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateCompletion({ prompt, systemPrompt = '', temperature = 0.3, maxTokens = 1500, stopSequences = [] }) {
    if (!await this.isAvailable()) {
      throw new AIProviderError('Cloud AI Provider is not configured with an API key');
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(stopSequences.length > 0 ? { stop: stopSequences } : {})
    };

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          if (response.status === 429 && attempt <= this.maxRetries) {
            logger.warn(`Cloud AI rate limited (429). Retrying attempt ${attempt}...`);
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            continue;
          }
          throw new AIProviderError(`Cloud AI API error (${response.status}): ${errBody.slice(0, 300)}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const content = choice?.message?.content || '';
        const promptTokens = data.usage?.prompt_tokens || Math.ceil((prompt.length + systemPrompt.length) / 4);
        const completionTokens = data.usage?.completion_tokens || Math.ceil(content.length / 4);

        return {
          content,
          promptTokens,
          completionTokens,
          model: this.model,
          provider: 'cloud',
          raw: data,
        };
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new AIProviderError(`Cloud AI request timed out after ${this.timeoutMs}ms`);
        }
        if (attempt > this.maxRetries) {
          throw new AIProviderError(`Cloud AI failed after ${this.maxRetries} retries: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }

  async generateStructured({ prompt, systemPrompt = '', schema = null, temperature = 0.1 }) {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid, RFC 8259 compliant JSON. Do not include markdown codeblocks or commentary.`;
    const result = await this.generateCompletion({
      prompt: jsonPrompt,
      systemPrompt: systemPrompt ? `${systemPrompt} You are a strict JSON output generator.` : 'You are a strict JSON output generator.',
      temperature,
    });

    try {
      let clean = result.content.trim();
      const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        clean = codeBlockMatch[1].trim();
      } else {
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          clean = clean.substring(start, end + 1);
        }
      }
      const parsed = JSON.parse(clean);
      return {
        data: parsed,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: this.model,
        provider: 'cloud',
      };
    } catch (err) {
      logger.warn('Failed to parse Cloud AI response as JSON', { raw: result.content });
      throw new AIProviderError(`Structured output parsing failed: ${err.message}`);
    }
  }
}
