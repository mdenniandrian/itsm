/**
 * Change Management Module (ITIL 4 Standard & CAB Approvals)
 */

window.changesState = {
  activeStatus: 'all',
  activeType: 'all',
  searchQuery: '',
};

window.loadChanges = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Change Management</h1>
        <p class="page-subtitle">ITIL 4 standard change governance, risk assessment, CAB approvals, and rollback plans</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" onclick="showCreateChangeModal()">
          ${renderIcon('plus')}
          <span>Create Change Request</span>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="loadChangesList()">
          ${renderIcon('refresh')}
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid mb-6" id="changes-stats-grid">
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
    </div>

    <!-- Filter Bar -->
    <div class="card mb-6">
      <div class="card-body py-3">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex gap-2 flex-wrap" id="change-filter-tabs">
            <button class="btn btn-sm btn-primary" onclick="setChangeStatusFilter('all', this)">All Changes</button>
            <button class="btn btn-sm btn-secondary" onclick="setChangeStatusFilter('pending_approval', this)">Pending CAB</button>
            <button class="btn btn-sm btn-secondary" onclick="setChangeStatusFilter('scheduled', this)">Scheduled</button>
            <button class="btn btn-sm btn-secondary" onclick="setChangeStatusFilter('implementing', this)">Implementing</button>
            <button class="btn btn-sm btn-secondary" onclick="setChangeStatusFilter('closed', this)">Completed</button>
          </div>
          <div class="search-input-wrap" style="width:260px">
            <span class="search-icon">${renderIcon('search')}</span>
            <input type="text" class="form-control" placeholder="Search title or CR number..." oninput="handleSearchChange(this.value)">
          </div>
        </div>
      </div>
    </div>

    <!-- Changes Table Card -->
    <div class="card">
      <div class="table-wrapper" id="changes-table-container">
        <div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>
      </div>
    </div>
  `;

  await loadChangesList();
};

window.setChangeStatusFilter = function(status, btn) {
  window.changesState.activeStatus = status;
  document.querySelectorAll('#change-filter-tabs button').forEach(b => b.className = 'btn btn-sm btn-secondary');
  if (btn) btn.className = 'btn btn-sm btn-primary';
  loadChangesList();
};

window.handleSearchChange = debounce(function(val) {
  window.changesState.searchQuery = val;
  loadChangesList();
}, 300);

window.loadChangesList = async function() {
  const container = document.getElementById('changes-table-container');
  const statsGrid = document.getElementById('changes-stats-grid');
  if (!container) return;

  try {
    const params = {};
    if (window.changesState.activeStatus !== 'all') params.status = window.changesState.activeStatus;
    if (window.changesState.searchQuery) params.search = window.changesState.searchQuery;

    const [stats, res] = await Promise.all([
      changesApi.stats(),
      changesApi.list(params),
    ]);

    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">${renderIcon('changes')}</div>
          <div class="stat-content">
            <div class="stat-value">${stats.total_changes}</div>
            <div class="stat-label">Total Change Requests</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:#fbbf24">${renderIcon('clock')}</div>
          <div class="stat-content">
            <div class="stat-value text-warning">${stats.pending_approval}</div>
            <div class="stat-label">Pending CAB Approval</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(6,182,212,0.12);color:#22d3ee">${renderIcon('activity')}</div>
          <div class="stat-content">
            <div class="stat-value text-primary">${stats.scheduled + stats.implementing}</div>
            <div class="stat-label">Scheduled / Implementing</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(244,63,94,0.12);color:#fb7185">${renderIcon('problems')}</div>
          <div class="stat-content">
            <div class="stat-value ${stats.high_risk > 0 ? 'text-danger' : 'text-success'}">${stats.high_risk}</div>
            <div class="stat-label">High / Critical Risk</div>
          </div>
        </div>
      `;
    }

    const changes = res.changes || [];
    if (!changes.length) {
      container.innerHTML = `
        <div class="empty-state p-8">
          <div class="empty-icon text-muted">${renderIcon('changes')}</div>
          <div class="empty-title">No Change Requests Found</div>
          <p class="empty-desc">Submit a system or infrastructure change request to proceed through the CAB review process.</p>
          <button class="btn btn-primary mt-4" onclick="showCreateChangeModal()">Create First Change Request</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Change # & Title</th>
            <th>Type & Risk</th>
            <th>Status</th>
            <th>Requester & PIC</th>
            <th>Execution Window</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${changes.map(c => renderChangeRow(c)).join('')}
        </tbody>
      </table>
    `;
  } catch(e) {
    toast.error('Failed to load Change Requests', e.message);
  }
};

function renderChangeRow(c) {
  const typeBadge = c.change_type === 'emergency'
    ? '<span class="badge badge-danger">Emergency</span>'
    : c.change_type === 'standard'
    ? '<span class="badge badge-success">Standard</span>'
    : '<span class="badge badge-info">Normal</span>';

  const riskBadge = c.risk_level === 'critical'
    ? '<span class="badge badge-danger">Critical Risk</span>'
    : c.risk_level === 'high'
    ? '<span class="badge badge-warning">High Risk</span>'
    : '<span class="badge badge-low">Low/Med Risk</span>';

  const statusBadge = c.status === 'pending_approval'
    ? '<span class="badge badge-warning">Pending CAB</span>'
    : c.status === 'scheduled'
    ? '<span class="badge badge-info">Scheduled</span>'
    : c.status === 'implementing'
    ? '<span class="badge badge-open">Implementing</span>'
    : c.status === 'closed'
    ? '<span class="badge badge-success">Completed</span>'
    : c.status === 'rejected'
    ? '<span class="badge badge-danger">Rejected</span>'
    : `<span class="badge badge-secondary">${c.status}</span>`;

  return `
    <tr>
      <td>
        <div class="font-bold text-accent">${escHtml(c.change_number)}</div>
        <div class="font-medium text-primary" style="max-width:320px">${escHtml(c.title)}</div>
      </td>
      <td>
        <div class="flex flex-col gap-1">
          <div>${typeBadge}</div>
          <div>${riskBadge}</div>
        </div>
      </td>
      <td>${statusBadge}</td>
      <td class="text-xs">
        <div><span class="text-muted">Requester:</span> <b>${escHtml(c.requester_name || '-')}</b></div>
        <div><span class="text-muted">PIC:</span> ${escHtml(c.assignee_name || '-')}</div>
      </td>
      <td class="text-xs text-secondary">
        ${c.scheduled_start_at ? formatDateShort(c.scheduled_start_at) : 'Unscheduled'}
      </td>
      <td>
        <button class="btn btn-secondary btn-xs" onclick="showChangeDetailModal(${c.id})">
          Details & CAB
        </button>
      </td>
    </tr>
  `;
}

window.showCreateChangeModal = async function() {
  try {
    const users = await usersApi.list();
    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="modal-title font-bold text-sm">Create Change Request (RFC)</span>
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <form id="create-change-form" onsubmit="event.preventDefault()">
          <div class="form-group mb-3">
            <label class="form-label font-medium text-xs">Change Title *</label>
            <input type="text" class="form-control" id="chg-title" placeholder="e.g. Upgrade Database Server RAM & Buffer Tuning" required>
          </div>

          <div class="grid-3 mb-3" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Change Type *</label>
              <select class="form-control" id="chg-type">
                <option value="normal">Normal (Requires CAB Review)</option>
                <option value="standard">Standard (Pre-approved / Low Risk)</option>
                <option value="emergency">Emergency (Urgent Incident Hotfix)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Risk Level *</label>
              <select class="form-control" id="chg-risk">
                <option value="low">Low Risk</option>
                <option value="medium" selected>Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="critical">Critical Risk</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">System Impact *</label>
              <select class="form-control" id="chg-impact">
                <option value="low">Low Impact (&lt; 5 Users)</option>
                <option value="medium" selected>Medium Impact (Department Wide)</option>
                <option value="high">High Impact (Enterprise Wide)</option>
              </select>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-medium text-xs">Business Justification & Objective *</label>
            <textarea class="form-control" id="chg-desc" rows="3" placeholder="Describe the technical justification and business reasons for this change..." required></textarea>
          </div>

          <div class="grid-2 mb-3" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Implementation Plan (Step-by-Step)</label>
              <textarea class="form-control" id="chg-impl-plan" rows="3" placeholder="1. Backup database&#10;2. Stop dependent services&#10;3. Execute migration script..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs text-danger">Rollback & Backout Plan *</label>
              <textarea class="form-control" id="chg-rollback-plan" rows="3" placeholder="Emergency recovery steps if implementation fails..."></textarea>
            </div>
          </div>

          <div class="grid-2 mb-3" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Maintenance Window Start</label>
              <input type="datetime-local" class="form-control" id="chg-start">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Maintenance Window End</label>
              <input type="datetime-local" class="form-control" id="chg-end">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Assigned Lead / PIC</label>
            <select class="form-control" id="chg-assignee">
              ${users.map(u => `<option value="${u.id}">${escHtml(u.name)} (${escHtml(u.role)})</option>`).join('')}
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="submitCreateChange()">Submit Change Request</button>
      </div>
    `, { size: 'modal-lg' });
  } catch(e) {
    toast.error('Failed to load change form', e.message);
  }
};

window.submitCreateChange = async function() {
  const title = document.getElementById('chg-title')?.value.trim();
  const description = document.getElementById('chg-desc')?.value.trim();
  const change_type = document.getElementById('chg-type')?.value;
  const risk_level = document.getElementById('chg-risk')?.value;
  const impact = document.getElementById('chg-impact')?.value;
  const implementation_plan = document.getElementById('chg-impl-plan')?.value.trim();
  const rollback_plan = document.getElementById('chg-rollback-plan')?.value.trim();
  const scheduled_start_at = document.getElementById('chg-start')?.value || null;
  const scheduled_end_at = document.getElementById('chg-end')?.value || null;
  const assigned_to = document.getElementById('chg-assignee')?.value || null;

  if (!title || !description) {
    toast.warning('Change Title and Description are required.');
    return;
  }

  try {
    const res = await changesApi.create({
      title,
      description,
      change_type,
      risk_level,
      impact,
      priority: risk_level === 'critical' ? 'critical' : 'medium',
      implementation_plan,
      rollback_plan,
      scheduled_start_at,
      scheduled_end_at,
      assigned_to,
    });

    modal.close();
    toast.success(`Change Request ${res.change_number} submitted successfully!`);
    loadChangesList();
  } catch(e) {
    toast.error('Failed to create Change Request', e.message);
  }
};

window.showChangeDetailModal = async function(id) {
  try {
    modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`, { size: 'modal-lg' });
    const c = await changesApi.get(id);
    const user = appState.user;
    const isManagerOrAdmin = ['admin', 'manager', 'superadmin'].includes(user.role);

    const approvals = c.approvals || [];

    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="font-bold text-accent">${escHtml(c.change_number)}</span>
          <span class="modal-title font-bold text-sm">${escHtml(c.title)}</span>
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <!-- Status & Assessment Header -->
        <div class="grid-4 mb-4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.75rem;background:var(--bg-input);padding:0.75rem;border-radius:8px">
          <div><span class="text-xs text-muted">Status:</span><div class="font-bold text-primary">${c.status.toUpperCase()}</div></div>
          <div><span class="text-xs text-muted">Type:</span><div class="font-bold text-accent">${c.change_type.toUpperCase()}</div></div>
          <div><span class="text-xs text-muted">Risk Level:</span><div class="font-bold text-danger">${c.risk_level.toUpperCase()}</div></div>
          <div><span class="text-xs text-muted">PIC:</span><div class="font-bold text-primary">${escHtml(c.assignee?.name || '-')}</div></div>
        </div>

        <div class="mb-4">
          <div class="text-xs font-bold text-muted mb-1">DESCRIPTION:</div>
          <p class="text-sm text-secondary" style="white-space:pre-wrap;background:var(--bg-card);padding:0.75rem;border-radius:6px;border:1px solid var(--border-primary)">${escHtml(c.description)}</p>
        </div>

        <!-- Plans -->
        <div class="grid-2 mb-4" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div class="card p-3">
            <div class="font-bold text-xs text-primary mb-1">Implementation Plan:</div>
            <div class="text-xs text-secondary" style="white-space:pre-wrap">${escHtml(c.implementation_plan || 'None')}</div>
          </div>
          <div class="card p-3" style="border-left:3px solid #f43f5e">
            <div class="font-bold text-xs text-danger mb-1">Rollback & Backout Plan:</div>
            <div class="text-xs text-secondary" style="white-space:pre-wrap">${escHtml(c.rollback_plan || 'None')}</div>
          </div>
        </div>

        <!-- CAB Approvals Section -->
        <div class="card mb-4">
          <div class="card-header py-2">
            <span class="card-title text-xs font-semibold">Change Advisory Board (CAB) Approvals</span>
          </div>
          <div class="card-body py-2">
            ${approvals.length ? `
              <div style="display:flex;flex-direction:column;gap:0.5rem">
                ${approvals.map(a => `
                  <div class="flex items-center justify-between p-2 text-xs" style="background:var(--bg-input);border-radius:6px">
                    <div>
                      <b>${escHtml(a.approver?.name || 'Reviewer')}</b> (${escHtml(a.stage)})
                      ${a.comments ? `<div class="text-muted mt-0.5 font-italic">"${escHtml(a.comments)}"</div>` : ''}
                    </div>
                    <div>
                      ${a.status === 'approved' ? '<span class="badge badge-success">Approved</span>' : a.status === 'rejected' ? '<span class="badge badge-danger">Rejected</span>' : '<span class="badge badge-warning">Pending</span>'}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="p-3 text-xs text-muted">Standard changes are pre-approved and do not require manual CAB review.</div>`}
          </div>
        </div>

        <!-- CAB Action Box for Managers -->
        ${isManagerOrAdmin && c.status === 'pending_approval' ? `
          <div class="p-3 card" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25)">
            <div class="font-bold text-xs text-warning mb-2">Your CAB Approval Decision:</div>
            <textarea class="form-control mb-2 text-xs" id="cab-comments" rows="2" placeholder="Approval notes or rejection justification..."></textarea>
            <div class="flex gap-2">
              <button class="btn btn-success btn-sm" onclick="submitCabDecision(${c.id}, 'approved')">Approve Change (CAB)</button>
              <button class="btn btn-danger btn-sm" onclick="submitCabDecision(${c.id}, 'rejected')">Reject Change</button>
            </div>
          </div>
        ` : ''}

        <!-- Status Transition for Implementers -->
        ${isManagerOrAdmin && c.status !== 'pending_approval' && c.status !== 'closed' && c.status !== 'rejected' ? `
          <div class="flex items-center justify-between mt-3 p-2 card text-xs" style="background:var(--bg-input)">
            <span class="text-muted font-medium">Update Execution Status:</span>
            <div class="flex gap-1">
              ${c.status === 'scheduled' ? `<button class="btn btn-primary btn-xs" onclick="updateChangeStatusDirect(${c.id}, 'implementing')">Start Implementation</button>` : ''}
              ${c.status === 'implementing' ? `<button class="btn btn-success btn-xs" onclick="updateChangeStatusDirect(${c.id}, 'closed')">Mark Completed & Close</button>` : ''}
              <button class="btn btn-ghost btn-xs text-danger" onclick="updateChangeStatusDirect(${c.id}, 'cancelled')">Cancel Change</button>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Close</button>
      </div>
    `, { size: 'modal-lg' });

  } catch(e) {
    toast.error('Failed to load change details', e.message);
  }
};

window.submitCabDecision = async function(id, decision) {
  const comments = document.getElementById('cab-comments')?.value.trim();
  try {
    await changesApi.decideApproval(id, { decision, comments });
    toast.success(`CAB decision recorded: ${decision.toUpperCase()}`);
    showChangeDetailModal(id);
    loadChangesList();
  } catch(e) {
    toast.error('Failed to record CAB decision', e.message);
  }
};

window.updateChangeStatusDirect = async function(id, status) {
  try {
    await changesApi.updateStatus(id, { status });
    toast.success(`Status updated to ${status}`);
    showChangeDetailModal(id);
    loadChangesList();
  } catch(e) {
    toast.error('Failed to update status', e.message);
  }
};
