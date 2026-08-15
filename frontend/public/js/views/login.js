import { APIClient } from '../api.js';
import { state } from '../state.js';
import { showToast } from '../components/ui.js';

export function renderLoginView(container) {
  container.innerHTML = `
    <div style="min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top, #1E293B 0%, #0B0F19 100%); padding: 20px;">
      <div class="card" style="max-width: 440px; width: 100%; padding: 36px; box-shadow: var(--shadow-lg);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-flex; width: 50px; height: 50px; background: linear-gradient(135deg, #3B82F6, #1E40AF); border-radius: var(--radius-md); align-items: center; justify-content: center; color: #fff; font-size: 1.5rem; margin-bottom: 12px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);">
            <i class="fas fa-shield-halved"></i>
          </div>
          <h1 style="font-size: 1.4rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">MEGADRONE Business OS</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">Enterprise AI Operations & Task Governance</p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Work Email</label>
            <input type="email" id="login-email" class="form-control" placeholder="name@company.com" required value="alex.mercer@apexglobal.io">
          </div>

          <div class="form-group" style="margin-bottom: 24px;">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-control" placeholder="••••••••" required value="megadrone123">
          </div>

          <button type="submit" id="btn-submit-login" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 0.95rem;">
            <i class="fas fa-arrow-right-to-bracket"></i> Sign In to Operations
          </button>
        </form>

        <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border-subtle);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; text-align: center; margin-bottom: 12px; letter-spacing: 0.05em;">
            Quick Demo Access (Apex Global Dynamics)
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm demo-login-btn" data-email="alex.mercer@apexglobal.io">
              Owner
            </button>
            <button type="button" class="btn btn-secondary btn-sm demo-login-btn" data-email="sarah.jenkins@apexglobal.io">
              Manager
            </button>
            <button type="button" class="btn btn-secondary btn-sm demo-login-btn" data-email="rahul.sharma@apexglobal.io">
              Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const emailInput = container.querySelector('#login-email');
  const passwordInput = container.querySelector('#login-password');
  const submitBtn = container.querySelector('#btn-submit-login');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

    try {
      const res = await APIClient.login(emailInput.value.trim(), passwordInput.value);
      state.setAuth(res.data.token, res.data.user, res.data.organization);
      showToast(`Welcome back, ${res.data.user.name}`, 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Sign In to Operations';
    }
  });

  container.querySelectorAll('.demo-login-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      emailInput.value = btn.dataset.email;
      passwordInput.value = 'megadrone123';
      form.requestSubmit();
    });
  });
}
