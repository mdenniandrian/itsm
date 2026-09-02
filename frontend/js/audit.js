/**
 * Enterprise Audit & Security Logging Module
 * Comprehensive audit trail for logins, user administration, ticket workflows, and system settings.
 */

window.auditState = {
  page: 1,
  perPage: 20,
  category: 'all',
  status: 'all',
  search: '',
  dateRange: 'all',
  totalPages: 1,
  totalItems: 0,
};

window.loadAuditLogs = async function() {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header flex items-center justify-between gap-4 flex-wrap mb-4">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="page-title">Audit & Security Logs</h1>
          <span class="badge badge-primary font-bold" style="font-size:0.7rem">COMPLIANCE & AUDIT</span>
        </div>
        <p class="page-subtitle">Real-time immutable audit trail of user sessions, administrative changes, and ticket lifecycles</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button class="btn btn-secondary btn-sm flex items-center gap-1.5" onclick="exportAuditLogsCsv()" id="audit-export-btn">
          ${renderIcon('download')}
          <span>Export CSV</span>
        </button>
        <button class="btn btn-primary btn-sm flex items-center gap-1.5" onclick="fetchAndRenderAuditLogs()">
          ${renderIcon('refresh')}
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- KPI Metrics Row -->
    <div class="stats-grid mb-4" id="audit-stats-container">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">${renderIcon('activity')}</div>
        <div class="stat-info">
          <div class="stat-value" id="kpi-audit-total">-</div>
          <div class="stat-label">Total Audit Events</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(16,185,129,0.12);color:#34d399">${renderIcon('check')}</div>
        <div class="stat-info">
          <div class="stat-value text-success" id="kpi-audit-logins">-</div>
          <div class="stat-label">Successful Logins Today</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(244,63,94,0.12);color:#fb7185">${renderIcon('problems')}</div>
        <div class="stat-info">
          <div class="stat-value text-danger" id="kpi-audit-failed">-</div>
          <div class="stat-label">Failed Logins (24h Alert)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:#fbbf24">${renderIcon('settings')}</div>
        <div class="stat-info">
          <div class="stat-value" id="kpi-audit-changes">-</div>
          <div class="stat-label">Admin & Config Changes</div>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="card p-3 mb-4" style="border:1px solid var(--border-hover)">
      <div style="display:grid;grid-template-columns:minmax(200px, 2fr) repeat(auto-fit, minmax(150px, 1fr)) auto;gap:0.75rem;align-items:center">
        <!-- Search Input -->
        <div class="form-group mb-0">
          <input type="text" class="form-control" id="audit-search-input" placeholder="Search by user, action, description, IP address..." oninput="onAuditSearchInput(this.value)">
        </div>

        <!-- Category Filter -->
        <div class="form-group mb-0">
          <select class="form-control" id="audit-category-select" onchange="onAuditFilterChange()">
            <option value="all">All Event Categories</option>
            <option value="auth">🔐 Authentication & Sessions</option>
            <option value="security">🛡️ Security & Access Control</option>
            <option value="ticket">🎫 Ticket Lifecycle</option>
            <option value="service_catalog">📋 Service Catalog</option>
            <option value="system">⚙️ System & Brand Config</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="form-group mb-0">
          <select class="form-control" id="audit-status-select" onchange="onAuditFilterChange()">
            <option value="all">All Statuses</option>
            <option value="success">✅ Success</option>
            <option value="failed">❌ Failed / Alert</option>
            <option value="warning">⚠️ Warning</option>
          </select>
        </div>

        <!-- Date Range Filter -->
        <div class="form-group mb-0">
          <select class="form-control" id="audit-date-select" onchange="onAuditFilterChange()">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        <!-- Reset Button -->
        <button class="btn btn-secondary btn-sm" onclick="resetAuditFilters()" title="Reset all filters">
          ${renderIcon('refresh')}
        </button>
      </div>
    </div>

    <!-- Audit Logs Table Container -->
    <div class="card">
      <div class="card-header flex items-center justify-between pb-3">
        <div class="flex items-center gap-2">
          <span class="card-title font-bold text-sm">Audit Log Stream</span>
          <span class="badge badge-secondary" id="audit-total-badge">0 events</span>
        </div>
        <div class="text-xs text-muted" id="audit-pagination-info">Showing page 1</div>
      </div>
      <div class="table-wrapper" id="audit-table-wrapper">
        <div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>
      </div>

      <!-- Pagination Footer -->
      <div class="card-footer flex items-center justify-between p-3" id="audit-pagination-footer" style="display:none;border-top:1px solid var(--border-primary)">
        <button class="btn btn-secondary btn-sm" id="audit-prev-btn" onclick="changeAuditPage(-1)" disabled>
          ${renderIcon('arrowLeft')}
          <span>Previous</span>
        </button>
        <span class="text-xs text-muted font-medium" id="audit-page-indicator">Page 1 of 1</span>
        <button class="btn btn-secondary btn-sm" id="audit-next-btn" onclick="changeAuditPage(1)" disabled>
          <span>Next</span>
          <span style="transform:rotate(180deg);display:inline-flex">${renderIcon('arrowLeft')}</span>
        </button>
      </div>
    </div>
  `;

  // Fetch KPI Stats and Logs
  loadAuditKpiStats();
  fetchAndRenderAuditLogs();
};

async function loadAuditKpiStats() {
  try {
    const stats = await auditApi.stats();
    document.getElementById('kpi-audit-total').textContent = stats.total_events?.toLocaleString() || '0';
    document.getElementById('kpi-audit-logins').textContent = stats.logins_today?.toLocaleString() || '0';
    document.getElementById('kpi-audit-failed').textContent = stats.failed_logins_24h?.toLocaleString() || '0';
    document.getElementById('kpi-audit-changes').textContent = stats.config_changes?.toLocaleString() || '0';
  } catch (e) {
    console.warn('Failed to load audit stats:', e);
  }
}

window.fetchAndRenderAuditLogs = async function() {
  const container = document.getElementById('audit-table-wrapper');
  if (!container) return;

  container.innerHTML = `<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`;

  const params = {
    page: window.auditState.page,
    per_page: window.auditState.perPage,
  };

  if (window.auditState.category !== 'all') params.category = window.auditState.category;
  if (window.auditState.status !== 'all') params.status = window.auditState.status;
  if (window.auditState.search) params.search = window.auditState.search;

  if (window.auditState.dateRange === 'today') {
    const todayStr = new Date().toISOString().split('T')[0];
    params.from_date = todayStr;
    params.to_date = todayStr;
  } else if (window.auditState.dateRange === '7days') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    params.from_date = d.toISOString().split('T')[0];
  } else if (window.auditState.dateRange === '30days') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    params.from_date = d.toISOString().split('T')[0];
  }

  try {
    const res = await auditApi.list(params);
    const logs = res.data || [];
    window.auditState.totalPages = res.last_page || 1;
    window.auditState.totalItems = res.total || 0;

    // Update Badges & Pagination Controls
    const totalBadge = document.getElementById('audit-total-badge');
    if (totalBadge) totalBadge.textContent = `${res.total || 0} events`;

    const pagInfo = document.getElementById('audit-pagination-info');
    if (pagInfo) pagInfo.textContent = `Showing ${res.from || 0}-${res.to || 0} of ${res.total || 0}`;

    const pagFooter = document.getElementById('audit-pagination-footer');
    if (pagFooter) pagFooter.style.display = res.total > 0 ? 'flex' : 'none';

    const prevBtn = document.getElementById('audit-prev-btn');
    const nextBtn = document.getElementById('audit-next-btn');
    const pageInd = document.getElementById('audit-page-indicator');

    if (prevBtn) prevBtn.disabled = res.current_page <= 1;
    if (nextBtn) nextBtn.disabled = res.current_page >= res.last_page;
    if (pageInd) pageInd.textContent = `Page ${res.current_page || 1} of ${res.last_page || 1}`;

    if (!logs.length) {
      container.innerHTML = `
        <div class="empty-state p-8 text-center">
          <div class="empty-icon text-muted mb-2">${renderIcon('activity')}</div>
          <div class="empty-title font-bold">No Audit Log Records Found</div>
          <p class="text-xs text-muted mt-1">Try clearing your search query or adjusting active filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="table" style="width:100%">
        <thead>
          <tr>
            <th style="width:170px">Timestamp</th>
            <th style="width:220px">User / Actor</th>
            <th style="width:120px">Category</th>
            <th>Action & Event Details</th>
            <th style="width:160px">Client & Origin</th>
            <th style="width:90px">Status</th>
            <th style="width:80px;text-align:right">Action</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => {
            const statusBadge = getAuditStatusBadge(log.status);
            const categoryBadge = getAuditCategoryBadge(log.category);
            const timeFormatted = new Date(log.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            return `
              <tr class="hover-bg" style="transition:background 0.15s ease">
                <td>
                  <div class="font-mono text-xs font-semibold">${timeFormatted}</div>
                  <div class="text-xs text-muted mt-0.5">${timeAgo(log.created_at)}</div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="avatar avatar-sm" style="width:28px;height:28px;font-size:0.7rem;flex-shrink:0">
                      ${getInitials(log.user_name || 'System')}
                    </div>
                    <div style="min-width:0">
                      <div class="font-semibold text-xs text-primary truncate" style="max-width:160px">${escHtml(log.user_name || 'System / Anonymous')}</div>
                      <div class="text-xs text-muted truncate" style="font-size:0.68rem;max-width:160px">${escHtml(log.user_email || log.user_role || 'guest')}</div>
                    </div>
                  </div>
                </td>
                <td>
                  ${categoryBadge}
                </td>
                <td>
                  <div class="flex items-center gap-1.5 flex-wrap mb-1">
                    <span class="font-mono font-bold text-xs" style="color:var(--accent-primary)">${escHtml(log.action)}</span>
                    <span class="text-xs text-muted font-mono" style="font-size:0.68rem">(${escHtml(log.event_type)})</span>
                  </div>
                  <div class="text-xs text-secondary" style="line-height:1.4">${escHtml(log.description)}</div>
                </td>
                <td>
                  <div class="font-mono text-xs text-primary">${escHtml(log.ip_address || '-')}</div>
                  <div class="flex items-center gap-1 text-xs text-muted mt-0.5" style="font-size:0.68rem">
                    <span>${escHtml(log.device || 'Device')}</span> &bull; 
                    <span>${escHtml(log.browser || 'Browser')}</span>
                  </div>
                </td>
                <td>
                  ${statusBadge}
                </td>
                <td style="text-align:right">
                  <button class="btn btn-ghost btn-xs text-accent" onclick="showAuditDetailModal(${log.id})" title="Inspect Full Audit Metadata & Payload Diff">
                    ${renderIcon('eye')}
                    <span>View</span>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="card p-6 text-center">
        <div class="text-danger font-bold mb-1">Failed to Load Audit Logs</div>
        <p class="text-xs text-muted">${escHtml(err.message)}</p>
      </div>
    `;
  }
};

window.onAuditSearchInput = debounce(function(val) {
  window.auditState.search = val.trim();
  window.auditState.page = 1;
  fetchAndRenderAuditLogs();
}, 300);

window.onAuditFilterChange = function() {
  window.auditState.category = document.getElementById('audit-category-select')?.value || 'all';
  window.auditState.status = document.getElementById('audit-status-select')?.value || 'all';
  window.auditState.dateRange = document.getElementById('audit-date-select')?.value || 'all';
  window.auditState.page = 1;
  fetchAndRenderAuditLogs();
};

window.resetAuditFilters = function() {
  window.auditState.page = 1;
  window.auditState.category = 'all';
  window.auditState.status = 'all';
  window.auditState.dateRange = 'all';
  window.auditState.search = '';

  const sInp = document.getElementById('audit-search-input');
  const catSel = document.getElementById('audit-category-select');
  const statSel = document.getElementById('audit-status-select');
  const dateSel = document.getElementById('audit-date-select');

  if (sInp) sInp.value = '';
  if (catSel) catSel.value = 'all';
  if (statSel) statSel.value = 'all';
  if (dateSel) dateSel.value = 'all';

  fetchAndRenderAuditLogs();
};

window.changeAuditPage = function(delta) {
  const newPage = window.auditState.page + delta;
  if (newPage >= 1 && newPage <= window.auditState.totalPages) {
    window.auditState.page = newPage;
    fetchAndRenderAuditLogs();
  }
};

window.exportAuditLogsCsv = function() {
  const params = {};
  if (window.auditState.category !== 'all') params.category = window.auditState.category;
  if (window.auditState.status !== 'all') params.status = window.auditState.status;
  if (window.auditState.search) params.search = window.auditState.search;

  if (window.auditState.dateRange === 'today') {
    const todayStr = new Date().toISOString().split('T')[0];
    params.from_date = todayStr;
    params.to_date = todayStr;
  } else if (window.auditState.dateRange === '7days') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    params.from_date = d.toISOString().split('T')[0];
  } else if (window.auditState.dateRange === '30days') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    params.from_date = d.toISOString().split('T')[0];
  }

  const url = auditApi.exportUrl(params);
  window.open(url, '_blank');
  toast.success('Export initiated', 'Downloading audit logs in CSV format...');
};

function getAuditStatusBadge(status) {
  if (status === 'success') {
    return `<span class="badge badge-success" style="font-size:0.68rem">Success</span>`;
  } else if (status === 'failed' || status === 'danger') {
    return `<span class="badge badge-critical" style="font-size:0.68rem">Failed</span>`;
  } else if (status === 'warning') {
    return `<span class="badge badge-warning" style="font-size:0.68rem">Warning</span>`;
  }
  return `<span class="badge badge-secondary" style="font-size:0.68rem">${escHtml(status)}</span>`;
}

function getAuditCategoryBadge(category) {
  const map = {
    auth: { label: 'Auth', bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
    security: { label: 'Security', bg: 'rgba(244,63,94,0.12)', color: '#fb7185' },
    ticket: { label: 'Ticket', bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
    service_catalog: { label: 'Catalog', bg: 'rgba(6,182,212,0.12)', color: '#22d3ee' },
    problem: { label: 'Problem', bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
    change: { label: 'Change', bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
    system: { label: 'System', bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  };

  const item = map[category] || { label: category || 'Event', bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' };
  return `<span class="badge" style="background:${item.bg};color:${item.color};font-size:0.68rem;font-weight:600">${item.label}</span>`;
}

window.showAuditDetailModal = async function(id) {
  try {
    const res = await auditApi.get(id);
    const log = res.log;
    if (!log) throw new Error('Record not found');

    const oldJson = log.old_values ? JSON.stringify(log.old_values, null, 2) : null;
    const newJson = log.new_values ? JSON.stringify(log.new_values, null, 2) : null;

    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="text-accent" style="display:flex;align-items:center">${renderIcon('activity')}</span>
          <span class="modal-title font-bold text-sm">Audit Log Record #${log.id}</span>
          ${getAuditStatusBadge(log.status)}
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div class="card p-3 mb-3" style="background:var(--bg-input);border:1px solid var(--border-primary)">
          <div class="font-bold text-sm text-primary mb-1">${escHtml(log.action)}: ${escHtml(log.event_type)}</div>
          <p class="text-xs text-secondary mb-0">${escHtml(log.description)}</p>
        </div>

        <!-- Metadata Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.775rem;margin-bottom:1rem">
          <div><strong class="text-muted">Timestamp:</strong> <span class="font-mono text-primary">${new Date(log.created_at).toLocaleString()}</span></div>
          <div><strong class="text-muted">Actor / User:</strong> <span class="text-primary font-semibold">${escHtml(log.user_name || 'System')} (${escHtml(log.user_email || 'guest')})</span></div>
          <div><strong class="text-muted">User Role:</strong> <span class="badge badge-secondary" style="font-size:0.65rem">${escHtml(log.user_role || 'guest')}</span></div>
          <div><strong class="text-muted">Category:</strong> ${getAuditCategoryBadge(log.category)}</div>
          <div><strong class="text-muted">Client IP:</strong> <span class="font-mono text-primary">${escHtml(log.ip_address || '-')}</span></div>
          <div><strong class="text-muted">Device / OS:</strong> <span class="text-primary">${escHtml(log.device || '-')} &bull; ${escHtml(log.browser || '-')}</span></div>
          ${log.auditable_type ? `<div style="grid-column:1 / -1"><strong class="text-muted">Target Entity:</strong> <span class="font-mono text-xs text-accent">${escHtml(log.auditable_type)} (ID: ${log.auditable_id})</span></div>` : ''}
        </div>

        ${log.user_agent ? `
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Full User-Agent String</label>
            <div class="p-2 card font-mono text-xs text-muted" style="background:var(--bg-input);word-break:break-all;font-size:0.7rem">${escHtml(log.user_agent)}</div>
          </div>
        ` : ''}

        <!-- JSON Diff Section -->
        ${(oldJson || newJson) ? `
          <div class="form-group">
            <label class="form-label font-bold text-xs">Payload Modification Diff (Before vs After)</label>
            <div style="display:grid;grid-template-columns:${oldJson && newJson ? '1fr 1fr' : '1fr'};gap:0.75rem">
              ${oldJson ? `
                <div>
                  <div class="text-xs font-semibold text-danger mb-1">Old State (Before):</div>
                  <pre class="p-2 card font-mono text-xs" style="background:var(--bg-input);border:1px solid rgba(244,63,94,0.3);max-height:220px;overflow:auto;font-size:0.7rem;color:#fda4af">${escHtml(oldJson)}</pre>
                </div>
              ` : ''}
              ${newJson ? `
                <div>
                  <div class="text-xs font-semibold text-success mb-1">New State (After):</div>
                  <pre class="p-2 card font-mono text-xs" style="background:var(--bg-input);border:1px solid rgba(16,185,129,0.3);max-height:220px;overflow:auto;font-size:0.7rem;color:#86efac">${escHtml(newJson)}</pre>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
      <div class="modal-footer" style="justify-content:flex-end">
        <button class="btn btn-secondary btn-sm" onclick="modal.close()">Close</button>
      </div>
    `, { size: 'modal-lg' });
  } catch(e) {
    toast.error('Failed to load audit detail', e.message);
  }
};
