import { APIClient } from '../api.js';
import { showToast, formatDate, escapeHtml } from '../components/ui.js';

export function renderAssistantView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.75rem; background: rgba(167, 139, 250, 0.2); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.35); padding: 2px 8px; border-radius: var(--radius-full); font-weight: 800; text-transform: uppercase;">
              <i class="fas fa-microchip"></i> Autonomous Console
            </span>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-family: var(--font-mono);">OLLAMA + LOCAL ORCHESTRATOR</span>
          </div>
          <h1 style="font-size: 1.65rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin-top: 4px;">
            MEGATRON Command Console
          </h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Direct business operations interface with live database tool execution & human governance</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-clear-chat" class="btn btn-secondary btn-sm"><i class="fas fa-trash-can"></i> Clear Console</button>
        </div>
      </div>

      <!-- AI Core Activity Visualization & Lifecycle Header -->
      <div class="card" style="margin-bottom: 16px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; border: 1px solid rgba(167, 139, 250, 0.25);">
        <div style="display: flex; align-items: center; gap: 18px;">
          <!-- AI Core Visualizer Orb -->
          <div class="ai-core-visualizer" id="assistant-ai-orb" data-state="IDLE">
            <div class="ai-core-energy-ring outer-ring"></div>
            <div class="ai-core-energy-ring inner-ring"></div>
            <div class="ai-core-orbit-arcs">
              <span class="arc arc-1"></span>
              <span class="arc arc-2"></span>
            </div>
            <div class="ai-core-orb">
              <div class="ai-core-nucleus"></div>
            </div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-family: var(--font-mono);">
              AI CORE ACTIVITY
            </div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #fff; margin-top: 2px;" id="ai-core-state-label">
              NEURAL CORE: IDLE & READY
            </div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;" id="ai-core-status-desc">
              Awaiting operational command. Scoped to verified database.
            </div>
          </div>
        </div>

        <!-- Lifecycle Stage Stepper -->
        <div style="display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 0.7rem;" id="ai-lifecycle-stepper">
          <span class="badge" id="step-listening" style="background: rgba(56, 189, 248, 0.2); color: #38BDF8;">1. READY</span>
          <i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 0.6rem;"></i>
          <span class="badge" id="step-analyzing" style="background: var(--bg-surface); color: var(--text-muted);">2. ANALYZE</span>
          <i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 0.6rem;"></i>
          <span class="badge" id="step-routing" style="background: var(--bg-surface); color: var(--text-muted);">3. ROUTE</span>
          <i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 0.6rem;"></i>
          <span class="badge" id="step-executing" style="background: var(--bg-surface); color: var(--text-muted);">4. EXECUTE</span>
        </div>
      </div>

      <!-- Quick Action Chips -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Rajesh Khandelwal ka deal status batao">
          <i class="fas fa-user-tag" style="color: #38BDF8;"></i> Rajesh Deal Status (Lead)
        </button>
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Aaj kis customer ko call karna chahiye">
          <i class="fas fa-phone-volume" style="color: #34D399;"></i> Aaj kisko call karein? (Sales)
        </button>
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Meri agency ka health score batao">
          <i class="fas fa-heart-pulse" style="color: #FBBF24;"></i> Agency Health Score (Ops)
        </button>
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Rajesh ko WhatsApp follow-up message bana do">
          <i class="fas fa-envelope-open-text" style="color: #A78BFA;"></i> Prepare Follow-up Draft
        </button>
        <button class="btn btn-secondary btn-sm chip-btn" data-query="Show today's critical tasks">
          <i class="fas fa-list-check" style="color: #60A5FA;"></i> Critical Tasks
        </button>
      </div>

      <!-- Chat Console Container -->
      <div class="assistant-chat-container">
        <div class="assistant-messages" id="chat-messages">
          <div class="message-bubble message-assistant">
            <div style="font-weight: 800; color: #C4B5FD; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-microchip"></i> MEGATRON Business Operating System
            </div>
            <div>
              Welcome to the MEGATRON Operations Console. You can query live CRM data, generate follow-up drafts, evaluate operational velocity, and prioritize sales in natural language (English, Hindi, or Hinglish).
            </div>
            <div class="assistant-meta">
              <i class="fas fa-shield-halved" style="color: var(--accent-success);"></i> Neural Engine Ready • Hard Financial Guardrails Active
            </div>
          </div>
        </div>

        <form id="assistant-input-form" class="assistant-input-bar">
          <input type="text" id="assistant-query-input" class="assistant-input" placeholder="Enter an operational query or command (e.g. 'Rajesh Khandelwal deal status', 'Who should we call first?')..." autocomplete="off" required>
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
  const aiOrb = container.querySelector('#assistant-ai-orb');
  const aiStateLabel = container.querySelector('#ai-core-state-label');
  const aiStatusDesc = container.querySelector('#ai-core-status-desc');

  const stepAnalyzing = container.querySelector('#step-analyzing');
  const stepRouting = container.querySelector('#step-routing');
  const stepExecuting = container.querySelector('#step-executing');

  function setCoreState(state, title, desc) {
    if (aiOrb) aiOrb.setAttribute('data-state', state);
    if (aiStateLabel) aiStateLabel.textContent = title;
    if (aiStatusDesc) aiStatusDesc.textContent = desc;
  }

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

    const intent = data.intent || data.type || 'GENERAL_QUERY';
    const agent = data.agent || (data.type === 'TASK_OPERATION' ? 'TaskAgent' : 'LocalAI');

    let contentHtml = '';

    // Contextual Intent & Agent Strip
    const metadataStrip = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
        <span class="badge" style="background: rgba(56, 189, 248, 0.18); color: #38BDF8; font-family: var(--font-mono); font-size: 0.68rem; font-weight: 800;">
          INTENT: ${escapeHtml(intent)}
        </span>
        <span class="badge" style="background: rgba(167, 139, 250, 0.18); color: #A78BFA; font-family: var(--font-mono); font-size: 0.68rem; font-weight: 800;">
          AGENT: ${escapeHtml(agent)}
        </span>
        ${data.approvalRequired ? '<span class="badge priority-urgent" style="font-size: 0.68rem;"><i class="fas fa-shield-halved"></i> PENDING APPROVAL</span>' : ''}
      </div>
    `;

    if (data.type === 'TASK_OPERATION') {
      contentHtml = `
        ${metadataStrip}
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
    } else if (data.intent === 'FOLLOWUP_REQUEST' || data.type === 'COMMUNICATION_DRAFT') {
      contentHtml = `
        ${metadataStrip}
        <div style="font-weight: 700; color: #34D399; margin-bottom: 6px;">
          <i class="fas fa-file-pen"></i> ${escapeHtml(data.message)}
        </div>
      `;

      if (data.data?.draft) {
        contentHtml += `
          <div style="background: var(--bg-card); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-top: 8px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #60A5FA; margin-bottom: 4px;">Generated Draft Message:</div>
            <div style="font-size: 0.85rem; color: #fff; line-height: 1.5; white-space: pre-wrap; background: var(--bg-main); padding: 10px; border-radius: 4px;">${escapeHtml(data.data.draft)}</div>
          </div>
        `;
      }
    } else {
      contentHtml = `
        ${metadataStrip}
        <div style="white-space: pre-line; font-size: 0.9rem; line-height: 1.6;">${escapeHtml(data.message || 'Action executed successfully.')}</div>
      `;
    }

    bubble.innerHTML = `
      ${contentHtml}
      <div class="assistant-meta">
        <i class="fas fa-shield-check" style="color: var(--accent-success);"></i> Verified Live Telemetry • Governance Evaluated
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

    // Step 1: ANALYZING
    setCoreState('ANALYZING', 'NEURAL CORE: ANALYZING INTENT', 'Parsing natural language and evaluating priority rules...');
    if (stepAnalyzing) {
      stepAnalyzing.style.background = 'rgba(56, 189, 248, 0.2)';
      stepAnalyzing.style.color = '#38BDF8';
    }

    // Show typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'message-bubble message-assistant';
    typingBubble.id = 'assistant-typing-indicator';
    typingBubble.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Reasoning live operational request...</span>
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      // Step 2: ROUTING & EXECUTING
      setCoreState('PROCESSING', 'NEURAL CORE: EXECUTING PIPELINE', 'Routing to specialized agent and verifying database permissions...');
      if (stepRouting) {
        stepRouting.style.background = 'rgba(167, 139, 250, 0.2)';
        stepRouting.style.color = '#A78BFA';
      }
      if (stepExecuting) {
        stepExecuting.style.background = 'rgba(52, 211, 153, 0.2)';
        stepExecuting.style.color = '#34D399';
      }

      const res = await APIClient.sendAssistantQuery(queryText);
      typingBubble.remove();

      // Step 3: COMPLETED
      setCoreState('COMPLETED', 'NEURAL CORE: EXECUTION VERIFIED', 'Response dispatched with active governance.');
      appendAssistantMessage(res);

      setTimeout(() => {
        setCoreState('IDLE', 'NEURAL CORE: IDLE & READY', 'Awaiting operational command. Scoped to verified database.');
        if (stepAnalyzing) { stepAnalyzing.style.background = 'var(--bg-surface)'; stepAnalyzing.style.color = 'var(--text-muted)'; }
        if (stepRouting) { stepRouting.style.background = 'var(--bg-surface)'; stepRouting.style.color = 'var(--text-muted)'; }
        if (stepExecuting) { stepExecuting.style.background = 'var(--bg-surface)'; stepExecuting.style.color = 'var(--text-muted)'; }
      }, 3500);

    } catch (err) {
      typingBubble.remove();
      setCoreState('ERROR', 'NEURAL CORE: INTERCEPTION / ERROR', err.message || 'Operation intercepted by policy.');
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

      setTimeout(() => {
        setCoreState('IDLE', 'NEURAL CORE: IDLE & READY', 'Awaiting operational command. Scoped to verified database.');
      }, 4000);

    } finally {
      if (typingBubble.parentNode) typingBubble.remove();
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
    setCoreState('IDLE', 'NEURAL CORE: IDLE & READY', 'Awaiting operational command. Scoped to verified database.');
  });
}
