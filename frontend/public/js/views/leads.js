import { APIClient } from '../api.js';
import { showToast, showModal, formatDate, escapeHtml } from '../components/ui.js';

export async function renderLeadsView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;">Real Estate Lead Pipeline & CRM</h1>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Manage buyer & tenant inquiries, property requirements, and site visit schedules</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-ai-qualify" class="btn btn-ai">
            <i class="fas fa-sparkles"></i> AI Lead Qualifier
          </button>
          <button id="btn-add-lead" class="btn btn-primary">
            <i class="fas fa-plus"></i> New Property Lead
          </button>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="card" style="padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="lead-status-filters">
            <button class="btn btn-secondary btn-sm filter-btn active" data-status="">All Leads</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="NEW">New</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="QUALIFIED">Qualified</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="PROPOSAL">Proposal</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="NEGOTIATION">Negotiation</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="WON">Won Deals</button>
            <button class="btn btn-secondary btn-sm filter-btn" data-status="LOST">Lost</button>
          </div>
          <div style="min-width: 260px;">
            <input type="text" id="lead-search" class="form-control" placeholder="Search buyer, location, property type..." style="padding: 6px 12px; font-size: 0.85rem;">
          </div>
        </div>
      </div>

      <!-- Leads CRM Table -->
      <div class="card" style="padding: 0;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Buyer / Client</th>
                <th>Property Requirement</th>
                <th>Budget / Location</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Site Visit / Follow-up</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="leads-table-body">
              <tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading real estate leads...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  let currentStatusFilter = '';
  let searchQuery = '';

  async function loadLeads() {
    const tbody = container.querySelector('#leads-table-body');
    try {
      const params = {};
      if (currentStatusFilter) params.status = currentStatusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await APIClient.getLeads(params);
      const leads = res.data;

      if (leads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No property leads found matching your criteria.</td></tr>`;
        return;
      }

      const todayStr = new Date().toISOString().slice(0, 10);

      tbody.innerHTML = leads.map(l => {
        const reqStr = l.property_type || (l.bedrooms ? `${l.bedrooms}BHK Flat` : 'General Inquiry');
        const budgetStr = l.budget_max ? (l.budget_min ? `₹${l.budget_min} - ${l.budget_max}L` : `Up to ₹${l.budget_max}L`) : 'Budget open';
        const isOverdue = l.next_followup && l.next_followup < todayStr && !['WON', 'LOST'].includes(l.status);
        const hasSiteVisit = Boolean(l.site_visit_date);

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: #fff;">${escapeHtml(l.name)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(l.phone || l.email || 'Direct contact')}</div>
              ${l.company ? `<div style="font-size: 0.7rem; color: #60A5FA;">${escapeHtml(l.company)}</div>` : ''}
            </td>
            <td>
              <div style="font-weight: 600; color: #E2E8F0;">
                <i class="fas fa-home" style="color: var(--accent-primary); margin-right: 4px;"></i>
                ${escapeHtml(reqStr)}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">
                Purpose: ${escapeHtml(l.purpose || 'Self-use')} • ${escapeHtml(l.buy_or_rent || 'Buy')}
              </div>
            </td>
            <td>
              <div style="font-size: 0.85rem; font-weight: 600; color: #34D399;">${budgetStr}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">
                <i class="fas fa-location-dot" style="margin-right: 2px;"></i> ${escapeHtml(l.preferred_location || 'Citywide')}
              </div>
            </td>
            <td><span class="badge badge-${l.status.toLowerCase()}">${l.status}</span></td>
            <td><span class="badge priority-${l.priority.toLowerCase()}">${l.priority}</span></td>
            <td>
              ${hasSiteVisit ? `
                <div style="font-size: 0.8rem; color: #38BDF8; font-weight: 600;">
                  <i class="fas fa-car"></i> Visit: ${formatDate(l.site_visit_date)}
                </div>
              ` : ''}
              <div style="font-size: 0.75rem; color: ${isOverdue ? '#F87171' : 'var(--text-muted)'}; margin-top: 2px;">
                ${isOverdue ? '<i class="fas fa-triangle-exclamation"></i> Overdue: ' : 'Follow-up: '}${formatDate(l.next_followup)}
              </div>
            </td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 6px;">
                <button class="btn btn-ai btn-sm btn-draft-action" data-id="${l.id}" data-name="${escapeHtml(l.name)}" title="Generate AI Real Estate Draft">
                  <i class="fas fa-feather-pointed"></i> Draft
                </button>
                <button class="btn btn-secondary btn-sm btn-delete-lead" data-id="${l.id}" data-name="${escapeHtml(l.name)}" title="Delete Lead">
                  <i class="fas fa-trash-can" style="color: var(--accent-danger);"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-draft-action').forEach(btn => {
        btn.addEventListener('click', () => openFollowupDraftModal(btn.dataset.id, btn.dataset.name));
      });

      tbody.querySelectorAll('.btn-delete-lead').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Delete lead "${btn.dataset.name}"?`)) return;
          try {
            await APIClient.deleteLead(btn.dataset.id);
            showToast('Lead deleted', 'success');
            loadLeads();
          } catch (err) {
            showToast(err.message || 'Failed deleting lead', 'error');
          }
        });
      });
    } catch (err) {
      showToast(err.message || 'Failed loading leads', 'error');
    }
  }

  // Filter Buttons
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.dataset.status;
      loadLeads();
    });
  });

  // Search Input
  let searchTimeout;
  container.querySelector('#lead-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.trim();
      loadLeads();
    }, 300);
  });

  // AI Lead Qualifier Modal (Natural Language Parsing)
  container.querySelector('#btn-ai-qualify').addEventListener('click', () => {
    showModal({
      title: 'AI Real Estate Lead Qualifier',
      bodyHtml: `
        <div style="margin-bottom: 14px;">
          <label class="form-label">Paste Unformatted Buyer Message / Call Notes</label>
          <textarea id="ai-qualify-input" class="form-control" style="min-height: 100px;" placeholder="e.g. Customer wants 3BHK in Jaipur, budget 80 lakh, wants to visit this weekend."></textarea>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button type="button" class="btn btn-secondary btn-sm sample-qualify-btn" data-sample="Customer wants 3BHK in Jaipur, budget 80 lakh, wants to visit this weekend.">
              Sample 1 (Jaipur 3BHK)
            </button>
            <button type="button" class="btn btn-secondary btn-sm sample-qualify-btn" data-sample="Looking for 4BHK luxury villa on Golf Course Road Gurugram, budget around 2.5 Cr for family.">
              Sample 2 (Gurugram Villa)
            </button>
          </div>
        </div>

        <button type="button" id="btn-run-qualify" class="btn btn-ai" style="width: 100%; margin-bottom: 16px;">
          <i class="fas fa-bolt"></i> Extract Requirements & Classify Priority
        </button>

        <div id="qualify-result-box" style="display: none; background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong style="color: #fff; font-size: 0.95rem;">Extracted Property Specifications</strong>
            <span id="res-priority-badge" class="badge"></span>
          </div>
          <div class="grid-2" style="font-size: 0.85rem; gap: 10px; margin-bottom: 12px;">
            <div><span style="color: var(--text-muted);">Requirement:</span> <strong id="res-req" style="color: #fff;"></strong></div>
            <div><span style="color: var(--text-muted);">Budget:</span> <strong id="res-budget" style="color: #34D399;"></strong></div>
            <div><span style="color: var(--text-muted);">Location:</span> <strong id="res-loc" style="color: #60A5FA;"></strong></div>
            <div><span style="color: var(--text-muted);">Purpose / Mode:</span> <strong id="res-purpose" style="color: #fff;"></strong></div>
          </div>
          <div style="background: var(--bg-main); padding: 8px 12px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 10px;">
            <strong style="color: #C4B5FD;">Suggested Next Action:</strong> <span id="res-next-action" style="color: #E2E8F0;"></span>
          </div>
          <div style="font-size: 0.75rem; color: #FBBF24;">
            <i class="fas fa-circle-question"></i> <strong>Missing Information:</strong> <span id="res-missing-info"></span>
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Close', className: 'btn-secondary' },
        {
          label: 'Save as New CRM Lead',
          className: 'btn-primary',
          onClick: async (modalEl) => {
            const rawText = modalEl.querySelector('#ai-qualify-input').value.trim();
            if (!rawText) {
              showToast('Please enter inquiry text first', 'error');
              return false;
            }

            try {
              const qRes = await APIClient.qualifyRequirement(rawText);
              const q = qRes.data;

              // Create Lead in CRM
              await APIClient.createLead({
                name: `Inquiry (${q.propertyType !== 'Not provided.' ? q.propertyType : 'Buyer'})`,
                propertyType: q.propertyType !== 'Not provided.' ? q.propertyType : null,
                preferredLocation: q.location !== 'Not provided.' ? q.location : null,
                priority: q.priority || 'MEDIUM',
                status: 'NEW',
                purpose: q.purpose !== 'Not provided.' ? q.purpose : null,
                buyOrRent: q.buyOrRent !== 'Not provided.' ? q.buyOrRent : 'Buy',
                aiClassification: q.summary,
                aiSuggestedAction: q.nextAction,
                nextFollowup: new Date(Date.now() + (q.suggestedFollowupDays || 1) * 86400000).toISOString().slice(0, 10),
                notes: rawText,
              });

              showToast('Lead qualified and saved to CRM pipeline', 'success');
              loadLeads();
              return true;
            } catch (err) {
              showToast(err.message || 'Failed saving lead', 'error');
              return false;
            }
          }
        }
      ]
    });

    const overlay = document.querySelector('.modal-overlay');
    if (!overlay) return;

    // Sample filler buttons
    overlay.querySelectorAll('.sample-qualify-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelector('#ai-qualify-input').value = btn.dataset.sample;
      });
    });

    // Run qualify button
    overlay.querySelector('#btn-run-qualify').addEventListener('click', async () => {
      const inputVal = overlay.querySelector('#ai-qualify-input').value.trim();
      if (!inputVal) {
        showToast('Please enter inquiry text', 'error');
        return;
      }

      const btn = overlay.querySelector('#btn-run-qualify');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

      try {
        const res = await APIClient.qualifyRequirement(inputVal);
        const data = res.data;

        overlay.querySelector('#res-priority-badge').className = `badge priority-${data.priority.toLowerCase()}`;
        overlay.querySelector('#res-priority-badge').textContent = data.priority;
        overlay.querySelector('#res-req').textContent = data.requirement;
        overlay.querySelector('#res-budget').textContent = data.budget;
        overlay.querySelector('#res-loc').textContent = data.location;
        overlay.querySelector('#res-purpose').textContent = `${data.purpose} (${data.buyOrRent})`;
        overlay.querySelector('#res-next-action').textContent = data.nextAction;
        overlay.querySelector('#res-missing-info').textContent = (data.missingInfo || []).join(', ') || 'All critical fields provided.';

        overlay.querySelector('#qualify-result-box').style.display = 'block';
      } catch (err) {
        showToast(err.message || 'Qualification error', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-bolt"></i> Extract Requirements & Classify Priority';
      }
    });
  });

  // Add Manual Lead Modal
  container.querySelector('#btn-add-lead').addEventListener('click', () => {
    showModal({
      title: 'Create New Real Estate Lead',
      bodyHtml: `
        <form id="create-lead-form">
          <div class="form-group">
            <label class="form-label">Client / Buyer Name *</label>
            <input type="text" id="lead-name" class="form-control" required placeholder="e.g. Aarav Singhania">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" id="lead-phone" class="form-control" placeholder="+91 98290 00000">
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="lead-email" class="form-control" placeholder="client@email.com">
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Property Type</label>
              <select id="lead-prop-type" class="form-control">
                <option value="3BHK Apartment">3BHK Apartment</option>
                <option value="2BHK Apartment">2BHK Apartment</option>
                <option value="4BHK Luxury Villa">4BHK Luxury Villa</option>
                <option value="Commercial Showroom">Commercial Showroom</option>
                <option value="Pre-leased Office">Pre-leased Office</option>
                <option value="Residential Plot">Residential Plot</option>
                <option value="Farmhouse">Farmhouse</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Preferred Locality / City</label>
              <input type="text" id="lead-loc" class="form-control" placeholder="e.g. Vaishali Nagar, Jaipur">
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Max Budget (in Lakhs INR)</label>
              <input type="number" id="lead-budget" class="form-control" placeholder="e.g. 85">
            </div>
            <div class="form-group">
              <label class="form-label">Site Visit Date (Optional)</label>
              <input type="date" id="lead-site-visit" class="form-control">
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Pipeline Stage</label>
              <select id="lead-status" class="form-control">
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED" selected>QUALIFIED</option>
                <option value="PROPOSAL">PROPOSAL</option>
                <option value="NEGOTIATION">NEGOTIATION</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="lead-priority" class="form-control">
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH" selected>HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notes / Specific Client Requirements</label>
            <textarea id="lead-notes" class="form-control" placeholder="e.g. East facing, 2 covered car parkings, ready to move..."></textarea>
          </div>
        </form>
      `,
      footerButtons: [
        { label: 'Cancel', className: 'btn-secondary' },
        {
          label: 'Create Property Lead',
          className: 'btn-primary',
          onClick: async (modalEl) => {
            const name = modalEl.querySelector('#lead-name').value.trim();
            if (!name) {
              showToast('Lead name is required', 'error');
              return false;
            }

            const data = {
              name,
              phone: modalEl.querySelector('#lead-phone').value.trim() || null,
              email: modalEl.querySelector('#lead-email').value.trim() || null,
              propertyType: modalEl.querySelector('#lead-prop-type').value,
              preferredLocation: modalEl.querySelector('#lead-loc').value.trim() || null,
              budgetMax: modalEl.querySelector('#lead-budget').value ? parseFloat(modalEl.querySelector('#lead-budget').value) : null,
              siteVisitDate: modalEl.querySelector('#lead-site-visit').value || null,
              status: modalEl.querySelector('#lead-status').value,
              priority: modalEl.querySelector('#lead-priority').value,
              notes: modalEl.querySelector('#lead-notes').value.trim() || null,
              nextFollowup: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            };

            try {
              await APIClient.createLead(data);
              showToast('Property lead created successfully', 'success');
              loadLeads();
              return true;
            } catch (err) {
              showToast(err.message || 'Creation failed', 'error');
              return false;
            }
          }
        }
      ]
    });
  });

  // Follow-up Draft Modal (With scenario choice and no fake sending)
  function openFollowupDraftModal(leadId, leadName) {
    showModal({
      title: `AI Real Estate Follow-up: ${leadName}`,
      bodyHtml: `
        <div id="draft-loading" style="text-align: center; padding: 24px;">
          <div class="loader-spinner" style="margin: 0 auto 10px auto;"></div>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Composing personalized property follow-up draft...</span>
        </div>
        <div id="draft-form-area" style="display: none;">
          <div class="form-group">
            <label class="form-label">Follow-up Scenario</label>
            <select id="draft-scenario" class="form-control">
              <option value="Customer hasn't replied for 3 days. Send polite re-engagement check.">Customer hasn't replied for 3 days</option>
              <option value="Confirm scheduled site visit appointment and share GPS pin location.">Confirm scheduled site visit</option>
              <option value="Share 2 newly shortlisted properties matching their exact budget and location.">Share newly shortlisted properties</option>
              <option value="Follow up on commercial proposal terms and developer discount.">Follow up on price negotiation</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subject Line</label>
            <input type="text" id="draft-subject" class="form-control" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Draft Message</label>
            <textarea id="draft-body" class="form-control" style="min-height: 150px; font-family: var(--font-sans); line-height: 1.5;"></textarea>
          </div>
          <div style="font-size: 0.75rem; background: var(--bg-surface); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-warning); color: #FDE68A;">
            <i class="fas fa-shield-halved"></i> <strong>Human-in-the-Loop Governance:</strong> MEGADRONE will not dispatch messages automatically. Review the draft above before dispatching via your configured integration.
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Close', className: 'btn-secondary' },
        {
          label: 'Regenerate Draft',
          className: 'btn-secondary',
          onClick: async (modalEl) => {
            const scenario = modalEl.querySelector('#draft-scenario').value;
            modalEl.querySelector('#draft-form-area').style.display = 'none';
            modalEl.querySelector('#draft-loading').style.display = 'block';
            try {
              const res = await APIClient.generateFollowupDraft(leadId, scenario);
              modalEl.querySelector('#draft-subject').value = res.data.subject || 'Follow-up regarding property';
              modalEl.querySelector('#draft-body').value = res.data.body || '';
            } finally {
              modalEl.querySelector('#draft-loading').style.display = 'none';
              modalEl.querySelector('#draft-form-area').style.display = 'block';
            }
            return false;
          }
        },
        {
          label: 'Copy Draft to Clipboard',
          className: 'btn-primary',
          onClick: (modalEl) => {
            const body = modalEl.querySelector('#draft-body').value;
            navigator.clipboard.writeText(body);
            showToast('Draft copied to clipboard.', 'success');
            return true;
          }
        }
      ]
    });

    APIClient.generateFollowupDraft(leadId).then(res => {
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        overlay.querySelector('#draft-loading').style.display = 'none';
        overlay.querySelector('#draft-form-area').style.display = 'block';
        overlay.querySelector('#draft-subject').value = res.data.subject || 'Follow-up regarding property';
        overlay.querySelector('#draft-body').value = res.data.body || '';
      }
    }).catch(err => {
      showToast(err.message || 'Failed generating draft', 'error');
    });
  }

  loadLeads();
}
