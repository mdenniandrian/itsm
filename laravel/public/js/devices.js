/**
 * Device Monitoring (RMM) - Live Endpoint Activity, Telemetry & Screen Viewer
 */

window.devicesState = {
  activeFilter: 'all',
  searchQuery: '',
  refreshTimer: null,
  liveScreenTimer: null,
};

window.loadDevices = async function() {
  if (window.devicesState.refreshTimer) clearInterval(window.devicesState.refreshTimer);
  if (window.devicesState.liveScreenTimer) clearInterval(window.devicesState.liveScreenTimer);

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Device & Screen Monitoring</h1>
        <p class="page-subtitle">Monitor hardware status, CPU/RAM utilization, active foreground applications, and live user endpoint screens in real time</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" onclick="showEnrollDeviceModal()">
          ${renderIcon('plus')}
          <span>Enroll Device</span>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="loadDevicesList()">
          ${renderIcon('refresh')}
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Live Status Overview Cards -->
    <div class="stats-grid mb-6" id="device-stats-grid">
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:50px"></div></div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="card mb-6">
      <div class="card-body py-3">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex gap-2 flex-wrap" id="device-filter-tabs">
            <button class="btn btn-sm btn-primary" onclick="setDeviceFilter('all', this)">All Devices</button>
            <button class="btn btn-sm btn-secondary" onclick="setDeviceFilter('online', this)">Online</button>
            <button class="btn btn-sm btn-secondary" onclick="setDeviceFilter('idle', this)">Idle / Away</button>
            <button class="btn btn-sm btn-secondary" onclick="setDeviceFilter('offline', this)">Offline</button>
          </div>
          <div class="search-input-wrap" style="width:280px">
            <span class="search-icon">${renderIcon('search')}</span>
            <input
              type="text"
              class="form-control"
              placeholder="Search hostname, IP, or user..."
              id="device-search-input"
              oninput="handleDeviceSearch(this.value)"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Live Devices Grid -->
    <div id="devices-grid-container" class="grid-3" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.25rem">
      <div class="flex-center p-8" style="grid-column:1/-1"><div class="spinner spinner-lg"></div></div>
    </div>
  `;

  await loadDevicesList();

  // Auto-refresh list every 5 seconds
  window.devicesState.refreshTimer = setInterval(() => {
    if (appState.currentPage === 'devices') {
      loadDevicesList(true);
    } else {
      clearInterval(window.devicesState.refreshTimer);
    }
  }, 5000);
};

window.setDeviceFilter = function(filter, btn) {
  window.devicesState.activeFilter = filter;
  document.querySelectorAll('#device-filter-tabs button').forEach(b => {
    b.className = 'btn btn-sm btn-secondary';
  });
  if (btn) btn.className = 'btn btn-sm btn-primary';
  loadDevicesList();
};

window.handleDeviceSearch = debounce(function(val) {
  window.devicesState.searchQuery = val;
  loadDevicesList();
}, 300);

window.loadDevicesList = async function(isSilent = false) {
  const container = document.getElementById('devices-grid-container');
  const statsGrid = document.getElementById('device-stats-grid');
  if (!container) return;

  try {
    const params = {};
    if (window.devicesState.activeFilter !== 'all') {
      params.status = window.devicesState.activeFilter;
    }
    if (window.devicesState.searchQuery) {
      params.search = window.devicesState.searchQuery;
    }

    const [stats, res] = await Promise.all([
      devicesApi.stats(),
      devicesApi.list(params),
    ]);

    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">${renderIcon('devices')}</div>
          <div class="stat-content">
            <div class="stat-value">${stats.total_endpoints}</div>
            <div class="stat-label">Total Enrolled Endpoints</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid #10b981">
          <div class="stat-icon" style="background:rgba(16,185,129,0.12);color:#34d399">${renderIcon('check')}</div>
          <div class="stat-content">
            <div class="stat-value text-success">${stats.online_count}</div>
            <div class="stat-label">Online Now</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid #f59e0b">
          <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:#fbbf24">${renderIcon('clock')}</div>
          <div class="stat-content">
            <div class="stat-value text-warning">${stats.idle_count}</div>
            <div class="stat-label">Idle / Away</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid #64748b">
          <div class="stat-icon" style="background:rgba(100,116,139,0.12);color:#94a3b8">${renderIcon('activity')}</div>
          <div class="stat-content">
            <div class="stat-value text-muted">${stats.offline_count}</div>
            <div class="stat-label">Offline</div>
          </div>
        </div>
      `;
    }

    const devices = res.devices || [];
    if (!devices.length) {
      container.innerHTML = `
        <div class="empty-state p-8" style="grid-column:1/-1">
          <div class="empty-icon text-muted">${renderIcon('devices')}</div>
          <div class="empty-title">No Devices Enrolled</div>
          <p class="empty-desc">Install the endpoint monitoring agent on client machines to start tracking real-time telemetry and activity.</p>
          <button class="btn btn-primary mt-4" onclick="showEnrollDeviceModal()">Agent Installation Guide</button>
        </div>
      `;
      return;
    }

    container.innerHTML = devices.map(d => renderDeviceCard(d)).join('');
  } catch(e) {
    if (!isSilent) toast.error('Failed to load device list', e.message);
  }
};

function renderDeviceCard(d) {
  const isOnline = d.status === 'online';
  const isIdle = d.status === 'idle';
  const statusColor = isOnline ? '#10b981' : isIdle ? '#f59e0b' : '#64748b';
  const statusLabel = isOnline ? 'Online' : isIdle ? 'Idle / Away' : 'Offline';

  const osName = d.os_name || 'System';

  const cpuColor = d.current_cpu_percent > 85 ? 'var(--priority-critical)' : d.current_cpu_percent > 60 ? 'var(--status-in-progress)' : '#818cf8';
  const ramColor = d.current_ram_percent > 85 ? 'var(--priority-critical)' : d.current_ram_percent > 70 ? 'var(--status-in-progress)' : '#c084fc';

  return `
    <div class="card device-card" style="border-top: 3px solid ${statusColor}">
      <div class="card-header pb-2" style="align-items:flex-start">
        <div>
          <div class="flex items-center gap-2">
            <span class="status-pulse-dot" style="background:${statusColor}"></span>
            <h3 class="font-bold text-sm text-primary">${escHtml(d.device_name || d.hostname)}</h3>
          </div>
          <div class="text-xs text-muted mt-1 flex items-center gap-2">
            <span>${escHtml(osName)}</span>
            <span>·</span>
            <span>IP: ${escHtml(d.ip_address || '-')}</span>
          </div>
        </div>
        <span class="badge ${isOnline ? 'badge-success' : isIdle ? 'badge-warning' : 'badge-closed'}">
          ${statusLabel}
        </span>
      </div>

      <div class="card-body pt-2" style="display:flex;flex-direction:column;gap:0.75rem">
        <!-- Screen Preview Thumbnail -->
        <div style="position:relative;border-radius:8px;overflow:hidden;background:#000;border:1px solid var(--border-primary);aspect-ratio:16/9;cursor:pointer" onclick="showLiveScreenModal(${d.id}, '${escHtml(d.device_name || d.hostname)}')">
          ${d.last_screenshot_path ? `
            <img src="${d.last_screenshot_path}" alt="Screen ${escHtml(d.hostname)}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.75rem">Loading screen capture...</div>
          ` : `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.75rem;gap:0.25rem">
              <span class="text-muted">${renderIcon('devices')}</span>
              <span>Click to view live screen</span>
            </div>
          `}
          <!-- Floating Overlay on Thumbnail -->
          <div style="position:absolute;bottom:6px;left:6px;right:6px;display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);padding:3px 8px;border-radius:4px">
            <span class="text-xs font-semibold" style="color:#818cf8">View Screen</span>
            <span class="text-xs text-muted" style="font-size:0.7rem">${d.last_screenshot_diff ? d.last_screenshot_diff : 'Live'}</span>
          </div>
        </div>

        <!-- Assigned User -->
        <div class="flex items-center justify-between text-xs" style="background:var(--bg-input);padding:0.4rem 0.6rem;border-radius:6px">
          <span class="text-muted">User:</span>
          <span class="font-medium text-primary">${escHtml(d.assigned_user_name || 'Unassigned')}</span>
        </div>

        <!-- Live Activity Tracker -->
        <div class="live-activity-box" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:8px;padding:0.6rem">
          <div class="text-xs font-semibold text-accent mb-1 flex items-center gap-1">
            <span>Active Application:</span>
          </div>
          <div class="text-xs font-bold text-primary truncate" title="${escHtml(d.current_app || '')}">
            ${escHtml(d.current_app || 'No active foreground task')}
          </div>
          ${d.current_window_title ? `
            <div class="text-xs text-muted truncate mt-0.5" title="${escHtml(d.current_window_title)}">
              ${escHtml(d.current_window_title)}
            </div>
          ` : ''}
        </div>

        <!-- Resource Meters -->
        <div style="display:flex;flex-direction:column;gap:0.4rem" class="text-xs">
          <!-- CPU -->
          <div>
            <div class="flex justify-between mb-1">
              <span class="text-muted">CPU:</span>
              <span class="font-semibold" style="color:${cpuColor}">${d.current_cpu_percent}%</span>
            </div>
            <div class="progress-bar-bg" style="height:5px;background:var(--bg-input);border-radius:3px;overflow:hidden">
              <div style="width:${Math.min(100, d.current_cpu_percent)}%;height:100%;background:${cpuColor};border-radius:3px;transition:width 0.5s ease"></div>
            </div>
          </div>

          <!-- RAM -->
          <div>
            <div class="flex justify-between mb-1">
              <span class="text-muted">RAM (${d.total_ram_gb ? d.total_ram_gb + ' GB' : ''}):</span>
              <span class="font-semibold" style="color:${ramColor}">${d.current_ram_percent}%</span>
            </div>
            <div class="progress-bar-bg" style="height:5px;background:var(--bg-input);border-radius:3px;overflow:hidden">
              <div style="width:${Math.min(100, d.current_ram_percent)}%;height:100%;background:${ramColor};border-radius:3px;transition:width 0.5s ease"></div>
            </div>
          </div>
        </div>

        <!-- Last Seen -->
        <div class="text-xs text-muted text-right">
          Last Seen: ${d.last_seen_diff}
        </div>
      </div>

      <div class="card-footer" style="padding:0.6rem 1rem;background:rgba(255,255,255,0.02);display:flex;justify-content:space-between;gap:0.4rem;flex-wrap:wrap">
        <button class="btn btn-primary btn-xs" onclick="showLiveScreenModal(${d.id}, '${escHtml(d.device_name || d.hostname)}')" title="View Live Desktop Screen">
          Screen
        </button>
        <button class="btn btn-secondary btn-xs" onclick="showDeviceDetailModal(${d.id})" title="View Telemetry & History">
          Details
        </button>
        <button class="btn btn-secondary btn-xs" onclick="showSendMessageModal(${d.id}, '${escHtml(d.device_name || d.hostname)}')" title="Send Pop-up Message to Screen">
          Message
        </button>
        <button class="btn btn-ghost btn-xs" onclick="showEditDeviceModal(${d.id}, '${escHtml(d.device_name || '')}', ${d.assigned_user_id || 'null'})" title="Assign User">
          ${renderIcon('edit')}
        </button>
        <button class="btn btn-ghost btn-xs text-danger" onclick="deleteDevice(${d.id})" title="Delete Device">
          ${renderIcon('trash')}
        </button>
      </div>
    </div>
  `;
}

// ============================================
// LIVE SCREEN VIEWER MODAL
// ============================================

window.showLiveScreenModal = async function(id, deviceName) {
  if (window.devicesState.liveScreenTimer) clearInterval(window.devicesState.liveScreenTimer);

  modal.show(`
    <div class="modal-header" style="padding:0.875rem 1.25rem">
      <div class="flex items-center gap-2">
        <span class="status-pulse-dot" style="background:#10b981"></span>
        <span class="modal-title font-bold text-sm">Live Screen Viewer: ${escHtml(deviceName)}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge badge-success" id="screen-status-badge">Live Monitoring</span>
        <button class="modal-close" onclick="closeLiveScreenModal()">✕</button>
      </div>
    </div>
    <div class="modal-body" style="padding:1rem;background:#05070d">
      <!-- Screen Toolbar -->
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2 text-xs">
        <div class="flex items-center gap-2">
          <button class="btn btn-primary btn-sm" id="btn-trigger-shot" onclick="triggerImmediateScreenshot(${id})">
            Capture Screen Now
          </button>
          <label class="flex items-center gap-1.5 cursor-pointer text-muted" style="background:var(--bg-input);padding:3px 8px;border-radius:4px">
            <input type="checkbox" id="auto-refresh-screen-toggle" checked onchange="toggleLiveScreenRefresh(${id}, this.checked)">
            <span>Live Auto-Refresh (2s)</span>
          </label>
        </div>
        <div class="text-muted" id="screen-time-label">
          Connecting to endpoint...
        </div>
      </div>

      <!-- Main Screen Viewport -->
      <div id="live-screen-viewport" style="position:relative;width:100%;min-height:380px;background:#000;border-radius:8px;overflow:hidden;border:1px solid var(--border-primary);display:flex;align-items:center;justify-content:center">
        <div class="spinner spinner-lg" id="screen-loading-spinner"></div>
        <img id="live-screen-img" src="" alt="Live Desktop Screen" style="display:none;width:100%;height:auto;max-height:75vh;object-fit:contain;border-radius:4px">
      </div>

      <!-- Active Window Bar -->
      <div class="mt-3 p-2 flex items-center justify-between text-xs" style="background:var(--bg-input);border-radius:6px">
        <div class="flex items-center gap-2">
          <span class="text-accent font-semibold">Active Window:</span>
          <span class="text-primary font-medium truncate" id="screen-active-app-name" style="max-width:480px">-</span>
        </div>
        <button class="btn btn-ghost btn-xs" onclick="openScreenFullscreen()">Fullscreen</button>
      </div>
    </div>
    <div class="modal-footer" style="padding:0.75rem 1.25rem">
      <button class="btn btn-secondary" onclick="closeLiveScreenModal()">Close</button>
    </div>
  `, { size: 'modal-lg' });

  // Initial fetch and trigger
  await updateLiveScreenImage(id);

  // Set live refresh timer (every 2s)
  window.devicesState.liveScreenTimer = setInterval(() => {
    const modalEl = document.querySelector('#live-screen-viewport');
    if (modalEl) {
      updateLiveScreenImage(id, true);
    } else {
      clearInterval(window.devicesState.liveScreenTimer);
    }
  }, 2000);
};

window.closeLiveScreenModal = function() {
  if (window.devicesState.liveScreenTimer) clearInterval(window.devicesState.liveScreenTimer);
  modal.close();
};

window.toggleLiveScreenRefresh = function(id, isChecked) {
  if (window.devicesState.liveScreenTimer) clearInterval(window.devicesState.liveScreenTimer);
  if (isChecked) {
    window.devicesState.liveScreenTimer = setInterval(() => {
      updateLiveScreenImage(id, true);
    }, 2000);
  }
};

window.triggerImmediateScreenshot = async function(id) {
  const btn = document.getElementById('btn-trigger-shot');
  if (btn) btn.disabled = true;
  toast.info('Requesting immediate screen capture from endpoint...');

  try {
    await devicesApi.captureScreen(id);
    setTimeout(async () => {
      await updateLiveScreenImage(id);
      if (btn) btn.disabled = false;
      toast.success('Latest screen capture received!');
    }, 1500);
  } catch(e) {
    if (btn) btn.disabled = false;
    toast.error('Failed to capture screen', e.message);
  }
};

window.updateLiveScreenImage = async function(id, isSilent = false) {
  try {
    const res = await devicesApi.get(id);
    const d = res.device;
    const img = document.getElementById('live-screen-img');
    const spinner = document.getElementById('screen-loading-spinner');
    const badge = document.getElementById('screen-status-badge');
    const timeLabel = document.getElementById('screen-time-label');
    const appLabel = document.getElementById('screen-active-app-name');

    if (!img) return;

    if (appLabel) {
      appLabel.textContent = `${d.current_app || 'Desktop'} ${d.current_window_title ? '— ' + d.current_window_title : ''}`;
    }

    if (badge) {
      badge.textContent = d.status === 'online' ? 'Live Monitoring' : d.status === 'idle' ? 'User Idle' : 'Device Offline';
      badge.className = `badge ${d.status === 'online' ? 'badge-success' : d.status === 'idle' ? 'badge-warning' : 'badge-closed'}`;
    }

    if (d.last_screenshot_path) {
      const cacheBustUrl = `${d.last_screenshot_path.split('?')[0]}?t=${Date.now()}`;
      img.src = cacheBustUrl;
      img.onload = () => {
        if (spinner) spinner.style.display = 'none';
        img.style.display = 'block';
      };
      if (timeLabel) {
        timeLabel.textContent = `Captured: ${d.last_screenshot_diff || 'Just now'}`;
      }
    } else {
      if (spinner) spinner.style.display = 'none';
      if (timeLabel) timeLabel.textContent = 'No screenshot saved, click "Capture Screen Now"';
    }
  } catch(e) {
    if (!isSilent) console.warn('Update screen error:', e);
  }
};

window.openScreenFullscreen = function() {
  const img = document.getElementById('live-screen-img');
  if (!img || !img.src) return;
  window.open(img.src, '_blank');
};

window.showEnrollDeviceModal = function(initialTab = 'install') {
  const host = window.location.origin;
  modal.show(`
    <div class="modal-header">
      <div class="flex items-center gap-2">
        <span class="modal-title font-bold text-sm">ITSM Endpoint Agent Setup & Uninstall Guide</span>
      </div>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <!-- Tabs Navigation -->
      <div class="flex gap-2 mb-4 p-1" style="background:var(--bg-input);border-radius:8px;border:1px solid var(--border-primary)">
        <button class="btn btn-sm ${initialTab === 'install' ? 'btn-primary' : 'btn-secondary'}" style="flex:1" id="tab-btn-install" onclick="switchAgentModalTab('install')">
          ${renderIcon('download')}
          <span>1. Install & Auto-Start Agent</span>
        </button>
        <button class="btn btn-sm ${initialTab === 'uninstall' ? 'btn-danger' : 'btn-secondary'}" style="flex:1" id="tab-btn-uninstall" onclick="switchAgentModalTab('uninstall')">
          ${renderIcon('trash')}
          <span>2. Uninstall & Remove Agent</span>
        </button>
      </div>

      <!-- Tab 1: Install & Enroll -->
      <div id="tab-content-install" style="display:${initialTab === 'install' ? 'block' : 'none'}">
        <p class="text-xs text-secondary mb-3">
          Run the command below in the client computer terminal/PowerShell. The agent will auto-install as a persistent background daemon and register with your ITSM server:
        </p>

        <!-- macOS & Linux Install -->
        <div class="mb-4">
          <label class="form-label font-medium text-xs flex items-center gap-2">
            <span>🍏 macOS & 🐧 Linux (Terminal):</span>
          </label>
          <div style="position:relative">
            <pre id="cmd-install-unix" style="background:var(--bg-card);border:1px solid var(--border-primary);padding:0.75rem;border-radius:6px;color:#a5b4fc;font-size:0.8rem;overflow-x:auto;white-space:pre-wrap">curl -sSL ${host}/agent/install-agent.sh | bash -s "${host}"</pre>
            <button class="btn btn-secondary btn-xs" style="position:absolute;top:6px;right:6px" onclick="copyElementText('cmd-install-unix')">Copy</button>
          </div>
          <div class="text-xs text-muted mt-1">Registers macOS LaunchAgent / Linux Systemd user service named <code>itsm-agent</code>.</div>
        </div>

        <!-- Windows Install -->
        <div class="mb-4">
          <label class="form-label font-medium text-xs flex items-center gap-2">
            <span>🪟 Windows (PowerShell):</span>
          </label>
          <div style="position:relative">
            <pre id="cmd-install-win" style="background:var(--bg-card);border:1px solid var(--border-primary);padding:0.75rem;border-radius:6px;color:#a5b4fc;font-size:0.8rem;overflow-x:auto;white-space:pre-wrap">&amp; { $h='${host}'; irm "$h/agent/install-agent.ps1" | iex }</pre>
            <button class="btn btn-secondary btn-xs" style="position:absolute;top:6px;right:6px" onclick="copyElementText('cmd-install-win')">Copy</button>
          </div>
          <div class="text-xs text-muted mt-1">Registers Windows Scheduled Task <code>ITSMEndpointAgent</code> running <code>itsm-agent.exe</code> on logon.</div>
        </div>
      </div>

      <!-- Tab 2: Uninstall & Stop -->
      <div id="tab-content-uninstall" style="display:${initialTab === 'uninstall' ? 'block' : 'none'}">
        <div class="p-3 mb-3" style="background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.2);border-radius:8px">
          <div class="font-bold text-xs text-danger mb-1">🛑 How to Permanently Stop & Remove Agent from Client Machine:</div>
          <p class="text-xs text-secondary" style="line-height:1.5">
            If you delete a device from this portal without uninstalling the daemon on the client machine, the agent will auto-reconnect. Run the uninstall command below on the client machine first:
          </p>
        </div>

        <!-- macOS & Linux Uninstall -->
        <div class="mb-4">
          <label class="form-label font-medium text-xs flex items-center gap-2">
            <span>🍏 macOS & 🐧 Linux (Terminal):</span>
          </label>
          <div style="position:relative">
            <pre id="cmd-uninstall-unix" style="background:var(--bg-card);border:1px solid var(--border-primary);padding:0.75rem;border-radius:6px;color:#fda4af;font-size:0.8rem;overflow-x:auto;white-space:pre-wrap">curl -sSL ${host}/agent/uninstall-agent.sh | bash</pre>
            <button class="btn btn-secondary btn-xs" style="position:absolute;top:6px;right:6px" onclick="copyElementText('cmd-uninstall-unix')">Copy</button>
          </div>
          <div class="text-xs text-muted mt-1">Unloads LaunchAgent plist, terminates running processes, and cleans up tokens.</div>
        </div>

        <!-- Windows Uninstall -->
        <div class="mb-4">
          <label class="form-label font-medium text-xs flex items-center gap-2">
            <span>🪟 Windows (PowerShell):</span>
          </label>
          <div style="position:relative">
            <pre id="cmd-uninstall-win" style="background:var(--bg-card);border:1px solid var(--border-primary);padding:0.75rem;border-radius:6px;color:#fda4af;font-size:0.8rem;overflow-x:auto;white-space:pre-wrap">&amp; { $h='${host}'; irm "$h/agent/uninstall-agent.ps1" | iex }</pre>
            <button class="btn btn-secondary btn-xs" style="position:absolute;top:6px;right:6px" onclick="copyElementText('cmd-uninstall-win')">Copy</button>
          </div>
          <div class="text-xs text-muted mt-1">Unregisters scheduled task, kills process, and removes local folder.</div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="modal.close();loadDevicesList()">Close & Refresh List</button>
    </div>
  `, { size: 'modal-lg' });
};

window.switchAgentModalTab = function(tab) {
  const installTab = document.getElementById('tab-content-install');
  const uninstallTab = document.getElementById('tab-content-uninstall');
  const installBtn = document.getElementById('tab-btn-install');
  const uninstallBtn = document.getElementById('tab-btn-uninstall');

  if (tab === 'install') {
    if (installTab) installTab.style.display = 'block';
    if (uninstallTab) uninstallTab.style.display = 'none';
    if (installBtn) installBtn.className = 'btn btn-sm btn-primary';
    if (uninstallBtn) uninstallBtn.className = 'btn btn-sm btn-secondary';
  } else {
    if (installTab) installTab.style.display = 'none';
    if (uninstallTab) uninstallTab.style.display = 'block';
    if (installBtn) installBtn.className = 'btn btn-sm btn-secondary';
    if (uninstallBtn) uninstallBtn.className = 'btn btn-sm btn-danger';
  }
};

window.copyCommand = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Command copied to clipboard!');
  }).catch(() => {
    toast.info('Please copy text manually.');
  });
};

window.showDeviceDetailModal = async function(id) {
  try {
    modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`, { size: 'modal-lg' });
    const res = await devicesApi.get(id);
    const d = res.device;
    const activities = res.activities || [];

    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="status-pulse-dot" style="background:${d.status === 'online' ? '#10b981' : d.status === 'idle' ? '#f59e0b' : '#64748b'}"></span>
          <span class="modal-title font-bold text-sm">${escHtml(d.device_name || d.hostname)}</span>
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <!-- Screen Preview Section inside Detail -->
        <div class="card mb-4" style="border:1px solid rgba(99,102,241,0.2);overflow:hidden">
          <div class="card-header py-2 flex items-center justify-between">
            <span class="card-title text-xs font-semibold">Latest Desktop Screenshot</span>
            <button class="btn btn-primary btn-xs" onclick="showLiveScreenModal(${d.id}, '${escHtml(d.device_name || d.hostname)}')">Open Live Viewer</button>
          </div>
          <div style="background:#000;text-align:center;padding:0.5rem">
            ${d.last_screenshot_path ? `
              <img src="${d.last_screenshot_path}" alt="Screen" style="max-height:260px;width:auto;max-width:100%;border-radius:4px;cursor:pointer" onclick="showLiveScreenModal(${d.id}, '${escHtml(d.device_name || d.hostname)}')">
            ` : `<div class="p-6 text-muted text-xs">No screenshots captured yet.</div>`}
          </div>
        </div>

        <!-- Specs Bar -->
        <div class="grid-4 mb-4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;background:var(--bg-input);padding:0.75rem;border-radius:8px">
          <div><span class="text-xs text-muted">OS:</span><div class="text-xs font-semibold">${escHtml(d.os_name)}</div></div>
          <div><span class="text-xs text-muted">IP Address:</span><div class="text-xs font-semibold">${escHtml(d.ip_address || '-')}</div></div>
          <div><span class="text-xs text-muted">CPU:</span><div class="text-xs font-semibold">${escHtml(d.cpu_model || 'N/A')}</div></div>
          <div><span class="text-xs text-muted">RAM / Disk:</span><div class="text-xs font-semibold">${d.total_ram_gb || '-'} GB / ${d.total_disk_gb || '-'} GB</div></div>
        </div>

        <!-- Current Live Activity -->
        <div class="card mb-4" style="border:1px solid rgba(99,102,241,0.2);background:rgba(99,102,241,0.04)">
          <div class="card-body py-3">
            <div class="text-xs text-accent font-bold mb-1">CURRENT FOREGROUND APPLICATION:</div>
            <div class="text-sm font-bold text-primary">${escHtml(d.current_app || 'None')}</div>
            <div class="text-xs text-muted mt-0.5">${escHtml(d.current_window_title || '-')}</div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="card mb-4">
          <div class="card-header py-2">
            <span class="card-title text-xs font-semibold">Application Activity Timeline (Last 24 Hours)</span>
          </div>
          <div class="table-wrapper" style="max-height:200px;overflow-y:auto">
            ${activities.length ? `
              <table class="table text-xs">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Window / Document Title</th>
                    <th>Timestamp</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${activities.map(a => `
                    <tr>
                      <td class="font-bold text-accent">${escHtml(a.app_name)}</td>
                      <td class="truncate" style="max-width:250px">${escHtml(a.window_title || '-')}</td>
                      <td>${formatDateShort(a.started_at)}</td>
                      <td><span class="badge badge-info">${a.duration_formatted}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `<div class="p-4 text-center text-muted text-xs">No activity history recorded yet.</div>`}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="showLiveScreenModal(${d.id}, '${escHtml(d.device_name || d.hostname)}')">View Live Screen</button>
        <button class="btn btn-secondary" onclick="showSendMessageModal(${d.id}, '${escHtml(d.device_name || d.hostname)}')">Send Pop-up Message</button>
        <button class="btn btn-secondary" onclick="modal.close()">Close</button>
      </div>
    `, { size: 'modal-lg' });
  } catch(e) {
    toast.error('Failed to load device details', e.message);
  }
};

window.showSendMessageModal = function(id, deviceName) {
  modal.show(`
    <div class="modal-header">
      <span class="modal-title font-bold text-sm">Send Desktop Pop-up Notification (${escHtml(deviceName)})</span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="form-group">
          <label class="form-label font-medium text-xs">Notification Title *</label>
          <input type="text" class="form-control" id="cmd-title" value="IT Service Management Notification">
        </div>
        <div class="form-group">
          <label class="form-label font-medium text-xs">Pop-up Message Body *</label>
          <textarea class="form-control" id="cmd-message" rows="4" placeholder="e.g. Please reboot your workstation after 5:00 PM for scheduled maintenance..."></textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="submitSendMessage(${id})">Send Message Now</button>
    </div>
  `);
};

window.submitSendMessage = async function(id) {
  const title = document.getElementById('cmd-title').value.trim();
  const message = document.getElementById('cmd-message').value.trim();

  if (!message) {
    toast.warning('Message body cannot be empty');
    return;
  }

  try {
    await devicesApi.sendCommand(id, {
      command_type: 'message_popup',
      title,
      message,
    });
    modal.close();
    toast.success('Message sent to user device queue!');
  } catch(e) {
    toast.error('Failed to send message', e.message);
  }
};

window.showEditDeviceModal = async function(id, currentName, currentUserId) {
  try {
    const users = await usersApi.list();
    modal.show(`
      <div class="modal-header">
        <span class="modal-title font-bold text-sm">Edit / Assign Device</span>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Device Display Name</label>
            <input type="text" class="form-control" id="edit-dev-name" value="${escHtml(currentName || '')}">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Assign to User</label>
            <select class="form-control" id="edit-dev-user">
              <option value="">-- Unassigned --</option>
              ${users.map(u => `
                <option value="${u.id}" ${u.id === currentUserId ? 'selected' : ''}>
                  ${escHtml(u.name)} (${escHtml(u.email)}) - ${escHtml(u.department || '')}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="submitEditDevice(${id})">Save Changes</button>
      </div>
    `);
  } catch(e) {
    toast.error('Failed to load user list');
  }
};

window.submitEditDevice = async function(id) {
  const device_name = document.getElementById('edit-dev-name').value.trim();
  const assigned_user_id = document.getElementById('edit-dev-user').value || null;

  try {
    await devicesApi.update(id, { device_name, assigned_user_id });
    modal.close();
    toast.success('Device information updated successfully');
    loadDevicesList();
  } catch(e) {
    toast.error('Failed to update device', e.message);
  }
};

window.deleteDevice = function(id) {
  const host = window.location.origin;
  modal.show(`
    <div class="modal-header">
      <span class="modal-title font-bold text-sm text-danger flex items-center gap-2">
        ${renderIcon('trash')}
        <span>Delete Device from Monitoring</span>
      </span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <p class="text-xs text-secondary mb-3">
        Are you sure you want to delete this device from the monitoring dashboard?
      </p>

      <div class="p-3 mb-3" style="background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.25);border-radius:8px">
        <div class="font-bold text-xs text-danger mb-1 flex items-center gap-1.5">
          <span>⚠️ Important: Stop Agent on the Client Machine!</span>
        </div>
        <p class="text-xs text-secondary mb-2" style="line-height:1.5">
          If the <code>itsm-agent</code> service is still running in the background of that computer, it will automatically re-register upon its next heartbeat.
          To permanently stop and remove it from that machine:
        </p>
        <div style="position:relative">
          <pre id="cmd-del-uninstall" style="background:var(--bg-card);border:1px solid var(--border-primary);padding:0.5rem;border-radius:6px;color:#fda4af;font-size:0.75rem;overflow-x:auto">curl -sSL ${host}/agent/uninstall-agent.sh | bash</pre>
          <button class="btn btn-secondary btn-xs" style="position:absolute;top:4px;right:4px" onclick="copyElementText('cmd-del-uninstall')">Copy</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-danger" onclick="executeDeleteDevice(${id})">Delete Device Now</button>
    </div>
  `);
};

window.executeDeleteDevice = async function(id) {
  try {
    await devicesApi.delete(id);
    modal.close();
    toast.success('Device deleted successfully');
    loadDevicesList();
  } catch(e) {
    toast.error('Failed to delete device', e.message);
  }
};
