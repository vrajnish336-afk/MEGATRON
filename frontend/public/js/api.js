import { state } from './state.js';

const API_BASE = '/api';

export class APIClient {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
        state.setAuth(null, null, null);
        window.location.hash = '#/login';
        throw new Error('Session expired. Please log in again.');
      }

      if (!res.ok) {
        const errorMsg = data.error?.message || data.message || `API error ${res.status}`;
        const err = new Error(errorMsg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  // Auth
  static login(email, password) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  }

  static register(orgName, name, email, password) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify({ orgName, name, email, password }) });
  }

  static getMe() {
    return this.request('/auth/me');
  }

  // Dashboard & Metrics
  static getDashboardSummary() {
    return this.request('/dashboard/summary');
  }

  // Leads
  static getLeads(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/leads${query ? `?${query}` : ''}`);
  }

  static getLeadStats() {
    return this.request('/leads/stats');
  }

  static getFollowups() {
    return this.request('/leads/followups');
  }

  static createLead(data) {
    return this.request('/leads', { method: 'POST', body: JSON.stringify(data) });
  }

  static updateLead(id, data) {
    return this.request(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  static deleteLead(id) {
    return this.request(`/leads/${id}`, { method: 'DELETE' });
  }

  // Tasks
  static getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  static getTaskSchedule() {
    return this.request('/tasks/schedule');
  }

  static createTask(data) {
    return this.request('/tasks', { method: 'POST', body: JSON.stringify(data) });
  }

  static updateTask(id, data) {
    return this.request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  static deleteTask(id) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  // AI Assistant & Operations
  static sendAssistantQuery(query) {
    return this.request('/ai/assistant', { method: 'POST', body: JSON.stringify({ query }) });
  }

  static getDailyBrief() {
    return this.request('/ai/daily-brief');
  }

  static classifyLead(leadData) {
    return this.request('/ai/classify-lead', { method: 'POST', body: JSON.stringify(leadData) });
  }

  static getLeadDraft(leadId) {
    return this.request(`/ai/leads/${leadId}/draft`);
  }

  static getAiUsage() {
    return this.request('/ai/usage');
  }

  // Workflows
  static getWorkflows() {
    return this.request('/workflows');
  }

  static getWorkflowRuns() {
    return this.request('/workflows/runs');
  }

  static createWorkflow(data) {
    return this.request('/workflows', { method: 'POST', body: JSON.stringify(data) });
  }

  static triggerWorkflow(id, payload = {}) {
    return this.request(`/workflows/${id}/trigger`, { method: 'POST', body: JSON.stringify(payload) });
  }

  static deleteWorkflow(id) {
    return this.request(`/workflows/${id}`, { method: 'DELETE' });
  }

  // Approvals
  static getApprovals(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/approvals${query ? `?${query}` : ''}`);
  }

  static approveAction(id) {
    return this.request(`/approvals/${id}/approve`, { method: 'POST' });
  }

  static rejectAction(id, reason) {
    return this.request(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
  }

  // Reports
  static getLeadReport() {
    return this.request('/reports/leads');
  }

  static getTaskReport() {
    return this.request('/reports/tasks');
  }

  static explainReport(question) {
    return this.request('/reports/explain', { method: 'POST', body: JSON.stringify({ question }) });
  }

  // Activities
  static getActivities(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/activities${query ? `?${query}` : ''}`);
  }

  // Settings
  static getAiStatus() {
    return this.request('/settings/ai-status');
  }

  static updatePrivacyPolicy(policy) {
    return this.request('/settings/privacy-policy', { method: 'POST', body: JSON.stringify(policy) });
  }
}
