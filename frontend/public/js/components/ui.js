/**
 * UI Components & Helpers
 * Phase 6.3 - Premium Business SaaS Motion & UX Polish
 */

export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type} toast-enter`;
  
  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-triangle-exclamation';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fas ${iconClass}" style="font-size: 1.1rem; flex-shrink: 0;"></i>
    <span style="flex: 1; line-height: 1.4;">${escapeHtml(message)}</span>
    <button style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px 4px;" aria-label="Close notification">&times;</button>
  `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector('button');
  let timeoutId = null;

  const removeToast = () => {
    if (timeoutId) clearTimeout(timeoutId);
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 220);
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', removeToast);
  }

  timeoutId = setTimeout(removeToast, duration);
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
        <button class="modal-close" id="modal-close-x" aria-label="Close modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        ${bodyHtml}
      </div>
      ${footerButtons.length ? `<div class="modal-footer">${buttonsHtml}</div>` : ''}
    </div>
  `;

  container.appendChild(overlay);

  let isClosing = false;
  const closeModal = () => {
    if (isClosing) return;
    isClosing = true;
    overlay.classList.add('modal-exit');
    document.removeEventListener('keydown', handleKeyDown);
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
      if (onClose) onClose();
    }, 190);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleKeyDown);

  overlay.querySelector('#modal-close-x')?.addEventListener('click', closeModal);
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

/**
 * Smooth numeric counter animation using requestAnimationFrame
 * Respects prefers-reduced-motion
 */
export function animateNumber(element, target, duration = 600) {
  if (!element) return;
  const targetNum = Number(target);
  if (isNaN(targetNum)) {
    element.textContent = target;
    return;
  }

  // Instant display if reduced motion is preferred
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = targetNum;
    return;
  }

  const startTime = performance.now();
  const startVal = 0;

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Cubic ease-out curve
    const easeOutProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.round(startVal + (targetNum - startVal) * easeOutProgress);
    element.textContent = currentVal;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = targetNum;
    }
  }

  requestAnimationFrame(step);
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
