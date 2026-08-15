import { APIClient } from '../api.js';
import { state } from '../state.js';
import { showToast, escapeHtml } from '../components/ui.js';

export async function renderSettingsView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">System & Privacy Governance Settings</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Configure AI provider connectivity, outbound data sensitivity gates, and tenant profiles</p>
        </div>
      </div>

      <!-- AI Provider Diagnostics -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-network-wired" style="color: var(--accent-primary);"></i> AI Provider Health & Routing Diagnostics</h3>
        </div>
        <div class="grid-2" id="ai-diagnostics-container">
          <div style="text-align: center; padding: 20px; color: var(--text-muted); grid-column: span 2;">Checking AI providers...</div>
        </div>
      </div>

      <!-- Data Privacy Policy Form -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fas fa-shield-halved" style="color: var(--accent-warning);"></i> Outbound Data Privacy Policy</h3>
            <p class="card-subtitle">Control what classes of business information are permitted to leave local processing</p>
          </div>
        </div>
        <form id="privacy-policy-form">
          <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer;">
              <div>
                <strong style="color: #fff; font-size: 0.9rem;">Allow Cloud AI for PUBLIC Data</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Marketing copy, public knowledge, general inquiries</div>
              </div>
              <input type="checkbox" id="allow-public" checked style="width: 18px; height: 18px;">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer;">
              <div>
                <strong style="color: #fff; font-size: 0.9rem;">Allow Cloud AI for INTERNAL Data</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Lead notes, internal task summaries, sanitized team logs</div>
              </div>
              <input type="checkbox" id="allow-internal" checked style="width: 18px; height: 18px;">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer;">
              <div>
                <strong style="color: #fff; font-size: 0.9rem;">Allow Cloud AI for CONFIDENTIAL Data</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Unpublished corporate agreements, high-stake pricing strategies</div>
              </div>
              <input type="checkbox" id="allow-confidential" style="width: 18px; height: 18px;">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer;">
              <div>
                <strong style="color: #fff; font-size: 0.9rem;">Allow Cloud AI for SENSITIVE Data</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">PII, proprietary formulas, sensitive customer credentials (Must remain Local)</div>
              </div>
              <input type="checkbox" id="allow-sensitive" style="width: 18px; height: 18px;">
            </label>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button type="submit" id="btn-save-privacy" class="btn btn-primary">
              <i class="fas fa-floppy-disk"></i> Save Privacy Controls
            </button>
          </div>
        </form>
      </div>

      <!-- Organization Profile -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-building" style="color: var(--accent-info);"></i> Tenant Organization Profile</h3>
        </div>
        <div class="grid-2">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Organization Name</div>
            <div style="font-size: 1rem; font-weight: 700; color: #fff; margin-top: 2px;">${escapeHtml(state.org?.name || 'Apex Global Dynamics')}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Unique Tenant Identifier</div>
            <div style="font-size: 0.9rem; font-family: var(--font-mono); color: var(--accent-primary); margin-top: 2px;">${escapeHtml(state.org?.id || 'org_apex_global')}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Active Subscription Plan</div>
            <div style="font-size: 0.9rem; font-weight: 600; color: var(--accent-success); margin-top: 2px;">${escapeHtml((state.org?.plan || 'Enterprise').toUpperCase())}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Data Storage Isolation</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 2px;">Dedicated Tenant Row-Level Enforcement</div>
          </div>
        </div>
      </div>
    </div>
  `;

  async function loadDiagnostics() {
    const diagContainer = container.querySelector('#ai-diagnostics-container');
    try {
      const res = await APIClient.getAiStatus();
      const st = res.data;

      diagContainer.innerHTML = `
        <!-- Cloud AI Card -->
        <div style="background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="font-weight: 700; color: #fff;"><i class="fas fa-cloud" style="color: var(--accent-primary);"></i> Cloud AI Provider</div>
            <span class="badge ${st.cloudAi.isAvailable ? 'badge-won' : 'badge-lost'}">
              ${st.cloudAi.isAvailable ? 'ONLINE' : 'NOT CONFIGURED'}
            </span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">Model: <strong>${st.cloudAi.model}</strong></div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; word-break: break-all;">Base URL: ${st.cloudAi.baseUrl}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
            ${st.cloudAi.configured ? 'API key configured in .env' : 'Provide CLOUD_AI_API_KEY in .env to activate Cloud reasoning'}
          </div>
        </div>

        <!-- Local Ollama Card -->
        <div style="background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="font-weight: 700; color: #fff;"><i class="fas fa-server" style="color: var(--accent-ai);"></i> Local Ollama Provider</div>
            <span class="badge ${st.localOllama.isAvailable ? 'badge-won' : 'priority-medium'}">
              ${st.localOllama.isAvailable ? 'ONLINE & READY' : 'OFFLINE / STANDBY'}
            </span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">Model: <strong>${st.localOllama.model}</strong></div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Base URL: ${st.localOllama.baseUrl}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
            ${st.localOllama.isAvailable ? 'Zero cloud transmission; 100% private local execution' : 'Start Ollama locally on port 11434 to enable zero-cost offline AI'}
          </div>
        </div>
      `;

      // Set privacy toggles
      if (st.dataPolicy) {
        container.querySelector('#allow-public').checked = Boolean(st.dataPolicy.allowCloudForPublic);
        container.querySelector('#allow-internal').checked = Boolean(st.dataPolicy.allowCloudForInternal);
        container.querySelector('#allow-confidential').checked = Boolean(st.dataPolicy.allowCloudForConfidential);
        container.querySelector('#allow-sensitive').checked = Boolean(st.dataPolicy.allowCloudForSensitive);
      }
    } catch (err) {
      showToast(err.message || 'Failed loading diagnostics', 'error');
    }
  }

  // Save privacy controls
  container.querySelector('#privacy-policy-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const policy = {
      allowCloudForPublic: container.querySelector('#allow-public').checked,
      allowCloudForInternal: container.querySelector('#allow-internal').checked,
      allowCloudForConfidential: container.querySelector('#allow-confidential').checked,
      allowCloudForSensitive: container.querySelector('#allow-sensitive').checked,
    };

    try {
      await APIClient.updatePrivacyPolicy(policy);
      showToast('Data Privacy Policy updated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed updating policy', 'error');
    }
  });

  loadDiagnostics();
}
