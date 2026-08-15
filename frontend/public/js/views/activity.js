import { APIClient } from '../api.js';
import { showToast, showModal, formatDateTime, escapeHtml } from '../components/ui.js';

export async function renderActivityView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">Immutable Audit & Activity Trail</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Cryptographic and audit-compliant log of all user actions, AI invocations, and workflow executions</p>
        </div>
      </div>

      <div class="card" style="padding: 0;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Resource Type</th>
                <th>User / Trigger</th>
                <th>Status</th>
                <th style="text-align: right;">Details</th>
              </tr>
            </thead>
            <tbody id="audit-table-body">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">Loading audit logs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  async function loadActivity() {
    const tbody = container.querySelector('#audit-table-body');
    try {
      const res = await APIClient.getActivities({ limit: 100 });
      const logs = res.data;

      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No audit events recorded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${formatDateTime(l.timestamp)}</td>
          <td style="font-weight: 700; color: #fff; font-size: 0.85rem;">${escapeHtml(l.action)}</td>
          <td><span class="badge" style="background-color: var(--bg-surface-hover); color: var(--text-secondary);">${l.resource_type}</span></td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(l.user_name || 'System / AI')}</td>
          <td><span class="badge ${l.status === 'SUCCESS' ? 'badge-won' : 'badge-lost'}">${l.status}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm btn-inspect-audit" data-json="${escapeHtml(JSON.stringify(l.details, null, 2))}">
              <i class="fas fa-eye"></i> View JSON
            </button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-inspect-audit').forEach(btn => {
        btn.addEventListener('click', () => {
          showModal({
            title: 'Audit Event Parameters (Sanitized)',
            bodyHtml: `
              <pre style="background: var(--bg-main); padding: 14px; border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.8rem; color: #A7F3D0; overflow-x: auto; max-height: 400px;">${btn.dataset.json}</pre>
            `,
            footerButtons: [{ label: 'Close', className: 'btn-secondary' }]
          });
        });
      });
    } catch (err) {
      showToast(err.message || 'Failed loading audit trail', 'error');
    }
  }

  loadActivity();
}
