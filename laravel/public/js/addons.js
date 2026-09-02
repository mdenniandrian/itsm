/**
 * Add-ons & Integrations Management Module
 * (Telegram Notification, LDAP/Active Directory, SMTP Email, Webhooks, Slack)
 */

window.addonsState = {
  activeCategory: 'all',
  addonsList: [],
};

window.loadAddons = async function() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Add-ons & Integrations</h1>
        <p class="page-subtitle">Manage third-party integrations, Telegram alerts, Zimbra LDAP / Active Directory, SMTP mail server, and webhooks</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" onclick="showNotificationTemplateStudioModal()">
          ${renderIcon('sparkles')}
          <span>Notification Templates Studio</span>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="loadAddonsList()">
          ${renderIcon('refresh')}
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Overview Stats -->
    <div class="stats-grid mb-6" id="addons-stats-grid">
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
    </div>

    <!-- Category Filter Tabs -->
    <div class="card mb-6">
      <div class="card-body py-3">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex gap-2 flex-wrap" id="addon-filter-tabs">
            <button class="btn btn-sm btn-primary" onclick="setAddonCategory('all', this)">All Add-ons</button>
            <button class="btn btn-sm btn-secondary" onclick="setAddonCategory('notification', this)">Notifications (Telegram, Slack, SMTP)</button>
            <button class="btn btn-sm btn-secondary" onclick="setAddonCategory('authentication', this)">Authentication (LDAP / AD)</button>
            <button class="btn btn-sm btn-secondary" onclick="setAddonCategory('integration', this)">API & Webhook Integrations</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add-ons Cards Grid -->
    <div id="addons-grid-container" class="grid-3" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.25rem">
      <div class="flex-center p-8" style="grid-column:1/-1"><div class="spinner spinner-lg"></div></div>
    </div>
  `;

  await loadAddonsList();
};

window.setAddonCategory = function(cat, btn) {
  window.addonsState.activeCategory = cat;
  document.querySelectorAll('#addon-filter-tabs button').forEach(b => {
    b.className = 'btn btn-sm btn-secondary';
  });
  if (btn) btn.className = 'btn btn-sm btn-primary';
  renderAddonsCards();
};

window.loadAddonsList = async function() {
  const container = document.getElementById('addons-grid-container');
  const statsGrid = document.getElementById('addons-stats-grid');
  if (!container) return;

  try {
    const res = await addonsApi.list();
    const addons = res.addons || [];
    window.addonsState.addonsList = addons;

    // Stats
    const total = addons.length;
    const activeCount = addons.filter(a => a.is_enabled).length;
    const verifiedCount = addons.filter(a => a.last_test_status === 'success').length;
    const failedCount = addons.filter(a => a.last_test_status === 'failed').length;

    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">${renderIcon('addons')}</div>
          <div class="stat-content">
            <div class="stat-value">${total}</div>
            <div class="stat-label">Available Add-ons</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid #10b981">
          <div class="stat-icon" style="background:rgba(16,185,129,0.12);color:#34d399">${renderIcon('zap')}</div>
          <div class="stat-content">
            <div class="stat-value text-success">${activeCount}</div>
            <div class="stat-label">Active Integrations</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid #6366f1">
          <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">${renderIcon('check')}</div>
          <div class="stat-content">
            <div class="stat-value text-primary">${verifiedCount}</div>
            <div class="stat-label">Verified & Connected</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid ${failedCount > 0 ? '#f43f5e' : '#64748b'}">
          <div class="stat-icon" style="background:rgba(244,63,94,0.12);color:#fb7185">${renderIcon('problems')}</div>
          <div class="stat-content">
            <div class="stat-value ${failedCount > 0 ? 'text-danger' : 'text-muted'}">${failedCount}</div>
            <div class="stat-label">Connection Errors</div>
          </div>
        </div>
      `;
    }

    renderAddonsCards();
  } catch(e) {
    toast.error('Failed to load add-ons list', e.message);
  }
};

function renderAddonsCards() {
  const container = document.getElementById('addons-grid-container');
  if (!container) return;

  let list = window.addonsState.addonsList || [];
  if (window.addonsState.activeCategory !== 'all') {
    list = list.filter(a => a.category === window.addonsState.activeCategory);
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state p-8" style="grid-column:1/-1">
        <div class="empty-icon text-muted">${renderIcon('addons')}</div>
        <div class="empty-title">No add-ons found in this category</div>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(a => renderAddonCard(a)).join('');
}

function renderAddonCard(a) {
  const isEnabled = !!a.is_enabled;
  const statusColor = isEnabled ? '#10b981' : '#64748b';

  const testBadge = a.last_test_status === 'success'
    ? '<span class="badge badge-success" style="font-size:0.7rem">Verified</span>'
    : a.last_test_status === 'failed'
    ? '<span class="badge badge-danger" style="font-size:0.7rem">Failed</span>'
    : '<span class="badge badge-secondary" style="font-size:0.7rem">Not Tested</span>';

  const categoryLabel = a.category === 'notification'
    ? 'Notification'
    : a.category === 'authentication'
    ? 'Authentication'
    : 'Integration';

  return `
    <div class="card addon-card" style="border-top: 3px solid ${statusColor};display:flex;flex-direction:column;justify-content:space-between">
      <div>
        <div class="card-header pb-2" style="align-items:flex-start">
          <div class="flex items-center gap-3">
            <div style="background:rgba(99,102,241,0.1);color:#818cf8;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(99,102,241,0.25)">
              ${renderIcon('addons')}
            </div>
            <div>
              <h3 class="font-bold text-sm text-primary">${escHtml(a.name)}</h3>
              <div class="flex items-center gap-2 mt-1">
                <span class="badge badge-info" style="font-size:0.65rem">${categoryLabel}</span>
                ${testBadge}
              </div>
            </div>
          </div>

          <!-- Enable Toggle Switch -->
          <label class="switch" title="${isEnabled ? 'Click to disable' : 'Click to enable'}">
            <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleAddonEnabled('${a.addon_key}', this.checked)">
            <span class="slider round"></span>
          </label>
        </div>

        <div class="card-body py-2">
          <p class="text-xs text-secondary mb-3" style="line-height:1.5;min-height:36px">
            ${escHtml(a.description || '')}
          </p>

          ${a.last_test_message ? `
            <div class="p-2 mb-2 text-xs truncate" style="background:var(--bg-input);border-radius:6px;border-left:3px solid ${a.last_test_status === 'success' ? '#10b981' : '#f43f5e'}" title="${escHtml(a.last_test_message)}">
              <span class="text-muted">Status:</span> ${escHtml(a.last_test_message)}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="card-footer" style="padding:0.75rem 1rem;background:rgba(255,255,255,0.02);display:flex;justify-content:space-between;gap:0.5rem">
        <button class="btn btn-primary btn-sm" onclick="showAddonConfigModal('${a.addon_key}')">
          Configure
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-quick-test-${a.addon_key}" onclick="quickTestAddon('${a.addon_key}')">
          Test Connection
        </button>
      </div>
    </div>
  `;
}

window.toggleAddonEnabled = async function(key, isEnabled) {
  try {
    const addon = window.addonsState.addonsList.find(a => a.addon_key === key);
    if (!addon) return;

    await addonsApi.update(key, {
      is_enabled: isEnabled,
      config: addon.config || {},
    });

    toast.success(`${addon.name} successfully ${isEnabled ? 'enabled' : 'disabled'}`);
    loadAddonsList();
  } catch(e) {
    toast.error('Failed to update add-on status', e.message);
    loadAddonsList();
  }
};

window.quickTestAddon = async function(key) {
  const btn = document.getElementById(`btn-quick-test-${key}`);
  if (btn) btn.disabled = true;
  toast.info('Testing integration connection...');

  try {
    const res = await addonsApi.test(key, {});
    if (res.success) {
      toast.success('Connection Test Succeeded!', res.message);
    } else {
      toast.warning('Connection Test Failed', res.message);
    }
    loadAddonsList();
  } catch(e) {
    toast.error('Test execution error', e.message);
  } finally {
    if (btn) btn.disabled = false;
  }
};

// ============================================
// CONFIGURATION MODALS
// ============================================

window.showAddonConfigModal = async function(key) {
  try {
    modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`, { size: 'modal-lg' });
    const addon = await addonsApi.get(key);
    const cfg = addon.config || {};

    let formContentHtml = '';

    if (key === 'telegram') {
      formContentHtml = `
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="p-3" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:8px">
            <div class="font-bold text-xs text-accent mb-1">Telegram Bot Setup Guide:</div>
            <ol class="text-xs text-secondary pl-4" style="line-height:1.6">
              <li>Open Telegram, message <code>@BotFather</code> to create a new bot and copy your <b>Bot Token</b>.</li>
              <li>Create an IT Support group, add your bot to the group as an Admin.</li>
              <li>Obtain your group <b>Chat ID</b> (e.g. by adding <code>@userinfobot</code> to the group).</li>
            </ol>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Telegram Bot Token *</label>
            <input type="text" class="form-control" id="cfg-tg-token" placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRstuVWXyz" value="${escHtml(cfg.bot_token || '')}">
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Telegram Chat ID / Group ID *</label>
            <input type="text" class="form-control" id="cfg-tg-chat-id" placeholder="e.g. -1001234567890 or @channel_name" value="${escHtml(cfg.chat_id || '')}">
          </div>

          <div>
            <label class="form-label font-medium text-xs mb-2">Automated Notification Events:</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem" class="text-xs">
              <label class="flex items-center gap-2 cursor-pointer p-2 card">
                <input type="checkbox" id="cfg-tg-new-ticket" ${cfg.notify_new_ticket !== false ? 'checked' : ''}>
                <span>New Ticket Created</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 card">
                <input type="checkbox" id="cfg-tg-status-change" ${cfg.notify_status_change !== false ? 'checked' : ''}>
                <span>Ticket Status Updated</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 card">
                <input type="checkbox" id="cfg-tg-sla-breach" ${cfg.notify_sla_breach !== false ? 'checked' : ''}>
                <span>SLA Breach Warning</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 card">
                <input type="checkbox" id="cfg-tg-device-alert" ${cfg.notify_device_alert !== false ? 'checked' : ''}>
                <span>Device Alerts (CPU &gt; 90%)</span>
              </label>
            </div>
          </div>
        </div>
      `;
    } else if (key === 'ldap') {
      formContentHtml = `
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="p-3" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:8px">
            <div class="font-bold text-xs text-accent mb-1">LDAP / Active Directory Directory Integration:</div>
            <p class="text-xs text-secondary">
              Allows internal staff and employees to authenticate to ITSM Portal using enterprise Zimbra LDAP / Active Directory domain credentials.
            </p>
          </div>

          <div class="grid-2" style="display:grid;grid-template-columns:2fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Server Host *</label>
              <input type="text" class="form-control" id="cfg-ldap-host" placeholder="e.g. ldap://192.168.1.10 or ad.company.com" value="${escHtml(cfg.host || '')}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Port *</label>
              <input type="number" class="form-control" id="cfg-ldap-port" placeholder="389" value="${escHtml(cfg.port || '389')}">
            </div>
          </div>

          <div class="form-group">
            <label class="flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" id="cfg-ldap-ssl" ${cfg.use_ssl ? 'checked' : ''}>
              <span>Use Secure Encryption (SSL / LDAPS Port 636)</span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Base DN (Distinguished Name) *</label>
            <input type="text" class="form-control" id="cfg-ldap-base-dn" placeholder="e.g. dc=company,dc=com or ou=Staff,dc=domain,dc=local" value="${escHtml(cfg.base_dn || '')}">
          </div>

          <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Admin Bind DN (Service Account)</label>
              <input type="text" class="form-control" id="cfg-ldap-bind-dn" placeholder="cn=admin,dc=company,dc=com" value="${escHtml(cfg.bind_dn || '')}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Bind Password</label>
              <input type="password" class="form-control" id="cfg-ldap-bind-pwd" placeholder="••••••••" value="${escHtml(cfg.bind_password || '')}">
            </div>
          </div>

          <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">User Search Filter</label>
              <input type="text" class="form-control" id="cfg-ldap-filter" placeholder="(sAMAccountName={username})" value="${escHtml(cfg.user_filter || '(sAMAccountName={username})')}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Default Role for New Users</label>
              <select class="form-control" id="cfg-ldap-role">
                <option value="user" ${cfg.default_role === 'user' ? 'selected' : ''}>User (Regular Employee)</option>
                <option value="agent" ${cfg.default_role === 'agent' ? 'selected' : ''}>Agent (IT Support Technician)</option>
                <option value="manager" ${cfg.default_role === 'manager' ? 'selected' : ''}>Manager</option>
              </select>
            </div>
          </div>
        </div>
      `;
    } else if (key === 'smtp') {
      formContentHtml = `
        <!-- SMTP Tabs Navigation -->
        <div class="flex gap-2 mb-4 p-1 card" style="background:var(--bg-input);border-radius:8px">
          <button type="button" class="btn btn-xs btn-primary" id="tab-btn-smtp-server" onclick="switchSmtpTab('server')">
            ${renderIcon('server')}
            <span>1. Server & Credentials</span>
          </button>
          <button type="button" class="btn btn-xs btn-secondary" id="tab-btn-smtp-rules" onclick="switchSmtpTab('rules')">
            ${renderIcon('ticket')}
            <span>2. Routing Rules & IT Team</span>
          </button>
          <button type="button" class="btn btn-xs btn-secondary" id="tab-btn-smtp-test" onclick="switchSmtpTab('test')">
            ${renderIcon('zap')}
            <span>3. Test Delivery</span>
          </button>
        </div>

        <!-- Tab 1: Server & Credentials -->
        <div id="smtp-tab-server" style="display:flex;flex-direction:column;gap:1rem">
          <div class="grid-2" style="display:grid;grid-template-columns:2fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">SMTP Host / Mailserver *</label>
              <input type="text" class="form-control" id="cfg-smtp-host" placeholder="mail.company.com" value="${escHtml(cfg.host || '')}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Port *</label>
              <input type="number" class="form-control" id="cfg-smtp-port" placeholder="587" value="${escHtml(cfg.port || '587')}">
            </div>
          </div>

          <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Encryption Type</label>
              <select class="form-control" id="cfg-smtp-enc">
                <option value="tls" ${cfg.encryption === 'tls' ? 'selected' : ''}>TLS (Port 587 - Recommended)</option>
                <option value="ssl" ${cfg.encryption === 'ssl' ? 'selected' : ''}>SSL (Port 465)</option>
                <option value="none" ${cfg.encryption === 'none' ? 'selected' : ''}>None (Port 25)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">SMTP Username / Account *</label>
              <input type="text" class="form-control" id="cfg-smtp-user" placeholder="no-reply@company.com" value="${escHtml(cfg.username || '')}">
            </div>
          </div>

          <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">SMTP Password *</label>
              <input type="password" class="form-control" id="cfg-smtp-pwd" placeholder="••••••••" value="${escHtml(cfg.password || '')}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Sender Email Address (From Address) *</label>
              <input type="email" class="form-control" id="cfg-smtp-from-email" placeholder="no-reply@company.com" value="${escHtml(cfg.from_address || 'no-reply@company.com')}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Sender Name (From Name)</label>
            <input type="text" class="form-control" id="cfg-smtp-from-name" placeholder="ITSM Enterprise Helpdesk" value="${escHtml(cfg.from_name || 'ITSM Enterprise Service Desk')}">
          </div>
        </div>

        <!-- Tab 2: Notification & Routing Rules -->
        <div id="smtp-tab-rules" style="display:none;flex-direction:column;gap:1rem">
          <div class="p-3" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:8px">
            <div class="font-bold text-xs text-accent mb-1">IT Helpdesk Notification Distribution Center:</div>
            <p class="text-xs text-secondary mb-0">
              Configure automated notification targets when tickets are created, assigned, or updated.
            </p>
          </div>

          <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">IT Team / Helpdesk Group Mailing List</label>
              <input type="email" class="form-control" id="cfg-smtp-team-email" placeholder="it-support@company.com" value="${escHtml(cfg.team_email || '')}">
              <div class="text-xs text-muted mt-1">Shared group inbox for IT support queue alerts.</div>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">New Ticket Distribution Policy</label>
              <select class="form-control" id="cfg-smtp-routing-mode">
                <option value="both" ${cfg.routing_mode === 'both' || !cfg.routing_mode ? 'selected' : ''}>Send to Group Email & Broadcast to All IT Agents (Recommended)</option>
                <option value="group_only" ${cfg.routing_mode === 'group_only' ? 'selected' : ''}>Send to IT Helpdesk Group Only</option>
                <option value="broadcast_all" ${cfg.routing_mode === 'broadcast_all' ? 'selected' : ''}>Broadcast to Every IT Staff Inbox (Agent & Admin)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label font-medium text-xs mb-2">Email Notification Triggers & Target Recipients:</label>
            <div style="display:flex;flex-direction:column;gap:0.5rem" class="text-xs">
              <label class="flex items-center justify-between p-2.5 card cursor-pointer">
                <div class="flex items-center gap-2.5">
                  <input type="checkbox" id="cfg-smtp-rule-new-requester" ${cfg.notify_new_ticket_requester !== false ? 'checked' : ''}>
                  <div>
                    <div class="font-bold text-primary">Ticket Created &rarr; Send Confirmation to Requester</div>
                    <div class="text-muted" style="font-size:0.7rem">Employee receives ticket confirmation #TKT-xxxx and estimated resolution SLA.</div>
                  </div>
                </div>
                <span class="badge badge-info font-mono">To: Requester</span>
              </label>

              <label class="flex items-center justify-between p-2.5 card cursor-pointer">
                <div class="flex items-center gap-2.5">
                  <input type="checkbox" id="cfg-smtp-rule-new-team" ${cfg.notify_new_ticket_team !== false ? 'checked' : ''}>
                  <div>
                    <div class="font-bold text-primary">New Ticket Ingested &rarr; Send Alert to IT Team</div>
                    <div class="text-muted" style="font-size:0.7rem">Notifies IT support agents of a new inbound ticket ready for triage.</div>
                  </div>
                </div>
                <span class="badge badge-danger font-mono">To: IT Team</span>
              </label>

              <label class="flex items-center justify-between p-2.5 card cursor-pointer">
                <div class="flex items-center gap-2.5">
                  <input type="checkbox" id="cfg-smtp-rule-assigned" ${cfg.notify_assigned !== false ? 'checked' : ''}>
                  <div>
                    <div class="font-bold text-primary">Ticket Assigned &rarr; Send to Assigned Technician</div>
                    <div class="text-muted" style="font-size:0.7rem">Assigned agent receives immediate inbox notification with ticket details.</div>
                  </div>
                </div>
                <span class="badge badge-warning font-mono">To: Assignee</span>
              </label>

              <label class="flex items-center justify-between p-2.5 card cursor-pointer">
                <div class="flex items-center gap-2.5">
                  <input type="checkbox" id="cfg-smtp-rule-status" ${cfg.notify_status_change !== false ? 'checked' : ''}>
                  <div>
                    <div class="font-bold text-primary">Status Updated &rarr; Send Progress to Requester</div>
                    <div class="text-muted" style="font-size:0.7rem">Notifies requester when status updates to In Progress, Pending, or Resolved.</div>
                  </div>
                </div>
                <span class="badge badge-success font-mono">To: Requester</span>
              </label>

              <label class="flex items-center justify-between p-2.5 card cursor-pointer">
                <div class="flex items-center gap-2.5">
                  <input type="checkbox" id="cfg-smtp-rule-comment" ${cfg.notify_comment !== false ? 'checked' : ''}>
                  <div>
                    <div class="font-bold text-primary">Comments & Notes &rarr; Send Activity Update</div>
                    <div class="text-muted" style="font-size:0.7rem">Facilitates two-way collaboration between IT agents and requester.</div>
                  </div>
                </div>
                <span class="badge badge-secondary font-mono">Two-Way</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Tab 3: Test & Live Verification -->
        <div id="smtp-tab-test" style="display:none;flex-direction:column;gap:1rem">
          <div class="p-3" style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:8px">
            <div class="font-bold text-xs text-success mb-1">Live Outbound Email Verification:</div>
            <p class="text-xs text-secondary mb-0">
              Send a live test email using official ITSM templates to verify outbound mail delivery.
            </p>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Test Recipient Email Address *</label>
            <input type="email" class="form-control" id="cfg-smtp-test-target" placeholder="support@company.com" value="${escHtml(cfg.test_recipient || cfg.from_address || 'support@company.com')}">
            <div class="text-xs text-muted mt-1">A test email summarizing server configuration will be sent to this address.</div>
          </div>
        </div>
      `;
    } else if (key === 'webhook' || key === 'slack') {
      formContentHtml = `
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Webhook URL *</label>
            <input type="url" class="form-control" id="cfg-wh-url" placeholder="https://hooks.slack.com/services/... or https://api.company.com/webhook" value="${escHtml(cfg.webhook_url || '')}">
          </div>
          ${key === 'webhook' ? `
            <div class="form-group">
              <label class="form-label font-medium text-xs">Secret Signature Token</label>
              <input type="text" class="form-control" id="cfg-wh-secret" placeholder="Optional security secret" value="${escHtml(cfg.secret_token || '')}">
            </div>
          ` : `
            <div class="form-group">
              <label class="form-label font-medium text-xs">Channel Name</label>
              <input type="text" class="form-control" id="cfg-wh-channel" placeholder="#it-alerts" value="${escHtml(cfg.channel_name || '#it-support')}">
            </div>
          `}
        </div>
      `;
    }

    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="modal-title font-bold text-sm">${escHtml(addon.name)} Configuration</span>
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <!-- Status Switch inside modal -->
        <div class="flex items-center justify-between p-3 mb-4 card" style="background:var(--bg-input)">
          <div>
            <div class="font-bold text-sm text-primary">Integration Status</div>
            <div class="text-xs text-muted">Enable this integration for active use across ITSM workflows</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="modal-addon-enable" ${addon.is_enabled ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>

        <form id="addon-config-form" onsubmit="event.preventDefault()">
          ${formContentHtml}
        </form>

        <!-- Test Log Box -->
        <div id="modal-test-log-box" class="mt-4 p-3 text-xs" style="display:none;border-radius:6px"></div>
      </div>
      <div class="modal-footer" style="justify-content:space-between">
        <button class="btn btn-secondary btn-sm" id="btn-modal-test" onclick="executeModalTest('${key}')">
          Test Live Connection
        </button>
        <div class="flex gap-2">
          <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
          <button class="btn btn-primary" onclick="submitSaveAddonConfig('${key}')">Save Configuration</button>
        </div>
      </div>
    `, { size: 'modal-lg' });

  } catch(e) {
    toast.error('Failed to load add-on configuration', e.message);
  }
};

window.switchSmtpTab = function(tabName) {
  const tabs = ['server', 'rules', 'test'];
  tabs.forEach(t => {
    const el = document.getElementById(`smtp-tab-${t}`);
    const btn = document.getElementById(`tab-btn-smtp-${t}`);
    if (el) el.style.display = (t === tabName) ? 'flex' : 'none';
    if (btn) btn.className = (t === tabName) ? 'btn btn-xs btn-primary' : 'btn btn-xs btn-secondary';
  });
};

function extractConfigFormData(key) {
  const is_enabled = !!document.getElementById('modal-addon-enable')?.checked;
  let config = {};

  if (key === 'telegram') {
    config = {
      bot_token: document.getElementById('cfg-tg-token')?.value.trim() || '',
      chat_id: document.getElementById('cfg-tg-chat-id')?.value.trim() || '',
      notify_new_ticket: !!document.getElementById('cfg-tg-new-ticket')?.checked,
      notify_status_change: !!document.getElementById('cfg-tg-status-change')?.checked,
      notify_sla_breach: !!document.getElementById('cfg-tg-sla-breach')?.checked,
      notify_device_alert: !!document.getElementById('cfg-tg-device-alert')?.checked,
    };
  } else if (key === 'ldap') {
    config = {
      host: document.getElementById('cfg-ldap-host')?.value.trim() || '',
      port: parseInt(document.getElementById('cfg-ldap-port')?.value) || 389,
      use_ssl: !!document.getElementById('cfg-ldap-ssl')?.checked,
      base_dn: document.getElementById('cfg-ldap-base-dn')?.value.trim() || '',
      bind_dn: document.getElementById('cfg-ldap-bind-dn')?.value.trim() || '',
      bind_password: document.getElementById('cfg-ldap-bind-pwd')?.value || '',
      user_filter: document.getElementById('cfg-ldap-filter')?.value.trim() || '(sAMAccountName={username})',
      default_role: document.getElementById('cfg-ldap-role')?.value || 'user',
      auto_create_user: true,
    };
  } else if (key === 'smtp') {
    config = {
      host: document.getElementById('cfg-smtp-host')?.value.trim() || '',
      port: parseInt(document.getElementById('cfg-smtp-port')?.value) || 587,
      encryption: document.getElementById('cfg-smtp-enc')?.value || 'tls',
      username: document.getElementById('cfg-smtp-user')?.value.trim() || '',
      password: document.getElementById('cfg-smtp-pwd')?.value || '',
      from_address: document.getElementById('cfg-smtp-from-email')?.value.trim() || 'no-reply@company.com',
      from_name: document.getElementById('cfg-smtp-from-name')?.value.trim() || 'ITSM Enterprise Service Desk',
      team_email: document.getElementById('cfg-smtp-team-email')?.value.trim() || '',
      routing_mode: document.getElementById('cfg-smtp-routing-mode')?.value || 'both',
      notify_new_ticket_requester: !!document.getElementById('cfg-smtp-rule-new-requester')?.checked,
      notify_new_ticket_team: !!document.getElementById('cfg-smtp-rule-new-team')?.checked,
      notify_assigned: !!document.getElementById('cfg-smtp-rule-assigned')?.checked,
      notify_status_change: !!document.getElementById('cfg-smtp-rule-status')?.checked,
      notify_comment: !!document.getElementById('cfg-smtp-rule-comment')?.checked,
      test_recipient: document.getElementById('cfg-smtp-test-target')?.value.trim() || 'support@company.com',
    };
  } else if (key === 'webhook' || key === 'slack') {
    config = {
      webhook_url: document.getElementById('cfg-wh-url')?.value.trim() || '',
      secret_token: document.getElementById('cfg-wh-secret')?.value.trim() || '',
      channel_name: document.getElementById('cfg-wh-channel')?.value.trim() || '#it-support',
    };
  }

  return { is_enabled, config };
}

window.executeModalTest = async function(key) {
  const btn = document.getElementById('btn-modal-test');
  const logBox = document.getElementById('modal-test-log-box');
  if (btn) btn.disabled = true;

  const { config } = extractConfigFormData(key);

  if (logBox) {
    logBox.style.display = 'block';
    logBox.style.background = 'var(--bg-input)';
    logBox.style.border = '1px solid var(--border-primary)';
    logBox.style.color = 'var(--text-secondary)';
    logBox.innerHTML = 'Executing connection and endpoint delivery test...';
  }

  try {
    const res = await addonsApi.test(key, { config, test_recipient: config.test_recipient });
    if (logBox) {
      if (res.success) {
        logBox.style.background = 'rgba(16,185,129,0.08)';
        logBox.style.border = '1px solid rgba(16,185,129,0.3)';
        logBox.style.color = '#34d399';
        logBox.innerHTML = `<b>SUCCESS:</b> ${escHtml(res.message)}`;
      } else {
        logBox.style.background = 'rgba(244,63,94,0.08)';
        logBox.style.border = '1px solid rgba(244,63,94,0.3)';
        logBox.style.color = '#fb7185';
        logBox.innerHTML = `<b>FAILED:</b> ${escHtml(res.message)}`;
      }
    }
  } catch(e) {
    if (logBox) {
      logBox.style.background = 'rgba(244,63,94,0.08)';
      logBox.style.border = '1px solid rgba(244,63,94,0.3)';
      logBox.style.color = '#fb7185';
      logBox.innerHTML = `<b>ERROR:</b> ${escHtml(e.message)}`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.submitSaveAddonConfig = async function(key) {
  const payload = extractConfigFormData(key);

  try {
    await addonsApi.update(key, payload);
    modal.close();
    toast.success('Add-on configuration saved successfully!');
    loadAddonsList();
  } catch(e) {
    toast.error('Failed to save configuration', e.message);
  }
};

// =========================================================================
// NOTIFICATION TEMPLATES STUDIO & CUSTOMIZER (Email, Telegram & In-App)
// =========================================================================

window.tmplStudioState = {
  templates: [],
  placeholders: {},
  selectedIndex: 0,
  activeChannel: 'email', // 'email', 'telegram', 'in_app'
  previewDebounceTimer: null,
};

window.showNotificationTemplateStudioModal = async function() {
  try {
    modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`, { size: 'modal-xl' });
    const res = await notificationTemplatesApi.list();
    window.tmplStudioState.templates = res.templates || [];
    window.tmplStudioState.placeholders = res.available_placeholders || {};
    window.tmplStudioState.selectedIndex = 0;
    window.tmplStudioState.activeChannel = 'email';

    renderTemplateStudioModal();
  } catch(e) {
    toast.error('Failed to load notification templates', e.message);
  }
};

function renderTemplateStudioModal() {
  const templates = window.tmplStudioState.templates;
  const currentTmpl = templates[window.tmplStudioState.selectedIndex] || {};
  const activeChannel = window.tmplStudioState.activeChannel;

  modal.show(`
    <div class="modal-header">
      <div class="flex items-center gap-2">
        <span class="modal-title font-bold text-sm">Notification Templates Studio (Email, Telegram & In-App)</span>
      </div>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body p-0">
      <div style="display:grid;grid-template-columns:1.2fr 1fr;min-height:540px;border-top:1px solid var(--border-primary)">
        
        <!-- Left Column: Template Selector & Editor -->
        <div class="p-4" style="border-right:1px solid var(--border-primary);display:flex;flex-direction:column;gap:1rem;background:var(--bg-surface)">
          
          <!-- Event Selector Dropdown -->
          <div class="form-group mb-0">
            <label class="form-label font-medium text-xs">Select Notification Event:</label>
            <select class="form-control" id="tmpl-select-event" onchange="handleStudioEventChange(this.value)">
              ${templates.map((t, idx) => `
                <option value="${idx}" ${idx === window.tmplStudioState.selectedIndex ? 'selected' : ''}>
                  ${escHtml(t.name)}
                </option>
              `).join('')}
            </select>
            <div class="text-xs text-muted mt-1">${escHtml(currentTmpl.description || '')}</div>
          </div>

          <!-- Channel Tabs (Email, Telegram, In-App) -->
          <div class="flex gap-2 p-1 card" style="background:var(--bg-input);border-radius:6px">
            <button class="btn btn-xs ${activeChannel === 'email' ? 'btn-primary' : 'btn-secondary'}" style="flex:1" onclick="setStudioChannel('email')">
              ${renderIcon('mail')}
              <span>Email Gateway</span>
            </button>
            <button class="btn btn-xs ${activeChannel === 'telegram' ? 'btn-primary' : 'btn-secondary'}" style="flex:1" onclick="setStudioChannel('telegram')">
              ${renderIcon('telegram')}
              <span>Telegram Bot</span>
            </button>
            <button class="btn btn-xs ${activeChannel === 'in_app' ? 'btn-primary' : 'btn-secondary'}" style="flex:1" onclick="setStudioChannel('in_app')">
              ${renderIcon('bell')}
              <span>In-App Web</span>
            </button>
          </div>

          <!-- Active Channel Form Fields -->
          <div id="studio-editor-fields" style="display:flex;flex-direction:column;gap:0.75rem;flex:1">
            ${renderStudioChannelFields(currentTmpl, activeChannel)}
          </div>

          <!-- Interactive Variable Tags Helper -->
          <div class="p-2.5 card" style="background:var(--bg-input);border-radius:6px">
            <div class="text-xs font-semibold text-muted mb-1.5 flex items-center justify-between">
              <span>Dynamic Placeholders (Click to insert):</span>
            </div>
            <div class="flex gap-1 flex-wrap" style="max-height:85px;overflow-y:auto">
              ${Object.keys(window.tmplStudioState.placeholders).map(tag => `
                <button type="button" class="btn btn-ghost btn-xs font-mono" style="font-size:0.68rem;padding:2px 6px" onclick="insertPlaceholderTag('${tag}')" title="${escHtml(window.tmplStudioState.placeholders[tag])}">
                  ${tag}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Right Column: Real-Time Preview Studio -->
        <div class="p-4" style="background:var(--bg-primary);display:flex;flex-direction:column;gap:0.75rem">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-primary">Real-Time Template Preview</span>
            <span class="badge badge-info" id="preview-channel-badge">${activeChannel.toUpperCase()}</span>
          </div>

          <!-- Live Preview Container -->
          <div id="studio-live-preview-box" style="flex:1;background:var(--bg-surface);border:1px solid var(--border-primary);border-radius:8px;padding:12px;overflow-y:auto;max-height:460px">
            <div class="flex-center p-8"><div class="spinner"></div></div>
          </div>
        </div>

      </div>
    </div>
    <div class="modal-footer" style="justify-content:space-between">
      <button class="btn btn-secondary btn-sm" onclick="resetCurrentTemplateToDefault()">
        ${renderIcon('refresh')}
        <span>Reset to Default</span>
      </button>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="modal.close()">Close</button>
        <button class="btn btn-primary" onclick="saveCurrentStudioTemplate()">
          ${renderIcon('check')}
          <span>Save Template Changes</span>
        </button>
      </div>
    </div>
  `, { size: 'modal-xl' });

  triggerStudioLivePreview();
}

function renderStudioChannelFields(tmpl, channel) {
  if (channel === 'email') {
    return `
      <div class="form-group mb-2">
        <label class="form-label font-medium text-xs">Email Subject *</label>
        <input type="text" class="form-control font-mono text-xs" id="tmpl-email-subject" value="${escHtml(tmpl.email_subject || '')}" oninput="triggerStudioLivePreview()">
      </div>
      <div class="form-group mb-0" style="flex:1;display:flex;flex-direction:column">
        <label class="form-label font-medium text-xs flex justify-between">
          <span>Email HTML Body Content *</span>
        </label>
        <textarea class="form-control font-mono text-xs" id="tmpl-email-body" rows="9" style="resize:vertical;line-height:1.5" oninput="triggerStudioLivePreview()">${escHtml(tmpl.email_body || '')}</textarea>
      </div>
    `;
  } else if (channel === 'telegram') {
    return `
      <div class="form-group mb-0" style="flex:1;display:flex;flex-direction:column">
        <label class="form-label font-medium text-xs flex justify-between">
          <span>Telegram Message Body (Supports HTML tags: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;, &lt;a&gt;) *</span>
        </label>
        <textarea class="form-control font-mono text-xs" id="tmpl-tg-body" rows="12" style="resize:vertical;line-height:1.5" oninput="triggerStudioLivePreview()">${escHtml(tmpl.telegram_template || '')}</textarea>
      </div>
    `;
  } else {
    return `
      <div class="form-group mb-0" style="flex:1;display:flex;flex-direction:column">
        <label class="form-label font-medium text-xs">In-App Web Notification Text *</label>
        <textarea class="form-control font-mono text-xs" id="tmpl-inapp-body" rows="6" style="resize:vertical" oninput="triggerStudioLivePreview()">${escHtml(tmpl.in_app_template || '')}</textarea>
      </div>
    `;
  }
}

window.handleStudioEventChange = function(index) {
  window.tmplStudioState.selectedIndex = parseInt(index);
  renderTemplateStudioModal();
};

window.setStudioChannel = function(channel) {
  window.tmplStudioState.activeChannel = channel;
  renderTemplateStudioModal();
};

window.insertPlaceholderTag = function(tag) {
  let targetInput = null;
  const channel = window.tmplStudioState.activeChannel;

  if (channel === 'email') {
    targetInput = document.activeElement && document.activeElement.id === 'tmpl-email-subject'
      ? document.getElementById('tmpl-email-subject')
      : document.getElementById('tmpl-email-body');
  } else if (channel === 'telegram') {
    targetInput = document.getElementById('tmpl-tg-body');
  } else {
    targetInput = document.getElementById('tmpl-inapp-body');
  }

  if (targetInput) {
    const start = targetInput.selectionStart || 0;
    const end = targetInput.selectionEnd || 0;
    const text = targetInput.value;
    targetInput.value = text.substring(0, start) + tag + text.substring(end);
    targetInput.selectionStart = targetInput.selectionEnd = start + tag.length;
    targetInput.focus();
    triggerStudioLivePreview();
  }
};

window.triggerStudioLivePreview = function() {
  clearTimeout(window.tmplStudioState.previewDebounceTimer);
  window.tmplStudioState.previewDebounceTimer = setTimeout(async () => {
    const currentTmpl = window.tmplStudioState.templates[window.tmplStudioState.selectedIndex];
    if (!currentTmpl) return;

    const email_subject = document.getElementById('tmpl-email-subject')?.value || currentTmpl.email_subject;
    const email_body = document.getElementById('tmpl-email-body')?.value || currentTmpl.email_body;
    const telegram_template = document.getElementById('tmpl-tg-body')?.value || currentTmpl.telegram_template;
    const in_app_template = document.getElementById('tmpl-inapp-body')?.value || currentTmpl.in_app_template;

    try {
      const preview = await notificationTemplatesApi.preview(currentTmpl.id, {
        email_subject,
        email_body,
        telegram_template,
        in_app_template,
      });

      const previewBox = document.getElementById('studio-live-preview-box');
      if (!previewBox) return;

      const channel = window.tmplStudioState.activeChannel;

      if (channel === 'email') {
        previewBox.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:0.75rem">
            <div class="p-2 card text-xs" style="background:var(--bg-input)">
              <div class="text-muted">Subject:</div>
              <div class="font-bold text-primary">${escHtml(preview.rendered_email_subject)}</div>
            </div>
            <div class="card p-3" style="background:#ffffff;color:#1e293b;border-radius:8px;font-size:13px;line-height:1.6;box-shadow:0 2px 8px rgba(0,0,0,0.15)">
              <div style="border-bottom:2px solid #6366f1;padding-bottom:8px;margin-bottom:12px;font-weight:800;color:#4338ca;font-size:14px">
                ITSM ENTERPRISE HELP DESK
              </div>
              <div style="font-size:13px;color:#334155">${preview.rendered_email_body}</div>
              <div style="border-top:1px dashed #cbd5e1;margin-top:16px;padding-top:8px;font-size:11px;color:#64748b;text-align:center">
                This notification was sent automatically by the ITSM Enterprise Helpdesk Portal.
              </div>
            </div>
          </div>
        `;
      } else if (channel === 'telegram') {
        previewBox.innerHTML = `
          <div style="background:#17212b;color:#f5f5f5;border-radius:10px;padding:14px;font-size:12.5px;line-height:1.6;font-family:-apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3)">
            <div style="white-space:pre-wrap">${preview.rendered_telegram}</div>
          </div>
        `;
      } else {
        previewBox.innerHTML = `
          <div class="card p-3 flex items-center gap-3" style="border-left:4px solid #6366f1">
            <div class="stat-icon" style="background:rgba(99,102,241,0.15);color:#818cf8">${renderIcon('bell')}</div>
            <div>
              <div class="text-xs font-bold text-primary">In-App Web Notification</div>
              <div class="text-xs text-secondary mt-0.5">${escHtml(preview.rendered_in_app)}</div>
            </div>
          </div>
        `;
      }
    } catch(e) {}
  }, 250);
};

window.saveCurrentStudioTemplate = async function() {
  const currentTmpl = window.tmplStudioState.templates[window.tmplStudioState.selectedIndex];
  if (!currentTmpl) return;

  const email_subject = document.getElementById('tmpl-email-subject')?.value || currentTmpl.email_subject;
  const email_body = document.getElementById('tmpl-email-body')?.value || currentTmpl.email_body;
  const telegram_template = document.getElementById('tmpl-tg-body')?.value || currentTmpl.telegram_template;
  const in_app_template = document.getElementById('tmpl-inapp-body')?.value || currentTmpl.in_app_template;

  try {
    const res = await notificationTemplatesApi.update(currentTmpl.id, {
      email_subject,
      email_body,
      telegram_template,
      in_app_template,
    });

    // Update in local state
    window.tmplStudioState.templates[window.tmplStudioState.selectedIndex] = res.template;
    toast.success('Notification template saved successfully!');
  } catch(e) {
    toast.error('Failed to save template', e.message);
  }
};

window.resetCurrentTemplateToDefault = async function() {
  const currentTmpl = window.tmplStudioState.templates[window.tmplStudioState.selectedIndex];
  if (!currentTmpl) return;

  if (!confirm(`Reset template "${currentTmpl.name}" to factory default format?`)) return;

  try {
    const res = await notificationTemplatesApi.reset(currentTmpl.id);
    window.tmplStudioState.templates[window.tmplStudioState.selectedIndex] = res.template;
    renderTemplateStudioModal();
    toast.success('Template restored to factory default!');
  } catch(e) {
    toast.error('Failed to reset template', e.message);
  }
};

