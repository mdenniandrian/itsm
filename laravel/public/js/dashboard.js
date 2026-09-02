function cleanAllCharts() {
  if (typeof Chart !== 'undefined') {
    ['trend-chart', 'status-chart', 'priority-chart', 'category-chart'].forEach(id => {
      try {
        const c = Chart.getChart(id);
        if (c) c.destroy();
      } catch (e) {}
    });

    if (Chart.instances) {
      Object.keys(Chart.instances).forEach(key => {
        try {
          Chart.instances[key]?.destroy();
        } catch (e) {}
      });
    }
  }

  if (window.appState && window.appState.charts) {
    Object.keys(window.appState.charts).forEach(key => {
      try {
        window.appState.charts[key]?.destroy();
      } catch (e) {}
    });
    window.appState.charts = {};
  }
}

window.loadDashboard = async function() {
  cleanAllCharts();

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Operations Dashboard</h1>
        <p class="page-subtitle">Activity overview, SLA performance metrics, and IT Service Management workload</p>
      </div>
      <button class="btn btn-primary" onclick="navigateTo('new-ticket')">
        ${renderIcon('plus')}
        <span>Create Ticket</span>
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid" id="stats-grid">
      ${[1,2,3,4].map(() => `
        <div class="stat-card">
          <div class="stat-icon skeleton" style="width:44px;height:44px;border-radius:10px"></div>
          <div class="stat-content">
            <div class="skeleton" style="width:60px;height:24px;margin-bottom:8px"></div>
            <div class="skeleton" style="width:100px;height:12px"></div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Charts Row 1 -->
    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Ticket Volume Trend (30 Days)</span>
        </div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:250px">
            <canvas id="trend-chart"></canvas>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Tickets by Status</span>
        </div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:250px">
            <canvas id="status-chart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="charts-row">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Tickets Open by Priority</span>
        </div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:220px">
            <canvas id="priority-chart"></canvas>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Tickets by Category</span>
        </div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:220px">
            <canvas id="category-chart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Row: Recent Tickets & Agent Performance -->
    <div class="dashboard-grid">
      <!-- Recent Tickets -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent Tickets</span>
          <button class="btn btn-sm btn-secondary" onclick="navigateTo('tickets')">View All</button>
        </div>
        <div class="table-wrapper" id="recent-tickets-table">
          <div class="flex-center p-6"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Agent Performance -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Support Team Performance</span>
        </div>
        <div class="card-body p-0" id="agent-perf-list">
          <div class="flex-center p-6"><div class="spinner"></div></div>
        </div>
      </div>
    </div>

    <!-- SLA Breaches Alert Card -->
    <div class="card" id="sla-breaches-card" style="display:none;border-color:rgba(244,63,94,0.3);margin-top:1.5rem">
      <div class="card-header" style="background:rgba(244,63,94,0.06)">
        <div class="flex items-center gap-2">
          <span class="text-danger" style="display:flex;align-items:center">${renderIcon('problems')}</span>
          <span class="card-title text-danger">Active SLA Breaches</span>
        </div>
        <span class="badge badge-critical" id="sla-breach-count"></span>
      </div>
      <div class="table-wrapper" id="sla-breaches-table"></div>
    </div>
  `;

  // Load data in parallel
  try {
    const [stats, trend, byStatus, byPriority, byCategory, recentTickets, agentPerf, slaBreaches] = await Promise.all([
      dashboardApi.stats(),
      dashboardApi.trend(30),
      dashboardApi.byStatus(),
      dashboardApi.byPriority(),
      dashboardApi.byCategory(),
      dashboardApi.recentTickets(),
      dashboardApi.agentPerformance(),
      dashboardApi.slaBreaches(),
    ]);

    renderStats(stats);
    try { renderTrendChart(trend); } catch (e) { console.warn('Trend chart error:', e); }
    try { renderStatusChart(byStatus); } catch (e) { console.warn('Status chart error:', e); }
    try { renderPriorityChart(byPriority); } catch (e) { console.warn('Priority chart error:', e); }
    try { renderCategoryChart(byCategory); } catch (e) { console.warn('Category chart error:', e); }
    renderRecentTickets(recentTickets);
    renderAgentPerformance(agentPerf);
    renderSLABreaches(slaBreaches);
  } catch(e) {
    toast.error('Failed to load dashboard data', e.message);
  }
};

function renderStats(stats) {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  const statItems = [
    { value: stats.open + stats.in_progress + stats.pending, label: 'Active Tickets', iconName: 'ticket', color: 'rgba(99,102,241,0.12)', iconColor: '#818cf8' },
    { value: stats.critical, label: 'Critical Tickets', iconName: 'problems', color: 'rgba(244,63,94,0.12)', iconColor: '#fb7185', alert: stats.critical > 0 },
    { value: stats.resolved_today, label: 'Resolved Today', iconName: 'check', color: 'rgba(16,185,129,0.12)', iconColor: '#34d399' },
    { value: stats.sla_breached, label: 'SLA Breaches', iconName: 'clock', color: 'rgba(245,158,11,0.12)', iconColor: '#fbbf24', alert: stats.sla_breached > 0 },
  ];

  // Only show unassigned for non-user roles
  const user = appState.user;
  if (['admin','manager','agent'].includes(user.role)) {
    statItems.splice(3, 0, { value: stats.unassigned, label: 'Unassigned Tickets', iconName: 'users', color: 'rgba(168,85,247,0.12)', iconColor: '#c084fc' });
    statItems.pop();
  }

  grid.innerHTML = statItems.map(s => `
    <div class="stat-card" ${s.alert ? 'style="border-color:rgba(244,63,94,0.3)"' : ''}>
      <div class="stat-icon" style="background:${s.color};color:${s.iconColor}">
        ${renderIcon(s.iconName)}
      </div>
      <div class="stat-content">
        <div class="stat-value" style="${s.alert && s.value > 0 ? 'color:var(--priority-critical)' : ''}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>
  `).join('');
}

function renderTrendChart(data) {
  const ctx = document.getElementById('trend-chart');
  if (!ctx) return;

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const labels = (data || []).map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  });

  const createdData = (data || []).map(d => d.created || 0);
  const resolvedData = (data || []).map(d => d.resolved || 0);
  const maxVal = Math.max(...createdData, ...resolvedData, 0);

  appState.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Created',
          data: createdData,
          borderColor: '#4f7cf8',
          backgroundColor: 'rgba(79,124,248,0.08)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#4f7cf8',
          pointRadius: 3,
        },
        {
          label: 'Resolved',
          data: resolvedData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#10b981',
          pointRadius: 3,
        }
      ]
    },
    options: {
      ...chartDefaults('line'),
      scales: {
        x: {
          grid: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)' },
          ticks: { color: isLight ? '#475569' : '#8892aa', font: { family: 'Inter', size: 11 } }
        },
        y: {
          min: 0,
          suggestedMax: Math.max(5, maxVal + 2),
          ticks: {
            stepSize: 1,
            color: isLight ? '#475569' : '#8892aa',
            font: { family: 'Inter', size: 11 }
          },
          grid: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)' }
        }
      }
    }
  });
}

function renderStatusChart(data) {
  const ctx = document.getElementById('status-chart');
  if (!ctx) return;

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const colors = { open: '#4f7cf8', in_progress: '#f59e0b', pending: '#8b5cf6', resolved: '#10b981', closed: '#6b7280' };

  const rawList = data || [];
  const total = rawList.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  const isEmpty = total === 0;

  const chartData = isEmpty ? [1] : rawList.map(d => d.count);
  const bgColors = isEmpty 
    ? [isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'] 
    : rawList.map(d => colors[d.status] || '#6b7280');

  appState.charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: rawList.map(d => `${statusLabel(d.status)} (${d.count || 0})`),
      datasets: [{
        data: chartData,
        backgroundColor: bgColors,
        borderColor: isLight ? '#ffffff' : '#141928',
        borderWidth: 3,
      }]
    },
    options: {
      ...chartDefaults('doughnut'),
      cutout: '70%',
      plugins: {
        ...chartDefaults('doughnut').plugins,
        legend: {
          position: 'right',
          labels: {
            color: isLight ? '#475569' : '#8892aa',
            boxWidth: 12,
            padding: 12,
            font: { family: 'Inter', size: 11 },
            generateLabels: () => {
              return rawList.map((d, i) => ({
                text: `${statusLabel(d.status)} (${d.count || 0})`,
                fillStyle: colors[d.status] || '#6b7280',
                strokeStyle: colors[d.status] || '#6b7280',
                hidden: false,
                index: i,
              }));
            }
          }
        },
        tooltip: {
          enabled: !isEmpty,
        }
      }
    },
    plugins: [{
      id: 'centerTextStatus',
      beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        if (!top) return;
        ctx.save();
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 18px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        ctx.fillText(String(total), centerX, centerY - 6);
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
        ctx.fillText(isEmpty ? 'No Tickets' : 'Tickets', centerX, centerY + 12);
        ctx.restore();
      }
    }]
  });
}

function renderPriorityChart(data) {
  const ctx = document.getElementById('priority-chart');
  if (!ctx) return;

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const colors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

  const rawList = data || [];
  const total = rawList.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  const isEmpty = total === 0;

  const chartData = isEmpty ? [1] : rawList.map(d => d.count);
  const bgColors = isEmpty 
    ? [isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'] 
    : rawList.map(d => colors[d.priority] || '#6b7280');

  appState.charts.priority = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: rawList.map(d => `${priorityLabel(d.priority)} (${d.count || 0})`),
      datasets: [{
        data: chartData,
        backgroundColor: bgColors,
        borderColor: isLight ? '#ffffff' : '#141928',
        borderWidth: 3,
      }]
    },
    options: {
      ...chartDefaults('doughnut'),
      cutout: '70%',
      plugins: {
        ...chartDefaults('doughnut').plugins,
        legend: {
          position: 'right',
          labels: {
            color: isLight ? '#475569' : '#8892aa',
            boxWidth: 12,
            padding: 12,
            font: { family: 'Inter', size: 11 },
            generateLabels: () => {
              return rawList.map((d, i) => ({
                text: `${priorityLabel(d.priority)} (${d.count || 0})`,
                fillStyle: colors[d.priority] || '#6b7280',
                strokeStyle: colors[d.priority] || '#6b7280',
                hidden: false,
                index: i,
              }));
            }
          }
        },
        tooltip: {
          enabled: !isEmpty,
        }
      }
    },
    plugins: [{
      id: 'centerTextPriority',
      beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        if (!top) return;
        ctx.save();
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 18px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        ctx.fillText(String(total), centerX, centerY - 6);
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
        ctx.fillText(isEmpty ? 'No Active' : 'Active', centerX, centerY + 12);
        ctx.restore();
      }
    }]
  });
}

function renderCategoryChart(data) {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const colors = { incident: '#f43f5e', service_request: '#6366f1', problem: '#f59e0b', change_request: '#10b981' };

  const rawList = data || [];
  const total = rawList.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  const isEmpty = total === 0;

  const chartData = isEmpty ? [1] : rawList.map(d => d.count);
  const bgColors = isEmpty 
    ? [isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'] 
    : rawList.map(d => colors[d.category] || '#6b7280');

  appState.charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: rawList.map(d => `${categoryLabel(d.category)} (${d.count || 0})`),
      datasets: [{
        data: chartData,
        backgroundColor: bgColors,
        borderColor: isLight ? '#ffffff' : '#141928',
        borderWidth: 3,
      }]
    },
    options: {
      ...chartDefaults('doughnut'),
      cutout: '70%',
      plugins: {
        ...chartDefaults('doughnut').plugins,
        legend: {
          position: 'right',
          labels: {
            color: isLight ? '#475569' : '#8892aa',
            boxWidth: 12,
            padding: 12,
            font: { family: 'Inter', size: 11 },
            generateLabels: () => {
              return rawList.map((d, i) => ({
                text: `${categoryLabel(d.category)} (${d.count || 0})`,
                fillStyle: colors[d.category] || '#6b7280',
                strokeStyle: colors[d.category] || '#6b7280',
                hidden: false,
                index: i,
              }));
            }
          }
        },
        tooltip: {
          enabled: !isEmpty,
        }
      }
    },
    plugins: [{
      id: 'centerTextCategory',
      beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        if (!top) return;
        ctx.save();
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 18px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        ctx.fillText(String(total), centerX, centerY - 6);
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
        ctx.fillText(isEmpty ? 'No Tickets' : 'Tickets', centerX, centerY + 12);
        ctx.restore();
      }
    }]
  });
}

function renderRecentTickets(tickets) {
  const el = document.getElementById('recent-tickets-table');
  if (!el) return;

  if (!tickets.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem"><div class="empty-icon text-muted">${renderIcon('ticket')}</div><div class="empty-title">No recent tickets</div></div>`;
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Ticket #</th>
          <th>Subject</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Requester</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${tickets.map(t => `
          <tr onclick="navigateTo('ticket-${t.id}')" style="cursor:pointer">
            <td><span class="ticket-number font-mono text-xs">${escHtml(t.ticket_number)}</span></td>
            <td><div class="ticket-title text-xs">${escHtml(t.title)}</div></td>
            <td><span class="badge badge-${t.status}">${statusLabel(t.status)}</span></td>
            <td><span class="badge badge-${t.priority}">${priorityLabel(t.priority)}</span></td>
            <td class="text-xs">${escHtml(t.requester_name || '-')}</td>
            <td class="text-xs text-muted">${timeAgo(t.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderAgentPerformance(agents) {
  const el = document.getElementById('agent-perf-list');
  if (!el) return;

  if (!agents.length) {
    el.innerHTML = '<div class="empty-state p-6"><div class="empty-desc text-muted">No agent performance data</div></div>';
    return;
  }

  el.innerHTML = agents.slice(0, 5).map((a, i) => `
    <div class="agent-row">
      <div class="agent-rank">#${i + 1}</div>
      <div class="avatar">${getInitials(a.name)}</div>
      <div style="flex:1;min-width:0">
        <div class="font-medium text-sm text-primary truncate">${escHtml(a.name)}</div>
        <div class="text-xs text-muted">${a.total_assigned || 0} assigned tickets</div>
      </div>
      <div class="agent-stats">
        <div class="agent-stat">
          <div class="agent-stat-value text-success">${a.resolved || 0}</div>
          <div class="agent-stat-label">Resolved</div>
        </div>
        <div class="agent-stat">
          <div class="agent-stat-value">${a.active || 0}</div>
          <div class="agent-stat-label">Active</div>
        </div>
        <div class="agent-stat">
          <div class="agent-stat-value">${a.avg_resolution_hrs !== null ? a.avg_resolution_hrs + 'h' : '-'}</div>
          <div class="agent-stat-label">Avg Resolution</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderSLABreaches(data) {
  const card = document.getElementById('sla-breaches-card');
  if (!card || !data.length) return;

  card.style.display = 'block';
  document.getElementById('sla-breach-count').textContent = `${data.length} Breaches`;

  document.getElementById('sla-breaches-table').innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Ticket #</th>
          <th>Subject</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Assignee</th>
          <th>SLA Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(t => `
          <tr onclick="navigateTo('ticket-${t.id}')" style="cursor:pointer">
            <td><span class="ticket-number font-mono text-xs">${escHtml(t.ticket_number)}</span></td>
            <td><span class="ticket-title text-xs">${escHtml(t.title)}</span></td>
            <td><span class="badge badge-${t.priority}">${priorityLabel(t.priority)}</span></td>
            <td><span class="badge badge-${t.status}">${statusLabel(t.status)}</span></td>
            <td class="text-xs">${escHtml(t.assignee_name || 'Unassigned')}</td>
            <td><span class="badge badge-danger">SLA Breach</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function chartDefaults(type) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const isDonut = type === 'doughnut';
  const textColor = isLight ? '#475569' : '#8892aa';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
  const tooltipBg = isLight ? '#ffffff' : '#141928';
  const tooltipBorder = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)';
  const tooltipTitle = isLight ? '#0f172a' : '#e8edf5';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isDonut ? 'right' : 'bottom',
        labels: {
          color: textColor,
          boxWidth: 12,
          padding: 16,
          font: { family: 'Inter', size: 12 }
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: tooltipTitle,
        bodyColor: textColor,
        padding: 12,
      }
    },
    scales: isDonut ? undefined : {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
      }
    }
  };
}
