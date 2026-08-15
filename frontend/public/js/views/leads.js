import { APIClient } from '../api.js';
import { showToast, showModal, formatDate, escapeHtml } from '../components/ui.js';

export async function renderLeadsView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">Leads & Customer Pipeline</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Manage prospect relationships, qualification stages, and follow-up sequences</p>
        </div>
        <button id="btn-add-lead" class="btn btn-primary">
          <i class="fas fa-plus"></i> New Lead
        </button>
      </div>

      <!-- Filter Controls Bar -->
      <div class="card" style="padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="lead-status-filters">
            <button class="btn btn-secondary btn-sm filter-btn active" data-status="">All</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="NEW">New</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="QUALIFIED">Qualified</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="PROPOSAL">Proposal</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="NEGOTIATION">Negotiation</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="WON">Won</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="LOST">Lost</button>
          </div>
          <div style="min-width: 250px;">
            <input type="text" id="lead-search" class="form-control" placeholder="Search by name, company, email..." style="padding: 6px 12px; font-size: 0.85rem;">
          </div>
        </div>
      </div>

      <!-- Leads Table -->
      <div class="card" style="padding: 0;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Lead / Contact</th>
                <th>Company</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Next Follow-Up</th>
                <th>AI Qualification</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="leads-table-body">
              <tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading leads...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  let currentStatusFilter = '';
  let searchQuery = '';

  async function loadLeads() {
    const tbody = container.querySelector('#leads-table-body');
    try {
      const params = {};
      if (currentStatusFilter) params.status = currentStatusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await APIClient.getLeads(params);
      const leads = res.data;

      if (leads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No leads found matching current criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = leads.map(l => `
        <tr>
          <td>
            <div style="font-weight: 700; color: #fff;">${escapeHtml(l.name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(l.email || l.phone || 'No direct contact')}</div>
          </td>
          <td>
            <div style="font-weight: 500; color: #E2E8F0;">${escapeHtml(l.company || 'Direct Client')}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">Source: ${escapeHtml(l.source || 'DIRECT')}</div>
          </td>
          <td><span class="badge badge-${l.status.toLowerCase()}">${l.status}</span></td>
          <td><span class="badge priority-${l.priority.toLowerCase()}">${l.priority}</span></td>
          <td>
            <div style="font-size: 0.8rem; color: ${l.next_followup ? '#93C5FD' : 'var(--text-muted)'};">
              <i class="far fa-calendar-check" style="margin-right: 4px;"></i> ${formatDate(l.next_followup)}
            </div>
          </td>
          <td>
            <div style="font-size: 0.8rem; color: #C4B5FD; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(l.ai_suggested_action || l.ai_classification || 'Standard Follow-up')}">
              <i class="fas fa-sparkles" style="color: var(--accent-ai);"></i> ${escapeHtml(l.ai_classification || l.ai_suggested_action || 'Pending Classification')}
            </div>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm btn-draft-action" data-id="${l.id}" title="Generate AI Draft">
                <i class="fas fa-feather-pointed" style="color: var(--accent-ai);"></i> Draft
              </button>
              <button class="btn btn-secondary btn-sm btn-delete-lead" data-id="${l.id}" data-name="${escapeHtml(l.name)}" title="Delete Lead">
                <i class="fas fa-trash-can" style="color: var(--accent-danger);"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      // Attach actions
      tbody.querySelectorAll('.btn-draft-action').forEach(btn => {
        btn.addEventListener('click', () => openDraftModal(btn.dataset.id));
      });

      tbody.querySelectorAll('.btn-delete-lead').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteLead(btn.dataset.id, btn.dataset.name));
      });
    } catch (err) {
      showToast(err.message || 'Failed loading leads', 'error');
    }
  }

  // Filter Buttons
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.dataset.status;
      loadLeads();
    });
  });

  // Search Input
  let searchTimeout;
  container.querySelector('#lead-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.trim();
      loadLeads();
    }, 300);
  });

  // Add Lead Modal
  container.querySelector('#btn-add-lead').addEventListener('click', () => {
    showModal({
      title: 'Create New Customer Lead',
      bodyHtml: `
        <form id="create-lead-form">
          <div class="form-group">
            <label class="form-label">Contact Name *</label>
            <input type="text" id="lead-name" class="form-control" required placeholder="e.g. John Doe">
          </div>
          <div class="form-group">
            <label class="form-label">Company Name</label>
            <input type="text" id="lead-company" class="form-control" placeholder="e.g. Acme Corp">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="lead-email" class="form-control" placeholder="john@acme.com">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" id="lead-phone" class="form-control" placeholder="+1 (555) 000-0000">
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Pipeline Stage</label>
              <select id="lead-status" class="form-control">
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="PROPOSAL">PROPOSAL</option>
                <option value="NEGOTIATION">NEGOTIATION</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="lead-priority" class="form-control">
                <option value="LOW">LOW</option>
                <option value="MEDIUM" selected>MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Next Follow-Up Date</label>
            <input type="date" id="lead-followup" class="form-control" value="${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}">
          </div>
          <div class="form-group">
            <label class="form-label">Initial Discussion / Notes</label>
            <textarea id="lead-notes" class="form-control" placeholder="Key prospect objectives or discussion points..."></textarea>
          </div>
        </form>
      `,
      footerButtons: [
        { label: 'Cancel', className: 'btn-secondary' },
        {
          label: 'Create & Classify Lead',
          className: 'btn-primary',
          onClick: async (modalEl) => {
            const name = modalEl.querySelector('#lead-name').value.trim();
            if (!name) {
              showToast('Lead name is required', 'error');
              return false;
            }

            const data = {
              name,
              company: modalEl.querySelector('#lead-company').value.trim() || null,
              email: modalEl.querySelector('#lead-email').value.trim() || null,
              phone: modalEl.querySelector('#lead-phone').value.trim() || null,
              status: modalEl.querySelector('#lead-status').value,
              priority: modalEl.querySelector('#lead-priority').value,
              nextFollowup: modalEl.querySelector('#lead-followup').value || null,
              notes: modalEl.querySelector('#lead-notes').value.trim() || null,
            };

            try {
              await APIClient.createLead(data);
              showToast('Lead created and added to pipeline', 'success');
              loadLeads();
              return true;
            } catch (err) {
              showToast(err.message || 'Failed creating lead', 'error');
              return false;
            }
          }
        }
      ]
    });
  });

  // Draft Generator Modal
  async function openDraftModal(leadId) {
    showModal({
      title: 'AI Customer Follow-up Draft',
      bodyHtml: `
        <div id="draft-loading" style="text-align: center; padding: 20px;">
          <div class="loader-spinner" style="margin: 0 auto 10px auto;"></div>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Composing strategic customer outreach draft...</span>
        </div>
        <div id="draft-container" style="display: none;">
          <div class="form-group">
            <label class="form-label">Subject Line</label>
            <input type="text" id="draft-subject" class="form-control" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Email Draft Body</label>
            <textarea id="draft-body" class="form-control" style="min-height: 160px; font-family: var(--font-sans); line-height: 1.6;" readonly></textarea>
          </div>
          <div style="font-size: 0.75rem; color: var(--accent-warning); background: var(--accent-warning-light); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent-warning);">
            <i class="fas fa-shield-halved"></i> <strong>Human-in-the-Loop Governance:</strong> MEGADRONE will not dispatch external communications to clients without your formal approval.
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Close', className: 'btn-secondary' },
        {
          label: 'Copy Draft to Clipboard',
          className: 'btn-primary',
          onClick: (modalEl) => {
            const body = modalEl.querySelector('#draft-body').value;
            navigator.clipboard.writeText(body);
            showToast('Draft copied to clipboard', 'success');
            return true;
          }
        }
      ]
    });

    try {
      const res = await APIClient.getLeadDraft(leadId);
      const draft = res.data;
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        overlay.querySelector('#draft-loading').style.display = 'none';
        overlay.querySelector('#draft-container').style.display = 'block';
        overlay.querySelector('#draft-subject').value = draft.subject || 'Follow-up regarding our conversation';
        overlay.querySelector('#draft-body').value = draft.body || '';
      }
    } catch (err) {
      showToast(err.message || 'Failed generating draft', 'error');
    }
  }

  // Delete Lead
  async function handleDeleteLead(leadId, leadName) {
    if (!confirm(`Are you sure you want to delete lead "${leadName}"?`)) return;
    try {
      await APIClient.deleteLead(leadId);
      showToast('Lead deleted successfully', 'success');
      loadLeads();
    } catch (err) {
      showToast(err.message || 'Failed deleting lead', 'error');
    }
  }

  loadLeads();
}
