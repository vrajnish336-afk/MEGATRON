import { APIClient } from '../api.js';
import { state } from '../state.js';
import { showToast, showModal, formatDate, formatDateTime, escapeHtml } from '../components/ui.js';

export async function renderDashboardView(container) {
  const userName = state.user?.name ? state.user.name.split(' ')[0] : 'Broker';

  container.innerHTML = `
    <div class="page-container">
      <!-- Executive Greeting & Controls -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.8rem; background: rgba(59, 130, 246, 0.15); color: #60A5FA; padding: 2px 8px; border-radius: var(--radius-full); font-weight: 700; text-transform: uppercase;">
              <i class="fas fa-building"></i> Real Estate Operations
            </span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(new Date().toISOString())}</span>
          </div>
          <h1 style="font-size: 1.7rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin-top: 4px;">
            Good morning, ${escapeHtml(userName)}.
          </h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Here is your agency's verified operational brief and prioritized buyer follow-ups for today.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-refresh-brief" class="btn btn-ai btn-sm">
            <i class="fas fa-robot"></i> Refresh Real Estate Brief
          </button>
          <a href="#/assistant" class="btn btn-primary btn-sm">
            <i class="fas fa-terminal"></i> AI Assistant
          </a>
        </div>
      </div>

      <div id="dashboard-loading" style="text-align: center; padding: 40px;">
        <div class="loader-spinner" style="margin: 0 auto 12px auto;"></div>
        <span style="color: var(--text-muted); font-size: 0.9rem;">Gathering live real estate intelligence...</span>
      </div>

      <div id="dashboard-content" style="display: none;">
        <!-- Alert Banner (Urgent Action Items) -->
        <div id="urgent-alerts-container"></div>

        <!-- Section 1: TODAY'S BUSINESS BRIEF -->
        <div class="card" style="margin-bottom: 24px; border-top: 3px solid var(--accent-primary);">
          <div class="card-header" style="margin-bottom: 16px;">
            <div>
              <h2 class="card-title" style="font-size: 1.1rem; color: #fff; text-transform: uppercase; letter-spacing: 0.05em;">
                <i class="fas fa-newspaper" style="color: var(--accent-primary);"></i> Today's Business Brief
              </h2>
              <p class="card-subtitle">Verified live operational telemetry across buyer inquiries, site visits, and transactions</p>
            </div>
            <span class="badge" style="background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-subtle);">
              <i class="fas fa-database" style="color: var(--accent-success); margin-right: 4px;"></i> Live Verified Data
            </span>
          </div>

          <div class="grid-4" id="brief-metrics-grid" style="margin-bottom: 16px;">
            <!-- Brief Metric Cards -->
          </div>

          <div style="background-color: var(--bg-surface); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 12px;">
            <i class="fas fa-microchip-ai" style="color: var(--accent-ai); font-size: 1.2rem; margin-top: 2px;"></i>
            <div>
              <div style="font-size: 0.8rem; font-weight: 700; color: #C4B5FD; text-transform: uppercase; letter-spacing: 0.04em;">Executive AI Assessment & Priorities</div>
              <div id="brief-ai-summary" style="font-size: 0.9rem; color: var(--text-primary); margin-top: 2px; line-height: 1.5;"></div>
            </div>
          </div>
        </div>

        <!-- Section 2: Follow-ups Needing Attention & Today's Site Visits -->
        <div class="grid-2" style="margin-bottom: 24px;">
          <!-- Follow-ups Needing Attention -->
          <div class="card" style="display: flex; flex-direction: column;">
            <div class="card-header" style="margin-bottom: 12px;">
              <div>
                <h3 class="card-title" style="color: #FBBF24;">
                  <i class="fas fa-bell"></i> Follow-ups Needing Attention
                </h3>
                <p class="card-subtitle">Prioritized: Overdue → High Priority → Site Visits</p>
              </div>
              <a href="#/leads" class="btn btn-secondary btn-sm">Full CRM</a>
            </div>
            <div id="attention-leads-list" style="display: flex; flex-direction: column; gap: 10px; flex: 1;"></div>
          </div>

          <!-- Scheduled Site Visits & Priority Tasks -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Today's Site Visits -->
            <div class="card">
              <div class="card-header" style="margin-bottom: 12px;">
                <div>
                  <h3 class="card-title" style="color: #60A5FA;">
                    <i class="fas fa-car-side"></i> Scheduled Site Visits (Today & Upcoming)
                  </h3>
                  <p class="card-subtitle">Property walkthroughs with confirmed buyers</p>
                </div>
              </div>
              <div id="site-visits-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
            </div>

            <!-- Priority Operational Tasks -->
            <div class="card">
              <div class="card-header" style="margin-bottom: 12px;">
                <div>
                  <h3 class="card-title" style="color: #34D399;">
                    <i class="fas fa-list-check"></i> Today's Critical Deliverables
                  </h3>
                </div>
                <a href="#/tasks" class="btn btn-secondary btn-sm">All Tasks</a>
              </div>
              <div id="today-tasks-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
            </div>
          </div>
        </div>

        <!-- Section 3: Business Impact Telemetry (No Fabricated Numbers) -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <div>
              <h3 class="card-title"><i class="fas fa-chart-pie" style="color: var(--accent-info);"></i> Business Impact & Operational Telemetry</h3>
              <p class="card-subtitle">Actual system throughput metrics tracked across your agency workflow</p>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Strictly Real Data</span>
          </div>
          <div class="grid-4" id="business-impact-grid">
            <!-- Business Impact metrics populated here -->
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
      const [briefRes, attentionRes, siteVisitsRes, tasksRes, impactRes] = await Promise.all([
        APIClient.getDailyBrief(),
        APIClient.getFollowupsNeedingAttention(5),
        APIClient.getSiteVisits(),
        APIClient.getTaskSchedule(),
        APIClient.getBusinessImpact(),
      ]);

      const brief = briefRes.data;
      const metrics = brief.realEstateMetrics || {};
      const attentionLeads = attentionRes.data || [];
      const siteVisits = siteVisitsRes.data || { today: [], upcoming: [] };
      const todayTasks = tasksRes.data?.today || [];
      const overdueTasks = tasksRes.data?.overdue || [];
      const impact = impactRes.data;

      // 1. Render Urgent Alert Banner
      const alertsContainer = container.querySelector('#urgent-alerts-container');
      alertsContainer.innerHTML = '';
      if (brief.alerts && brief.alerts.length > 0) {
        alertsContainer.innerHTML = `
          <div class="alert-banner danger">
            <div class="alert-content">
              <i class="fas fa-triangle-exclamation" style="font-size: 1.3rem;"></i>
              <div>
                <strong>Urgent Attention Required:</strong>
                <div style="font-size: 0.85rem; margin-top: 2px;">
                  ${brief.alerts.map(a => escapeHtml(a.message)).join(' • ')}
                </div>
              </div>
            </div>
            <a href="#/leads" class="btn btn-danger btn-sm" style="background: rgba(255,255,255,0.2);">Take Action</a>
          </div>
        `;
      }

      // 2. Render Business Brief Metrics Grid
      const briefGrid = container.querySelector('#brief-metrics-grid');
      briefGrid.innerHTML = `
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">New Inbound Leads</span><i class="fas fa-user-plus" style="color: var(--accent-primary);"></i></div>
          <div class="metric-value">${metrics.newLeadsCount !== undefined ? metrics.newLeadsCount : 'Data unavailable.'}</div>
          <div class="metric-foot">Recent inquiries</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Hot / Urgent Leads</span><i class="fas fa-fire" style="color: var(--accent-warning);"></i></div>
          <div class="metric-value" style="color: #FBBF24;">${metrics.hotLeadsCount !== undefined ? metrics.hotLeadsCount : 'Data unavailable.'}</div>
          <div class="metric-foot">High purchase intent</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Site Visits Today</span><i class="fas fa-location-dot" style="color: var(--accent-info);"></i></div>
          <div class="metric-value" style="color: #38BDF8;">${metrics.siteVisitsTodayCount !== undefined ? metrics.siteVisitsTodayCount : 'Data unavailable.'}</div>
          <div class="metric-foot">${metrics.upcomingSiteVisitsCount || 0} upcoming this week</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Overdue Follow-ups</span><i class="fas fa-clock" style="color: var(--accent-danger);"></i></div>
          <div class="metric-value" style="color: var(--accent-danger);">${metrics.overdueFollowupsCount !== undefined ? metrics.overdueFollowupsCount : 'Data unavailable.'}</div>
          <div class="metric-foot" style="color: #F87171;">Needs immediate contact</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Follow-ups Due Today</span><i class="fas fa-calendar-check" style="color: var(--accent-primary);"></i></div>
          <div class="metric-value">${metrics.followupsDueTodayCount !== undefined ? metrics.followupsDueTodayCount : 'Data unavailable.'}</div>
          <div class="metric-foot">Scheduled communications</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Active Negotiations</span><i class="fas fa-handshake" style="color: #F472B6;"></i></div>
          <div class="metric-value" style="color: #F472B6;">${metrics.negotiationsCount !== undefined ? metrics.negotiationsCount : 'Data unavailable.'}</div>
          <div class="metric-foot">Deals in closing stage</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Won Contracts</span><i class="fas fa-trophy" style="color: var(--accent-success);"></i></div>
          <div class="metric-value" style="color: var(--accent-success);">${metrics.wonDealsCount !== undefined ? metrics.wonDealsCount : 'Data unavailable.'}</div>
          <div class="metric-foot">Closed property sales</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Lost Inquiries</span><i class="fas fa-box-archive" style="color: var(--text-muted);"></i></div>
          <div class="metric-value" style="color: var(--text-muted);">${metrics.lostDealsCount !== undefined ? metrics.lostDealsCount : 'Data unavailable.'}</div>
          <div class="metric-foot">Archived/Relocated</div>
        </div>
      `;

      container.querySelector('#brief-ai-summary').textContent = brief.aiExecutiveSummary || 'Operations tracking live property inquiries and scheduled walkthroughs.';

      // 3. Render Follow-ups Needing Attention
      const attentionEl = container.querySelector('#attention-leads-list');
      if (attentionLeads.length === 0) {
        attentionEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 20px 0;">All customer follow-ups are up to date.</div>`;
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        attentionEl.innerHTML = attentionLeads.map(l => {
          const isOverdue = l.next_followup && l.next_followup < todayStr;
          const reqStr = l.property_type || l.bedrooms ? `${l.bedrooms ? `${l.bedrooms}BHK ` : ''}${l.property_type || 'Property'}` : (l.company || 'Property Inquiry');
          const budgetStr = l.budget_max ? `₹${l.budget_max}L` : '';

          return `
            <div style="background-color: var(--bg-surface); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); border-left: 3px solid ${isOverdue ? 'var(--accent-danger)' : (l.priority === 'URGENT' ? 'var(--accent-warning)' : 'var(--accent-primary)')};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">${escapeHtml(l.name)}</div>
                  <div style="font-size: 0.75rem; color: #93C5FD; margin-top: 1px;">
                    <i class="fas fa-home"></i> ${escapeHtml(reqStr)} ${budgetStr ? `• ${budgetStr}` : ''} ${l.preferred_location ? `• ${escapeHtml(l.preferred_location)}` : ''}
                  </div>
                </div>
                <span class="badge priority-${l.priority.toLowerCase()}">${l.priority}</span>
              </div>

              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px; background: var(--bg-main); padding: 6px 10px; border-radius: 4px;">
                <strong style="color: var(--text-muted);">Suggested Next Action:</strong> ${escapeHtml(l.ai_suggested_action || 'Call prospect to schedule site visit')}
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <span style="font-size: 0.75rem; color: ${isOverdue ? '#F87171' : 'var(--text-muted)'};">
                  ${isOverdue ? '<i class="fas fa-triangle-exclamation"></i> OVERDUE: ' : '<i class="far fa-calendar"></i> Next: '}${formatDate(l.next_followup)}
                </span>
                <button class="btn btn-ai btn-sm btn-quick-draft" data-id="${l.id}" data-name="${escapeHtml(l.name)}">
                  <i class="fas fa-feather-pointed"></i> Generate Draft
                </button>
              </div>
            </div>
          `;
        }).join('');

        attentionEl.querySelectorAll('.btn-quick-draft').forEach(btn => {
          btn.addEventListener('click', () => openFollowupDraftModal(btn.dataset.id, btn.dataset.name));
        });
      }

      // 4. Render Site Visits
      const visitsEl = container.querySelector('#site-visits-list');
      const allVisits = [...siteVisits.today, ...siteVisits.upcoming].slice(0, 4);
      if (allVisits.length === 0) {
        visitsEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0;">No site visits scheduled for this week.</div>`;
      } else {
        visitsEl.innerHTML = allVisits.map(v => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div>
              <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">${escapeHtml(v.name)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(v.property_type || 'Property')} • ${escapeHtml(v.preferred_location || 'Site')}</div>
            </div>
            <span class="badge badge-contacted"><i class="fas fa-calendar-day"></i> ${formatDate(v.site_visit_date)}</span>
          </div>
        `).join('');
      }

      // 5. Render Tasks
      const tasksEl = container.querySelector('#today-tasks-list');
      const criticalTasks = [...overdueTasks, ...todayTasks].slice(0, 4);
      if (criticalTasks.length === 0) {
        tasksEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0;">No pending deliverables for today.</div>`;
      } else {
        tasksEl.innerHTML = criticalTasks.map(t => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">${escapeHtml(t.title)}</div>
            <span class="badge priority-${t.priority.toLowerCase()}">${t.priority}</span>
          </div>
        `).join('');
      }

      // 6. Render Business Impact
      const impactGrid = container.querySelector('#business-impact-grid');
      if (!impact.hasData || !impact.metrics) {
        impactGrid.innerHTML = `
          <div style="grid-column: span 4; text-align: center; padding: 20px; color: var(--text-muted);">
            <em>Insufficient data. Business impact metrics will compute as operations are logged.</em>
          </div>
        `;
      } else {
        const imp = impact.metrics;
        impactGrid.innerHTML = `
          <div class="metric-card">
            <span class="metric-label">Leads Managed</span>
            <div class="metric-value">${imp.leadsManaged}</div>
            <div class="metric-foot">CRM Database Records</div>
          </div>
          <div class="metric-card">
            <span class="metric-label">Tasks Completed</span>
            <div class="metric-value" style="color: var(--accent-success);">${imp.completedTasks}</div>
            <div class="metric-foot">Deliverables executed</div>
          </div>
          <div class="metric-card">
            <span class="metric-label">AI Drafts Generated</span>
            <div class="metric-value" style="color: #A78BFA;">${imp.responseDraftsGenerated}</div>
            <div class="metric-foot">Human-reviewed drafts</div>
          </div>
          <div class="metric-card">
            <span class="metric-label">Approval Actions</span>
            <div class="metric-value" style="color: #FBBF24;">${imp.approvalActionsCompleted}</div>
            <div class="metric-foot">Governed safety sign-offs</div>
          </div>
        `;
      }

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (err) {
      showToast(err.message || 'Failed loading dashboard', 'error');
      loadingEl.innerHTML = `<div style="color: var(--accent-danger);">Error loading data: ${escapeHtml(err.message)}</div>`;
    }
  }

  // Follow-up Draft Modal (With strict human review requirement & no fake sending)
  function openFollowupDraftModal(leadId, leadName) {
    showModal({
      title: `AI Real Estate Follow-up: ${leadName}`,
      bodyHtml: `
        <div id="draft-loading" style="text-align: center; padding: 24px;">
          <div class="loader-spinner" style="margin: 0 auto 10px auto;"></div>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Generating personalized property follow-up draft...</span>
        </div>
        <div id="draft-form-area" style="display: none;">
          <div class="form-group">
            <label class="form-label">Follow-up Context / Scenario</label>
            <select id="draft-scenario" class="form-control">
              <option value="Customer hasn't replied for 3 days. Send friendly re-engagement check.">Customer hasn't replied for 3 days</option>
              <option value="Confirm scheduled site visit appointment and share GPS pin location.">Confirm scheduled site visit</option>
              <option value="Share 2 newly shortlisted properties matching their exact budget and location.">Share newly shortlisted properties</option>
              <option value="Follow up on commercial proposal terms and builder discount.">Follow up on price negotiation</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subject / Channel</label>
            <input type="text" id="draft-subject" class="form-control" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Draft Message</label>
            <textarea id="draft-body" class="form-control" style="min-height: 150px; font-family: var(--font-sans); line-height: 1.5;"></textarea>
          </div>
          <div style="font-size: 0.75rem; background: var(--bg-surface); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-warning); color: #FDE68A;">
            <i class="fas fa-shield-halved"></i> <strong>Human-in-the-Loop Governance:</strong> MEGADRONE will not dispatch messages automatically. Review the draft above before dispatching via your configured integration.
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Close', className: 'btn-secondary' },
        {
          label: 'Regenerate for Scenario',
          className: 'btn-secondary',
          onClick: async (modalEl) => {
            const scenario = modalEl.querySelector('#draft-scenario').value;
            modalEl.querySelector('#draft-form-area').style.display = 'none';
            modalEl.querySelector('#draft-loading').style.display = 'block';
            try {
              const res = await APIClient.generateFollowupDraft(leadId, scenario);
              modalEl.querySelector('#draft-subject').value = res.data.subject || 'Follow-up regarding property';
              modalEl.querySelector('#draft-body').value = res.data.body || '';
            } finally {
              modalEl.querySelector('#draft-loading').style.display = 'none';
              modalEl.querySelector('#draft-form-area').style.display = 'block';
            }
            return false;
          }
        },
        {
          label: 'Copy Draft',
          className: 'btn-primary',
          onClick: (modalEl) => {
            const body = modalEl.querySelector('#draft-body').value;
            navigator.clipboard.writeText(body);
            showToast('Draft copied to clipboard.', 'success');
            return true;
          }
        }
      ]
    });

    // Initial generate
    APIClient.generateFollowupDraft(leadId).then(res => {
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        overlay.querySelector('#draft-loading').style.display = 'none';
        overlay.querySelector('#draft-form-area').style.display = 'block';
        overlay.querySelector('#draft-subject').value = res.data.subject || 'Follow-up regarding property';
        overlay.querySelector('#draft-body').value = res.data.body || '';
      }
    }).catch(err => {
      showToast(err.message || 'Failed generating draft', 'error');
    });
  }

  refreshBriefBtn.addEventListener('click', async () => {
    refreshBriefBtn.disabled = true;
    refreshBriefBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    await loadDashboardData();
    refreshBriefBtn.disabled = false;
    refreshBriefBtn.innerHTML = '<i class="fas fa-robot"></i> Refresh Real Estate Brief';
    showToast('Real estate operations brief refreshed.', 'success');
  });

  loadDashboardData();
}
