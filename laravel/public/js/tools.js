/**
 * IT Diagnostics & Troubleshooting Tools Module
 * (Ping, Port Scanner, Traceroute, DNS Lookup, SSL Inspector, Password Gen, JWT/Base64, Whois/Geo)
 */

window.toolsState = {
  activeTab: 'network', // network, security
  activeNetworkTool: 'ping', // ping, port, ssl, dns, traceroute
  activeSecurityTool: 'passgen', // passgen, jwt, whois
  lastOutput: '',
};

window.loadTools = function() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const role = appState.user?.role || 'user';
  if (!['admin', 'manager', 'agent'].includes(role)) {
    content.innerHTML = `
      <div class="empty-state p-8">
        <div class="empty-icon text-danger">${renderIcon('shield')}</div>
        <div class="empty-title">Access Restricted</div>
        <p class="empty-desc">The IT Diagnostics & Troubleshooting module is accessible only by IT Support Specialists and Administrators.</p>
        <button class="btn btn-primary mt-4" onclick="navigateTo('dashboard')">Back to Dashboard</button>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">IT Diagnostics & Troubleshooting Tools</h1>
        <p class="page-subtitle">Network connectivity diagnostics, port scanning, SSL inspection, DNS records, and IT utility toolsets</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="showAttachToolOutputModal()">
          ${renderIcon('ticket')}
          <span>Attach to Ticket</span>
        </button>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="card mb-6">
      <div class="card-body py-3">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex gap-2 flex-wrap" id="tools-main-tabs">
            <button class="btn btn-sm ${window.toolsState.activeTab === 'network' ? 'btn-primary' : 'btn-secondary'}" onclick="setToolsMainTab('network', this)">
              ${renderIcon('activity')}
              <span>Network & Connectivity</span>
            </button>
            <button class="btn btn-sm ${window.toolsState.activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}" onclick="setToolsMainTab('security', this)">
              ${renderIcon('shield')}
              <span>Security & Data Utilities</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Container for Selected Tab Content -->
    <div id="tools-tab-container"></div>
  `;

  renderToolsTabContent();
};

window.setToolsMainTab = function(tab, btn) {
  window.toolsState.activeTab = tab;
  document.querySelectorAll('#tools-main-tabs button').forEach(b => b.className = 'btn btn-sm btn-secondary');
  if (btn) btn.className = 'btn btn-sm btn-primary';
  renderToolsTabContent();
};

function renderToolsTabContent() {
  const container = document.getElementById('tools-tab-container');
  if (!container) return;

  if (window.toolsState.activeTab === 'network') {
    renderNetworkToolsTab(container);
  } else {
    renderSecurityToolsTab(container);
  }
}

// ============================================
// 1. NETWORK & CONNECTIVITY TAB
// ============================================
function renderNetworkToolsTab(container) {
  container.innerHTML = `
    <!-- Sub Tool Selector Pills -->
    <div class="flex gap-2 mb-4 flex-wrap" id="net-sub-tabs">
      <button class="btn btn-xs ${window.toolsState.activeNetworkTool === 'ping' ? 'btn-primary' : 'btn-secondary'}" onclick="setNetworkSubTool('ping', this)">Ping & Latency</button>
      <button class="btn btn-xs ${window.toolsState.activeNetworkTool === 'port' ? 'btn-primary' : 'btn-secondary'}" onclick="setNetworkSubTool('port', this)">Port & Service Scanner</button>
      <button class="btn btn-xs ${window.toolsState.activeNetworkTool === 'ssl' ? 'btn-primary' : 'btn-secondary'}" onclick="setNetworkSubTool('ssl', this)">SSL Certificate Check</button>
      <button class="btn btn-xs ${window.toolsState.activeNetworkTool === 'dns' ? 'btn-primary' : 'btn-secondary'}" onclick="setNetworkSubTool('dns', this)">DNS & Reverse Lookup</button>
      <button class="btn btn-xs ${window.toolsState.activeNetworkTool === 'traceroute' ? 'btn-primary' : 'btn-secondary'}" onclick="setNetworkSubTool('traceroute', this)">Traceroute</button>
    </div>

    <!-- Active Network Tool Area -->
    <div id="network-tool-viewport"></div>
  `;

  renderNetworkSubTool();
}

window.setNetworkSubTool = function(sub, btn) {
  window.toolsState.activeNetworkTool = sub;
  document.querySelectorAll('#net-sub-tabs button').forEach(b => b.className = 'btn btn-xs btn-secondary');
  if (btn) btn.className = 'btn btn-xs btn-primary';
  renderNetworkSubTool();
};

function renderNetworkSubTool() {
  const vp = document.getElementById('network-tool-viewport');
  if (!vp) return;

  const sub = window.toolsState.activeNetworkTool;

  if (sub === 'ping') {
    vp.innerHTML = `
      <div class="card mb-6">
        <div class="card-header pb-2">
          <div>
            <h3 class="card-title text-sm font-bold">Ping & Latency Tester</h3>
            <p class="text-xs text-muted">Test reachability, round-trip latency, and packet loss from a specific source interface/IP to a remote destination</p>
          </div>
        </div>
        <div class="card-body">
          <form id="ping-form" onsubmit="event.preventDefault(); executePing();" class="flex gap-3 items-end flex-wrap">
            <div class="form-group mb-0" style="flex:2;min-width:230px">
              <label class="form-label text-xs font-semibold">Target Destination (Host / IP) *</label>
              <input type="text" class="form-control" id="ping-host" placeholder="e.g. 1.1.1.1, google.com, or 192.168.1.1" value="1.1.1.1" required>
            </div>
            <div class="form-group mb-0" style="flex:2;min-width:240px">
              <label class="form-label text-xs font-semibold flex items-center justify-between">
                <span>Source Address / Interface</span>
                <span class="text-muted" style="font-size:0.68rem">(Optional)</span>
              </label>
              <select class="form-control" id="ping-source-select" onchange="handlePingSourceChange(this)" style="font-size:0.75rem">
                <option value="">Default (Auto / System Primary IP)</option>
                <option value="custom">✏️ Custom Specific IP / Interface...</option>
              </select>
              <input type="text" class="form-control mt-1.5" id="ping-source-custom" placeholder="e.g. 10.8.0.2, 192.168.1.50, eth0" style="display:none;font-size:0.75rem">
            </div>
            <div class="form-group mb-0" style="width:115px">
              <label class="form-label text-xs font-semibold">Ping Count</label>
              <select class="form-control" id="ping-count">
                <option value="3">3 Packets</option>
                <option value="4" selected>4 Packets</option>
                <option value="6">6 Packets</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-run-ping">
              ${renderIcon('activity')}
              <span>Start Ping</span>
            </button>
          </form>

          <!-- Quick Host Presets -->
          <div class="flex items-center gap-2 mt-3 flex-wrap text-xs">
            <span class="text-muted font-medium">Quick Presets:</span>
            <button class="btn btn-ghost btn-xs" onclick="setPingHost('1.1.1.1')">Cloudflare (1.1.1.1)</button>
            <button class="btn btn-ghost btn-xs" onclick="setPingHost('8.8.8.8')">Google DNS (8.8.8.8)</button>
            <button class="btn btn-ghost btn-xs" onclick="setPingHost('192.168.1.1')">Local Gateway (192.168.1.1)</button>
            <button class="btn btn-ghost btn-xs" onclick="setPingHost('github.com')">GitHub (github.com)</button>
          </div>
        </div>
      </div>

      <!-- Results Viewport -->
      <div id="ping-results-area" style="display:none"></div>
    `;

    setTimeout(() => window.loadPingInterfaces(), 50);
  } else if (sub === 'port') {
    vp.innerHTML = `
      <div class="card mb-6">
        <div class="card-header pb-2">
          <div>
            <h3 class="card-title text-sm font-bold">Port & Service Availability Scanner</h3>
            <p class="text-xs text-muted">Check whether target service ports (Web, DB, RDP, SSH, Mail) are open, listening, or filtered by firewall</p>
          </div>
        </div>
        <div class="card-body">
          <form id="port-form" onsubmit="event.preventDefault(); executePortScan();" class="flex gap-3 items-end flex-wrap">
            <div class="form-group mb-0" style="flex:2;min-width:240px">
              <label class="form-label text-xs font-medium">Target Host / IP Address *</label>
              <input type="text" class="form-control" id="port-host" placeholder="e.g. 127.0.0.1 or db.company.com" value="127.0.0.1" required>
            </div>
            <div class="form-group mb-0" style="flex:1;min-width:200px">
              <label class="form-label text-xs font-medium">Port Preset</label>
              <select class="form-control" id="port-preset" onchange="handlePortPresetChange(this.value)">
                <option value="common" selected>Common Standard Ports (Web, SSH, DB, RDP)</option>
                <option value="web">Web Services (80, 443, 8080, 8443)</option>
                <option value="db">Databases (3306, 5432, 1433, 6379, 27017)</option>
                <option value="remote">Remote Access (22, 3389, 21)</option>
                <option value="mail">Mail Services (25, 465, 587, 993, 110)</option>
                <option value="custom">Custom Specific Port</option>
              </select>
            </div>
            <div class="form-group mb-0" id="custom-port-group" style="width:120px;display:none">
              <label class="form-label text-xs font-medium">Port Number</label>
              <input type="number" class="form-control" id="port-single" placeholder="8000" min="1" max="65535">
            </div>
            <button type="submit" class="btn btn-primary" id="btn-run-port">
              ${renderIcon('search')}
              <span>Scan Ports</span>
            </button>
          </form>
        </div>
      </div>

      <div id="port-results-area" style="display:none"></div>
    `;
  } else if (sub === 'ssl') {
    vp.innerHTML = `
      <div class="card mb-6">
        <div class="card-header pb-2">
          <div>
            <h3 class="card-title text-sm font-bold">SSL / TLS Certificate Inspector</h3>
            <p class="text-xs text-muted">Inspect domain SSL/TLS certificate validity, expiration date, issuer CA, and encryption cipher</p>
          </div>
        </div>
        <div class="card-body">
          <form onsubmit="event.preventDefault(); executeSslCheck();" class="flex gap-3 items-end flex-wrap">
            <div class="form-group mb-0" style="flex:2;min-width:240px">
              <label class="form-label text-xs font-medium">Domain Name (Port 443) *</label>
              <input type="text" class="form-control" id="ssl-host" placeholder="e.g. google.com or portal.company.com" value="google.com" required>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-run-ssl">
              ${renderIcon('shield')}
              <span>Inspect SSL</span>
            </button>
          </form>
        </div>
      </div>

      <div id="ssl-results-area" style="display:none"></div>
    `;
  } else if (sub === 'dns') {
    vp.innerHTML = `
      <div class="card mb-6">
        <div class="card-header pb-2">
          <div>
            <h3 class="card-title text-sm font-bold">DNS Record & Reverse Lookup</h3>
            <p class="text-xs text-muted">Query A, AAAA, CNAME, MX, TXT (SPF/DKIM), NS records and Reverse DNS (PTR)</p>
          </div>
        </div>
        <div class="card-body">
          <form onsubmit="event.preventDefault(); executeDnsLookup();" class="flex gap-3 items-end flex-wrap">
            <div class="form-group mb-0" style="flex:2;min-width:240px">
              <label class="form-label text-xs font-medium">Domain or IP Address *</label>
              <input type="text" class="form-control" id="dns-host" placeholder="e.g. cloudflare.com or 8.8.8.8" value="cloudflare.com" required>
            </div>
            <div class="form-group mb-0" style="width:140px">
              <label class="form-label text-xs font-medium">Record Type</label>
              <select class="form-control" id="dns-type">
                <option value="ANY" selected>All (ANY)</option>
                <option value="A">A (IPv4)</option>
                <option value="AAAA">AAAA (IPv6)</option>
                <option value="CNAME">CNAME</option>
                <option value="MX">MX (Mail)</option>
                <option value="TXT">TXT (SPF/DKIM)</option>
                <option value="NS">NS (Nameserver)</option>
                <option value="SOA">SOA</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-run-dns">
              ${renderIcon('search')}
              <span>Resolve DNS</span>
            </button>
          </form>
        </div>
      </div>

      <div id="dns-results-area" style="display:none"></div>
    `;
  } else if (sub === 'traceroute') {
    vp.innerHTML = `
      <div class="card mb-6">
        <div class="card-header pb-2">
          <div>
            <h3 class="card-title text-sm font-bold">Traceroute & Hop Path Tracer</h3>
            <p class="text-xs text-muted">Trace network routing hops to diagnose latency spikes or packet drops along the path</p>
          </div>
        </div>
        <div class="card-body">
          <form onsubmit="event.preventDefault(); executeTraceroute();" class="flex gap-3 items-end flex-wrap">
            <div class="form-group mb-0" style="flex:2;min-width:240px">
              <label class="form-label text-xs font-medium">Target Host / IP *</label>
              <input type="text" class="form-control" id="trace-host" placeholder="e.g. 1.1.1.1 or google.com" value="1.1.1.1" required>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-run-trace">
              ${renderIcon('activity')}
              <span>Run Traceroute</span>
            </button>
          </form>
        </div>
      </div>

      <div id="trace-results-area" style="display:none"></div>
    `;
  }
}

window.setPingHost = function(h) {
  const el = document.getElementById('ping-host');
  if (el) { el.value = h; el.focus(); }
};

window.handlePortPresetChange = function(val) {
  const customGroup = document.getElementById('custom-port-group');
  if (customGroup) {
    customGroup.style.display = val === 'custom' ? 'block' : 'none';
  }
};

window.loadPingInterfaces = async function() {
  const selectEl = document.getElementById('ping-source-select');
  if (!selectEl) return;
  try {
    const res = await toolsApi.interfaces();
    if (res && res.interfaces && res.interfaces.length > 0) {
      const customOpt = selectEl.querySelector('option[value="custom"]');
      res.interfaces.forEach(iface => {
        if (!selectEl.querySelector(`option[value="${iface.ip}"]`)) {
          const opt = document.createElement('option');
          opt.value = iface.ip;
          opt.textContent = `🔌 ${iface.name} (${iface.ip})`;
          if (customOpt) {
            selectEl.insertBefore(opt, customOpt);
          } else {
            selectEl.appendChild(opt);
          }
        }
      });
    }
  } catch (e) {}
};

window.handlePingSourceChange = function(selectEl) {
  const customInput = document.getElementById('ping-source-custom');
  if (customInput) {
    if (selectEl.value === 'custom') {
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      customInput.style.display = 'none';
    }
  }
};

// --- Execution Handlers ---

window.executePing = async function() {
  const host = document.getElementById('ping-host')?.value.trim();
  const count = document.getElementById('ping-count')?.value || 4;
  const sourceSelect = document.getElementById('ping-source-select');
  let source = '';
  if (sourceSelect) {
    if (sourceSelect.value === 'custom') {
      source = document.getElementById('ping-source-custom')?.value.trim() || '';
    } else {
      source = sourceSelect.value.trim();
    }
  }

  const btn = document.getElementById('btn-run-ping');
  const resArea = document.getElementById('ping-results-area');

  if (!host) { toast.warning('Please enter a target destination host or IP address'); return; }

  if (btn) btn.disabled = true;
  if (resArea) {
    resArea.style.display = 'block';
    resArea.innerHTML = `<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`;
  }

  try {
    const res = await toolsApi.ping({ host, count, source: source || undefined });
    window.toolsState.lastOutput = `[PING TEST: FROM ${res.source || 'Default'} -> TO ${res.host}]\nStatus: ${res.is_alive ? 'ALIVE' : 'UNREACHABLE'}\nPacket Loss: ${res.packet_loss_percent}%\nAvg Latency: ${res.avg_latency_ms || '-'} ms\nCommand Executed: ${res.command_executed || '-'}\nRaw Output:\n${res.raw_output}`;

    resArea.innerHTML = `
      <div class="stats-grid mb-4" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr))">
        <div class="stat-card" style="border-left:3px solid ${res.is_alive ? '#10b981' : '#f43f5e'}">
          <div class="stat-icon" style="background:${res.is_alive ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)'};color:${res.is_alive ? '#34d399' : '#fb7185'}">
            ${renderIcon(res.is_alive ? 'check' : 'x')}
          </div>
          <div class="stat-content">
            <div class="stat-value ${res.is_alive ? 'text-success' : 'text-danger'}">${res.is_alive ? 'ONLINE (ALIVE)' : 'UNREACHABLE'}</div>
            <div class="stat-label">Host Reachability</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid var(--accent-primary)">
          <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:var(--accent-primary)">${renderIcon('activity')}</div>
          <div class="stat-content">
            <div class="stat-value text-xs font-bold" style="font-size:0.75rem;line-height:1.4">
              <span class="text-muted">From:</span> <span class="text-primary font-semibold">${escHtml(res.source || 'Default')}</span><br>
              <span class="text-muted">To:</span> <span class="text-success font-semibold">${escHtml(res.host)}</span>
            </div>
            <div class="stat-label">Source ➔ Target Path</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">${renderIcon('clock')}</div>
          <div class="stat-content">
            <div class="stat-value text-primary">${res.avg_latency_ms !== null ? res.avg_latency_ms + ' ms' : '-'}</div>
            <div class="stat-label">Average Latency (RTT)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:#fbbf24">${renderIcon('activity')}</div>
          <div class="stat-content">
            <div class="stat-value ${res.packet_loss_percent > 0 ? 'text-warning' : 'text-success'}">${res.packet_loss_percent}%</div>
            <div class="stat-label">Packet Loss</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(6,182,212,0.12);color:#22d3ee">${renderIcon('zap')}</div>
          <div class="stat-content">
            <div class="stat-value">${res.min_latency_ms !== null ? `${res.min_latency_ms} / ${res.max_latency_ms} ms` : '-'}</div>
            <div class="stat-label">Min / Max Latency</div>
          </div>
        </div>
      </div>

      <!-- Raw Terminal Console -->
      <div class="card">
        <div class="card-header py-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="card-title text-xs font-semibold">Terminal Output Console</span>
            ${res.command_executed ? `<span class="badge badge-secondary text-xs" style="font-family:monospace;font-size:0.68rem">$ ${escHtml(res.command_executed)}</span>` : ''}
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-xs" onclick="copyLastOutput()">Copy Output</button>
            <button class="btn btn-primary btn-xs" onclick="showAttachToolOutputModal()">Attach to Ticket</button>
          </div>
        </div>
        <div class="card-body p-0">
          <pre style="background:#05070f;color:#38bdf8;padding:1rem;margin:0;font-family:'JetBrains Mono',monospace;font-size:0.75rem;line-height:1.6;border-radius:0 0 8px 8px;overflow-x:auto;white-space:pre-wrap">${escHtml(res.raw_output || 'No output log')}</pre>
        </div>
      </div>
    `;
  } catch(e) {
    if (resArea) {
      resArea.innerHTML = `<div class="empty-state p-4"><div class="empty-title text-danger">Ping failed: ${escHtml(e.message)}</div></div>`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.executePortScan = async function() {
  const host = document.getElementById('port-host')?.value.trim();
  const preset = document.getElementById('port-preset')?.value || 'common';
  const singlePort = document.getElementById('port-single')?.value;
  const btn = document.getElementById('btn-run-port');
  const resArea = document.getElementById('port-results-area');

  if (!host) { toast.warning('Please enter a host or IP address'); return; }

  let payload = { host };
  if (preset === 'custom' && singlePort) {
    payload.port = parseInt(singlePort);
  } else if (preset === 'web') {
    payload.ports = [80, 443, 8080, 8443];
  } else if (preset === 'db') {
    payload.ports = [3306, 5432, 1433, 6379, 27017];
  } else if (preset === 'remote') {
    payload.ports = [22, 3389, 21, 445];
  } else if (preset === 'mail') {
    payload.ports = [25, 465, 587, 993, 110];
  }

  if (btn) btn.disabled = true;
  if (resArea) {
    resArea.style.display = 'block';
    resArea.innerHTML = `<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`;
  }

  try {
    const res = await toolsApi.portCheck(payload);
    const results = res.results || [];

    let logText = `[PORT SCAN: ${res.host}]\n`;
    results.forEach(r => {
      logText += `Port ${r.port} (${r.service}): ${r.status.toUpperCase()} ${r.latency_ms ? '(' + r.latency_ms + 'ms)' : ''}\n`;
    });
    window.toolsState.lastOutput = logText;

    resArea.innerHTML = `
      <div class="card mb-4">
        <div class="card-header py-2 flex items-center justify-between">
          <span class="card-title text-xs font-semibold">Port Scan Results (${res.host})</span>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-xs" onclick="copyLastOutput()">Copy Results</button>
            <button class="btn btn-primary btn-xs" onclick="showAttachToolOutputModal()">Attach to Ticket</button>
          </div>
        </div>
        <div class="card-body p-0">
          <table class="table text-xs">
            <thead>
              <tr>
                <th style="width:100px">Port</th>
                <th>Associated Service</th>
                <th>Status</th>
                <th>Response Time</th>
                <th>Details / Error</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(r => `
                <tr>
                  <td class="font-bold text-accent font-mono">Port ${r.port}</td>
                  <td class="font-medium text-primary">${escHtml(r.service)}</td>
                  <td>
                    <span class="badge ${r.is_open ? 'badge-success' : 'badge-danger'}">
                      ${r.is_open ? 'OPEN / LISTENING' : 'CLOSED / FILTERED'}
                    </span>
                  </td>
                  <td>${r.latency_ms !== null ? `<span class="text-success font-semibold">${r.latency_ms} ms</span>` : '<span class="text-muted">-</span>'}</td>
                  <td class="text-muted">${escHtml(r.error || 'Port is open and accepting incoming connections')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) {
    if (resArea) {
      resArea.innerHTML = `<div class="empty-state p-4"><div class="empty-title text-danger">Port scan failed: ${escHtml(e.message)}</div></div>`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.executeSslCheck = async function() {
  const host = document.getElementById('ssl-host')?.value.trim();
  const btn = document.getElementById('btn-run-ssl');
  const resArea = document.getElementById('ssl-results-area');

  if (!host) { toast.warning('Please enter a domain name'); return; }

  if (btn) btn.disabled = true;
  if (resArea) {
    resArea.style.display = 'block';
    resArea.innerHTML = `<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`;
  }

  try {
    const res = await toolsApi.sslCheck({ host });
    window.toolsState.lastOutput = `[SSL INSPECTION: ${res.host}]\nCommon Name: ${res.common_name}\nIssuer: ${res.issuer}\nValid From: ${res.valid_from}\nValid To: ${res.valid_to}\nDays Remaining: ${res.days_remaining} days\nStatus: ${res.is_valid ? 'VALID' : 'EXPIRED'}`;

    resArea.innerHTML = `
      <div class="card mb-4" style="border-top: 3px solid ${res.is_valid ? '#10b981' : '#f43f5e'}">
        <div class="card-header pb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="status-pulse-dot" style="background:${res.is_valid ? '#10b981' : '#f43f5e'}"></span>
            <span class="card-title text-sm font-bold">${escHtml(res.common_name)}</span>
          </div>
          <span class="badge ${res.is_valid ? 'badge-success' : 'badge-danger'}">
            ${res.is_valid ? `Valid (${res.days_remaining} Days Remaining)` : 'Expired / Invalid'}
          </span>
        </div>
        <div class="card-body">
          <div class="grid-3 mb-4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;background:var(--bg-input);padding:0.875rem;border-radius:8px">
            <div>
              <div class="text-xs text-muted">Certificate Issuer:</div>
              <div class="text-xs font-bold text-primary mt-0.5">${escHtml(res.issuer)}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Valid From:</div>
              <div class="text-xs font-semibold text-primary mt-0.5">${res.valid_from}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Valid To (Expiration):</div>
              <div class="text-xs font-semibold ${res.days_remaining < 30 ? 'text-warning font-bold' : 'text-primary'} mt-0.5">${res.valid_to}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Signature Algorithm:</div>
              <div class="text-xs font-semibold text-primary mt-0.5">${escHtml(res.signature_algorithm)}</div>
            </div>
          </div>

          ${res.sans && res.sans.length ? `
            <div>
              <div class="text-xs font-semibold text-accent mb-2">Subject Alternative Names (SANs):</div>
              <div class="flex gap-1.5 flex-wrap">
                ${res.sans.slice(0, 12).map(s => `<span class="badge badge-secondary" style="font-size:0.65rem">${escHtml(s)}</span>`).join('')}
                ${res.sans.length > 12 ? `<span class="badge badge-secondary" style="font-size:0.65rem">+${res.sans.length - 12} more domains</span>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="card-footer py-2 flex justify-end gap-2">
          <button class="btn btn-secondary btn-xs" onclick="copyLastOutput()">Copy Summary</button>
          <button class="btn btn-primary btn-xs" onclick="showAttachToolOutputModal()">Attach to Ticket</button>
        </div>
      </div>
    `;
  } catch(e) {
    if (resArea) {
      resArea.innerHTML = `<div class="empty-state p-4"><div class="empty-title text-danger">SSL check failed: ${escHtml(e.message)}</div></div>`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.executeDnsLookup = async function() {
  const host = document.getElementById('dns-host')?.value.trim();
  const type = document.getElementById('dns-type')?.value || 'ANY';
  const btn = document.getElementById('btn-run-dns');
  const resArea = document.getElementById('dns-results-area');

  if (!host) { toast.warning('Please enter a domain or IP'); return; }

  if (btn) btn.disabled = true;
  if (resArea) {
    resArea.style.display = 'block';
    resArea.innerHTML = `<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`;
  }

  try {
    const res = await toolsApi.dnsLookup({ host, type });
    const records = res.records || [];

    let logText = `[DNS LOOKUP: ${res.query}]\n`;
    if (res.reverse_dns) logText += `Reverse DNS (PTR): ${res.reverse_dns}\n`;
    records.forEach(r => {
      logText += `${r.type.padEnd(6)} TTL=${r.ttl} ${r.target || ''} ${r.pri ? '(Pri=' + r.pri + ')' : ''}\n`;
    });
    window.toolsState.lastOutput = logText;

    resArea.innerHTML = `
      <div class="card mb-4">
        <div class="card-header py-2 flex items-center justify-between">
          <div>
            <span class="card-title text-xs font-semibold">DNS Records (${res.query})</span>
            ${res.reverse_dns ? `<div class="text-xs text-muted mt-0.5">Reverse PTR: <code class="text-accent">${escHtml(res.reverse_dns)}</code></div>` : ''}
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-xs" onclick="copyLastOutput()">Copy Records</button>
            <button class="btn btn-primary btn-xs" onclick="showAttachToolOutputModal()">Attach to Ticket</button>
          </div>
        </div>
        <div class="card-body p-0">
          ${records.length ? `
            <table class="table text-xs">
              <thead>
                <tr>
                  <th style="width:90px">Type</th>
                  <th>Host</th>
                  <th>Target / Value</th>
                  <th style="width:80px">TTL</th>
                </tr>
              </thead>
              <tbody>
                ${records.map(r => `
                  <tr>
                    <td><span class="badge badge-info font-mono">${escHtml(r.type)}</span></td>
                    <td class="font-mono text-muted">${escHtml(r.host || res.query)}</td>
                    <td class="font-mono font-medium text-primary" style="word-break:break-all">${escHtml(r.target || '')} ${r.pri ? `<span class="badge badge-secondary" style="font-size:0.65rem">Pri: ${r.pri}</span>` : ''}</td>
                    <td class="text-muted font-mono">${r.ttl}s</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<div class="p-6 text-center text-muted text-xs">No DNS records found for this query.</div>`}
        </div>
      </div>
    `;
  } catch(e) {
    if (resArea) {
      resArea.innerHTML = `<div class="empty-state p-4"><div class="empty-title text-danger">DNS lookup failed: ${escHtml(e.message)}</div></div>`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.executeTraceroute = async function() {
  const host = document.getElementById('trace-host')?.value.trim();
  const btn = document.getElementById('btn-run-trace');
  const resArea = document.getElementById('trace-results-area');

  if (!host) { toast.warning('Please enter a host or IP'); return; }

  if (btn) btn.disabled = true;
  if (resArea) {
    resArea.style.display = 'block';
    resArea.innerHTML = `<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`;
  }

  try {
    const res = await toolsApi.traceroute({ host });
    window.toolsState.lastOutput = `[TRACEROUTE: ${res.host}]\n${res.raw_output}`;

    resArea.innerHTML = `
      <div class="card mb-4">
        <div class="card-header py-2 flex items-center justify-between">
          <span class="card-title text-xs font-semibold">Traceroute Hop Route (${res.host})</span>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-xs" onclick="copyLastOutput()">Copy Output</button>
            <button class="btn btn-primary btn-xs" onclick="showAttachToolOutputModal()">Attach to Ticket</button>
          </div>
        </div>
        <div class="card-body p-0">
          <pre style="background:#05070f;color:#a5b4fc;padding:1rem;margin:0;font-family:'JetBrains Mono',monospace;font-size:0.75rem;line-height:1.6;border-radius:0 0 8px 8px;overflow-x:auto;white-space:pre-wrap">${escHtml(res.raw_output || 'Trace complete')}</pre>
        </div>
      </div>
    `;
  } catch(e) {
    if (resArea) {
      resArea.innerHTML = `<div class="empty-state p-4"><div class="empty-title text-danger">Traceroute failed: ${escHtml(e.message)}</div></div>`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

// ============================================
// 2. SECURITY & DATA UTILITIES TAB
// ============================================
function renderSecurityToolsTab(container) {
  container.innerHTML = `
    <!-- Sub Tool Selector Pills -->
    <div class="flex gap-2 mb-4 flex-wrap" id="sec-sub-tabs">
      <button class="btn btn-xs ${window.toolsState.activeSecurityTool === 'passgen' ? 'btn-primary' : 'btn-secondary'}" onclick="setSecuritySubTool('passgen', this)">Password & Key Generator</button>
      <button class="btn btn-xs ${window.toolsState.activeSecurityTool === 'jwt' ? 'btn-primary' : 'btn-secondary'}" onclick="setSecuritySubTool('jwt', this)">JWT & Base64 Inspector</button>
      <button class="btn btn-xs ${window.toolsState.activeSecurityTool === 'whois' ? 'btn-primary' : 'btn-secondary'}" onclick="setSecuritySubTool('whois', this)">IP & Whois Geolocation</button>
    </div>

    <!-- Active Security Tool Area -->
    <div id="security-tool-viewport"></div>
  `;

  renderSecuritySubTool();
}

window.setSecuritySubTool = function(sub, btn) {
  window.toolsState.activeSecurityTool = sub;
  document.querySelectorAll('#sec-sub-tabs button').forEach(b => b.className = 'btn btn-xs btn-secondary');
  if (btn) btn.className = 'btn btn-xs btn-primary';
  renderSecuritySubTool();
};

function renderSecuritySubTool() {
  const vp = document.getElementById('security-tool-viewport');
  if (!vp) return;

  const sub = window.toolsState.activeSecurityTool;

  if (sub === 'passgen') {
    vp.innerHTML = `
      <div class="card mb-6">
        <div class="card-header pb-2">
          <div>
            <h3 class="card-title text-sm font-bold">Cryptographic Password & Key Generator</h3>
            <p class="text-xs text-muted">Generate cryptographically secure passwords and keys for user accounts or emergency credential resets</p>
          </div>
        </div>
        <div class="card-body">
          <div class="grid-2 mb-4" style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
            <div>
              <div class="form-group mb-3">
                <label class="form-label text-xs font-medium flex justify-between">
                  <span>Character Length:</span>
                  <span class="font-bold text-accent" id="pass-len-val">16</span>
                </label>
                <input type="range" class="form-control" id="pass-length" min="8" max="64" value="16" oninput="document.getElementById('pass-len-val').textContent=this.value; executePassGen();">
              </div>

              <div class="flex flex-col gap-2 text-xs">
                <label class="flex items-center gap-2 cursor-pointer card p-2">
                  <input type="checkbox" id="pass-upper" checked onchange="executePassGen()">
                  <span>Uppercase Letters (A-Z)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer card p-2">
                  <input type="checkbox" id="pass-lower" checked onchange="executePassGen()">
                  <span>Lowercase Letters (a-z)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer card p-2">
                  <input type="checkbox" id="pass-nums" checked onchange="executePassGen()">
                  <span>Numbers (0-9)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer card p-2">
                  <input type="checkbox" id="pass-syms" checked onchange="executePassGen()">
                  <span>Special Symbols (!@#$%^&*)</span>
                </label>
              </div>
            </div>

            <!-- Output Box -->
            <div style="display:flex;flex-direction:column;justify-content:space-between">
              <div class="p-4" style="background:var(--bg-input);border-radius:8px;border:1px solid var(--border-primary)">
                <div class="text-xs text-muted mb-1 flex justify-between">
                  <span>Generated Password:</span>
                  <span id="pass-entropy-badge" class="badge badge-success">Entropy: ~96 bits</span>
                </div>
                <div class="font-mono font-bold text-base text-primary select-all mb-3" id="pass-result-text" style="word-break:break-all;color:#818cf8">
                  Generating...
                </div>
                <button class="btn btn-primary btn-sm w-full" onclick="copyPassword()">
                  ${renderIcon('check')}
                  <span>Copy Password</span>
                </button>
              </div>

              <button class="btn btn-secondary btn-sm mt-3" onclick="executePassGen()">
                ${renderIcon('refresh')}
                <span>Regenerate Password</span>
              </button>
            </div>
          </div>

          <!-- Pre-computed Hashes Area -->
          <div id="pass-hashes-area" class="mt-4 pt-4" style="border-top:1px solid var(--border-primary)"></div>
        </div>
      </div>
    `;
    executePassGen();
  } else if (sub === 'jwt') {
    vp.innerHTML = `
      <div class="card mb-6">
        <div class="card-header pb-2">
          <div>
            <h3 class="card-title text-sm font-bold">JWT & Base64 Decoder / Inspector</h3>
            <p class="text-xs text-muted">Inspect JSON Web Tokens (JWT), verify active lifetime (exp/iat), or encode/decode Base64 strings</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-group mb-3">
            <label class="form-label text-xs font-medium">Input String / JWT Token / Base64</label>
            <textarea class="form-control font-mono text-xs" id="jwt-input" rows="4" placeholder="Paste JWT token (eyJhbGciOi...) or Base64 string here..."></textarea>
          </div>
          <div class="flex gap-2 mb-4">
            <button class="btn btn-primary btn-sm" onclick="executeBase64Jwt('inspect')">Inspect Token</button>
            <button class="btn btn-secondary btn-sm" onclick="executeBase64Jwt('decode')">Decode Base64</button>
            <button class="btn btn-secondary btn-sm" onclick="executeBase64Jwt('encode')">Encode to Base64</button>
          </div>

          <div id="jwt-results-area" style="display:none"></div>
        </div>
      </div>
    `;
  } else if (sub === 'whois') {
    vp.innerHTML = `
      <div class="card mb-6">
        <div class="card-header pb-2">
          <div>
            <h3 class="card-title text-sm font-bold">IP & Whois Geolocation Lookup</h3>
            <p class="text-xs text-muted">Query ISP, Autonomous System (ASN), Organization, and Geolocation metadata for IP or hostname</p>
          </div>
        </div>
        <div class="card-body">
          <form onsubmit="event.preventDefault(); executeWhoisIp();" class="flex gap-3 items-end flex-wrap">
            <div class="form-group mb-0" style="flex:2;min-width:240px">
              <label class="form-label text-xs font-medium">IP Address or Domain *</label>
              <input type="text" class="form-control" id="whois-query" placeholder="e.g. 8.8.8.8 or google.com" value="8.8.8.8" required>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-run-whois">
              ${renderIcon('search')}
              <span>Lookup IP / ASN</span>
            </button>
          </form>
        </div>
      </div>

      <div id="whois-results-area" style="display:none"></div>
    `;
  }
}

window.executePassGen = async function() {
  const length = document.getElementById('pass-length')?.value || 16;
  const uppercase = document.getElementById('pass-upper')?.checked ?? true;
  const lowercase = document.getElementById('pass-lower')?.checked ?? true;
  const numbers = document.getElementById('pass-nums')?.checked ?? true;
  const symbols = document.getElementById('pass-syms')?.checked ?? true;

  try {
    const res = await toolsApi.passwordGen({ length, uppercase, lowercase, numbers, symbols });
    const txt = document.getElementById('pass-result-text');
    const badge = document.getElementById('pass-entropy-badge');
    const hashArea = document.getElementById('pass-hashes-area');

    if (txt) txt.textContent = res.password;
    if (badge) {
      badge.textContent = `${res.strength} (~${res.entropy_bits} bits)`;
      badge.className = `badge ${res.entropy_bits >= 60 ? 'badge-success' : 'badge-warning'}`;
    }

    if (hashArea && res.hashes) {
      hashArea.innerHTML = `
        <div class="text-xs font-semibold text-muted mb-2">Pre-computed Cryptographic Hashes:</div>
        <div style="display:flex;flex-direction:column;gap:0.4rem" class="text-xs font-mono">
          <div class="flex items-center gap-2 p-1.5" style="background:var(--bg-input);border-radius:4px">
            <span class="badge badge-info" style="width:60px;font-size:0.65rem">SHA-256</span>
            <span class="text-muted truncate select-all">${res.hashes.sha256}</span>
          </div>
          <div class="flex items-center gap-2 p-1.5" style="background:var(--bg-input);border-radius:4px">
            <span class="badge badge-secondary" style="width:60px;font-size:0.65rem">MD5</span>
            <span class="text-muted truncate select-all">${res.hashes.md5}</span>
          </div>
          <div class="flex items-center gap-2 p-1.5" style="background:var(--bg-input);border-radius:4px">
            <span class="badge badge-warning" style="width:60px;font-size:0.65rem">Bcrypt</span>
            <span class="text-muted truncate select-all">${res.hashes.bcrypt}</span>
          </div>
        </div>
      `;
    }
  } catch(e) {}
};

window.copyPassword = function() {
  const txt = document.getElementById('pass-result-text')?.textContent.trim();
  if (!txt) return;
  window.copyToClipboard(txt, 'Password copied to clipboard!');
};

window.executeBase64Jwt = async function(action = 'inspect') {
  const input = document.getElementById('jwt-input')?.value.trim();
  const resArea = document.getElementById('jwt-results-area');

  if (!input) { toast.warning('Please enter input text'); return; }

  if (resArea) {
    resArea.style.display = 'block';
    resArea.innerHTML = `<div class="flex-center p-6"><div class="spinner"></div></div>`;
  }

  try {
    const res = await toolsApi.base64Jwt({ input, action });

    if (res.type === 'jwt') {
      window.toolsState.lastOutput = `[JWT TOKEN INSPECTION]\nAlg: ${res.signature_algorithm}\nExpires: ${res.expires_at || '-'}\nIssued: ${res.issued_at || '-'}\nHeader:\n${JSON.stringify(res.header, null, 2)}\nPayload:\n${JSON.stringify(res.payload, null, 2)}`;

      resArea.innerHTML = `
        <div class="card mb-4" style="border:1px solid rgba(99,102,241,0.25)">
          <div class="card-header py-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="badge badge-info">JSON Web Token (JWT)</span>
              <span class="badge ${res.is_expired ? 'badge-danger' : 'badge-success'}">${res.is_expired ? 'Expired Token' : 'Active Token'}</span>
            </div>
            <button class="btn btn-secondary btn-xs" onclick="copyLastOutput()">Copy Log</button>
          </div>
          <div class="card-body">
            <div class="grid-3 mb-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;background:var(--bg-input);padding:0.75rem;border-radius:6px">
              <div><span class="text-xs text-muted">Algorithm:</span><div class="text-xs font-bold text-accent">${escHtml(res.signature_algorithm)}</div></div>
              <div><span class="text-xs text-muted">Issued At (iat):</span><div class="text-xs font-semibold">${res.issued_at || '-'}</div></div>
              <div><span class="text-xs text-muted">Expires At (exp):</span><div class="text-xs font-semibold ${res.is_expired ? 'text-danger' : 'text-success'}">${res.expires_at || '-'}</div></div>
            </div>

            <div class="grid-2" style="display:grid;grid-template-columns:1fr 2fr;gap:0.75rem">
              <div>
                <div class="text-xs font-bold text-muted mb-1">HEADER:</div>
                <pre style="background:#05070f;color:#38bdf8;padding:0.75rem;border-radius:6px;font-size:0.75rem;overflow-x:auto">${escHtml(JSON.stringify(res.header, null, 2))}</pre>
              </div>
              <div>
                <div class="text-xs font-bold text-muted mb-1">PAYLOAD (CLAIMS):</div>
                <pre style="background:#05070f;color:#a5b4fc;padding:0.75rem;border-radius:6px;font-size:0.75rem;overflow-x:auto">${escHtml(JSON.stringify(res.payload, null, 2))}</pre>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      const outputText = res.encoded || res.decoded || 'Empty output';
      window.toolsState.lastOutput = outputText;

      resArea.innerHTML = `
        <div class="card mb-4">
          <div class="card-header py-2 flex items-center justify-between">
            <span class="card-title text-xs font-semibold">${action === 'encode' ? 'Base64 Encoded Result' : 'Base64 Decoded Result'}</span>
            <button class="btn btn-secondary btn-xs" onclick="copyLastOutput()">Copy Output</button>
          </div>
          <div class="card-body p-0">
            <pre style="background:#05070f;color:#34d399;padding:1rem;margin:0;font-family:'JetBrains Mono',monospace;font-size:0.8rem;line-height:1.6;border-radius:0 0 8px 8px;overflow-x:auto;white-space:pre-wrap">${escHtml(outputText)}</pre>
          </div>
        </div>
      `;
    }
  } catch(e) {
    if (resArea) {
      resArea.innerHTML = `<div class="empty-state p-4"><div class="empty-title text-danger">Error: ${escHtml(e.message)}</div></div>`;
    }
  }
};

window.executeWhoisIp = async function() {
  const query = document.getElementById('whois-query')?.value.trim();
  const btn = document.getElementById('btn-run-whois');
  const resArea = document.getElementById('whois-results-area');

  if (!query) { toast.warning('Please enter an IP or domain'); return; }

  if (btn) btn.disabled = true;
  if (resArea) {
    resArea.style.display = 'block';
    resArea.innerHTML = `<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`;
  }

  try {
    const res = await toolsApi.whoisIp({ query });
    window.toolsState.lastOutput = `[IP WHOIS / GEO: ${res.query}]\nResolved IP: ${res.resolved_ip}\nReverse DNS: ${res.reverse_dns || '-'}\nISP: ${res.isp}\nOrg: ${res.org}\nASN: ${res.as}\nLocation: ${res.city}, ${res.country}`;

    resArea.innerHTML = `
      <div class="card mb-4">
        <div class="card-header py-2 flex items-center justify-between">
          <span class="card-title text-xs font-semibold">IP Lookup Result: ${escHtml(res.query)}</span>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-xs" onclick="copyLastOutput()">Copy Log</button>
            <button class="btn btn-primary btn-xs" onclick="showAttachToolOutputModal()">Attach to Ticket</button>
          </div>
        </div>
        <div class="card-body">
          <div class="grid-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem">
            <div class="p-3" style="background:var(--bg-input);border-radius:6px">
              <span class="text-xs text-muted">IP Address:</span>
              <div class="text-sm font-bold text-accent font-mono mt-0.5">${escHtml(res.resolved_ip)}</div>
            </div>
            <div class="p-3" style="background:var(--bg-input);border-radius:6px">
              <span class="text-xs text-muted">Reverse DNS (PTR):</span>
              <div class="text-xs font-semibold text-primary mt-0.5 truncate">${escHtml(res.reverse_dns || 'No PTR record')}</div>
            </div>
            <div class="p-3" style="background:var(--bg-input);border-radius:6px">
              <span class="text-xs text-muted">Internet Service Provider (ISP):</span>
              <div class="text-xs font-bold text-primary mt-0.5">${escHtml(res.isp || '-')}</div>
            </div>
            <div class="p-3" style="background:var(--bg-input);border-radius:6px">
              <span class="text-xs text-muted">Autonomous System (ASN):</span>
              <div class="text-xs font-semibold text-primary mt-0.5">${escHtml(res.as || '-')}</div>
            </div>
            <div class="p-3" style="background:var(--bg-input);border-radius:6px">
              <span class="text-xs text-muted">Geolocation:</span>
              <div class="text-xs font-semibold text-primary mt-0.5">${escHtml(res.city ? `${res.city}, ${res.country}` : res.country)}</div>
            </div>
            <div class="p-3" style="background:var(--bg-input);border-radius:6px">
              <span class="text-xs text-muted">Timezone:</span>
              <div class="text-xs font-semibold text-primary mt-0.5">${escHtml(res.timezone || '-')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch(e) {
    if (resArea) {
      resArea.innerHTML = `<div class="empty-state p-4"><div class="empty-title text-danger">IP lookup failed: ${escHtml(e.message)}</div></div>`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.copyLastOutput = function() {
  if (!window.toolsState.lastOutput) {
    toast.info('No diagnostic log available to copy.');
    return;
  }
  window.copyToClipboard(window.toolsState.lastOutput, 'Diagnostic log copied to clipboard!');
};

// ============================================
// 3. ATTACH DIAGNOSTIC TO TICKET MODAL
// ============================================
window.showAttachToolOutputModal = async function() {
  const currentOutput = window.toolsState.lastOutput || 'No diagnostic output log recorded.';

  try {
    modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`);
    const data = await ticketsApi.list({ limit: 20 });
    const openTickets = data.tickets || [];

    modal.show(`
      <div class="modal-header">
        <span class="modal-title font-bold text-sm">Attach Diagnostics Output to Ticket</span>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Select Target Ticket *</label>
            <select class="form-control" id="attach-ticket-id">
              ${openTickets.map(t => `
                <option value="${t.id}">${escHtml(t.ticket_number)} - ${escHtml(t.title)} (${statusLabel(t.status)})</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Note Type</label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="attach-is-internal" checked>
              <span class="text-xs">Mark as Internal Note (IT team only)</span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Diagnostic Log Body *</label>
            <textarea class="form-control font-mono text-xs" id="attach-log-content" rows="6">${escHtml(currentOutput)}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="submitAttachToTicket()">Attach to Ticket Now</button>
      </div>
    `);
  } catch(e) {
    toast.error('Failed to load ticket list', e.message);
  }
};

window.submitAttachToTicket = async function() {
  const ticketId = document.getElementById('attach-ticket-id')?.value;
  const content = document.getElementById('attach-log-content')?.value.trim();
  const is_internal = !!document.getElementById('attach-is-internal')?.checked;

  if (!ticketId || !content) {
    toast.warning('Please select a ticket and ensure log is not empty');
    return;
  }

  try {
    await ticketsApi.addComment(ticketId, {
      content: `[IT Diagnostics Tool Output]\n\`\`\`\n${content}\n\`\`\``,
      is_internal,
    });
    modal.close();
    toast.success('Diagnostic log attached to ticket comment successfully!');
  } catch(e) {
    toast.error('Failed to attach to ticket', e.message);
  }
};
