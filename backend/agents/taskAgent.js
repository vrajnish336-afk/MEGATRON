import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { userRepo } from '../database/repositories/userRepo.js';

export class TaskAgent extends BaseAgent {
  constructor() {
    super('TaskAgent', 'Understands natural language task instructions and queries live task database', TASK_TYPES.COMMAND_PARSING);
  }

  async parseAndExecuteCommand(commandText, context = {}) {
    const prompt = `Parse this user task command into structured JSON:
User Command: "${commandText}"

Return JSON matching one of these formats:
Format 1 (Query):
{
  "action": "QUERY_TASKS",
  "filters": {
    "isToday": boolean,
    "isOverdue": boolean,
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null,
    "status": "PENDING" | "IN_PROGRESS" | "COMPLETED" | null
  }
}

Format 2 (Create):
{
  "action": "CREATE_TASK",
  "task": {
    "title": string,
    "description": string | null,
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    "dueDate": string (YYYY-MM-DD) | null,
    "assigneeName": string | null
  }
}

Format 3 (Complete):
{
  "action": "COMPLETE_TASK",
  "taskId": string | null,
  "searchTitle": string | null
}`;

    const result = await this.runStructured({
      prompt,
      systemPrompt: 'You are a precise task parser for business operations. Today is ' + new Date().toISOString().slice(0, 10),
      taskType: TASK_TYPES.COMMAND_PARSING,
      context,
    });

    const parsed = result.success && result.data ? result.data : this.fallbackParser(commandText);

    // Live Database execution based on parsed intention
    if (parsed.action === 'QUERY_TASKS') {
      if (parsed.filters?.isToday) {
        const tasks = taskRepo.getTodayTasks(context.orgId);
        return {
          action: 'QUERY_TASKS',
          message: `Found ${tasks.length} task(s) scheduled for today.`,
          data: tasks,
        };
      }
      if (parsed.filters?.isOverdue) {
        const tasks = taskRepo.getOverdueTasks(context.orgId);
        return {
          action: 'QUERY_TASKS',
          message: `Found ${tasks.length} overdue task(s).`,
          data: tasks,
        };
      }
      const tasks = taskRepo.listByOrg(context.orgId, {
        priority: parsed.filters?.priority,
        status: parsed.filters?.status,
        limit: 20,
      });
      return {
        action: 'QUERY_TASKS',
        message: `Found ${tasks.length} matching task(s).`,
        data: tasks,
      };
    }

    if (parsed.action === 'CREATE_TASK' && parsed.task) {
      let assignedToId = null;
      if (parsed.task.assigneeName) {
        const users = userRepo.findByOrg(context.orgId);
        const match = users.find(u => u.name.toLowerCase().includes(parsed.task.assigneeName.toLowerCase()));
        if (match) assignedToId = match.id;
      }

      const newTask = taskRepo.create({
        orgId: context.orgId,
        title: parsed.task.title || commandText,
        description: parsed.task.description || `Created via assistant: "${commandText}"`,
        priority: parsed.task.priority || 'MEDIUM',
        dueDate: parsed.task.dueDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        assignedTo: assignedToId,
      });

      return {
        action: 'CREATE_TASK',
        message: `Created task: "${newTask.title}" (Due: ${newTask.due_date || 'No date'}, Priority: ${newTask.priority})`,
        data: newTask,
      };
    }

    if (parsed.action === 'COMPLETE_TASK') {
      if (parsed.taskId) {
        const updated = taskRepo.update(parsed.taskId, context.orgId, { status: 'COMPLETED' });
        return {
          action: 'COMPLETE_TASK',
          message: `Task completed successfully.`,
          data: updated,
        };
      }
    }

    // Default fallback
    const allTasks = taskRepo.listByOrg(context.orgId, { limit: 10 });
    return {
      action: 'QUERY_TASKS',
      message: `Showing ${allTasks.length} recent tasks.`,
      data: allTasks,
    };
  }

  fallbackParser(text) {
    const lower = text.toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    if (lower.includes('today')) {
      return { action: 'QUERY_TASKS', filters: { isToday: true } };
    }
    if (lower.includes('overdue')) {
      return { action: 'QUERY_TASKS', filters: { isOverdue: true } };
    }
    if (lower.includes('create') || lower.includes('add') || lower.includes('remind')) {
      const title = text.replace(/^(create|add|schedule|set)\s*(a|an)?\s*(task|reminder|follow-up)?\s*(for|to)?/i, '').trim();
      return {
        action: 'CREATE_TASK',
        task: {
          title: title || 'Follow up item',
          priority: lower.includes('urgent') || lower.includes('important') ? 'HIGH' : 'MEDIUM',
          dueDate: lower.includes('tomorrow') ? tomorrow : today,
        }
      };
    }
    return { action: 'QUERY_TASKS', filters: {} };
  }
}

export const taskAgent = new TaskAgent();
