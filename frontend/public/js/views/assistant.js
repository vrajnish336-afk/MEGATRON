import { APIClient } from '../api.js';
import { showToast, formatDate, escapeHtml } from '../components/ui.js';

export function renderAssistantView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">MEGADRONE Autonomous Assistant</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Direct business operations console with real database tool execution & strict human governance</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-clear-chat" class="btn btn-secondary btn-sm"><i class="fas fa-trash-can"></i> Clear Console</button>
        </div>
      </div>

      <!-- Quick Action Chips -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Show today's important tasks.">
          <i class="fas fa-list-check" style="color: var(--accent-primary);"></i> Show today's tasks
        </button>
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Which tasks are overdue?">
          <i class="fas fa-clock" style="color: var(--accent-danger);"></i> Overdue tasks
        </button>
        <button class="btn btn-secondary btn-sm chip-btn" data-query="आज मेरे सबसे important customers कौन हैं?">
          <i class="fas fa-star" style="color: var(--accent-warning);"></i> Top customers (Hindi)
        </button>
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Prepare follow-up messages for these leads.">
          <i class="fas fa-envelope-open-text" style="color: var(--accent-ai);"></i> Prepare follow-up drafts
        </button>
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Why did my business activity decrease this week?">
          <i class="fas fa-chart-line" style="color: var(--accent-info);"></i> Explain business activity
        </button>
      </div>

      <!-- Chat Console Container -->
      <div class="assistant-chat-container">
        <div class="assistant-messages" id="chat-messages">
          <div class="message-bubble message-assistant">
            <div style="font-weight: 700; color: #C4B5FD; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-robot"></i> MEGADRONE Business Operating System
            </div>
            <div>
              Welcome to the MEGADRONE Operations Console. You can query live CRM data, generate follow-up drafts, create tasks, and evaluate operational velocity in natural language.
            </div>
            <div class="assistant-meta">
              <i class="fas fa-shield-halved" style="color: var(--accent-success);"></i> System Ready • Live DB Scoped to Tenant
            </div>
          </div>
        </div>

        <form id="assistant-input-form" class="assistant-input-bar">
          <input type="text" id="assistant-query-input" class="assistant-input" placeholder="Type a natural-language operational command or question..." autocomplete="off" required>
          <button type="submit" id="btn-assistant-send" class="btn btn-ai" style="border-radius: var(--radius-full); padding: 12px 24px;">
            <i class="fas fa-paper-plane"></i> Execute
          </button>
        </form>
      </div>
    </div>
  `;

  const messagesContainer = container.querySelector('#chat-messages');
  const inputForm = container.querySelector('#assistant-input-form');
  const queryInput = container.querySelector('#assistant-query-input');
  const sendBtn = container.querySelector('#btn-assistant-send');
  const clearBtn = container.querySelector('#btn-clear-chat');

  function appendUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble message-user';
    bubble.innerHTML = `<div>${escapeHtml(text)}</div>`;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function appendAssistantMessage(data) {
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble message-assistant';

    let contentHtml = '';

    if (data.type === 'TASK_OPERATION') {
      contentHtml = `
        <div style="font-weight: 700; color: #60A5FA; margin-bottom: 6px;">
          <i class="fas fa-list-check"></i> ${escapeHtml(data.message)}
        </div>
      `;

      if (Array.isArray(data.data) && data.data.length > 0) {
        contentHtml += `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
            ${data.data.map(t => `
              <div style="background: var(--bg-card); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #fff; font-size: 0.85rem;">${escapeHtml(t.title)}</span>
                <span class="badge priority-${(t.priority || 'MEDIUM').toLowerCase()}">${t.priority || 'MEDIUM'}</span>
              </div>
            `).join('')}
          </div>
        `;
      }
    } else if (data.type === 'LEAD_QUERY') {
      contentHtml = `
        <div style="font-weight: 700; color: #A78BFA; margin-bottom: 6px;">
          <i class="fas fa-users"></i> ${escapeHtml(data.message)}
        </div>
      `;

      if (Array.isArray(data.data) && data.data.length > 0) {
        contentHtml += `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
            ${data.data.map(l => `
              <div style="background: var(--bg-card); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #fff; font-size: 0.85rem;">${escapeHtml(l.name)}</strong>
                  <span style="color: var(--text-muted); font-size: 0.75rem;"> • ${escapeHtml(l.company || 'Direct')}</span>
                </div>
                <span class="badge badge-${l.status.toLowerCase()}">${l.status}</span>
              </div>
            `).join('')}
          </div>
        `;
      }
    } else if (data.type === 'COMMUNICATION_DRAFT') {
      contentHtml = `
        <div style="font-weight: 700; color: #34D399; margin-bottom: 6px;">
          <i class="fas fa-file-pen"></i> ${escapeHtml(data.message)}
        </div>
      `;

      if (Array.isArray(data.data) && data.data.length > 0) {
        contentHtml += `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
            ${data.data.map(d => `
              <div style="background: var(--bg-card); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div style="font-size: 0.8rem; font-weight: 700; color: #60A5FA;">To: ${escapeHtml(d.leadName)} (${escapeHtml(d.subject)})</div>
                <div style="font-size: 0.8rem; color: var(--text-primary); margin-top: 6px; white-space: pre-line; background: var(--bg-main); padding: 8px; border-radius: 4px;">${escapeHtml(d.body)}</div>
              </div>
            `).join('')}
          </div>
        `;
      }
    } else if (data.type === 'APPROVAL_REQUIRED') {
      contentHtml = `
        <div style="font-weight: 700; color: #FBBF24; margin-bottom: 6px;">
          <i class="fas fa-shield-exclamation"></i> Approval Queue Intercepted
        </div>
        <div style="color: #FEF3C7; font-size: 0.85rem;">${escapeHtml(data.message)}</div>
        <div style="margin-top: 8px;">
          <a href="#/approvals" class="btn btn-warning btn-sm" style="background: #F59E0B; color: #000; font-weight: 700;">
            Review in Approval Queue
          </a>
        </div>
      `;
    } else {
      contentHtml = `
        <div style="white-space: pre-line; font-size: 0.9rem; line-height: 1.6;">${escapeHtml(data.message || 'Action executed.')}</div>
      `;
    }

    bubble.innerHTML = `
      ${contentHtml}
      <div class="assistant-meta">
        <i class="fas fa-shield-check" style="color: var(--accent-success);"></i> Verified Live Execution • Risk Assessment Checked
      </div>
    `;

    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function handleQuery(queryText) {
    if (!queryText) return;

    appendUserMessage(queryText);
    queryInput.value = '';
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
      const res = await APIClient.sendAssistantQuery(queryText);
      appendAssistantMessage(res);
    } catch (err) {
      showToast(err.message || 'Execution error', 'error');
      const errBubble = document.createElement('div');
      errBubble.className = 'message-bubble message-assistant';
      errBubble.innerHTML = `
        <div style="color: var(--accent-danger); font-weight: 700;">
          <i class="fas fa-triangle-exclamation"></i> Security / Policy Interception
        </div>
        <div style="font-size: 0.85rem; color: #FECACA; margin-top: 4px;">${escapeHtml(err.message)}</div>
      `;
      messagesContainer.appendChild(errBubble);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Execute';
    }
  }

  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleQuery(queryInput.value.trim());
  });

  container.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleQuery(btn.dataset.query);
    });
  });

  clearBtn.addEventListener('click', () => {
    messagesContainer.innerHTML = `
      <div class="message-bubble message-assistant">
        <div>Console reset. Ready for operational commands.</div>
      </div>
    `;
  });
}
