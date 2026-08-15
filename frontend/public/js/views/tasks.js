import { APIClient } from '../api.js';
import { showToast, showModal, formatDate, escapeHtml } from '../components/ui.js';

export async function renderTasksView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">Task Governance & Execution</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Manage operational deliverables, milestone tracking, and overdue reminders</p>
        </div>
        <button id="btn-add-task" class="btn btn-primary">
          <i class="fas fa-plus"></i> New Task
        </button>
      </div>

      <!-- Filters -->
      <div class="card" style="padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="task-filters">
            <button class="btn btn-secondary btn-sm filter-btn active" data-filter="ALL">All Tasks</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-filter="TODAY"><i class="fas fa-calendar-day"></i> Due Today</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-filter="OVERDUE"><i class="fas fa-clock" style="color: var(--accent-danger);"></i> Overdue</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-filter="PENDING">Pending</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-filter="COMPLETED">Completed</button>
          </div>
          <div style="min-width: 250px;">
            <input type="text" id="task-search" class="form-control" placeholder="Search tasks..." style="padding: 6px 12px; font-size: 0.85rem;">
          </div>
        </div>
      </div>

      <!-- Tasks List -->
      <div class="card" style="padding: 0;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style="width: 40px;"></th>
                <th>Task Title / Deliverable</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Assigned To</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="tasks-table-body">
              <tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading tasks...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  let currentFilter = 'ALL';
  let searchQuery = '';

  async function loadTasks() {
    const tbody = container.querySelector('#tasks-table-body');
    try {
      let tasks = [];
      const today = new Date().toISOString().slice(0, 10);

      if (currentFilter === 'TODAY' || currentFilter === 'OVERDUE') {
        const schedRes = await APIClient.getTaskSchedule();
        if (currentFilter === 'TODAY') tasks = schedRes.data.today || [];
        if (currentFilter === 'OVERDUE') tasks = schedRes.data.overdue || [];
      } else {
        const params = {};
        if (currentFilter === 'PENDING') params.status = 'PENDING';
        if (currentFilter === 'COMPLETED') params.status = 'COMPLETED';
        if (searchQuery) params.search = searchQuery;
        const res = await APIClient.getTasks(params);
        tasks = res.data;
      }

      if (tasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No tasks found for current filter.</td></tr>`;
        return;
      }

      tbody.innerHTML = tasks.map(t => {
        const isOverdue = t.due_date && t.due_date < today && t.status !== 'COMPLETED';
        const isDone = t.status === 'COMPLETED';

        return `
          <tr style="${isDone ? 'opacity: 0.6;' : ''}">
            <td>
              <input type="checkbox" class="task-check" data-id="${t.id}" ${isDone ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
            </td>
            <td>
              <div style="font-weight: 600; color: #fff; ${isDone ? 'text-decoration: line-through;' : ''}">${escapeHtml(t.title)}</div>
              ${t.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(t.description)}</div>` : ''}
            </td>
            <td><span class="badge priority-${t.priority.toLowerCase()}">${t.priority}</span></td>
            <td>
              <span class="badge ${isDone ? 'badge-won' : 'badge-new'}">${t.status}</span>
            </td>
            <td>
              <div style="font-size: 0.8rem; font-weight: ${isOverdue ? '700' : '400'}; color: ${isOverdue ? '#F87171' : '#94A3B8'};">
                ${isOverdue ? '<i class="fas fa-triangle-exclamation" style="margin-right: 4px;"></i>' : '<i class="far fa-calendar" style="margin-right: 4px;"></i>'}
                ${formatDate(t.due_date)}
              </div>
            </td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(t.assigned_to_name || 'Unassigned')}</td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm btn-delete-task" data-id="${t.id}" data-title="${escapeHtml(t.title)}" title="Delete Task">
                <i class="fas fa-trash-can" style="color: var(--accent-danger);"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Toggle Complete Checkbox
      tbody.querySelectorAll('.task-check').forEach(cb => {
        cb.addEventListener('change', async (e) => {
          const newStatus = e.target.checked ? 'COMPLETED' : 'PENDING';
          await APIClient.updateTask(e.target.dataset.id, { status: newStatus });
          showToast(`Task marked as ${newStatus}`, 'success');
          loadTasks();
        });
      });

      // Delete Task
      tbody.querySelectorAll('.btn-delete-task').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Delete task "${btn.dataset.title}"?`)) return;
          try {
            await APIClient.deleteTask(btn.dataset.id);
            showToast('Task deleted', 'success');
            loadTasks();
          } catch (err) {
            showToast(err.message || 'Failed deleting task', 'error');
          }
        });
      });
    } catch (err) {
      showToast(err.message || 'Failed loading tasks', 'error');
    }
  }

  // Filter Buttons
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadTasks();
    });
  });

  // Search
  let searchTimer;
  container.querySelector('#task-search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      loadTasks();
    }, 300);
  });

  // Add Task Modal
  container.querySelector('#btn-add-task').addEventListener('click', () => {
    showModal({
      title: 'Create New Task Deliverable',
      bodyHtml: `
        <form id="create-task-form">
          <div class="form-group">
            <label class="form-label">Task Title *</label>
            <input type="text" id="task-title" class="form-control" placeholder="e.g. Follow up on proposal terms" required>
          </div>
          <div class="form-group">
            <label class="form-label">Description / Scope</label>
            <textarea id="task-desc" class="form-control" placeholder="Detailed notes or deliverables..."></textarea>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="task-priority" class="form-control">
                <option value="LOW">LOW</option>
                <option value="MEDIUM" selected>MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Due Date</label>
              <input type="date" id="task-due" class="form-control" value="${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}">
            </div>
          </div>
        </form>
      `,
      footerButtons: [
        { label: 'Cancel', className: 'btn-secondary' },
        {
          label: 'Create Task',
          className: 'btn-primary',
          onClick: async (modalEl) => {
            const title = modalEl.querySelector('#task-title').value.trim();
            if (!title) {
              showToast('Task title is required', 'error');
              return false;
            }

            const data = {
              title,
              description: modalEl.querySelector('#task-desc').value.trim() || null,
              priority: modalEl.querySelector('#task-priority').value,
              dueDate: modalEl.querySelector('#task-due').value || null,
            };

            try {
              await APIClient.createTask(data);
              showToast('Task created successfully', 'success');
              loadTasks();
              return true;
            } catch (err) {
              showToast(err.message || 'Failed creating task', 'error');
              return false;
            }
          }
        }
      ]
    });
  });

  loadTasks();
}
