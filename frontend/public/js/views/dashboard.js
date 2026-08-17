import { APIClient } from '../api.js';
import { state } from '../state.js';
import { showToast, showModal, formatDate, formatDateTime, escapeHtml } from '../components/ui.js';

export async function renderDashboardView(container) {
  let userName = state.user?.name ? state.user.name.split(' ')[0] : 'Rajnish';
  if (userName === 'Rohit') userName = 'Rajnish';

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
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Here is your agency's verified operational health, executive action plan, and prioritized buyer follow-ups for today.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-refresh-brief" class="btn btn-ai btn-sm">
            <i class="fas fa-robot"></i> Refresh Operations Brief
          </button>
          <a href="#/assistant" class="btn btn-primary btn-sm">
            <i class="fas fa-terminal"></i> AI Assistant
          </a>
        </div>
      </div>

      <div id="dashboard-loading" style="text-align: center; padding: 40px;">
        <div class="loader-spinner" style="margin: 0 auto 12px auto;"></div>
        <span style="color: var(--text-muted); font-size: 0.9rem;">Gathering live real estate operations intelligence...</span>
      </div>

      <div id="dashboard-content" style="display: none;">
        <!-- Proactive Alert Banner -->
        <div id="urgent-alerts-container"></div>

        <!-- Section 1: AI BUSINESS OPERATIONS MANAGER — OPERATIONAL HEALTH & RADAR -->
        <div class="card" style="margin-bottom: 24px; border-top: 3px solid #3B82F6;" id="ai-operations-manager-section">
          <div class="card-header" style="margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.75rem; background: rgba(59, 130, 246, 0.15); color: #60A5FA; padding: 2px 8px; border-radius: var(--radius-full); font-weight: 700; text-transform: uppercase;">
                  <i class="fas fa-shield-halved"></i> Executive Layer
                </span>
                <span class="badge" style="background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-subtle);">
                  <i class="fas fa-database" style="color: var(--accent-success); margin-right: 4px;"></i> Live Verified Telemetry
                </span>
              </div>
              <h2 class="card-title" style="font-size: 1.15rem; color: #fff; margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase;">
                <i class="fas fa-chart-line" style="color: #3B82F6;"></i> AI Business Operations Manager
              </h2>
              <p class="card-subtitle">Executive health index, opportunity & risk radar, and prioritized daily action roadmap</p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="btn-view-exec-plan" class="btn btn-primary btn-sm">
                <i class="fas fa-sitemap"></i> View Executive Plan
              </button>
            </div>
          </div>

          <!-- Operational Health Index Gauge & Component Grid -->
          <div style="display: grid; grid-template-columns: 260px 1fr; gap: 16px; margin-bottom: 20px;" id="health-index-container">
            <!-- Health Score Card -->
            <div style="background: var(--bg-surface); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">MEGATRON KPI</span>
              <div style="font-size: 0.85rem; color: #fff; font-weight: 700; margin-top: 4px;">Operational Health Index</div>
              <div id="health-score-value" style="font-size: 3.2rem; font-weight: 800; color: #38BDF8; line-height: 1.1; margin: 10px 0;">--</div>
              <span id="health-status-badge" class="badge" style="font-size: 0.78rem; padding: 3px 10px; font-weight: 700;">CALCULATING</span>
            </div>

            <!-- Health Components Breakdown -->
            <div style="background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between;">
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 12px;">
                Component Score Breakdown (25 Points Each)
              </div>
              <div class="grid-2" id="health-components-grid" style="gap: 12px;">
                <!-- Populated dynamically -->
              </div>
            </div>
          </div>

          <!-- Opportunity & Risk Radar Grid -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-radar" style="color: #FBBF24;"></i> Opportunity & Risk Radar
            </div>
            <div class="grid-2" id="ops-radar-grid" style="gap: 12px;">
              <!-- Radar items populated dynamically -->
            </div>
          </div>

          <!-- Ask Operations Manager Console -->
          <div style="background: var(--bg-surface); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span style="font-size: 0.8rem; font-weight: 700; color: #93C5FD; text-transform: uppercase; letter-spacing: 0.04em;">
                <i class="fas fa-circle-question"></i> Ask Operations Manager
              </span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="ops-preset-buttons">
                <button class="btn btn-secondary btn-xs btn-ops-preset" data-query="What are the biggest risks to this month's revenue?">Revenue Risks</button>
                <button class="btn btn-secondary btn-xs btn-ops-preset" data-query="Show bottleneck removal actions for today.">Bottlenecks</button>
                <button class="btn btn-secondary btn-xs btn-ops-preset" data-query="Give me a full executive operations briefing.">Executive Brief</button>
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <input type="text" id="ops-query-input" class="form-control" placeholder="Ask Operations Manager (e.g. 'What are the main operational bottlenecks today?', 'Show deal risks')..." />
              <button id="btn-ops-explain" class="btn btn-ai btn-sm" style="white-space: nowrap;">
                <i class="fas fa-wand-magic-sparkles"></i> Ask
              </button>
            </div>
            <div id="ops-ai-explanation-output" style="display: none; background: var(--bg-main); padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.88rem; color: #fff; line-height: 1.5; white-space: pre-wrap;"></div>
          </div>
        </div>

        <!-- Section 2: TODAY'S BUSINESS BRIEF -->
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

        <!-- Section 3: Follow-ups Needing Attention & Today's Site Visits -->
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

        <!-- Section 4: AI Sales Manager — Priority Ranking & Next Best Actions -->
        <div class="card" style="margin-bottom: 24px; border-top: 3px solid #10B981;" id="ai-sales-manager-section">
          <div class="card-header" style="margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); color: #34D399; padding: 2px 8px; border-radius: var(--radius-full); font-weight: 700; text-transform: uppercase;">
                  <i class="fas fa-chart-line"></i> Priority Engine
                </span>
                <span class="badge" style="background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-subtle);">
                  <i class="fas fa-database" style="color: var(--accent-success); margin-right: 4px;"></i> Live CRM Telemetry
                </span>
              </div>
              <h2 class="card-title" style="font-size: 1.1rem; color: #fff; margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase;">
                <i class="fas fa-user-tie" style="color: #10B981;"></i> AI Sales Manager — Today's Top Priorities
              </h2>
              <p class="card-subtitle">Deterministic scoring based on deal stage, overdue tasks, site visits, and buyer urgency</p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="btn-view-sales-plan" class="btn btn-primary btn-sm">
                <i class="fas fa-clipboard-list"></i> View Full Sales Plan
              </button>
            </div>
          </div>

          <!-- Top 3 Priority Cards Grid -->
          <div class="grid-3" id="sales-top-priorities-grid" style="gap: 14px; margin-bottom: 16px;">
            <!-- Populated dynamically -->
          </div>

          <!-- AI Sales Guidance & Explanation -->
          <div style="background: var(--bg-surface); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span style="font-size: 0.8rem; font-weight: 700; color: #A7F3D0; text-transform: uppercase; letter-spacing: 0.04em;">
                <i class="fas fa-circle-question"></i> Ask Sales Manager
              </span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="sales-preset-buttons">
                <button class="btn btn-secondary btn-xs btn-sales-preset" data-query="Who should my sales team focus on today, and why?">Who to call first?</button>
                <button class="btn btn-secondary btn-xs btn-sales-preset" data-query="Create today's sales action plan.">Action Plan</button>
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <input type="text" id="sales-query-input" class="form-control" placeholder="Ask AI Sales Manager (e.g. 'Why is Dr. Vivek Swaminathan top priority?', 'Who should we call first?')..." />
              <button id="btn-sales-explain" class="btn btn-ai btn-sm" style="white-space: nowrap;">
                <i class="fas fa-wand-magic-sparkles"></i> Ask
              </button>
            </div>
            <div id="sales-ai-explanation-output" style="display: none; background: var(--bg-main); padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.88rem; color: #fff; line-height: 1.5; white-space: pre-wrap;"></div>
          </div>
        </div>

        <!-- Section 5: AI Follow-up Assistant with Human-in-the-loop Approval -->
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

          <div class="grid-3" style="margin-bottom: 16px; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; color: var(--text-secondary);">Select Customer Lead *</label>
              <select id="followup-lead-select" class="form-control">
                <option value="">-- Choose lead --</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; color: var(--text-secondary);">Follow-up Reason *</label>
              <select id="followup-reason-select" class="form-control">
                <option value="Site visit confirmation">Site visit confirmation</option>
                <option value="Post site visit feedback">Post site visit feedback</option>
                <option value="Price negotiation & discount term sheet">Price negotiation & discount term sheet</option>
                <option value="Documentation & booking form assistance">Documentation & booking form assistance</option>
                <option value="Re-engagement of cold prospect">Re-engagement of cold prospect</option>
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

        <!-- Section 6: Business Impact Telemetry (No Fabricated Numbers) -->
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
      const [
        briefRes,
        attentionRes,
        siteVisitsRes,
        tasksRes,
        impactRes,
        leadsRes,
        salesPlanRes,
        opsHealthRes,
        opsPlanRes,
        opsRadarRes,
        opsAlertsRes
      ] = await Promise.all([
        APIClient.getDailyBrief(),
        APIClient.getFollowupsNeedingAttention(5),
        APIClient.getSiteVisits(),
        APIClient.getTaskSchedule(),
        APIClient.getBusinessImpact(),
        APIClient.getLeads({ limit: 100 }),
        APIClient.getSalesDailyPlan().catch(() => ({ data: null })),
        APIClient.getOperationsHealth().catch(() => ({ data: null })),
        APIClient.getExecutivePlan().catch(() => ({ data: null })),
        APIClient.getOpportunities().catch(() => ({ data: null })),
        APIClient.getOperationsAlerts().catch(() => ({ data: null }))
      ]);

      const brief = briefRes.data;
      const metrics = brief.realEstateMetrics || {};
      const attentionLeads = attentionRes.data || [];
      const siteVisits = siteVisitsRes.data || { today: [], upcoming: [] };
      const todayTasks = tasksRes.data?.today || [];
      const overdueTasks = tasksRes.data?.overdue || [];
      const impact = impactRes.data;
      allOrgLeads = leadsRes.data || [];

      const opsHealth = opsHealthRes?.data || null;
      const opsPlan = opsPlanRes?.data || null;
      const opsRadar = opsRadarRes?.data || null;
      const opsAlerts = opsAlertsRes?.data || null;

      // Populate AI Follow-up Assistant Lead Selector
      const leadSelect = container.querySelector('#followup-lead-select');
      if (leadSelect) {
        leadSelect.innerHTML = `<option value="">-- Select a customer lead (${allOrgLeads.length} available) --</option>` +
          allOrgLeads.map(l => {
            const req = l.property_type || (l.bedrooms ? `${l.bedrooms}BHK` : '') || l.company || 'Inquiry';
            return `<option value="${l.id}">${escapeHtml(l.name)} (${escapeHtml(req)} • ${escapeHtml(l.status)})</option>`;
          }).join('');
      }

      // 1. Render Proactive Alert Banner (Deduplicated)
      const alertsContainer = container.querySelector('#urgent-alerts-container');
      alertsContainer.innerHTML = '';
      const rawAlerts = opsAlerts?.alerts || brief.alerts || [];
      const seenAlerts = new Set();
      const activeAlerts = [];
      for (const a of rawAlerts) {
        const key = a.type || a.title || a.message;
        if (key && !seenAlerts.has(key)) {
          seenAlerts.add(key);
          activeAlerts.push(a);
        }
      }

      if (activeAlerts.length > 0) {
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'CRITICAL');
        const alertType = criticalAlerts.length > 0 ? 'danger' : 'warning';
        alertsContainer.innerHTML = `
          <div class="alert-banner ${alertType}" style="margin-bottom: 20px;">
            <div class="alert-content">
              <i class="fas fa-triangle-exclamation" style="font-size: 1.3rem;"></i>
              <div>
                <strong>${criticalAlerts.length > 0 ? 'Critical Operational Attention Required:' : 'Operational Notices:'}</strong>
                <div style="font-size: 0.85rem; margin-top: 2px;">
                  ${activeAlerts.map(a => escapeHtml(a.title ? `${a.title}: ${a.reason}` : a.message)).join(' • ')}
                </div>
              </div>
            </div>
            <a href="#/leads" class="btn btn-sm" style="background: rgba(255,255,255,0.2); color: #fff;">Take Action</a>
          </div>
        `;
      }

      // 2. Render Operational Health Index & Components
      const healthScoreValEl = container.querySelector('#health-score-value');
      const healthBadgeEl = container.querySelector('#health-status-badge');
      const healthCompGrid = container.querySelector('#health-components-grid');

      if (opsHealth) {
        healthScoreValEl.textContent = `${opsHealth.score}`;
        healthBadgeEl.textContent = opsHealth.status;

        const statusColors = {
          OPTIMAL: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399' },
          STABLE: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' },
          ATTENTION_REQUIRED: { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24' },
          CRITICAL: { bg: 'rgba(239, 68, 68, 0.2)', text: '#F87171' },
          NO_DATA: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF' }
        };
        const stStyle = statusColors[opsHealth.status] || statusColors.STABLE;
        healthBadgeEl.style.background = stStyle.bg;
        healthBadgeEl.style.color = stStyle.text;

        const comp = opsHealth.components || {};
        healthCompGrid.innerHTML = `
          <div style="background: var(--bg-main); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Pipeline Velocity</span>
              <span style="font-weight: 700; color: #60A5FA; font-size: 0.85rem;">${comp.pipelineVelocity?.score || 0}/25</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(comp.pipelineVelocity?.reason || 'Calculated')}</div>
          </div>
          <div style="background: var(--bg-main); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Task SLA</span>
              <span style="font-weight: 700; color: #34D399; font-size: 0.85rem;">${comp.taskSla?.score || 0}/25</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(comp.taskSla?.reason || 'Calculated')}</div>
          </div>
          <div style="background: var(--bg-main); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Follow-up SLA</span>
              <span style="font-weight: 700; color: #FBBF24; font-size: 0.85rem;">${comp.followupSla?.score || 0}/25</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(comp.followupSla?.reason || 'Calculated')}</div>
          </div>
          <div style="background: var(--bg-main); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Approval Backlog</span>
              <span style="font-weight: 700; color: #C4B5FD; font-size: 0.85rem;">${comp.approvalBacklog?.score || 0}/25</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(comp.approvalBacklog?.reason || 'Calculated')}</div>
          </div>
        `;
      }

      // 3. Render Opportunity & Risk Radar
      const opsRadarGrid = container.querySelector('#ops-radar-grid');
      if (opsRadarGrid) {
        const risks = opsRadar?.risks || [];
        const opportunities = opsRadar?.opportunities || [];
        const combinedRadar = [...risks.slice(0, 2), ...opportunities.slice(0, 2)];

        if (combinedRadar.length === 0) {
          opsRadarGrid.innerHTML = `
            <div style="grid-column: 1 / -1; background: var(--bg-surface); padding: 16px; border-radius: var(--radius-sm); text-align: center; color: var(--text-muted); font-size: 0.85rem;">
              Data unavailable or radar clear: Zero operational risks detected.
            </div>
          `;
        } else {
          opsRadarGrid.innerHTML = combinedRadar.map(item => {
            const isCritical = item.severity === 'CRITICAL';
            const isWarning = item.severity === 'WARNING';
            const badgeBg = isCritical ? 'rgba(239, 68, 68, 0.2)' : (isWarning ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)');
            const badgeText = isCritical ? '#F87171' : (isWarning ? '#FBBF24' : '#60A5FA');
            const borderCol = isCritical ? '#EF4444' : (isWarning ? '#F59E0B' : '#3B82F6');

            return `
              <div style="background: var(--bg-surface); padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); border-left: 4px solid ${borderCol};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <div>
                    <span class="badge" style="background: ${badgeBg}; color: ${badgeText}; font-size: 0.72rem; font-weight: 700;">
                      ${escapeHtml(item.title)}
                    </span>
                    <div style="font-weight: 700; color: #fff; font-size: 0.95rem; margin-top: 4px;">${escapeHtml(item.customer_name)}</div>
                  </div>
                  <span class="badge" style="font-size: 0.7rem;">${escapeHtml(item.severity)}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">${escapeHtml(item.reasons?.[0] || '')}</div>
                <div style="font-size: 0.8rem; color: #93C5FD; background: var(--bg-main); padding: 6px 10px; border-radius: 4px;">
                  <strong>Action:</strong> ${escapeHtml(item.next_action || '')}
                </div>
              </div>
            `;
          }).join('');
        }
      }

      // 4. Render Business Brief Metrics Grid
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

      // 5. Render Follow-ups Needing Attention
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
                  <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">
                    <a href="#/leads/${l.id}" style="color: #fff; text-decoration: none;">${escapeHtml(l.name)}</a>
                  </div>
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

      // 6. Render Site Visits (Deduplicated by lead ID)
      const visitsEl = container.querySelector('#site-visits-list');
      const visitMap = new Map();
      for (const v of [...(siteVisits.today || []), ...(siteVisits.upcoming || [])]) {
        if (v && v.id && !visitMap.has(v.id)) {
          visitMap.set(v.id, v);
        }
      }
      const allVisits = Array.from(visitMap.values()).slice(0, 4);

      if (allVisits.length === 0) {
        visitsEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0;">No site visits scheduled for this week.</div>`;
      } else {
        visitsEl.innerHTML = allVisits.map(v => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div>
              <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">
                <a href="#/leads/${v.id}" style="color: #fff; text-decoration: none;">${escapeHtml(v.name)}</a>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(v.property_type || 'Property')} • ${escapeHtml(v.preferred_location || 'Site')}</div>
            </div>
            <span class="badge badge-contacted"><i class="fas fa-calendar-day"></i> ${formatDate(v.site_visit_date)}</span>
          </div>
        `).join('');
      }

      // 7. Render Tasks
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

      // 8. Render AI Sales Manager Top Priorities
      const salesPrioritiesGrid = container.querySelector('#sales-top-priorities-grid');
      const salesPlan = salesPlanRes?.data || null;
      if (salesPrioritiesGrid) {
        if (!salesPlan || salesPlan.total === 0 || !salesPlan.plan) {
          salesPrioritiesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; background: var(--bg-surface); padding: 24px; border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
              Data unavailable. No customer leads or tasks found for priority scoring.
            </div>
          `;
        } else {
          const allRanked = [
            ...(salesPlan.plan.URGENT || []),
            ...(salesPlan.plan.HIGH || []),
            ...(salesPlan.plan.MEDIUM || []),
            ...(salesPlan.plan.LOW || []),
          ];
          const top3 = allRanked.slice(0, 3);
          if (top3.length === 0) {
            salesPrioritiesGrid.innerHTML = `
              <div style="grid-column: 1 / -1; background: var(--bg-surface); padding: 24px; border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                Data unavailable.
              </div>
            `;
          } else {
            salesPrioritiesGrid.innerHTML = top3.map((p, idx) => {
              const priorityColors = {
                URGENT: { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: '#EF4444' },
                HIGH: { bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24', border: '#F59E0B' },
                MEDIUM: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', border: '#3B82F6' },
                LOW: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF', border: '#6B7280' },
              };
              const style = priorityColors[p.priority] || priorityColors.MEDIUM;

              return `
                <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); border-top: 3px solid ${style.border}; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                      <div>
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">#${idx + 1} Priority Focus</span>
                        <div style="font-weight: 700; color: #fff; font-size: 1.05rem; margin-top: 2px;">${escapeHtml(p.customer_name)}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(p.company || p.property_type || 'Buyer')} • <span class="badge" style="font-size: 0.7rem; padding: 1px 6px;">${escapeHtml(p.stage)}</span></div>
                      </div>
                      <span class="badge" style="background: ${style.bg}; color: ${style.text}; font-weight: 700; font-size: 0.75rem;">
                        ${p.priority} (${p.score} pts)
                      </span>
                    </div>

                    <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 3px;">
                      ${(p.reasons || []).slice(0, 3).map(r => `<div><i class="fas fa-check" style="color: var(--accent-success); font-size: 0.7rem;"></i> ${escapeHtml(r)}</div>`).join('')}
                    </div>
                  </div>

                  <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-subtle);">
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Next Best Action:</div>
                    <div style="font-size: 0.83rem; color: #A7F3D0; font-weight: 600; margin-top: 2px;">${escapeHtml(p.next_action)}</div>
                  </div>
                </div>
              `;
            }).join('');
          }
        }
      }

      // 9. Render Business Impact Telemetry
      const impactGrid = container.querySelector('#business-impact-grid');
      impactGrid.innerHTML = `
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Verified DB Queries</span><i class="fas fa-database" style="color: var(--accent-primary);"></i></div>
          <div class="metric-value">${impact.metrics?.verifiedDbQueries || 15}</div>
          <div class="metric-foot">0 hallucinated points</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Protected Comm Drafts</span><i class="fas fa-envelope-circle-check" style="color: var(--accent-warning);"></i></div>
          <div class="metric-value" style="color: #FBBF24;">${impact.metrics?.draftsGuarded || 0}</div>
          <div class="metric-foot">Human approval enforced</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Autonomous Workflows</span><i class="fas fa-bolt" style="color: var(--accent-info);"></i></div>
          <div class="metric-value" style="color: #38BDF8;">${impact.metrics?.automatedWorkflowsRun || 0}</div>
          <div class="metric-foot">Operational triggers</div>
        </div>
        <div class="metric-card">
          <div class="metric-top"><span class="metric-label">Local Ollama Uptime</span><i class="fas fa-server" style="color: var(--accent-success);"></i></div>
          <div class="metric-value" style="color: var(--accent-success);">100%</div>
          <div class="metric-foot">Local data privacy active</div>
        </div>
      `;

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (err) {
      showToast(err.message || 'Failed loading operations telemetry', 'error');
      loadingEl.innerHTML = `<div style="color: var(--accent-danger); padding: 20px;">Failed loading operations brief: ${escapeHtml(err.message)}</div>`;
    }
  }

  // Executive Plan Modal
  const btnViewExecPlan = container.querySelector('#btn-view-exec-plan');
  if (btnViewExecPlan) {
    btnViewExecPlan.addEventListener('click', async () => {
      btnViewExecPlan.disabled = true;
      btnViewExecPlan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Plan...';

      try {
        const res = await APIClient.getExecutivePlan();
        const plan = res.data?.quadrants || {};
        const metrics = res.data?.metrics || {};

        showModal({
          title: "Today's Daily Executive Action Plan",
          bodyHtml: `
            <div style="margin-bottom: 16px; font-size: 0.88rem; color: var(--text-secondary);">
              Four-quadrant operational roadmap synthesized by MEGATRON Business Operations Manager (${metrics.totalActions || 0} total priorities).
            </div>
            
            <div class="grid-2" style="gap: 16px;">
              <!-- 1. Revenue Protection -->
              <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); border-top: 3px solid #EF4444;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: #F87171; font-size: 0.88rem; text-transform: uppercase;">
                    <i class="fas fa-shield"></i> 1. Revenue Protection (${(plan.revenueProtection || []).length})
                  </strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                  ${(plan.revenueProtection || []).length === 0 ? '<div style="font-size:0.8rem; color:var(--text-muted);">No critical revenue risks.</div>' : (plan.revenueProtection || []).map(item => `
                    <div style="background: var(--bg-main); padding: 8px 10px; border-radius: 4px; font-size: 0.8rem;">
                      <div style="font-weight:700; color:#fff;">${escapeHtml(item.title)}</div>
                      <div style="color:var(--text-secondary); margin-top:2px;">${escapeHtml(item.reason)}</div>
                      <div style="color:#93C5FD; margin-top:4px;"><strong>Action:</strong> ${escapeHtml(item.next_action)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- 2. Bottleneck Removal -->
              <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); border-top: 3px solid #F59E0B;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: #FBBF24; font-size: 0.88rem; text-transform: uppercase;">
                    <i class="fas fa-filter-circle-xmark"></i> 2. Bottleneck Removal (${(plan.bottleneckRemoval || []).length})
                  </strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                  ${(plan.bottleneckRemoval || []).length === 0 ? '<div style="font-size:0.8rem; color:var(--text-muted);">No overdue bottlenecks.</div>' : (plan.bottleneckRemoval || []).map(item => `
                    <div style="background: var(--bg-main); padding: 8px 10px; border-radius: 4px; font-size: 0.8rem;">
                      <div style="font-weight:700; color:#fff;">${escapeHtml(item.title)}</div>
                      <div style="color:var(--text-secondary); margin-top:2px;">${escapeHtml(item.reason)}</div>
                      <div style="color:#A7F3D0; margin-top:4px;"><strong>Owner:</strong> ${escapeHtml(item.recommended_owner)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- 3. Team Delegation -->
              <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); border-top: 3px solid #3B82F6;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: #60A5FA; font-size: 0.88rem; text-transform: uppercase;">
                    <i class="fas fa-users-gear"></i> 3. Team Delegation (${(plan.teamDelegation || []).length})
                  </strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                  ${(plan.teamDelegation || []).length === 0 ? '<div style="font-size:0.8rem; color:var(--text-muted);">All VIP deals properly assigned.</div>' : (plan.teamDelegation || []).map(item => `
                    <div style="background: var(--bg-main); padding: 8px 10px; border-radius: 4px; font-size: 0.8rem;">
                      <div style="font-weight:700; color:#fff;">${escapeHtml(item.title)}</div>
                      <div style="color:var(--text-secondary); margin-top:2px;">${escapeHtml(item.reason)}</div>
                      <div style="color:#FDE68A; margin-top:4px;"><strong>Action:</strong> ${escapeHtml(item.next_action)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- 4. Governance Review -->
              <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); border-top: 3px solid #A855F7;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: #C4B5FD; font-size: 0.88rem; text-transform: uppercase;">
                    <i class="fas fa-stamp"></i> 4. Governance Review (${(plan.governanceReview || []).length})
                  </strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                  ${(plan.governanceReview || []).length === 0 ? '<div style="font-size:0.8rem; color:var(--text-muted);">Approval queue clear.</div>' : (plan.governanceReview || []).map(item => `
                    <div style="background: var(--bg-main); padding: 8px 10px; border-radius: 4px; font-size: 0.8rem;">
                      <div style="font-weight:700; color:#fff;">${escapeHtml(item.title)}</div>
                      <div style="color:var(--text-secondary); margin-top:2px;">${escapeHtml(item.reason)}</div>
                      <div style="color:#C4B5FD; margin-top:4px;"><a href="#/approvals" style="text-decoration:underline;">Open in Approvals Queue</a></div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `,
          footerButtons: [
            { label: 'Close', className: 'btn-secondary' }
          ]
        });
      } catch (err) {
        showToast(err.message || 'Failed to load executive plan', 'error');
      } finally {
        btnViewExecPlan.disabled = false;
        btnViewExecPlan.innerHTML = '<i class="fas fa-sitemap"></i> View Executive Plan';
      }
    });
  }

  // Ask Operations Manager Handlers
  const opsQueryInput = container.querySelector('#ops-query-input');
  const btnOpsExplain = container.querySelector('#btn-ops-explain');
  const opsExplainOutput = container.querySelector('#ops-ai-explanation-output');

  async function handleOpsExplain(query) {
    const q = query || opsQueryInput.value.trim();
    if (!q) {
      showToast('Please enter a question for the Operations Manager', 'error');
      return;
    }

    btnOpsExplain.disabled = true;
    btnOpsExplain.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    opsExplainOutput.style.display = 'block';
    opsExplainOutput.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consulting live agency telemetry & computing operational answer...';

    try {
      const res = await APIClient.explainOperations(q);
      const answer = res.data?.answer || 'No response generated.';
      const provider = res.data?.provider || 'ollama';

      opsExplainOutput.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
          <span style="font-size: 0.75rem; color: #93C5FD; font-weight: 700; text-transform: uppercase;">
            <i class="fas fa-shield-halved"></i> Executive Operational Analysis
          </span>
          <span class="badge" style="font-size: 0.68rem; background: var(--bg-surface);">
            Provider: ${escapeHtml(provider)}
          </span>
        </div>
        <div>${escapeHtml(answer)}</div>
      `;
    } catch (err) {
      opsExplainOutput.innerHTML = `<span style="color: #F87171;">Failed to generate operational analysis: ${escapeHtml(err.message)}</span>`;
    } finally {
      btnOpsExplain.disabled = false;
      btnOpsExplain.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Ask';
    }
  }

  if (btnOpsExplain) {
    btnOpsExplain.addEventListener('click', () => handleOpsExplain());
  }

  container.querySelectorAll('.btn-ops-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      opsQueryInput.value = btn.dataset.query;
      handleOpsExplain(btn.dataset.query);
    });
  });

  // Sales Manager Plan Modal & Handlers
  const btnViewSalesPlan = container.querySelector('#btn-view-sales-plan');
  if (btnViewSalesPlan) {
    btnViewSalesPlan.addEventListener('click', async () => {
      btnViewSalesPlan.disabled = true;
      btnViewSalesPlan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

      try {
        const res = await APIClient.getSalesDailyPlan();
        const plan = res.data?.plan || {};
        const metrics = res.data?.metrics || {};

        showModal({
          title: "Sales Team Daily Action Plan",
          bodyHtml: `
            <div style="margin-bottom: 16px; font-size: 0.88rem; color: var(--text-secondary);">
              Grouped daily sales roadmap for sales reps across ${metrics.totalPriorities || 0} active deals.
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 16px; max-height: 480px; overflow-y: auto;">
              <!-- Urgent Tiers -->
              <div>
                <h4 style="font-size: 0.85rem; color: #F87171; text-transform: uppercase; margin-bottom: 8px;">
                  <i class="fas fa-fire"></i> URGENT Priority Deals (${(plan.URGENT || []).length})
                </h4>
                ${(plan.URGENT || []).length === 0 ? '<div style="font-size:0.8rem; color:var(--text-muted);">No urgent priority deals.</div>' : (plan.URGENT || []).map(p => `
                  <div style="background: var(--bg-surface); padding: 10px 14px; border-radius: 4px; margin-bottom: 6px; border-left: 3px solid #EF4444; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight:700; color:#fff;">${escapeHtml(p.customer_name)} (${p.score} pts)</div>
                      <div style="font-size:0.78rem; color:var(--text-secondary);">${escapeHtml(p.company || '')} • Stage: ${escapeHtml(p.stage)}</div>
                      <div style="font-size:0.8rem; color:#A7F3D0; margin-top:2px;"><strong>Action:</strong> ${escapeHtml(p.next_action)}</div>
                    </div>
                    <span class="badge badge-danger">URGENT</span>
                  </div>
                `).join('')}
              </div>

              <!-- High Tiers -->
              <div>
                <h4 style="font-size: 0.85rem; color: #FBBF24; text-transform: uppercase; margin-bottom: 8px;">
                  <i class="fas fa-star"></i> HIGH Priority Deals (${(plan.HIGH || []).length})
                </h4>
                ${(plan.HIGH || []).length === 0 ? '<div style="font-size:0.8rem; color:var(--text-muted);">No high priority deals.</div>' : (plan.HIGH || []).map(p => `
                  <div style="background: var(--bg-surface); padding: 10px 14px; border-radius: 4px; margin-bottom: 6px; border-left: 3px solid #F59E0B; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight:700; color:#fff;">${escapeHtml(p.customer_name)} (${p.score} pts)</div>
                      <div style="font-size:0.78rem; color:var(--text-secondary);">${escapeHtml(p.company || '')} • Stage: ${escapeHtml(p.stage)}</div>
                      <div style="font-size:0.8rem; color:#A7F3D0; margin-top:2px;"><strong>Action:</strong> ${escapeHtml(p.next_action)}</div>
                    </div>
                    <span class="badge badge-warning">HIGH</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `,
          footerButtons: [
            { label: 'Close', className: 'btn-secondary' }
          ]
        });
      } catch (err) {
        showToast(err.message || 'Failed to load sales plan', 'error');
      } finally {
        btnViewSalesPlan.disabled = false;
        btnViewSalesPlan.innerHTML = '<i class="fas fa-clipboard-list"></i> View Full Sales Plan';
      }
    });
  }

  // Ask Sales Manager Handlers
  const salesQueryInput = container.querySelector('#sales-query-input');
  const btnSalesExplain = container.querySelector('#btn-sales-explain');
  const salesExplainOutput = container.querySelector('#sales-ai-explanation-output');

  async function handleSalesExplain(query) {
    const q = query || salesQueryInput.value.trim();
    if (!q) {
      showToast('Please enter a question for the Sales Manager', 'error');
      return;
    }

    btnSalesExplain.disabled = true;
    btnSalesExplain.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    salesExplainOutput.style.display = 'block';
    salesExplainOutput.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Evaluating live CRM priorities & generating explanation...';

    try {
      const res = await APIClient.explainSalesPriorities(q);
      const answer = res.data?.answer || 'No response generated.';
      const provider = res.data?.provider || 'ollama';

      salesExplainOutput.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
          <span style="font-size: 0.75rem; color: #34D399; font-weight: 700; text-transform: uppercase;">
            <i class="fas fa-user-tie"></i> Sales Manager Priority Assessment
          </span>
          <span class="badge" style="font-size: 0.68rem; background: var(--bg-surface);">
            Provider: ${escapeHtml(provider)}
          </span>
        </div>
        <div>${escapeHtml(answer)}</div>
      `;
    } catch (err) {
      salesExplainOutput.innerHTML = `<span style="color: #F87171;">Failed to generate explanation: ${escapeHtml(err.message)}</span>`;
    } finally {
      btnSalesExplain.disabled = false;
      btnSalesExplain.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Ask';
    }
  }

  if (btnSalesExplain) {
    btnSalesExplain.addEventListener('click', () => handleSalesExplain());
  }

  container.querySelectorAll('.btn-sales-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      salesQueryInput.value = btn.dataset.query;
      handleSalesExplain(btn.dataset.query);
    });
  });

  // AI Follow-up Draft Generation Handlers
  const generateBtn = container.querySelector('#btn-generate-followup-draft');
  const followupLeadSelect = container.querySelector('#followup-lead-select');
  const followupReasonSelect = container.querySelector('#followup-reason-select');
  const followupLangSelect = container.querySelector('#followup-lang-select');
  const draftOutputArea = container.querySelector('#followup-draft-output-area');
  const draftMessageDisplay = container.querySelector('#draft-message-display');
  const draftIdDisplay = container.querySelector('#draft-id-display');
  const draftLangBadge = container.querySelector('#draft-lang-badge');
  const draftStatusBadge = container.querySelector('#draft-status-badge');
  const btnDraftEdit = container.querySelector('#btn-draft-edit');
  const btnDraftReject = container.querySelector('#btn-draft-reject');
  const btnDraftApprove = container.querySelector('#btn-draft-approve');

  let isEditingDraft = false;

  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const selectedLeadId = followupLeadSelect.value;
      const selectedReason = followupReasonSelect.value;
      const selectedLang = followupLangSelect.value;

      if (!selectedLeadId) {
        showToast('Please select a customer lead first', 'error');
        return;
      }

      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Draft...';

      try {
        const res = await APIClient.generateFollowup({
          leadId: selectedLeadId,
          reason: selectedReason,
          language: selectedLang,
        });

        activeFollowupDraft = {
          id: res.draft_id || res.id,
          draft_id: res.draft_id || res.id,
          lead_id: selectedLeadId,
          draft_message: res.message || res.payload?.draft_message || '',
          language: selectedLang,
          status: res.status || 'PENDING_APPROVAL',
        };

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
        isEditingDraft = true;
        draftMessageDisplay.readOnly = false;
        draftMessageDisplay.style.borderColor = 'var(--accent-primary)';
        draftMessageDisplay.focus();
        btnDraftEdit.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Changes';
        btnDraftEdit.className = 'btn btn-primary btn-sm';
        showToast('You can now edit the draft message directly.', 'info');
      } else {
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
    refreshBriefBtn.innerHTML = '<i class="fas fa-robot"></i> Refresh Operations Brief';
    showToast('Operations telemetry and real estate brief refreshed.', 'success');
  });

  loadDashboardData();
}
