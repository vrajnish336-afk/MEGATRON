import { state } from './state.js';
import { APIClient } from './api.js';
import { showToast, escapeHtml } from './components/ui.js';

// Views
import { renderLoginView } from './views/login.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderLeadsView } from './views/leads.js';
import { renderTasksView } from './views/tasks.js';
import { renderWorkflowsView } from './views/workflows.js';
import { renderApprovalsView } from './views/approvals.js';
import { renderAssistantView } from './views/assistant.js';
import { renderReportsView } from './views/reports.js';
import { renderActivityView } from './views/activity.js';
import { renderSettingsView } from './views/settings.js';

const appContainer = document.getElementById('app');

const ROUTES = {
  login: renderLoginView,
  dashboard: renderDashboardView,
  leads: renderLeadsView,
  tasks: renderTasksView,
  workflows: renderWorkflowsView,
  approvals: renderApprovalsView,
  assistant: renderAssistantView,
  reports: renderReportsView,
  activity: renderActivityView,
  settings: renderSettingsView,
};

function initApp() {
  window.addEventListener('hashchange', handleRoute);
  state.subscribe(() => {
    // Re-render layout if authentication state changed
  });
  handleRoute();
}

async function handleRoute() {
  const hash = window.location.hash.slice(2) || 'dashboard';
  const route = hash.split('?')[0];

  // Auth Guard
  if (!state.isAuthenticated() && route !== 'login') {
    window.location.hash = '#/login';
    renderLoginView(appContainer);
    return;
  }

  if (state.isAuthenticated() && route === 'login') {
    window.location.hash = '#/dashboard';
    return;
  }

  state.setRoute(route);

  if (route === 'login') {
    renderLoginView(appContainer);
  } else {
    renderMainLayout(route);
  }
}

function renderMainLayout(activeRoute) {
  // If app container already has the layout, just update active nav and main content
  let mainContent = document.getElementById('main-content-view');

  if (!mainContent) {
    appContainer.innerHTML = `
      <div class="app-container">
        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="app-sidebar">
          <div class="sidebar-header">
            <div class="brand-logo">
              <i class="fas fa-shield-halved"></i>
            </div>
            <div class="brand-info">
              <div class="brand-title">
                MEGADRONE <span class="brand-badge">OS</span>
              </div>
              <div class="brand-org" id="sidebar-org-name">${escapeHtml(state.org?.name || 'Operations')}</div>
            </div>
          </div>

          <nav class="sidebar-nav">
            <div class="nav-section-title">Operations & Data</div>
            <a href="#/dashboard" class="nav-item ${activeRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard">
              <i class="fas fa-chart-pie"></i>
              <span>Dashboard</span>
            </a>
            <a href="#/leads" class="nav-item ${activeRoute === 'leads' ? 'active' : ''}" data-route="leads">
              <i class="fas fa-users"></i>
              <span>Leads CRM</span>
            </a>
            <a href="#/tasks" class="nav-item ${activeRoute === 'tasks' ? 'active' : ''}" data-route="tasks">
              <i class="fas fa-list-check"></i>
              <span>Tasks</span>
            </a>

            <div class="nav-section-title">AI & Automations</div>
            <a href="#/assistant" class="nav-item ${activeRoute === 'assistant' ? 'active' : ''}" data-route="assistant">
              <i class="fas fa-terminal" style="color: #C4B5FD;"></i>
              <span style="font-weight: 600;">AI Assistant</span>
            </a>
            <a href="#/workflows" class="nav-item ${activeRoute === 'workflows' ? 'active' : ''}" data-route="workflows">
              <i class="fas fa-bolt"></i>
              <span>Workflows</span>
            </a>
            <a href="#/approvals" class="nav-item ${activeRoute === 'approvals' ? 'active' : ''}" data-route="approvals">
              <i class="fas fa-shield-check" style="color: #FBBF24;"></i>
              <span>Approvals Queue</span>
            </a>

            <div class="nav-section-title">Analytics & Security</div>
            <a href="#/reports" class="nav-item ${activeRoute === 'reports' ? 'active' : ''}" data-route="reports">
              <i class="fas fa-chart-line"></i>
              <span>Business Reports</span>
            </a>
            <a href="#/activity" class="nav-item ${activeRoute === 'activity' ? 'active' : ''}" data-route="activity">
              <i class="fas fa-fingerprint"></i>
              <span>Audit Trail</span>
            </a>
            <a href="#/settings" class="nav-item ${activeRoute === 'settings' ? 'active' : ''}" data-route="settings">
              <i class="fas fa-sliders"></i>
              <span>Settings & Privacy</span>
            </a>
          </nav>

          <div class="sidebar-footer">
            <div class="user-profile">
              <div class="user-avatar" id="sidebar-avatar">
                ${state.user ? state.user.name.charAt(0) : 'U'}
              </div>
              <div class="user-meta">
                <span class="user-name" id="sidebar-user-name">${escapeHtml(state.user?.name || 'User')}</span>
                <span class="user-role" id="sidebar-user-role">${escapeHtml(state.user?.role || 'EMPLOYEE')}</span>
              </div>
            </div>
            <button id="btn-logout-sidebar" class="btn-logout" title="Sign Out">
              <i class="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="main-wrapper">
          <header class="topbar">
            <div class="topbar-left">
              <button id="sidebar-toggle" class="btn btn-secondary btn-sm" style="display: none;">
                <i class="fas fa-bars"></i>
              </button>
              <h2 class="page-heading" id="topbar-page-title">${formatPageTitle(activeRoute)}</h2>
            </div>
            <div class="topbar-right">
              <div class="ai-status-indicator">
                <span class="status-dot"></span>
                <span>AI Governance: <strong>Active</strong></span>
              </div>
            </div>
          </header>

          <main id="main-content-view">
            <!-- Dynamic page view rendered here -->
          </main>
        </div>
      </div>
    `;

    // Logout listener
    document.getElementById('btn-logout-sidebar')?.addEventListener('click', () => {
      state.setAuth(null, null, null);
      showToast('Signed out of MEGADRONE Business OS', 'info');
      window.location.hash = '#/login';
    });

    mainContent = document.getElementById('main-content-view');
  } else {
    // Update active nav styling
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.dataset.route === activeRoute) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update topbar title
    const titleEl = document.getElementById('topbar-page-title');
    if (titleEl) titleEl.textContent = formatPageTitle(activeRoute);
  }

  // Render view
  const renderFn = ROUTES[activeRoute] || renderDashboardView;
  renderFn(mainContent);
}

function formatPageTitle(route) {
  const titles = {
    dashboard: 'Executive Dashboard',
    leads: 'Customer & Lead Pipeline',
    tasks: 'Task Governance & Execution',
    workflows: 'Automated Workflow Engine',
    approvals: 'Human Approval Queue',
    assistant: 'Autonomous Operations Console',
    reports: 'Business Reports & Intelligence',
    activity: 'Immutable Audit Trail',
    settings: 'System & Privacy Settings',
  };
  return titles[route] || 'Operations';
}

// Boot application on DOM ready
document.addEventListener('DOMContentLoaded', initApp);
