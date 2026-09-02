/**
 * ITSM App - Main Application Shell
 * Handles routing, auth, toast notifications, and global state
 */

// ============================================
// GLOBAL STATE
// ============================================
window.appState = {
  user: null,
  currentPage: null,
  sseSource: null,
  unreadCount: 0,
  charts: {},
  branding: {
    app_name: 'ITSM Enterprise',
    app_subtitle: 'Service Management',
    meta_title: 'ITSM Portal - Enterprise Service Desk',
    app_version: '1.0.0',
    copyright_text: 'Made by @mdenniandrian_',
    copyright_author: '@mdenniandrian_',
    copyright_author_url: 'https://instagram.com/mdenniandrian_',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    teal_color: '#06b6d4',
  }
};

// Initialize Theme immediately
(function initTheme() {
  const savedTheme = localStorage.getItem('itsm_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

window.hexToRgba = function(hex, alpha = 1) {
  if (!hex || hex.length < 6) return `rgba(99,102,241,${alpha})`;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) || 99;
  const g = parseInt(hex.substring(2, 4), 16) || 102;
  const b = parseInt(hex.substring(4, 6), 16) || 241;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

window.updateFavicon = function(iconUrl) {
  if (!iconUrl) return;
  // Remove existing favicon links to force instant browser tab repaint across Chrome, Firefox, Safari
  const existingLinks = document.querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']");
  existingLinks.forEach(el => el.remove());

  const link = document.createElement('link');
  link.id = 'dynamic-favicon';
  link.rel = 'icon';
  if (iconUrl.startsWith('data:image/svg+xml')) {
    link.type = 'image/svg+xml';
  }
  link.href = iconUrl;
  document.head.appendChild(link);
};

window.applyBrandingTheme = function(branding) {
  if (!branding) return;
  window.appState.branding = branding;

  if (branding.meta_title) {
    document.title = branding.meta_title;
  }

  const faviconUrl = branding.favicon_url || branding.logo_url;
  if (faviconUrl) {
    window.updateFavicon(faviconUrl);
  } else {
    // Dynamically color the default SVG Shield Favicon using active Theme Primary Color
    const primaryColor = branding.theme_primary || '#6366f1';
    const dynamicSvgFavicon = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${encodeURIComponent(primaryColor)}'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/></svg>`;
    window.updateFavicon(dynamicSvgFavicon);
  }

  // Update Sidebar Brand
  if (typeof window.renderSidebarBrand === 'function') {
    window.renderSidebarBrand(branding);
  }

  // Update DOM Elements
  document.querySelectorAll('.app-brand-name').forEach(el => {
    el.textContent = branding.app_name || '';
    el.style.display = branding.app_name ? '' : 'none';
  });
  document.querySelectorAll('.app-brand-subtitle').forEach(el => {
    el.textContent = branding.app_subtitle || '';
  });
  document.querySelectorAll('.logo-text').forEach(el => {
    el.textContent = branding.app_name || '';
    el.style.display = branding.app_name ? '' : 'none';
  });
  document.querySelectorAll('.logo-subtitle').forEach(el => {
    el.textContent = branding.app_subtitle || '';
  });
  document.querySelectorAll('.app-brand-version').forEach(el => el.textContent = 'v' + (branding.app_version || '1.0.0').replace(/^v/, ''));
  document.querySelectorAll('.app-brand-copyright').forEach(el => {
    el.textContent = branding.copyright_text || 'Made by @mdenniandrian_';
    if (el.tagName === 'A' && branding.copyright_author_url) {
      el.href = branding.copyright_author_url;
    }
  });

  // Inject Theme Colors
  const primary = branding.primary_color || '#6366f1';
  const secondary = branding.secondary_color || '#8b5cf6';
  const teal = branding.teal_color || '#06b6d4';

  let styleEl = document.getElementById('custom-branding-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-branding-style';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    :root {
      --accent-primary: ${primary} !important;
      --accent-primary-hover: ${primary} !important;
      --accent-primary-glow: ${hexToRgba(primary, 0.2)} !important;
      --accent-secondary: ${secondary} !important;
      --accent-teal: ${teal} !important;
      --gradient-brand: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%) !important;
    }
    [data-theme="light"] {
      --accent-primary: ${primary} !important;
      --accent-primary-hover: ${primary} !important;
      --accent-primary-glow: ${hexToRgba(primary, 0.15)} !important;
      --accent-secondary: ${secondary} !important;
      --accent-teal: ${teal} !important;
      --gradient-brand: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%) !important;
    }
  `;
};

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('itsm_theme', next);

  toast.info(next === 'light' ? 'Mode Terang (Light Mode) Aktif' : 'Mode Gelap (Dark Mode) Aktif');

  // Redraw charts if on dashboard or KPI page
  if (appState.currentPage === 'dashboard' && typeof window.loadDashboard === 'function') {
    window.loadDashboard();
  } else if (appState.currentPage === 'kpi' && typeof window.loadKpi === 'function') {
    window.loadKpi();
  }
};

window.chartDefaults = function(type) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const isDonut = type === 'doughnut';
  const textColor = isLight ? '#475569' : '#cbd5e1';
  const labelColor = isLight ? '#334155' : '#e2e8f0';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
  const tooltipBg = isLight ? '#ffffff' : '#1e293b';
  const tooltipBorder = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)';
  const tooltipTitle = isLight ? '#0f172a' : '#f8fafc';

  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = textColor;
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    color: textColor,
    plugins: {
      legend: {
        position: isDonut ? 'right' : 'bottom',
        labels: {
          color: labelColor,
          fontColor: labelColor,
          boxWidth: 12,
          padding: 16,
          font: { family: "'Plus Jakarta Sans', Inter, sans-serif", size: 12, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: tooltipTitle,
        bodyColor: textColor,
        padding: 12,
        titleFont: { family: "'Plus Jakarta Sans', Inter, sans-serif", weight: 'bold' },
        bodyFont: { family: "'Plus Jakarta Sans', Inter, sans-serif" }
      }
    },
    scales: isDonut ? undefined : {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', Inter, sans-serif", size: 11 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', Inter, sans-serif", size: 11 } }
      }
    }
  };
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const token = localStorage.getItem('itsm_token');
  const userJson = localStorage.getItem('itsm_user');

  if (!token || !userJson) {
    window.location.href = '/';
    return;
  }

  appState.user = JSON.parse(userJson);

  // Load Branding Settings asynchronously
  try {
    const res = await brandingApi.get();
    if (res && res.branding) {
      applyBrandingTheme(res.branding);
    }
  } catch(e) {}

  // Render app shell
  renderAppShell();

  // Setup topbar user
  renderTopbarUser();

  // Setup navigation
  setupNavigation();

  // Load initial page
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigateTo(hash);

  // Start SSE notifications
  startSSE();

  // Load notification count
  loadNotifCount();

  // Mobile sidebar toggle & overlay
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    toggleMobileSidebar();
  });

  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    toggleMobileSidebar(false);
  });
});

window.toggleMobileSidebar = function(open) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  const shouldOpen = open !== undefined ? open : !sidebar.classList.contains('mobile-open');
  if (shouldOpen) {
    sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
  } else {
    sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
  }
};

window.renderSidebarBrand = function(branding) {
  const container = document.getElementById('sidebar-brand-container');
  if (!container) return;

  const b = branding || window.appState.branding || {};
  const logoUrl = b.logo_url;
  const appName = (b.app_name && typeof b.app_name === 'string') ? b.app_name.trim() : '';
  const appSubtitle = (b.app_subtitle && typeof b.app_subtitle === 'string') ? b.app_subtitle.trim() : '';
  const appVersion = b.app_version ? String(b.app_version).trim().replace(/^v/, '') : '1.0.0';

  if (logoUrl) {
    // Custom Image Logo (Horizontal banner or icon)
    container.innerHTML = `
      <div class="logo-brand logo-brand-custom">
        <div style="width:100%;max-width:100%;display:flex;align-items:center;min-width:0">
          <img src="${escHtml(logoUrl)}" alt="Logo" class="brand-logo-img">
        </div>
        ${(appName || appSubtitle) ? `
          <div style="display:flex;flex-direction:column;gap:1px;width:100%;min-width:0;margin-top:2px">
            ${appName ? `<div class="logo-text" style="font-weight:700;font-size:0.95rem;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(appName)}</div>` : ''}
            <div class="flex items-center gap-1.5 flex-wrap" style="margin-top:1px">
              ${appSubtitle ? `<span class="logo-subtitle" style="font-size:0.65rem;color:var(--text-muted);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(appSubtitle)}</span>` : ''}
              ${appVersion ? `<span class="badge badge-secondary app-brand-version" style="font-size:0.6rem;padding:0px 5px">v${escHtml(appVersion)}</span>` : ''}
            </div>
          </div>
        ` : `
          <div class="flex items-center gap-1.5" style="margin-top:2px">
            ${appVersion ? `<span class="badge badge-secondary app-brand-version" style="font-size:0.6rem;padding:0px 5px">v${escHtml(appVersion)}</span>` : ''}
          </div>
        `}
      </div>
    `;
  } else {
    // Default SVG Shield Icon + Text + Version
    const displayName = appName || 'ITSM Enterprise';
    const displaySubtitle = appSubtitle || 'Service Management';
    container.innerHTML = `
      <div class="logo-brand" style="display:flex;align-items:center;gap:0.75rem;width:100%;min-width:0">
        <div class="logo-icon" style="background:var(--gradient-brand);color:white;width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="logo-text-wrap" style="flex:1;min-width:0;overflow:hidden">
          <div class="logo-text" style="font-weight:700;font-size:1.02rem;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(displayName)}</div>
          <div class="flex items-center gap-1.5" style="margin-top:2px">
            ${displaySubtitle ? `<div class="logo-subtitle" style="font-size:0.65rem;color:var(--text-muted);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(displaySubtitle)}</div>` : ''}
            ${appVersion ? `<span class="badge badge-secondary app-brand-version" style="font-size:0.6rem;padding:0px 5px">v${escHtml(appVersion)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
};

// ============================================
// RENDER APP SHELL
// ============================================
function renderAppShell() {
  const user = appState.user;
  const isAdmin = ['admin', 'manager'].includes(user.role);
  const isAgent = ['admin', 'manager', 'agent'].includes(user.role);

  document.getElementById('app-root').innerHTML = `
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo" id="sidebar-brand-container">
        <!-- Rendered by renderSidebarBrand -->
      </div>

      <nav class="sidebar-nav" id="sidebar-nav">
        <div class="nav-section-label">Main Menu</div>
        <button class="nav-item" data-page="dashboard" id="nav-dashboard">
          <span class="nav-icon">${renderIcon('dashboard')}</span>
          <span>Dashboard</span>
        </button>
        <button class="nav-item" data-page="tickets" id="nav-tickets">
          <span class="nav-icon">${renderIcon('ticket')}</span>
          <span>Tickets</span>
          <span class="nav-badge" id="open-count" style="display:none"></span>
        </button>
        <button class="nav-item" data-page="new-ticket" id="nav-new-ticket">
          <span class="nav-icon">${renderIcon('plus')}</span>
          <span>Create Ticket</span>
        </button>
        <button class="nav-item" data-page="services" id="nav-services">
          <span class="nav-icon">${renderIcon('catalog')}</span>
          <span>Service Catalog</span>
        </button>

        <div class="nav-section-label">Knowledge</div>
        <button class="nav-item" data-page="knowledge" id="nav-knowledge">
          <span class="nav-icon">${renderIcon('book')}</span>
          <span>Knowledge Base</span>
        </button>

        ${isAgent ? `
        <div class="nav-section-label">IT Operations & RMM</div>
        <button class="nav-item" data-page="kpi" id="nav-kpi">
          <span class="nav-icon">${renderIcon('kpi')}</span>
          <span>KPI & SLA Analytics</span>
        </button>
        <button class="nav-item" data-page="devices" id="nav-devices">
          <span class="nav-icon">${renderIcon('devices')}</span>
          <span>Device Monitoring</span>
        </button>
        <button class="nav-item" data-page="tools" id="nav-tools">
          <span class="nav-icon">${renderIcon('tools')}</span>
          <span>Diagnostics & Tools</span>
        </button>
        <button class="nav-item" data-page="changes" id="nav-changes">
          <span class="nav-icon">${renderIcon('changes')}</span>
          <span>Change Management</span>
        </button>
        <button class="nav-item" data-page="problems" id="nav-problems">
          <span class="nav-icon">${renderIcon('problems')}</span>
          <span>Problem Management</span>
        </button>
        <button class="nav-item" data-page="assets" id="nav-assets">
          <span class="nav-icon">${renderIcon('assets')}</span>
          <span>Asset Inventory</span>
        </button>
        ` : ''}

        ${isAdmin ? `
        <div class="nav-section-label">Administration</div>
        <button class="nav-item" data-page="users" id="nav-users">
          <span class="nav-icon">${renderIcon('users')}</span>
          <span>User Management</span>
        </button>
        <button class="nav-item" data-page="branding" id="nav-branding">
          <span class="nav-icon">${renderIcon('sparkles')}</span>
          <span>Brand & Theme Studio</span>
        </button>
        <button class="nav-item" data-page="addons" id="nav-addons">
          <span class="nav-icon">${renderIcon('addons')}</span>
          <span>Add-ons & Integrations</span>
        </button>
        <button class="nav-item" data-page="audit" id="nav-audit">
          <span class="nav-icon">${renderIcon('activity')}</span>
          <span>Audit & Security Logs</span>
        </button>
        ` : ''}

        <div class="nav-section-label">Account</div>
        <button class="nav-item" data-page="profile" id="nav-profile">
          <span class="nav-icon">${renderIcon('profile')}</span>
          <span>My Profile</span>
        </button>

        <div class="nav-section-label">Help & Docs</div>
        <button class="nav-item" data-page="guide" id="nav-guide">
          <span class="nav-icon">${renderIcon('book')}</span>
          <span>System Features Guide</span>
        </button>
      </nav>

      <div class="sidebar-footer" style="padding:0.75rem 0.85rem">
        <div class="user-profile-mini mb-2" onclick="navigateTo('profile')">
          <div class="avatar">${getInitials(user.name)}</div>
          <div class="user-info-mini">
            <div class="user-name-mini">${escHtml(user.name)}</div>
            <div class="user-role-mini">${user.role}</div>
          </div>
          <span style="color:var(--text-muted);display:flex;align-items:center">${renderIcon('profile')}</span>
        </div>
        <div class="pt-2" style="border-top:1px solid var(--border-primary);font-size:0.68rem;color:var(--text-muted);text-align:center;line-height:1.4">
          ${appState.branding?.app_name ? `<div class="app-brand-name font-semibold" style="color:var(--text-secondary);font-size:0.72rem;margin-bottom:2px">${escHtml(appState.branding?.app_name)}</div>` : ''}
          <div>
            <a href="${escHtml(appState.branding?.copyright_author_url || 'https://instagram.com/mdenniandrian_')}" target="_blank" rel="noopener noreferrer" class="app-brand-copyright" style="color:var(--accent-primary);text-decoration:none;font-weight:600">
              ${escHtml(appState.branding?.copyright_text || 'Made by @mdenniandrian_')}
            </a>
          </div>
        </div>
      </div>
    </aside>

    <!-- Sidebar Overlay for Mobile Backdrop -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <!-- Topbar -->
    <header class="topbar" id="topbar">
      <button class="icon-btn" id="mobile-menu-btn" title="Toggle Navigation Menu" aria-label="Toggle Navigation">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>
      <div class="topbar-title" id="topbar-title" style="font-weight:600;font-size:0.95rem">Dashboard</div>

      <div class="topbar-search" id="topbar-search-wrap">
        <span class="topbar-search-icon">${renderIcon('search')}</span>
        <input type="text" id="global-search" placeholder="Search tickets, articles, hostnames..." autocomplete="off">
      </div>

      <div class="topbar-actions">
        <!-- Theme Toggle Switch -->
        <button class="theme-switch-btn" id="theme-switch-btn" onclick="toggleTheme()" title="Toggle Theme (Light / Dark Mode)" aria-label="Toggle Theme">
          <span class="theme-switch-icon icon-moon" title="Dark Mode">${renderIcon('moon')}</span>
          <span class="theme-switch-icon icon-sun" title="Light Mode">${renderIcon('sun')}</span>
          <div class="theme-switch-thumb"></div>
        </button>

        <button class="icon-btn" id="notif-btn" title="Notifications">
          ${renderIcon('bell')}
          <span class="notif-dot" id="notif-dot" style="display:none"></span>
        </button>
        <div class="avatar" style="cursor:pointer" onclick="navigateTo('profile')" title="View Profile">${getInitials(user.name)}</div>
        <button class="icon-btn" id="logout-btn" title="Sign Out">
          ${renderIcon('logout')}
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="main-content" id="main-content">
      <div id="page-content">
        <div class="flex-center" style="height:60vh">
          <div class="spinner spinner-lg"></div>
        </div>
      </div>
    </main>

    <!-- Notification Panel -->
    <div class="notif-panel" id="notif-panel">
      <div class="card-header">
        <div class="flex items-center gap-2">
          ${renderIcon('bell')}
          <span class="card-title text-sm font-semibold">Notifications</span>
        </div>
        <button class="btn btn-sm btn-ghost" id="mark-all-read-btn">Mark All Read</button>
      </div>
      <div style="flex:1;overflow-y:auto" id="notif-list">
        <div class="flex-center p-6"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- Toast Container -->
    <div class="toast-container" id="toast-container"></div>

    <!-- Modal Container -->
    <div id="modal-container"></div>
  `;

  // Setup logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Setup notification panel toggle
  document.getElementById('notif-btn').addEventListener('click', toggleNotifPanel);
  document.getElementById('mark-all-read-btn').addEventListener('click', markAllNotifRead);

  // Global search
  document.getElementById('global-search').addEventListener('input', debounce(handleGlobalSearch, 400));

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const btn = document.getElementById('notif-btn');
    if (panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  // Render sidebar logo & version
  renderSidebarBrand(appState.branding);

  // Load open ticket count for badge
  loadOpenTicketCount();
}

function renderTopbarUser() {}

// ============================================
// NAVIGATION / ROUTING
// ============================================
function setupNavigation() {
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-page]');
    if (navItem) {
      const page = navItem.dataset.page;
      navigateTo(page);
      if (typeof window.toggleMobileSidebar === 'function') {
        window.toggleMobileSidebar(false);
      }
    }
  });

  window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1) || 'dashboard';
    loadPage(page);
    updateActiveNav(page);
  });
}

function navigateTo(page, params = {}) {
  const currentHash = window.location.hash.slice(1);
  if (currentHash === page) {
    loadPage(page, params);
  } else {
    window.location.hash = page;
  }
}

function updateActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${page}`);
  if (activeNav) activeNav.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    kpi: 'KPI & SLA Analytics',
    devices: 'Endpoint & Server Monitoring',
    tools: 'IT Diagnostics & Troubleshooting Tools',
    tickets: 'Ticket Management',
    'new-ticket': 'Create New Ticket',
    services: 'IT Service Catalog',
    changes: 'Change Management & CAB',
    problems: 'Problem Management & RCA',
    knowledge: 'Knowledge Base',
    assets: 'Asset Management',
    users: 'User Management',
    branding: 'Brand & UI Theme Studio',
    addons: 'Add-ons & Integrations',
    profile: 'My Profile',
    guide: 'System Features & Capabilities Guide',
  };

  const title = document.getElementById('topbar-title');
  if (title) title.textContent = titles[page] || page;
}

function loadPage(page, params = {}) {
  const content = document.getElementById('page-content');
  if (!content) return;

  appState.currentPage = page;

  // Destroy all old charts safely
  if (typeof Chart !== 'undefined' && Chart.instances) {
    Object.keys(Chart.instances).forEach(key => {
      try { Chart.instances[key]?.destroy(); } catch (e) {}
    });
  }
  Object.values(appState.charts).forEach(c => { try { c?.destroy(); } catch(e){} });
  appState.charts = {};

  const pageLoaders = {
    dashboard: () => loadDashboard(),
    kpi: () => loadKpi(),
    devices: () => loadDevices(),
    tools: () => loadTools(),
    tickets: () => loadTickets(params),
    'new-ticket': () => loadNewTicket(),
    services: () => loadServices(),
    changes: () => loadChanges(),
    problems: () => loadProblems(),
    knowledge: () => loadKnowledge(),
    assets: () => loadAssets(),
    users: () => loadUsers(),
    branding: () => typeof window.loadBranding === 'function' && window.loadBranding(),
    addons: () => loadAddons(),
    audit: () => typeof window.loadAuditLogs === 'function' && window.loadAuditLogs(),
    profile: () => loadProfile(),
    guide: () => typeof window.loadSystemGuide === 'function' ? window.loadSystemGuide() : null,
  };

  if (page.startsWith('ticket-')) {
    const id = page.replace('ticket-', '');
    loadTicketDetail(id);
    return;
  }

  if (page.startsWith('article-')) {
    const id = page.replace('article-', '');
    loadArticleDetail(id);
    return;
  }

  if (pageLoaders[page]) {
    pageLoaders[page]();
  } else {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon text-muted">${renderIcon('dashboard')}</div>
        <div class="empty-title">Page Not Found</div>
        <div class="empty-desc">The requested page "${page}" is not available</div>
        <button class="btn btn-primary mt-4" onclick="navigateTo('dashboard')">Back to Dashboard</button>
      </div>
    `;
  }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
window.toast = {
  show(title, msg = '', type = 'info', duration = 4000) {
    const icons = {
      success: renderIcon('check'),
      error: renderIcon('problems'),
      warning: renderIcon('clock'),
      info: renderIcon('sparkles')
    };
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.id = id;
    el.innerHTML = `
      <div class="toast-icon" style="display:flex;align-items:center">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title font-semibold text-xs">${escHtml(title)}</div>
        ${msg ? `<div class="toast-msg text-xs text-muted mt-0.5">${escHtml(msg)}</div>` : ''}
      </div>
      <button onclick="removeToast('${id}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0.25rem;font-size:0.875rem;margin-left:0.5rem;">✕</button>
    `;
    container.appendChild(el);
    setTimeout(() => removeToast(id), duration);
  },
  success: (t, m) => toast.show(t, m, 'success'),
  error: (t, m) => toast.show(t, m, 'error'),
  warning: (t, m) => toast.show(t, m, 'warning'),
  info: (t, m) => toast.show(t, m, 'info'),
};

window.removeToast = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  }
};

// ============================================
// MODAL SYSTEM
// ============================================
window.modal = {
  show(content, options = {}) {
    const size = options.size || '';
    const container = document.getElementById('modal-container');
    const id = 'modal-' + Date.now();
    container.innerHTML = `
      <div class="modal-overlay active" id="${id}-overlay">
        <div class="modal ${size}" id="${id}">
          ${content}
        </div>
      </div>
    `;

    document.getElementById(`${id}-overlay`).addEventListener('click', (e) => {
      if (e.target.id === `${id}-overlay`) modal.close();
    });

    return id;
  },

  close() {
    const container = document.getElementById('modal-container');
    const overlay = container.querySelector('.modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => { container.innerHTML = ''; }, 300);
    }
  },

  confirm(title, msg, onConfirm, type = 'danger') {
    const id = modal.show(`
      <div class="modal-header">
        <span class="modal-title">${escHtml(title)}</span>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <p>${escHtml(msg)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-${type}" id="confirm-btn">Confirm</button>
      </div>
    `, { size: 'modal-sm' });

    document.getElementById('confirm-btn').addEventListener('click', () => {
      modal.close();
      onConfirm();
    });
  }
};

// ============================================
// REAL-TIME / POLLING NOTIFICATIONS
// ============================================
function startSSE() {
  if (window._notifInterval) clearInterval(window._notifInterval);
  window._notifInterval = setInterval(() => {
    loadNotifCount();
  }, 15000);
}

// ============================================
// NOTIFICATION PANEL
// ============================================
async function loadNotifCount() {
  try {
    const data = await notificationsApi.list({ limit: 1, unread_only: 'true' });
    appState.unreadCount = data.unread_count || 0;
    updateNotifBadge();
  } catch(e) {}
}

function updateNotifBadge() {
  const dot = document.getElementById('notif-dot');
  if (!dot) return;
  dot.style.display = appState.unreadCount > 0 ? 'block' : 'none';
}

async function loadNotifPanel() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  try {
    const data = await notificationsApi.list({ limit: 30 });
    if (!data.notifications.length) {
      list.innerHTML = `
        <div class="empty-state" style="padding:3rem 1rem">
          <div class="empty-icon text-muted">${renderIcon('bell')}</div>
          <div class="empty-title text-sm">No new notifications</div>
        </div>
      `;
      return;
    }

    list.innerHTML = data.notifications.map(n => `
      <div class="notif-item ${!n.is_read ? 'unread' : ''}" data-id="${n.id}" onclick="handleNotifClick(${n.id}, ${n.ticket_id})">
        <div class="notif-icon" style="background:${notifTypeColor(n.type)};display:flex;align-items:center;justify-content:center">${notifTypeIcon(n.type)}</div>
        <div class="notif-content">
          <div class="notif-title text-xs font-semibold">${escHtml(n.title)}</div>
          <div class="notif-msg text-xs text-muted mt-0.5">${escHtml(n.message)}</div>
          ${n.ticket_number ? `<div class="notif-msg text-accent text-xs mt-0.5 font-mono">#${n.ticket_number}</div>` : ''}
          <div class="notif-time text-xs text-muted mt-1">${timeAgo(n.created_at)}</div>
        </div>
        ${!n.is_read ? '<div style="width:6px;height:6px;background:var(--accent-primary);border-radius:50%;flex-shrink:0;margin-top:0.5rem"></div>' : ''}
      </div>
    `).join('');
  } catch(e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-desc text-xs text-muted">Failed to load notifications</div></div>';
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (isOpen) {
    loadNotifPanel();
    // Reset count
    appState.unreadCount = 0;
    updateNotifBadge();
  }
}

async function handleNotifClick(id, ticketId) {
  await notificationsApi.markRead(id).catch(() => {});
  document.querySelector(`.notif-item[data-id="${id}"]`)?.classList.remove('unread');
  if (ticketId) {
    document.getElementById('notif-panel').classList.remove('open');
    navigateTo(`ticket-${ticketId}`);
  }
}

async function markAllNotifRead() {
  await notificationsApi.markAllRead().catch(() => {});
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  appState.unreadCount = 0;
  updateNotifBadge();
  toast.success('All notifications marked as read');
}

function notifTypeColor(type) {
  const colors = { success: 'rgba(16,185,129,0.12)', error: 'rgba(244,63,94,0.12)', warning: 'rgba(245,158,11,0.12)', info: 'rgba(99,102,241,0.12)' };
  return colors[type] || colors.info;
}

function notifTypeIcon(type) {
  const icons = {
    success: renderIcon('check'),
    error: renderIcon('problems'),
    warning: renderIcon('clock'),
    info: renderIcon('bell')
  };
  return icons[type] || icons.info;
}

// ============================================
// GLOBAL SEARCH
// ============================================
async function handleGlobalSearch(e) {
  const q = e.target.value.trim();
  if (!q) return;
  navigateTo('tickets', { search: q });
}

// ============================================
// LOAD OPEN TICKET COUNT
// ============================================
async function loadOpenTicketCount() {
  try {
    const data = await dashboardApi.stats();
    const badge = document.getElementById('open-count');
    if (badge && data.open > 0) {
      badge.textContent = data.open;
      badge.style.display = 'inline-flex';
    }
  } catch(e) {}
}

// ============================================
// LOGOUT
// ============================================
function logout() {
  modal.confirm('Sign Out', 'Are you sure you want to sign out of the system?', () => {
    if (appState.sseSource) appState.sseSource.close();
    localStorage.removeItem('itsm_token');
    localStorage.removeItem('itsm_user');
    window.location.href = '/';
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
window.escHtml = function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

window.getInitials = function(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

window.timeAgo = function(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

window.formatDate = function(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

window.formatDateShort = function(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

window.debounce = function(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
};

window.statusLabel = function(status) {
  const labels = { open: 'Open', in_progress: 'In Progress', pending: 'Pending', resolved: 'Resolved', closed: 'Closed' };
  return labels[status] || status;
};

window.priorityLabel = function(p) {
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return labels[p] || p;
};

window.categoryLabel = function(c) {
  const labels = { incident: 'Incident', service_request: 'Service Request', problem: 'Problem', change_request: 'Change Request' };
  return labels[c] || c;
};

window.priorityIcon = function(p) {
  return '';
};

window.statusIcon = function(s) {
  return '';
};

window.assetTypeIcon = function(type) {
  return '';
};

window.formatCurrency = function(val) {
  if (!val) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
};

window.getSLAStatus = function(dueStr, breached) {
  if (breached) return { label: 'SLA Breach', class: 'sla-breach' };
  if (!dueStr) return null;
  const due = new Date(dueStr);
  const now = new Date();
  const diffHrs = (due - now) / 3600000;
  if (diffHrs < 0) return { label: 'Breached', class: 'sla-breach' };
  if (diffHrs < 2) return { label: `${Math.round(diffHrs * 60)}m remaining`, class: 'sla-warning' };
  if (diffHrs < 8) return { label: `${Math.round(diffHrs)}h remaining`, class: 'sla-warning' };
  return { label: `${Math.round(diffHrs)}h remaining`, class: 'sla-ok' };
};

// ============================================
// SIMPLE MARKDOWN RENDERER
// ============================================
window.renderMarkdown = function(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\| (.+) \|$/gm, (m, row) => {
      const cells = row.split(' | ').map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/gs, m => `<table>${m}</table>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[a-z])/gm, '')
    .replace(/<p><\/p>/g, '');
};

// ============================================
// UNIVERSAL CLIPBOARD COPY HELPER (HTTP & HTTPS)
// ============================================
window.copyToClipboard = function(text, successMessage = 'Copied to clipboard!') {
  if (!text) return;

  // 1. Try modern async Clipboard API if available in secure context
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof toast !== 'undefined') toast.success(successMessage);
    }).catch(() => {
      fallbackCopyText(text, successMessage);
    });
    return;
  }

  // 2. Universal fallback using hidden textarea (Works 100% on HTTP and all browsers)
  fallbackCopyText(text, successMessage);
};

function fallbackCopyText(text, successMessage) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      if (typeof toast !== 'undefined') toast.success(successMessage);
    } else {
      window.prompt('Copy to clipboard (Ctrl+C / Cmd+C, Enter):', text);
    }
  } catch (err) {
    window.prompt('Copy to clipboard (Ctrl+C / Cmd+C, Enter):', text);
  }
}

window.copyElementText = function(elementId, successMessage = 'Command copied to clipboard!') {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.innerText || el.textContent;
  window.copyToClipboard(text.trim(), successMessage);
};

window.copyCommand = function(text) {
  window.copyToClipboard(text, 'Command copied to clipboard!');
};
