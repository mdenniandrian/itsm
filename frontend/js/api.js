/**
 * ITSM API Client
 * Centralized HTTP client with auth header injection
 */

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('itsm_token');
  }

  getHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async request(method, path, body = null, params = {}) {
    let url = this.baseUrl + path;
    const qs = new URLSearchParams(params).toString();
    if (qs) url += '?' + qs;

    const options = {
      method,
      headers: this.getHeaders(),
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      localStorage.removeItem('itsm_token');
      localStorage.removeItem('itsm_user');
      window.location.href = '/';
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  get(path, params = {}) { return this.request('GET', path, null, params); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  delete(path) { return this.request('DELETE', path); }
}

window.api = new ApiClient();

// --- Auth ---
window.authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// --- Tickets ---
window.ticketsApi = {
  list: (params) => api.get('/tickets', params),
  get: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  delete: (id) => api.delete(`/tickets/${id}`),
  addComment: (id, data) => api.post(`/tickets/${id}/comments`, data),
  history: (id) => api.get(`/tickets/${id}/history`),
  rate: (id, data) => api.post(`/tickets/${id}/rate`, data),
  suggest: (query) => api.get('/tickets/suggest/knowledge', { query }),
};

// --- Users ---
window.usersApi = {
  list: (params) => api.get('/users', params),
  agents: () => api.get('/users/agents/list'),
  get: (id) => api.get(`/users/${id}`),
  checkEmail: (email, excludeUserId) => api.get('/users/check-email', { email, exclude_user_id: excludeUserId }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleItSupport: (id, data) => api.put(`/users/${id}/toggle-it-support`, data),
  toggleActive: (id, data) => api.put(`/users/${id}/toggle-active`, data),
  getSessions: (id) => api.get(`/users/${id}/sessions`),
  clearSessions: (id) => api.post(`/users/${id}/clear-sessions`),
  deleteSession: (id, sessionId) => api.delete(`/users/${id}/sessions/${sessionId}`),
  resendVerification: (id) => api.post(`/users/${id}/resend-verification`),
  delete: (id) => api.delete(`/users/${id}`),
};

// --- Dashboard ---
window.dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  byStatus: () => api.get('/dashboard/by-status'),
  byPriority: () => api.get('/dashboard/by-priority'),
  byCategory: () => api.get('/dashboard/by-category'),
  trend: (days = 14) => api.get('/dashboard/trend', { days }),
  agentPerformance: () => api.get('/dashboard/agent-performance'),
  recentTickets: () => api.get('/dashboard/recent-tickets'),
  slaBreaches: () => api.get('/dashboard/sla-breaches'),
};

// --- Notifications ---
window.notificationsApi = {
  list: (params) => api.get('/notifications', params),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// --- Knowledge Base ---
window.knowledgeApi = {
  list: (params) => api.get('/knowledge', params),
  get: (id) => api.get(`/knowledge/${id}`),
  create: (data) => api.post('/knowledge', data),
  update: (id, data) => api.put(`/knowledge/${id}`, data),
  delete: (id) => api.delete(`/knowledge/${id}`),
  helpful: (id) => api.post(`/knowledge/${id}/helpful`),
};

// --- Assets ---
window.assetsApi = {
  list: (params) => api.get('/assets', params),
  get: (id) => api.get(`/assets/${id}`),
  stats: () => api.get('/assets/stats/summary'),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
};

// --- KPI Monitoring ---
window.kpiApi = {
  summary: () => api.get('/kpi/summary'),
  trends: (days = 14) => api.get('/kpi/trends', { days }),
  agents: () => api.get('/kpi/agents'),
  departments: () => api.get('/kpi/departments'),
};

// --- Device Monitoring (RMM) ---
window.devicesApi = {
  list: (params) => api.get('/devices', params),
  stats: () => api.get('/devices/stats/summary'),
  get: (id) => api.get(`/devices/${id}`),
  liveFrame: (id) => api.get(`/devices/${id}/live-frame`),
  update: (id, data) => api.put(`/devices/${id}`, data),
  delete: (id) => api.delete(`/devices/${id}`),
  sendCommand: (id, data) => api.post(`/devices/${id}/commands`, data),
  captureScreen: (id) => api.post(`/devices/${id}/capture-screen`),
};

// --- Add-ons & Integrations ---
window.addonsApi = {
  list: () => api.get('/addons'),
  get: (key) => api.get(`/addons/${key}`),
  update: (key, data) => api.put(`/addons/${key}`, data),
  test: (key, data = {}) => api.post(`/addons/${key}/test`, data),
};

// --- Change Management (ITIL 4) ---
window.changesApi = {
  list: (params) => api.get('/changes', params),
  stats: () => api.get('/changes/stats/summary'),
  get: (id) => api.get(`/changes/${id}`),
  create: (data) => api.post('/changes', data),
  updateStatus: (id, data) => api.put(`/changes/${id}/status`, data),
  decideApproval: (id, data) => api.put(`/changes/${id}/approval`, data),
};

// --- Service Catalog & Requests ---
window.servicesApi = {
  catalog: () => api.get('/services/catalog'),
  get: (id) => api.get(`/services/catalog/${id}`),
  create: (data) => api.post('/services/catalog', data),
  update: (id, data) => api.put(`/services/catalog/${id}`, data),
  delete: (id) => api.delete(`/services/catalog/${id}`),
  submit: (data) => api.post('/services/request', data),
};

// --- Problem Management & RCA ---
window.problemsApi = {
  list: (params) => api.get('/problems', params),
  stats: () => api.get('/problems/stats/summary'),
  get: (id) => api.get(`/problems/${id}`),
  create: (data) => api.post('/problems', data),
  update: (id, data) => api.put(`/problems/${id}`, data),
  linkTickets: (id, ticket_ids) => api.post(`/problems/${id}/link-tickets`, { ticket_ids }),
  resolveAll: (id, data) => api.post(`/problems/${id}/resolve-all`, data),
};

// --- Reports & Export ---
window.reportsApi = {
  downloadTicketsCsv: () => {
    window.location.href = '/api/reports/tickets/export';
  },
  downloadKpiCsv: () => {
    window.location.href = '/api/reports/kpi/export';
  },
};

// --- IT Diagnostics & Troubleshooting Tools ---
window.toolsApi = {
  interfaces: () => api.get('/tools/interfaces'),
  ping: (data) => api.post('/tools/ping', data),
  portCheck: (data) => api.post('/tools/port-check', data),
  traceroute: (data) => api.post('/tools/traceroute', data),
  dnsLookup: (data) => api.post('/tools/dns-lookup', data),
  sslCheck: (data) => api.post('/tools/ssl-check', data),
  whoisIp: (data) => api.post('/tools/whois-ip', data),
  passwordGen: (data) => api.post('/tools/password-gen', data),
  base64Jwt: (data) => api.post('/tools/base64-jwt', data),
};

// --- Notification Templates Customizer API ---
window.notificationTemplatesApi = {
  list: () => api.get('/notification-templates'),
  get: (id) => api.get(`/notification-templates/${id}`),
  update: (id, data) => api.put(`/notification-templates/${id}`, data),
  preview: (id, data) => api.post(`/notification-templates/${id}/preview`, data),
  reset: (id) => api.post(`/notification-templates/${id}/reset`),
};

// --- Branding, Company Profile & Theme Customizer API ---
window.brandingApi = {
  get: () => api.get('/branding'),
  update: (data) => api.put('/branding', data),
  uploadLogo: (formData) => {
    const token = localStorage.getItem('itsm_token');
    return fetch('/api/branding/logo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.message || 'Failed to upload logo');
      return d;
    });
  },
  uploadFavicon: (formData) => {
    const token = localStorage.getItem('itsm_token');
    return fetch('/api/branding/favicon', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.message || 'Failed to upload favicon');
      return d;
    });
  },
  reset: () => api.post('/branding/reset'),
};

// --- Enterprise Audit & Security Logging API ---
window.auditApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/audit-logs${qs ? '?' + qs : ''}`);
  },
  stats: () => api.get('/audit-logs/stats/summary'),
  get: (id) => api.get(`/audit-logs/${id}`),
  exportUrl: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `/api/audit-logs/export/csv${qs ? '?' + qs : ''}`;
  },
};

