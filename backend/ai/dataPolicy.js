import { config } from '../core/config.js';
import { sanitizeObject } from '../security/sanitizer.js';
import { logger } from '../core/logger.js';
import { ForbiddenError } from '../core/errors.js';

export const DATA_CLASSIFICATIONS = {
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  CONFIDENTIAL: 'CONFIDENTIAL',
  SENSITIVE: 'SENSITIVE',
};

export const dataPolicy = {
  /**
   * Determine if data classification is allowed to be transmitted to target provider
   */
  isProviderAllowed(classification, providerType) {
    if (providerType === 'local') {
      // Local AI (Ollama) is always allowed for all data classifications
      return true;
    }

    if (providerType === 'cloud') {
      switch (classification) {
        case DATA_CLASSIFICATIONS.PUBLIC:
          return config.dataPolicy.allowCloudForPublic;
        case DATA_CLASSIFICATIONS.INTERNAL:
          return config.dataPolicy.allowCloudForInternal;
        case DATA_CLASSIFICATIONS.CONFIDENTIAL:
          return config.dataPolicy.allowCloudForConfidential;
        case DATA_CLASSIFICATIONS.SENSITIVE:
          return config.dataPolicy.allowCloudForSensitive;
        default:
          return false;
      }
    }

    return false;
  },

  /**
   * Enforce outbound policy check
   */
  enforce(classification, providerType) {
    const allowed = this.isProviderAllowed(classification, providerType);
    if (!allowed) {
      const msg = `Data Privacy Policy Violation: Outbound transmission of [${classification}] data to [${providerType}] AI provider is strictly prohibited by security policy.`;
      logger.warn(msg, { classification, providerType });
      throw new ForbiddenError(msg);
    }
    return true;
  },

  /**
   * Minimize and scrub private tokens / secrets before sending to any AI provider
   */
  minimize(payload) {
    if (!payload) return payload;
    if (typeof payload === 'string') {
      return payload
        .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL_MASKED]')
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_MASKED]');
    }
    return sanitizeObject(payload);
  }
};
