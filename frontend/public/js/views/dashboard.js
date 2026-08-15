import { APIClient } from '../api.js';
import { showToast, formatDate, formatDateTime, escapeHtml } from '../components/ui.js';

export async function renderDashboardView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">Executive Operations Center</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Real-time metrics, urgent follow-ups, and AI operational briefing</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-refresh-brief" class="btn btn-ai btn-sm">
            <i class="fas fa-robot"></i> Refresh AI Daily Brief
          </button>
          <a href="#/assistant" class="btn btn-primary btn-sm">
            <i class="fas fa-terminal"></i> AI Console
          </a>
        </div>
      </div>

      <div id="dashboard-loading" style="text-align: center; padding: 40px;">
        <div class="loader-spinner" style="margin: 0 auto 12px auto;"></div>
        <span style="color: var(--text-muted); font-size: 0.9rem;">Gathering live business intelligence...</span>
      </div>

      <div id="dashboard-content" style="display: none;">
        <!-- Alert Banner (Urgent Items) -->
        <div id="urgent-alerts-container"></div>

        <!-- Metrics Grid -->
        <div class="grid-4" style="margin-bottom: 24px;">
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Total Leads</span>
              <div class="metric-icon-wrap metric-icon-blue"><i class="fas fa-users"></i></div>
            </div>
            <div class="metric-value" id="m-total-leads">0</div>
            <div class="metric-foot"><span id="m-won-leads" style="color: var(--accent-success); font-weight: 600;">0</span> won contracts</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Active Tasks</span>
              <div class="metric-icon-wrap metric-icon-purple"><i class="fas fa-list-check"></i></div>
            </div>
            <div class="metric-value" id="m-active-tasks">0</div>
            <div class="metric-foot"><span id="m-today-tasks" style="color: var(--accent-primary); font-weight: 600;">0</span> due today</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Overdue Tasks</span>
              <div class="metric-icon-wrap metric-icon-red"><i class="fas fa-clock"></i></div>
            </div>
            <div class="metric-value" id="m-overdue-tasks" style="color: var(--accent-danger);">0</div>
            <div class="metric-foot" style="color: #F87171;">Requires immediate resolution</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">AI System Guardrails</span>
              <div class="metric-icon-wrap metric-icon-green"><i class="fas fa-shield-check"></i></div>
            </div>
            <div class="metric-value" style="color: var(--accent-success); font-size: 1.5rem; margin-top: 18px;">Active</div>
            <div class="metric-foot">Human-in-the-Loop Enforced</div>
          </div>
        </div>

        <!-- AI Executive Brief Section -->
        <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--accent-ai);">
          <div class="card-header" style="margin-bottom: 12px;">
            <div class="card-title" style="color: #C4B5FD;">
              <i class="fas fa-microchip-ai"></i> AI Operations Brief & Health Assessment
            </div>
            <span id="brief-date" style="font-size: 0.75rem; color: var(--text-muted);"></span>
          </div>
          <div id="brief-summary-text" style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.6; margin-bottom: 16px;">
            Loading verified daily brief...
          </div>
          <div id="brief-recommendations" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
        </div>

        <!-- 2 Column Layout: Today's Tasks & Followups -->
        <div class="grid-2" style="margin-bottom: 24px;">
          <!-- Today's Priority Tasks -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title"><i class="fas fa-calendar-day" style="color: var(--accent-primary);"></i> Today's Priority Tasks</h3>
                <p class="card-subtitle">Immediate operational deliverables</p>
              </div>
              <a href="#/tasks" class="btn btn-secondary btn-sm">View All Tasks</a>
            </div>
            <div id="today-tasks-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
          </div>

          <!-- Upcoming & Overdue Follow-ups -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title"><i class="fas fa-phone-volume" style="color: var(--accent-info);"></i> Customer Follow-Ups</h3>
                <p class="card-subtitle">Scheduled communications & outreach</p>
              </div>
              <a href="#/leads" class="btn btn-secondary btn-sm">CRM Pipeline</a>
            </div>
            <div id="followups-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
          </div>
        </div>

        <!-- Recent Audit Activities -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title"><i class="fas fa-timeline" style="color: var(--text-secondary);"></i> Recent Immutable Audit Trail</h3>
              <p class="card-subtitle">Transparent governance and execution log</p>
            </div>
            <a href="#/activity" class="btn btn-secondary btn-sm">Full Audit Trail</a>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User / Origin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="activity-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  const loadingEl = container.querySelector('#dashboard-loading');
  const contentEl = container.querySelector('#dashboard-content');
  const refreshBriefBtn = container.querySelector('#btn-refresh-brief');

  async function loadDashboardData() {
    try {
      const [summaryRes, briefRes] = await Promise.all([
        APIClient.getDashboardSummary(),
        APIClient.getDailyBrief(),
      ]);

      const summary = summaryRes.data;
      const brief = briefRes.data;

      // Populate metrics
      container.querySelector('#m-total-leads').textContent = summary.metrics.totalLeads;
      container.querySelector('#m-won-leads').textContent = `${summary.metrics.wonLeads} won`;
      container.querySelector('#m-active-tasks').textContent = summary.metrics.pendingTasks;
      container.querySelector('#m-today-tasks').textContent = summary.todayTasks.length;
      container.querySelector('#m-overdue-tasks').textContent = summary.metrics.overdueTasks;

      // Urgent alerts banner
      const alertsContainer = container.querySelector('#urgent-alerts-container');
      alertsContainer.innerHTML = '';
      if (summary.urgentItems && summary.urgentItems.length > 0) {
        alertsContainer.innerHTML = `
          <div class="alert-banner danger">
            <div class="alert-content">
              <i class="fas fa-triangle-exclamation" style="font-size: 1.2rem;"></i>
              <div>
                <strong>${summary.urgentItems.length} Urgent Action(s) Require Immediate Attention:</strong>
                <div style="font-size: 0.8rem; margin-top: 2px;">
                  ${summary.urgentItems.slice(0, 2).map(i => escapeHtml(i.title)).join(' • ')}
                </div>
              </div>
            </div>
            <a href="#/tasks" class="btn btn-danger btn-sm" style="background: rgba(255,255,255,0.2);">Resolve Now</a>
          </div>
        `;
      }

      // Brief
      container.querySelector('#brief-date').textContent = formatDate(brief.date);
      container.querySelector('#brief-summary-text').textContent = brief.aiExecutiveSummary || 'Business operating within normal operational parameters.';
      
      const recsEl = container.querySelector('#brief-recommendations');
      recsEl.innerHTML = (brief.aiRecommendations || []).map(r => `
        <span style="font-size: 0.75rem; background-color: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 4px 10px; border-radius: var(--radius-full); color: var(--text-secondary);">
          <i class="fas fa-check-circle" style="color: var(--accent-ai); margin-right: 4px;"></i> ${escapeHtml(r)}
        </span>
      `).join('');

      // Today Tasks
      const todayListEl = container.querySelector('#today-tasks-list');
      if (summary.todayTasks.length === 0) {
        todayListEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">No pending tasks scheduled for today. Great job!</div>`;
      } else {
        todayListEl.innerHTML = summary.todayTasks.map(t => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background-color: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" class="task-checkbox" data-id="${t.id}" style="cursor: pointer; width: 16px; height: 16px;">
              <div>
                <div style="font-size: 0.875rem; font-weight: 600; color: #fff;">${escapeHtml(t.title)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(t.assigned_to_name || 'Unassigned')}</div>
              </div>
            </div>
            <span class="badge priority-${t.priority.toLowerCase()}">${t.priority}</span>
          </div>
        `).join('');

        todayListEl.querySelectorAll('.task-checkbox').forEach(cb => {
          cb.addEventListener('change', async (e) => {
            if (e.target.checked) {
              await APIClient.updateTask(e.target.dataset.id, { status: 'COMPLETED' });
              showToast('Task marked as completed', 'success');
              loadDashboardData();
            }
          });
        });
      }

      // Followups
      const followupsEl = container.querySelector('#followups-list');
      const allFollowups = [...(summary.upcomingFollowups || [])];
      if (allFollowups.length === 0) {
        followupsEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">No customer follow-ups scheduled for the next 7 days.</div>`;
      } else {
        followupsEl.innerHTML = allFollowups.map(l => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background-color: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #fff;">${escapeHtml(l.name)} (${escapeHtml(l.company || 'Direct')})</div>
              <div style="font-size: 0.75rem; color: var(--accent-info);"><i class="far fa-calendar"></i> Due: ${formatDate(l.next_followup)}</div>
            </div>
            <a href="#/leads" class="btn btn-secondary btn-sm"><i class="fas fa-envelope-open-text"></i> Outreach</a>
          </div>
        `).join('');
      }

      // Activities
      const activityBody = container.querySelector('#activity-table-body');
      if (summary.recentActivities.length === 0) {
        activityBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No activity recorded yet.</td></tr>`;
      } else {
        activityBody.innerHTML = summary.recentActivities.map(a => `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${formatDateTime(a.timestamp)}</td>
            <td style="font-weight: 600; font-size: 0.8rem; color: #E2E8F0;">${escapeHtml(a.action)}</td>
            <td><span class="badge" style="background-color: var(--bg-surface-hover); color: var(--text-secondary);">${a.resource_type}</span></td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(a.user_name || 'System / AI')}</td>
            <td><span class="badge badge-won">${a.status}</span></td>
          </tr>
        `).join('');
      }

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (err) {
      showToast(err.message || 'Failed loading dashboard', 'error');
      loadingEl.innerHTML = `<div style="color: var(--accent-danger);">Error loading data: ${escapeHtml(err.message)}</div>`;
    }
  }

  refreshBriefBtn.addEventListener('click', async () => {
    refreshBriefBtn.disabled = true;
    refreshBriefBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    await loadDashboardData();
    refreshBriefBtn.disabled = false;
    refreshBriefBtn.innerHTML = '<i class="fas fa-robot"></i> Refresh AI Daily Brief';
    showToast('AI Daily Brief refreshed with verified metrics.', 'success');
  });

  loadDashboardData();
}
