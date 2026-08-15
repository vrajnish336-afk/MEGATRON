import { toolRegistry } from './toolRegistry.js';
import { registerLeadTools } from './leadTools.js';
import { registerTaskTools } from './taskTools.js';
import { registerReportTools } from './reportTools.js';
import { registerCommunicationTools } from './communicationTools.js';
import { logger } from '../core/logger.js';

export function initializeTools() {
  logger.info('Initializing MEGADRONE tool registry...');
  registerLeadTools();
  registerTaskTools();
  registerReportTools();
  registerCommunicationTools();
  logger.info(`Initialized ${toolRegistry.list().length} core business tools.`);
}
