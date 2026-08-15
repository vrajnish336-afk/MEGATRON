/**
 * UI Components & Helpers
 */

export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-check-circle';
  if (type === 'error') iconClass = 'fa-exclamation-triangle';

  toast.innerHTML = `
    <i class="fas ${iconClass}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showModal({ title, bodyHtml, footerButtons = [], onClose = null }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const buttonsHtml = footerButtons.map((btn, index) => `
    <button class="btn ${btn.className || 'btn-secondary'}" id="modal-btn-${index}">
      ${btn.label}
    </button>
  `).join('');

  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        <button class="modal-close" id="modal-close-x"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        ${bodyHtml}
      </div>
      ${footerButtons.length ? `<div class="modal-footer">${buttonsHtml}</div>` : ''}
    </div>
  `;

  container.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
    if (onClose) onClose();
  };

  overlay.querySelector('#modal-close-x').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  footerButtons.forEach((btn, index) => {
    const btnEl = overlay.querySelector(`#modal-btn-${index}`);
    if (btnEl) {
      btnEl.addEventListener('click', () => {
        if (btn.onClick) {
          const shouldClose = btn.onClick(overlay);
          if (shouldClose !== false) closeModal();
        } else {
          closeModal();
        }
      });
    }
  });

  return { close: closeModal, element: overlay };
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoStr;
  }
}

export function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}
