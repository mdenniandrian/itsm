/**
 * Problem Management & Root Cause Analysis (RCA) Module
 */

window.problemsState = {
  activeStatus: 'all',
  searchQuery: '',
};

window.loadProblems = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Problem Management & RCA</h1>
        <p class="page-subtitle">Root Cause Analysis (RCA), Known Error Database (KEDB), and mass incident resolution</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" onclick="showCreateProblemModal()">
          ${renderIcon('plus')}
          <span>Log Master Problem</span>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="loadProblemsList()">
          ${renderIcon('refresh')}
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Overview Stats -->
    <div class="stats-grid mb-6" id="problems-stats-grid">
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
    </div>

    <!-- Filter Bar -->
    <div class="card mb-6">
      <div class="card-body py-3">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex gap-2 flex-wrap" id="problem-filter-tabs">
            <button class="btn btn-sm btn-primary" onclick="setProblemStatusFilter('all', this)">All Problems</button>
            <button class="btn btn-sm btn-secondary" onclick="setProblemStatusFilter('investigating', this)">Under Investigation</button>
            <button class="btn btn-sm btn-secondary" onclick="setProblemStatusFilter('known_error', this)">Known Error (KEDB)</button>
            <button class="btn btn-sm btn-secondary" onclick="setProblemStatusFilter('resolved', this)">Resolved</button>
          </div>
          <div class="search-input-wrap" style="width:260px">
            <span class="search-icon">${renderIcon('search')}</span>
            <input type="text" class="form-control" placeholder="Search problem title or root cause..." oninput="handleSearchProblem(this.value)">
          </div>
        </div>
      </div>
    </div>

    <!-- Problems Table Card -->
    <div class="card">
      <div class="table-wrapper" id="problems-table-container">
        <div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>
      </div>
    </div>
  `;

  await loadProblemsList();
};

window.setProblemStatusFilter = function(status, btn) {
  window.problemsState.activeStatus = status;
  document.querySelectorAll('#problem-filter-tabs button').forEach(b => b.className = 'btn btn-sm btn-secondary');
  if (btn) btn.className = 'btn btn-sm btn-primary';
  loadProblemsList();
};

window.handleSearchProblem = debounce(function(val) {
  window.problemsState.searchQuery = val;
  loadProblemsList();
}, 300);

window.loadProblemsList = async function() {
  const container = document.getElementById('problems-table-container');
  const statsGrid = document.getElementById('problems-stats-grid');
  if (!container) return;

  try {
    const params = {};
    if (window.problemsState.activeStatus !== 'all') params.status = window.problemsState.activeStatus;
    if (window.problemsState.searchQuery) params.search = window.problemsState.searchQuery;

    const [stats, res] = await Promise.all([
      problemsApi.stats(),
      problemsApi.list(params),
    ]);

    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(244,63,94,0.12);color:#fb7185">${renderIcon('problems')}</div>
          <div class="stat-content">
            <div class="stat-value">${stats.total_problems}</div>
            <div class="stat-label">Total Master Problems</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:#fbbf24">${renderIcon('search')}</div>
          <div class="stat-content">
            <div class="stat-value text-warning">${stats.investigating}</div>
            <div class="stat-label">Under RCA Investigation</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(168,85,247,0.12);color:#c084fc">${renderIcon('book')}</div>
          <div class="stat-content">
            <div class="stat-value text-accent">${stats.known_errors}</div>
            <div class="stat-label">Known Error (KEDB)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(16,185,129,0.12);color:#34d399">${renderIcon('check')}</div>
          <div class="stat-content">
            <div class="stat-value text-success">${stats.resolved}</div>
            <div class="stat-label">Resolved Problems</div>
          </div>
        </div>
      `;
    }

    const problems = res.problems || [];
    if (!problems.length) {
      container.innerHTML = `
        <div class="empty-state p-8">
          <div class="empty-icon text-muted">${renderIcon('problems')}</div>
          <div class="empty-title">No Master Problems Logged</div>
          <p class="empty-desc">Log a Master Problem to analyze root cause patterns across recurring incidents.</p>
          <button class="btn btn-primary mt-4" onclick="showCreateProblemModal()">Log Master Problem</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Problem # & Title</th>
            <th>Priority & Impact</th>
            <th>Status</th>
            <th>Linked Incidents</th>
            <th>Root Cause (RCA)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${problems.map(p => renderProblemRow(p)).join('')}
        </tbody>
      </table>
    `;
  } catch(e) {
    toast.error('Failed to load Problems', e.message);
  }
};

function renderProblemRow(p) {
  const prioBadge = p.priority === 'critical'
    ? '<span class="badge badge-danger">Critical</span>'
    : p.priority === 'high'
    ? '<span class="badge badge-warning">High</span>'
    : '<span class="badge badge-low">Medium</span>';

  const statusBadge = p.status === 'investigating'
    ? '<span class="badge badge-warning">Investigating</span>'
    : p.status === 'known_error'
    ? '<span class="badge badge-info">Known Error</span>'
    : p.status === 'solution_found'
    ? '<span class="badge badge-open">Solution Found</span>'
    : p.status === 'resolved'
    ? '<span class="badge badge-success">Resolved</span>'
    : `<span class="badge badge-secondary">${p.status}</span>`;

  return `
    <tr>
      <td>
        <div class="font-bold text-accent">${escHtml(p.problem_number)}</div>
        <div class="font-medium text-primary" style="max-width:300px">${escHtml(p.title)}</div>
      </td>
      <td>
        <div class="flex flex-col gap-1">
          <div>${prioBadge}</div>
          <div class="text-xs text-muted">Impact: ${escHtml(p.impact)}</div>
        </div>
      </td>
      <td>${statusBadge}</td>
      <td>
        <span class="badge badge-info font-medium">${p.linked_tickets_count} Tickets</span>
      </td>
      <td class="text-xs text-secondary truncate" style="max-width:240px">
        ${escHtml(p.root_cause || 'Not yet identified')}
      </td>
      <td>
        <button class="btn btn-secondary btn-xs" onclick="showProblemDetailModal(${p.id})">
          Details & RCA
        </button>
      </td>
    </tr>
  `;
}

window.showCreateProblemModal = async function() {
  try {
    const tktRes = await ticketsApi.list({ status: 'open', limit: 20 });
    const openTickets = tktRes.tickets || [];

    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="modal-title font-bold text-sm">Log Master Problem & RCA Investigation</span>
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <form id="create-problem-form" onsubmit="event.preventDefault()">
          <div class="form-group mb-3">
            <label class="form-label font-medium text-xs">Master Problem Title *</label>
            <input type="text" class="form-control" id="prb-title" placeholder="e.g. Core Switch Overheating Causing Periodic Network Outages" required>
          </div>

          <div class="grid-2 mb-3" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Priority *</label>
              <select class="form-control" id="prb-priority">
                <option value="critical">Critical</option>
                <option value="high" selected>High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Incident Impact *</label>
              <select class="form-control" id="prb-impact">
                <option value="critical">Critical (Severe Outage / Operations Halted)</option>
                <option value="major" selected>Major (Widespread Department Impact)</option>
                <option value="minor">Minor (Partial / Localized Impact)</option>
              </select>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-medium text-xs">Symptom Description & Initial Analysis *</label>
            <textarea class="form-control" id="prb-desc" rows="3" placeholder="Summarize the recurring incident timeline, symptom patterns, and scope..." required></textarea>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-medium text-xs">Link Related Incident Tickets:</label>
            <div class="card p-2 text-xs" style="max-height:160px;overflow-y:auto;background:var(--bg-input)">
              ${openTickets.length ? openTickets.map(t => `
                <label class="flex items-center gap-2 p-1.5 cursor-pointer hover-bg" style="border-bottom:1px solid var(--border-primary)">
                  <input type="checkbox" name="prb-linked-ticket" value="${t.id}">
                  <span><b>#${t.ticket_number}</b> - ${escHtml(t.title)} (${escHtml(t.requester_name)})</span>
                </label>
              `).join('') : '<div class="text-muted p-2">No open tickets available to link.</div>'}
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="submitCreateProblem()">Create Master Problem</button>
      </div>
    `, { size: 'modal-lg' });
  } catch(e) {
    toast.error('Failed to load problem form', e.message);
  }
};

window.submitCreateProblem = async function() {
  const title = document.getElementById('prb-title')?.value.trim();
  const description = document.getElementById('prb-desc')?.value.trim();
  const priority = document.getElementById('prb-priority')?.value;
  const impact = document.getElementById('prb-impact')?.value;

  const checkboxes = document.querySelectorAll('input[name="prb-linked-ticket"]:checked');
  const ticket_ids = Array.from(checkboxes).map(c => parseInt(c.value));

  if (!title || !description) {
    toast.warning('Title and Description are required.');
    return;
  }

  try {
    const res = await problemsApi.create({
      title,
      description,
      priority,
      impact,
      ticket_ids,
    });

    modal.close();
    toast.success(`Problem ${res.problem_number} created successfully!`);
    loadProblemsList();
  } catch(e) {
    toast.error('Failed to create Problem', e.message);
  }
};

window.showProblemDetailModal = async function(id) {
  try {
    modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`, { size: 'modal-lg' });
    const p = await problemsApi.get(id);
    const tickets = p.tickets || [];

    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="font-bold text-accent">${escHtml(p.problem_number)}</span>
          <span class="modal-title font-bold text-sm">${escHtml(p.title)}</span>
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid-3 mb-4" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;background:var(--bg-input);padding:0.75rem;border-radius:8px">
          <div><span class="text-xs text-muted">Status:</span><div class="font-bold text-primary">${p.status.toUpperCase()}</div></div>
          <div><span class="text-xs text-muted">Priority:</span><div class="font-bold text-accent">${p.priority.toUpperCase()}</div></div>
          <div><span class="text-xs text-muted">Owner PIC:</span><div class="font-bold text-primary">${escHtml(p.owner?.name || '-')}</div></div>
        </div>

        <!-- RCA Fields Form -->
        <div class="card mb-4 p-3">
          <div class="font-bold text-xs text-primary mb-3">Root Cause Analysis & Solutions:</div>
          <div class="form-group mb-2">
            <label class="form-label font-medium text-xs">Root Cause Summary</label>
            <textarea class="form-control text-xs" id="rca-root-cause" rows="2" placeholder="Technical findings on the underlying cause...">${escHtml(p.root_cause || '')}</textarea>
          </div>
          <div class="grid-2 mb-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Workaround / Temporary Solution</label>
              <textarea class="form-control text-xs" id="rca-workaround" rows="2" placeholder="Temporary bypass or workaround steps...">${escHtml(p.workaround || '')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs text-success">Permanent Resolution (Fix)</label>
              <textarea class="form-control text-xs" id="rca-permanent" rows="2" placeholder="Permanent corrective actions and architecture fixes...">${escHtml(p.permanent_solution || '')}</textarea>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="submitSaveRca(${p.id})">Save RCA Notes</button>
        </div>

        <!-- Linked Incident Tickets -->
        <div class="card mb-4">
          <div class="card-header py-2 flex items-center justify-between">
            <span class="card-title text-xs font-semibold">Linked Incident Tickets (${tickets.length} Tickets)</span>
          </div>
          <div class="table-wrapper" style="max-height:160px;overflow-y:auto">
            ${tickets.length ? `
              <table class="table text-xs">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Requester</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${tickets.map(t => `
                    <tr>
                      <td class="font-bold text-accent">#${t.ticket_number}</td>
                      <td>${escHtml(t.title)}</td>
                      <td>${escHtml(t.requester?.name || '-')}</td>
                      <td><span class="badge badge-info">${t.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="p-3 text-xs text-muted">No incident tickets linked to this problem yet.</div>'}
          </div>
        </div>

        <!-- Mass Resolution Button Box -->
        ${p.status !== 'resolved' && p.status !== 'closed' ? `
          <div class="p-3 card" style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.25)">
            <div class="font-bold text-xs text-success mb-1">Mass Incident Resolution:</div>
            <p class="text-xs text-secondary mb-2">Resolving this Master Problem will automatically update all (${tickets.length}) linked incident tickets above to Resolved.</p>
            <button class="btn btn-success btn-sm" onclick="showMassResolveModal(${p.id})">
              Resolve Master Problem & Close Tickets
            </button>
          </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Close</button>
      </div>
    `, { size: 'modal-lg' });

  } catch(e) {
    toast.error('Failed to load problem details', e.message);
  }
};

window.submitSaveRca = async function(id) {
  const root_cause = document.getElementById('rca-root-cause')?.value.trim();
  const workaround = document.getElementById('rca-workaround')?.value.trim();
  const permanent_solution = document.getElementById('rca-permanent')?.value.trim();

  try {
    await problemsApi.update(id, {
      root_cause,
      workaround,
      permanent_solution,
      status: permanent_solution ? 'solution_found' : workaround ? 'known_error' : 'investigating',
    });
    toast.success('RCA notes updated successfully!');
    loadProblemsList();
  } catch(e) {
    toast.error('Failed to save RCA notes', e.message);
  }
};

window.showMassResolveModal = function(id) {
  modal.show(`
    <div class="modal-header">
      <span class="modal-title font-bold text-sm">Mass Resolve Master Problem</span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group mb-3">
        <label class="form-label font-medium text-xs">Permanent Resolution Implemented *</label>
        <textarea class="form-control" id="mass-sol" rows="3" placeholder="Describe the permanent fix and verification steps..." required></textarea>
      </div>
      <div class="form-group">
        <label class="form-label font-medium text-xs">Resolution Comment for Linked Tickets</label>
        <textarea class="form-control" id="mass-comment" rows="2" placeholder="Automated message sent to all requesters upon resolution..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-success" onclick="submitMassResolve(${id})">Execute Mass Resolution</button>
    </div>
  `);
};

window.submitMassResolve = async function(id) {
  const permanent_solution = document.getElementById('mass-sol')?.value.trim();
  const resolution_comment = document.getElementById('mass-comment')?.value.trim();

  if (!permanent_solution) {
    toast.warning('Permanent resolution description is required.');
    return;
  }

  try {
    const res = await problemsApi.resolveAll(id, { permanent_solution, resolution_comment });
    modal.close();
    toast.success('Mass Resolution Successful!', res.message);
    loadProblemsList();
  } catch(e) {
    toast.error('Failed to execute mass resolution', e.message);
  }
};
