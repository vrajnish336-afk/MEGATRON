import { logger } from '../core/logger.js';
import { ForbiddenError, ValidationError } from '../core/errors.js';
import { hasPermission } from '../permissions/policyEvaluator.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(name, { description, parameters, requiredPermission, riskLevel = 'LOW', execute }) {
    this.tools.set(name, {
      name,
      description,
      parameters,
      requiredPermission,
      riskLevel, // 'LOW', 'MEDIUM', 'HIGH'
      execute,
    });
  }

  get(name) {
    return this.tools.get(name) || null;
  }

  list() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      riskLevel: t.riskLevel,
      requiredPermission: t.requiredPermission,
    }));
  }

  async execute(name, params, context) {
    const tool = this.get(name);
    if (!tool) {
      throw new ValidationError(`Tool '${name}' is not registered`);
    }

    // Permission check
    if (tool.requiredPermission && context.user) {
      if (!hasPermission(context.user.role, tool.requiredPermission)) {
        throw new ForbiddenError(`Permission denied: Tool '${name}' requires '${tool.requiredPermission}'`);
      }
    }

    logger.info(`Executing tool '${name}'`, { orgId: context.orgId, userId: context.user?.id, riskLevel: tool.riskLevel });
    return await tool.execute(params, context);
  }
}

export const toolRegistry = new ToolRegistry();
