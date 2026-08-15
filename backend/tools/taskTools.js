import { toolRegistry } from './toolRegistry.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { PERMISSIONS } from '../permissions/permissionsMatrix.js';

export function registerTaskTools() {
  // Query Tasks
  toolRegistry.register('query_tasks', {
    description: 'Query business tasks filtered by status, priority, or due dates',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        search: { type: 'string' },
        limit: { type: 'number', default: 20 },
      },
    },
    requiredPermission: PERMISSIONS.TASK_READ,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const tasks = taskRepo.listByOrg(context.orgId, params);
      return { count: tasks.length, tasks };
    }
  });

  // Get Today's Important Tasks
  toolRegistry.register('get_today_tasks', {
    description: 'Retrieve tasks due today ordered by priority',
    parameters: { type: 'object', properties: {} },
    requiredPermission: PERMISSIONS.TASK_READ,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const tasks = taskRepo.getTodayTasks(context.orgId);
      return { count: tasks.length, tasks };
    }
  });

  // Get Overdue Tasks
  toolRegistry.register('get_overdue_tasks', {
    description: 'Retrieve all pending tasks whose due dates have passed',
    parameters: { type: 'object', properties: {} },
    requiredPermission: PERMISSIONS.TASK_READ,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const tasks = taskRepo.getOverdueTasks(context.orgId);
      return { count: tasks.length, tasks };
    }
  });

  // Create Task
  toolRegistry.register('create_task', {
    description: 'Create a new business task or follow-up item with due date and priority',
    parameters: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        dueDate: { type: 'string', description: 'YYYY-MM-DD' },
        assignedTo: { type: 'string' },
        leadId: { type: 'string' },
      },
    },
    requiredPermission: PERMISSIONS.TASK_CREATE,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const task = taskRepo.create({
        orgId: context.orgId,
        ...params,
      });
      return { message: 'Task created successfully', task };
    }
  });

  // Complete Task
  toolRegistry.register('complete_task', {
    description: 'Mark an active task as COMPLETED',
    parameters: {
      type: 'object',
      required: ['taskId'],
      properties: {
        taskId: { type: 'string' },
      },
    },
    requiredPermission: PERMISSIONS.TASK_UPDATE,
    riskLevel: 'LOW',
    execute: async (params, context) => {
      const updated = taskRepo.update(params.taskId, context.orgId, { status: 'COMPLETED' });
      return { message: 'Task marked as completed', task: updated };
    }
  });
}
