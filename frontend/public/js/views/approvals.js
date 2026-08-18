import { APIClient } from '../api.js';
import { showToast, showModal, formatDateTime, escapeHtml } from '../components/ui.js';

export async function renderApprovalsView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">Human Governance & Approval Queue</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Strict human-in-the-loop authorization gate for medium and high-risk AI operations</p>
        </div>
      </div>

      <div class="alert-banner info" style="margin-bottom: 20px;">
        <div class="alert-content">
          <i class="fas fa-shield-halved" style="font-size: 1.2rem;"></i>
          <div>
            <strong>Automated Safety Guarantee:</strong>
            <span style="font-size: 0.85rem;"> High-risk outbound operations (external communications, deletions, permission modifications) will never execute without an explicit manager sign-off.</span>
          </div>
        </div>
      </div>

      <!-- Approvals List -->
      <div id="approvals-container" style="display: flex; flex-direction: column; gap: 16px;">
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading approval requests...</div>
      </div>
    </div>
  `;

  async function loadApprovals() {
    const listEl = container.querySelector('#approvals-container');
    listEl.innerHTML = `
      <div class="skeleton-card" style="min-height: 120px;">
        <div class="skeleton skeleton-text" style="width: 30%; height: 18px;"></div>
        <div class="skeleton skeleton-text" style="width: 60%; height: 14px;"></div>
        <div class="skeleton skeleton-box" style="height: 50px;"></div>
      </div>
      <div class="skeleton-card" style="min-height: 120px;">
        <div class="skeleton skeleton-text" style="width: 30%; height: 18px;"></div>
        <div class="skeleton skeleton-text" style="width: 60%; height: 14px;"></div>
        <div class="skeleton skeleton-box" style="height: 50px;"></div>
      </div>
    `;
    try {
      const res = await APIClient.getApprovals();
      const approvals = res.data;

      if (approvals.length === 0) {
        listEl.innerHTML = `
          <div class="card" style="text-align: center; padding: 50px;">
            <i class="fas fa-circle-check" style="font-size: 2.5rem; color: var(--accent-success); margin-bottom: 12px;"></i>
            <h3 style="color: #fff; font-size: 1.1rem;">All Queues Clear</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">No pending actions currently require human supervisor authorization.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = approvals.map(appr => {
        const isPending = appr.status === 'PENDING';
        const isApproved = appr.status === 'APPROVED';

        return `
          <div class="card" style="border-left: 4px solid ${isPending ? 'var(--accent-warning)' : (isApproved ? 'var(--accent-success)' : 'var(--accent-danger)')};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge risk-${appr.risk_level.toLowerCase()}">${appr.risk_level} RISK</span>
                  <span style="font-weight: 700; color: #fff; font-size: 1rem;">${escapeHtml(appr.action_type)}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                  Requested by: <strong>${escapeHtml(appr.requested_by)}</strong> • ${formatDateTime(appr.created_at)}
                </div>
              </div>
              <div>
                <span class="badge ${isPending ? 'priority-urgent' : (isApproved ? 'badge-won' : 'badge-lost')}">
                  ${appr.status}
                </span>
              </div>
            </div>

            <div style="background-color: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 14px;">
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                <i class="fas fa-circle-info"></i> Reason for Interception:
              </div>
              <div style="font-size: 0.9rem; color: #fff;">${escapeHtml(appr.reason)}</div>

              ${appr.action_type === 'COMMUNICATION_DRAFT' && appr.payload.draft_message ? `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-subtle);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 0.75rem; color: #60A5FA; font-weight: 700; text-transform: uppercase;">
                      <i class="fab fa-whatsapp"></i> WhatsApp Follow-up Message Draft (${escapeHtml(appr.payload.language || 'English')})
                    </span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">Lead: <strong>${escapeHtml(appr.payload.customer_name || 'Customer')}</strong></span>
                  </div>
                  <div style="background: var(--bg-main); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); color: #fff; font-size: 0.88rem; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(appr.payload.draft_message)}</div>
                  <div style="font-size: 0.75rem; color: #FDE68A; margin-top: 6px; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-shield-halved" style="color: #FBBF24;"></i> Draft generated. Human approval required before sending.
                  </div>
                </div>
              ` : `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Payload Parameters</div>
                  <pre style="background: var(--bg-main); padding: 8px 12px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.75rem; color: #A7F3D0; overflow-x: auto; max-height: 120px;">${escapeHtml(JSON.stringify(appr.payload, null, 2))}</pre>
                </div>
              `}
            </div>

            ${isPending ? `
              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn btn-danger btn-sm btn-reject" data-id="${appr.id}">
                  <i class="fas fa-times"></i> Reject Action
                </button>
                <button class="btn btn-success btn-sm btn-approve" data-id="${appr.id}">
                  <i class="fas fa-check"></i> Authorize & Execute
                </button>
              </div>
            ` : `
              <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                <span>Resolved by: <strong>${escapeHtml(appr.approved_by_name || 'Authorized Supervisor')}</strong></span>
                <span>${formatDateTime(appr.resolved_at)}</span>
              </div>
            `}
          </div>
        `;
      }).join('');

      // Attach button handlers
      listEl.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
          try {
            await APIClient.approveAction(btn.dataset.id);
            showToast('Action authorized and executed successfully.', 'success');
            loadApprovals();
          } catch (err) {
            showToast(err.message || 'Authorization failed', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Authorize & Execute';
          }
        });
      });

      listEl.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', () => {
          showModal({
            title: 'Reject Action Request',
            bodyHtml: `
              <div class="form-group">
                <label class="form-label">Rejection Reason *</label>
                <textarea id="reject-reason" class="form-control" placeholder="Specify reason why this action is denied..." required></textarea>
              </div>
            `,
            footerButtons: [
              { label: 'Cancel', className: 'btn-secondary' },
              {
                label: 'Confirm Rejection',
                className: 'btn-danger',
                onClick: async (modalEl) => {
                  const reason = modalEl.querySelector('#reject-reason').value.trim();
                  if (!reason) {
                    showToast('Rejection reason is required', 'error');
                    return false;
                  }

                  try {
                    await APIClient.rejectAction(btn.dataset.id, reason);
                    showToast('Action request rejected', 'info');
                    loadApprovals();
                    return true;
                  } catch (err) {
                    showToast(err.message || 'Rejection failed', 'error');
                    return false;
                  }
                }
              }
            ]
          });
        });
      });
    } catch (err) {
      showToast(err.message || 'Failed loading approvals', 'error');
    }
  }

  loadApprovals();
}
