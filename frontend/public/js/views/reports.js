import { APIClient } from '../api.js';
import { showToast, escapeHtml } from '../components/ui.js';

export async function renderReportsView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">Business Intelligence & Operational Reports</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Verified metrics, pipeline velocity, AI usage costs, and natural language analytics</p>
        </div>
      </div>

      <!-- Ask AI About Reports Section -->
      <div class="card" style="margin-bottom: 24px; border: 1px solid var(--accent-ai);">
        <div class="card-header" style="margin-bottom: 12px;">
          <h3 class="card-title" style="color: #C4B5FD;">
            <i class="fas fa-sparkles"></i> AI Operational Interpretation & Diagnosis
          </h3>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 14px;">
          Ask questions regarding trends, bottlenecks, or pipeline anomalies. All answers are strictly grounded in live database records.
        </p>
        <form id="ask-ai-report-form" style="display: flex; gap: 10px; margin-bottom: 16px;">
          <input type="text" id="report-question" class="form-control" placeholder="e.g. Why did my business activity decrease this week?" style="flex: 1;" required>
          <button type="submit" id="btn-ask-report" class="btn btn-ai">
            <i class="fas fa-brain"></i> Analyze Data
          </button>
        </form>
        <div id="ai-report-answer" style="display: none; background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); line-height: 1.6; font-size: 0.9rem; color: #E2E8F0; white-space: pre-line;"></div>
      </div>

      <!-- Analytics Breakdown Grid -->
      <div class="grid-2" style="margin-bottom: 24px;">
        <!-- Lead Pipeline Report -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-filter" style="color: var(--accent-primary);"></i> Lead Pipeline Stage Breakdown</h3>
          </div>
          <div id="lead-report-content" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading lead analytics...</div>
          </div>
        </div>

        <!-- Task Velocity Report -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-gauge-high" style="color: var(--accent-info);"></i> Task Execution Velocity</h3>
          </div>
          <div id="task-report-content" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading task analytics...</div>
          </div>
        </div>
      </div>

      <!-- AI Usage & Cost Governance -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fas fa-coins" style="color: var(--accent-warning);"></i> AI Token Consumption & Cost Governance</h3>
            <p class="card-subtitle">Local Ollama processing is 100% cost-free; Cloud AI monitored continuously</p>
          </div>
        </div>
        <div class="grid-4" id="ai-usage-metrics">
          <div style="text-align: center; padding: 20px; color: var(--text-muted); grid-column: span 4;">Loading AI usage telemetry...</div>
        </div>
      </div>
    </div>
  `;

  async function loadReports() {
    try {
      const [leadRepRes, taskRepRes, usageRes] = await Promise.all([
        APIClient.getLeadReport(),
        APIClient.getTaskReport(),
        APIClient.getAiUsage(),
      ]);

      const leadData = leadRepRes.data;
      const taskData = taskRepRes.data;
      const usageData = usageRes.data;

      // Render Leads Stage Breakdown
      const leadEl = container.querySelector('#lead-report-content');
      const statuses = Object.entries(leadData.byStatus || {});
      leadEl.innerHTML = statuses.map(([status, count]) => {
        const pct = leadData.totalLeads > 0 ? Math.round((count / leadData.totalLeads) * 100) : 0;
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
              <span style="font-weight: 600; color: #fff;">${status}</span>
              <span style="color: var(--text-muted);">${count} (${pct}%)</span>
            </div>
            <div style="height: 8px; background: var(--bg-main); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${pct}%; background: var(--accent-primary); border-radius: 4px;"></div>
            </div>
          </div>
        `;
      }).join('');

      // Render Task Velocity
      const taskEl = container.querySelector('#task-report-content');
      taskEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <span style="color: var(--text-secondary); font-size: 0.85rem;">Total Tasks Tracked</span>
          <strong style="color: #fff;">${taskData.totalTasks}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <span style="color: var(--accent-danger); font-size: 0.85rem;"><i class="fas fa-clock"></i> Overdue Tasks</span>
          <strong style="color: var(--accent-danger);">${taskData.overdueCount}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <span style="color: var(--accent-primary); font-size: 0.85rem;"><i class="fas fa-calendar-day"></i> Due Today</span>
          <strong style="color: var(--accent-primary);">${taskData.dueTodayCount}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <span style="color: var(--accent-success); font-size: 0.85rem;"><i class="fas fa-check"></i> Completed Deliverables</span>
          <strong style="color: var(--accent-success);">${taskData.byStatus?.COMPLETED || 0}</strong>
        </div>
      `;

      // Render AI Usage & Cost
      const usageEl = container.querySelector('#ai-usage-metrics');
      usageEl.innerHTML = `
        <div class="metric-card">
          <span class="metric-label">Total AI Requests</span>
          <div class="metric-value">${usageData.totalRequests}</div>
          <div class="metric-foot">Scoped to organization</div>
        </div>
        <div class="metric-card">
          <span class="metric-label">Prompt Tokens</span>
          <div class="metric-value" style="font-size: 1.5rem;">${usageData.totalPromptTokens.toLocaleString()}</div>
          <div class="metric-foot">Ingested context</div>
        </div>
        <div class="metric-card">
          <span class="metric-label">Completion Tokens</span>
          <div class="metric-value" style="font-size: 1.5rem;">${usageData.totalCompletionTokens.toLocaleString()}</div>
          <div class="metric-foot">AI generated text</div>
        </div>
        <div class="metric-card">
          <span class="metric-label">Estimated AI Cost</span>
          <div class="metric-value" style="color: var(--accent-success); font-size: 1.5rem;">$${usageData.totalCostUsd.toFixed(4)}</div>
          <div class="metric-foot">Avg Latency: ${usageData.avgLatencyMs}ms</div>
        </div>
      `;
    } catch (err) {
      showToast(err.message || 'Failed loading reports', 'error');
    }
  }

  // Ask AI about Reports Form
  const askForm = container.querySelector('#ask-ai-report-form');
  const questionInput = container.querySelector('#report-question');
  const answerEl = container.querySelector('#ai-report-answer');
  const askBtn = container.querySelector('#btn-ask-report');

  askForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = questionInput.value.trim();
    if (!q) return;

    askBtn.disabled = true;
    askBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    answerEl.style.display = 'block';
    answerEl.textContent = 'Querying live database metrics and generating grounded explanation...';

    try {
      const res = await APIClient.explainReport(q);
      answerEl.textContent = res.data.explanation;
    } catch (err) {
      showToast(err.message || 'Analysis failed', 'error');
      answerEl.textContent = `Analysis error: ${err.message}`;
    } finally {
      askBtn.disabled = false;
      askBtn.innerHTML = '<i class="fas fa-brain"></i> Analyze Data';
    }
  });

  loadReports();
}
