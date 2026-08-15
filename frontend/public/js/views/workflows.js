import { APIClient } from '../api.js';
import { showToast, showModal, formatDateTime, escapeHtml } from '../components/ui.js';

export async function renderWorkflowsView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">Automated Workflow Engine</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Event-driven operational automation triggers, condition evaluation, and AI actions</p>
        </div>
        <button id="btn-create-workflow" class="btn btn-primary">
          <i class="fas fa-plus"></i> New Automation Rule
        </button>
      </div>

      <!-- Active Workflows Grid -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fas fa-bolt" style="color: var(--accent-warning);"></i> Configured Automated Workflows</h3>
            <p class="card-subtitle">Rules evaluated automatically upon business events</p>
          </div>
        </div>
        <div id="workflows-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
      </div>

      <!-- Execution Run Logs -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fas fa-clock-rotate-left" style="color: var(--accent-primary);"></i> Workflow Execution Run History</h3>
            <p class="card-subtitle">Audited step-by-step logs of executed automation runs</p>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Execution ID</th>
                <th>Workflow</th>
                <th>Trigger Event</th>
                <th>Status</th>
                <th>Steps Executed</th>
                <th>Started At</th>
              </tr>
            </thead>
            <tbody id="runs-table-body">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Loading runs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  async function loadWorkflows() {
    const listEl = container.querySelector('#workflows-list');
    const runsTbody = container.querySelector('#runs-table-body');

    try {
      const [wfRes, runsRes] = await Promise.all([
        APIClient.getWorkflows(),
        APIClient.getWorkflowRuns(),
      ]);

      const workflows = wfRes.data;
      const runs = runsRes.data;

      // Workflows
      if (workflows.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No automated workflows configured.</div>`;
      } else {
        listEl.innerHTML = workflows.map(wf => `
          <div style="background-color: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <div style="font-weight: 700; color: #fff; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                  ${escapeHtml(wf.name)}
                  <span class="badge ${wf.is_active ? 'badge-won' : 'badge-lost'}">${wf.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(wf.description || 'No description')}</div>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm btn-trigger-wf" data-id="${wf.id}" title="Run Manually">
                  <i class="fas fa-play" style="color: var(--accent-success);"></i> Test Run
                </button>
                <button class="btn btn-secondary btn-sm btn-delete-wf" data-id="${wf.id}" title="Delete Workflow">
                  <i class="fas fa-trash-can" style="color: var(--accent-danger);"></i>
                </button>
              </div>
            </div>

            <!-- Pipeline Diagram -->
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--bg-main); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.8rem;">
              <span style="background: var(--bg-surface-hover); padding: 3px 8px; border-radius: 4px; color: #FBBF24;">
                <i class="fas fa-bolt"></i> ${wf.trigger_type}
              </span>
              <i class="fas fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
              <span style="color: var(--text-secondary);">
                ${wf.conditions.length ? `${wf.conditions.length} condition(s)` : 'Always'}
              </span>
              <i class="fas fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
              <div style="display: flex; gap: 6px;">
                ${wf.actions.map(a => `
                  <span style="background: var(--accent-primary-light); color: var(--accent-primary); padding: 2px 8px; border-radius: 4px; font-weight: 600;">
                    ${escapeHtml(a.type)}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('');

        listEl.querySelectorAll('.btn-trigger-wf').forEach(btn => {
          btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
              const res = await APIClient.triggerWorkflow(btn.dataset.id, {
                name: 'Manual Test Enterprise Lead',
                company: 'Apex Test Co',
                email: 'test@apex.com'
              });
              showToast(`Workflow execution triggered (Status: ${res.data.status})`, 'success');
              loadWorkflows();
            } catch (err) {
              showToast(err.message || 'Execution failed', 'error');
            } finally {
              btn.disabled = false;
            }
          });
        });

        listEl.querySelectorAll('.btn-delete-wf').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm('Delete this workflow?')) return;
            try {
              await APIClient.deleteWorkflow(btn.dataset.id);
              showToast('Workflow deleted', 'success');
              loadWorkflows();
            } catch (err) {
              showToast(err.message || 'Delete failed', 'error');
            }
          });
        });
      }

      // Runs
      if (runs.length === 0) {
        runsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No execution runs recorded yet.</td></tr>`;
      } else {
        runsTbody.innerHTML = runs.map(r => `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary);">${r.id}</td>
            <td style="font-weight: 600; color: #fff;">${escapeHtml(r.workflow_name || 'Workflow')}</td>
            <td><span class="badge badge-new">${r.trigger_event}</span></td>
            <td>
              <span class="badge ${r.status === 'COMPLETED' ? 'badge-won' : (r.status === 'WAITING_APPROVAL' ? 'priority-urgent' : 'badge-lost')}">
                ${r.status}
              </span>
            </td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${r.executionSteps ? r.executionSteps.length : 0} step(s)</td>
            <td style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">${formatDateTime(r.started_at)}</td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast(err.message || 'Failed loading workflows', 'error');
    }
  }

  // Create Workflow Modal
  container.querySelector('#btn-create-workflow').addEventListener('click', () => {
    showModal({
      title: 'Create Automated Workflow Rule',
      bodyHtml: `
        <form id="create-wf-form">
          <div class="form-group">
            <label class="form-label">Workflow Name *</label>
            <input type="text" id="wf-name" class="form-control" placeholder="e.g. Inbound Lead Auto-Followup" required>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input type="text" id="wf-desc" class="form-control" placeholder="Purpose of this automation...">
          </div>
          <div class="form-group">
            <label class="form-label">Trigger Event</label>
            <select id="wf-trigger" class="form-control">
              <option value="LEAD_CREATED">LEAD_CREATED (When new lead is registered)</option>
              <option value="TASK_OVERDUE">TASK_OVERDUE (When task passes due date)</option>
              <option value="STATUS_CHANGED">STATUS_CHANGED (When lead stage advances)</option>
              <option value="MANUAL">MANUAL (On-demand execution)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Primary Automated Action</label>
            <select id="wf-action" class="form-control">
              <option value="CLASSIFY_LEAD">CLASSIFY_LEAD (Enrich and classify with AI)</option>
              <option value="CREATE_TASK">CREATE_TASK (Schedule automated follow-up task)</option>
              <option value="GENERATE_SUGGESTED_DRAFT">GENERATE_SUGGESTED_DRAFT (Prepare email draft)</option>
              <option value="SEND_EXTERNAL_MESSAGE">SEND_EXTERNAL_MESSAGE (Requires Human Approval)</option>
            </select>
          </div>
        </form>
      `,
      footerButtons: [
        { label: 'Cancel', className: 'btn-secondary' },
        {
          label: 'Create Automation',
          className: 'btn-primary',
          onClick: async (modalEl) => {
            const name = modalEl.querySelector('#wf-name').value.trim();
            if (!name) {
              showToast('Workflow name is required', 'error');
              return false;
            }

            const data = {
              name,
              description: modalEl.querySelector('#wf-desc').value.trim() || null,
              triggerType: modalEl.querySelector('#wf-trigger').value,
              conditions: [{ field: 'name', operator: 'IS_NOT_NULL', value: '' }],
              actions: [{ type: modalEl.querySelector('#wf-action').value, params: {} }],
              isActive: true,
            };

            try {
              await APIClient.createWorkflow(data);
              showToast('Workflow automation created', 'success');
              loadWorkflows();
              return true;
            } catch (err) {
              showToast(err.message || 'Creation failed', 'error');
              return false;
            }
          }
        }
      ]
    });
  });

  loadWorkflows();
}
