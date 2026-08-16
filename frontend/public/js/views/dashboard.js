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

        <!-- Section 3: AI Follow-up Assistant with Human-in-the-loop Approval -->
        <div class="card" style="margin-bottom: 24px; border-top: 3px solid var(--accent-ai);" id="ai-followup-assistant-section">
          <div class="card-header" style="margin-bottom: 16px;">
            <div>
              <h2 class="card-title" style="font-size: 1.1rem; color: #fff; text-transform: uppercase; letter-spacing: 0.05em;">
                <i class="fas fa-feather-pointed" style="color: var(--accent-ai);"></i> AI Follow-up Assistant
              </h2>
              <p class="card-subtitle">Generate high-converting personalized customer follow-up message drafts with human approval governance</p>
            </div>
            <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #C4B5FD; border: 1px solid rgba(168, 85, 247, 0.3);">
              <i class="fas fa-shield-halved" style="margin-right: 4px;"></i> Human Approval Required
            </span>
          </div>

          <div class="grid-3" style="gap: 16px; margin-bottom: 16px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; color: var(--text-secondary);">Select Lead / Customer *</label>
              <select id="followup-lead-select" class="form-control">
                <option value="">-- Select a customer lead --</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; color: var(--text-secondary);">Follow-up Reason *</label>
              <select id="followup-reason-select" class="form-control">
                <option value="No response">No response</option>
                <option value="Site visit reminder">Site visit reminder</option>
                <option value="Document request">Document request</option>
                <option value="Negotiation follow-up">Negotiation follow-up</option>
                <option value="General update">General update</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; color: var(--text-secondary);">Language / Tone</label>
              <select id="followup-lang-select" class="form-control">
                <option value="English">English (Professional WhatsApp)</option>
                <option value="Hindi">Hindi - हिन्दी (Devanagari)</option>
                <option value="Hinglish">Hinglish (Roman Conversational)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              <i class="fas fa-robot" style="color: var(--accent-primary);"></i> AI Provider: Local Ollama (fallback to Cloud) • Zero external data leaks
            </div>
            <button id="btn-generate-followup-draft" class="btn btn-ai">
              <i class="fas fa-wand-magic-sparkles"></i> Generate Draft
            </button>
          </div>

          <!-- Generated Draft Output Area -->
          <div id="followup-draft-output-area" style="display: none; background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60A5FA; font-weight: 700;">
                  <i class="fab fa-whatsapp"></i> WhatsApp Style Message
                </span>
                <span id="draft-lang-badge" class="badge badge-contacted">English</span>
                <span id="draft-status-badge" class="badge" style="background: rgba(245, 158, 11, 0.2); color: #FBBF24;">PENDING_APPROVAL</span>
              </div>
              <span id="draft-id-display" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);"></span>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="color: var(--text-secondary); font-size: 0.82rem; font-weight: 600;">AI Generated Message:</label>
              <textarea id="draft-message-display" class="form-control" style="min-height: 140px; line-height: 1.5; font-family: var(--font-sans); background: var(--bg-main); color: #fff;" readonly></textarea>
            </div>

            <!-- Mandatory Safety Rule Notice -->
            <div style="background: rgba(245, 158, 11, 0.12); border-left: 4px solid #F59E0B; padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-shield-halved" style="color: #FBBF24; font-size: 1.2rem;"></i>
              <span style="font-size: 0.85rem; color: #FDE68A; font-weight: 600;">
                Draft generated. Human approval required before sending.
              </span>
            </div>

            <!-- Action buttons: Approve, Reject, Edit -->
            <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;" id="draft-actions-bar">
              <button id="btn-draft-edit" class="btn btn-secondary btn-sm">
                <i class="fas fa-pen-to-square"></i> Edit
              </button>
              <button id="btn-draft-reject" class="btn btn-danger btn-sm">
                <i class="fas fa-times"></i> Reject
              </button>
              <button id="btn-draft-approve" class="btn btn-success btn-sm">
                <i class="fas fa-check"></i> Approve
              </button>
            </div>
          </div>
        </div>

        <!-- Section 4: Business Impact Telemetry (No Fabricated Numbers) -->
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

  let allOrgLeads = [];
  let activeFollowupDraft = null;

  async function loadDashboardData() {
    try {
      const [briefRes, attentionRes, siteVisitsRes, tasksRes, impactRes, leadsRes] = await Promise.all([
        APIClient.getDailyBrief(),
        APIClient.getFollowupsNeedingAttention(5),
        APIClient.getSiteVisits(),
        APIClient.getTaskSchedule(),
        APIClient.getBusinessImpact(),
        APIClient.getLeads({ limit: 100 }),
      ]);

      const brief = briefRes.data;
      const metrics = brief.realEstateMetrics || {};
      const attentionLeads = attentionRes.data || [];
      const siteVisits = siteVisitsRes.data || { today: [], upcoming: [] };
      const todayTasks = tasksRes.data?.today || [];
      const overdueTasks = tasksRes.data?.overdue || [];
      const impact = impactRes.data;
      allOrgLeads = leadsRes.data || [];

      // Populate AI Follow-up Assistant Lead Selector
      const leadSelect = container.querySelector('#followup-lead-select');
      if (leadSelect) {
        leadSelect.innerHTML = `<option value="">-- Select a customer lead (${allOrgLeads.length} available) --</option>` +
          allOrgLeads.map(l => {
            const req = l.property_type || (l.bedrooms ? `${l.bedrooms}BHK` : '') || l.company || 'Inquiry';
            return `<option value="${l.id}">${escapeHtml(l.name)} (${escapeHtml(req)} • ${escapeHtml(l.status)})</option>`;
          }).join('');
      }

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

    // AI Follow-up Assistant Event Handlers
    const generateBtn = container.querySelector('#btn-generate-followup-draft');
    const leadSelect = container.querySelector('#followup-lead-select');
    const reasonSelect = container.querySelector('#followup-reason-select');
    const langSelect = container.querySelector('#followup-lang-select');
    const draftOutputArea = container.querySelector('#followup-draft-output-area');
    const draftMessageDisplay = container.querySelector('#draft-message-display');
    const draftIdDisplay = container.querySelector('#draft-id-display');
    const draftLangBadge = container.querySelector('#draft-lang-badge');
    const draftStatusBadge = container.querySelector('#draft-status-badge');
    const btnDraftEdit = container.querySelector('#btn-draft-edit');
    const btnDraftApprove = container.querySelector('#btn-draft-approve');
    const btnDraftReject = container.querySelector('#btn-draft-reject');

    let isEditingDraft = false;

    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        const selectedLeadId = leadSelect.value;
        const selectedReason = reasonSelect.value;
        const selectedLang = langSelect.value;

        if (!selectedLeadId) {
          showToast('Please select a customer lead first', 'warning');
          leadSelect.focus();
          return;
        }

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Draft...';

        try {
          const res = await APIClient.generateFollowup({
            lead_id: selectedLeadId,
            reason: selectedReason,
            language: selectedLang,
          });

          activeFollowupDraft = res.draft || {
            draft_id: res.draft_id,
            id: res.draft_id,
            draft_message: res.message,
            language: selectedLang,
            status: res.status || 'PENDING_APPROVAL',
          };
          activeFollowupDraft.draft_id = res.draft_id || activeFollowupDraft.id;

          draftIdDisplay.textContent = `Draft ID: ${activeFollowupDraft.draft_id}`;
          draftMessageDisplay.value = res.message || activeFollowupDraft.draft_message;
          draftMessageDisplay.readOnly = true;
          draftLangBadge.textContent = selectedLang;
          draftStatusBadge.textContent = 'PENDING_APPROVAL';
          draftStatusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
          draftStatusBadge.style.color = '#FBBF24';

          btnDraftApprove.disabled = false;
          btnDraftReject.disabled = false;
          btnDraftEdit.disabled = false;
          btnDraftEdit.innerHTML = '<i class="fas fa-pen-to-square"></i> Edit';
          isEditingDraft = false;

          draftOutputArea.style.display = 'block';
          draftOutputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          showToast('AI follow-up draft generated. Human approval required before sending.', 'info');
        } catch (err) {
          showToast(err.message || 'Failed generating follow-up draft', 'error');
        } finally {
          generateBtn.disabled = false;
          generateBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Draft';
        }
      });
    }

    if (btnDraftEdit) {
      btnDraftEdit.addEventListener('click', async () => {
        if (!activeFollowupDraft) return;

        if (!isEditingDraft) {
          // Enable editing mode
          isEditingDraft = true;
          draftMessageDisplay.readOnly = false;
          draftMessageDisplay.style.borderColor = 'var(--accent-primary)';
          draftMessageDisplay.focus();
          btnDraftEdit.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Changes';
          btnDraftEdit.className = 'btn btn-primary btn-sm';
          showToast('You can now edit the draft message directly.', 'info');
        } else {
          // Save edited content
          const updatedText = draftMessageDisplay.value.trim();
          if (!updatedText) {
            showToast('Draft message cannot be empty', 'error');
            return;
          }

          btnDraftEdit.disabled = true;
          btnDraftEdit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

          try {
            await APIClient.editFollowupDraft(activeFollowupDraft.draft_id, { message: updatedText });
            activeFollowupDraft.draft_message = updatedText;
            draftMessageDisplay.readOnly = true;
            draftMessageDisplay.style.borderColor = 'var(--border-subtle)';
            isEditingDraft = false;
            btnDraftEdit.className = 'btn btn-secondary btn-sm';
            btnDraftEdit.innerHTML = '<i class="fas fa-pen-to-square"></i> Edit';
            showToast('Draft message updated and saved to approval queue.', 'success');
          } catch (err) {
            showToast(err.message || 'Failed to update draft', 'error');
          } finally {
            btnDraftEdit.disabled = false;
          }
        }
      });
    }

    if (btnDraftApprove) {
      btnDraftApprove.addEventListener('click', async () => {
        if (!activeFollowupDraft) return;

        btnDraftApprove.disabled = true;
        btnDraftApprove.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';

        try {
          await APIClient.approveFollowupDraft(activeFollowupDraft.draft_id);
          draftStatusBadge.textContent = 'APPROVED';
          draftStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
          draftStatusBadge.style.color = '#34D399';

          btnDraftApprove.disabled = true;
          btnDraftReject.disabled = true;
          btnDraftEdit.disabled = true;
          showToast('Draft approved successfully. Human authorization recorded in audit log.', 'success');
        } catch (err) {
          showToast(err.message || 'Failed to approve draft', 'error');
          btnDraftApprove.disabled = false;
          btnDraftApprove.innerHTML = '<i class="fas fa-check"></i> Approve';
        }
      });
    }

    if (btnDraftReject) {
      btnDraftReject.addEventListener('click', () => {
        if (!activeFollowupDraft) return;

        showModal({
          title: 'Reject Follow-up Draft',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label">Rejection Reason *</label>
              <textarea id="followup-reject-reason" class="form-control" placeholder="Provide reason for rejecting this communication draft (e.g. Tone too informal, price negotiation pending)..." required></textarea>
            </div>
          `,
          footerButtons: [
            { label: 'Cancel', className: 'btn-secondary' },
            {
              label: 'Confirm Rejection',
              className: 'btn-danger',
              onClick: async (modalEl) => {
                const reason = modalEl.querySelector('#followup-reject-reason').value.trim();
                if (!reason) {
                  showToast('Rejection reason is required', 'error');
                  return false;
                }

                try {
                  await APIClient.rejectFollowupDraft(activeFollowupDraft.draft_id, reason);
                  draftStatusBadge.textContent = 'REJECTED';
                  draftStatusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
                  draftStatusBadge.style.color = '#F87171';

                  btnDraftApprove.disabled = true;
                  btnDraftReject.disabled = true;
                  btnDraftEdit.disabled = true;
                  showToast('Follow-up draft rejected.', 'info');
                  return true;
                } catch (err) {
                  showToast(err.message || 'Failed to reject draft', 'error');
                  return false;
                }
              }
            }
          ]
        });
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
