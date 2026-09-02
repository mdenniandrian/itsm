/**
 * KPI Monitoring Page - ITSM Performance Analytics
 */

function cleanKpiCharts() {
  ['kpi-trend-chart', 'kpi-sla-chart'].forEach(id => {
    try {
      const c = Chart.getChart(id);
      if (c) c.destroy();
    } catch(e) {}
  });
}

window.loadKpi = async function() {
  cleanKpiCharts();
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">KPI & SLA Analytics</h1>
        <p class="page-subtitle">IT service quality metrics, resolution performance (MTTR/MTTA), CSAT satisfaction, and SLA compliance</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="reportsApi.downloadTicketsCsv()">
          ${renderIcon('download')}
          <span>Export Tickets (CSV)</span>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="reportsApi.downloadKpiCsv()">
          ${renderIcon('download')}
          <span>Export KPI (CSV)</span>
        </button>
        <button class="btn btn-primary btn-sm" onclick="loadKpi()">
          ${renderIcon('refresh')}
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- KPI Metric Cards -->
    <div class="stats-grid mb-6" id="kpi-cards-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
      <div class="stat-card"><div class="skeleton" style="height:60px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:60px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:60px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:60px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:60px"></div></div>
    </div>

    <!-- Charts Row -->
    <div class="dashboard-grid mb-6">
      <div class="card">
        <div class="card-header">
          <span class="card-title">MTTR Trend (Mean Time to Resolve)</span>
          <span class="badge badge-info">Target: &le; 8 Hours</span>
        </div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:250px">
            <canvas id="kpi-trend-chart"></canvas>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Daily SLA Compliance Rate (%)</span>
          <span class="badge badge-success">Target: &ge; 95%</span>
        </div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:250px">
            <canvas id="kpi-sla-chart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent Leaderboard & Department Breakdown -->
    <div class="dashboard-grid">
      <!-- Agent Scorecard -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Support Agent Performance Leaderboard</span>
        </div>
        <div class="table-wrapper" id="kpi-agents-table">
          <div class="flex-center p-6"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Department Breakdown -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Ticket Distribution by Department</span>
        </div>
        <div class="table-wrapper" id="kpi-depts-table">
          <div class="flex-center p-6"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  try {
    const [summary, trends, agents, depts] = await Promise.all([
      kpiApi.summary(),
      kpiApi.trends(14),
      kpiApi.agents(),
      kpiApi.departments(),
    ]);

    renderKpiSummary(summary);
    try { renderKpiCharts(trends); } catch(e) { console.warn('KPI chart error:', e); }
    renderAgentScorecard(agents);
    renderDeptBreakdown(depts);
  } catch(e) {
    toast.error('Failed to load KPI analytics', e.message);
  }
};

function renderKpiSummary(s) {
  const grid = document.getElementById('kpi-cards-grid');
  if (!grid) return;

  const slaColor = s.sla_compliance_rate >= 95 ? 'var(--status-resolved)' : s.sla_compliance_rate >= 85 ? 'var(--status-in-progress)' : 'var(--priority-critical)';

  grid.innerHTML = `
    <!-- MTTR -->
    <div class="stat-card" style="border-left: 3px solid #6366f1">
      <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">
        ${renderIcon('clock')}
      </div>
      <div class="stat-content">
        <div class="stat-value" style="color:#818cf8">${s.mttr_formatted}</div>
        <div class="stat-label">MTTR (Mean Time to Resolve)</div>
        <div class="text-xs text-muted mt-1">SLA Target: &le; 8 hours</div>
      </div>
    </div>

    <!-- MTTA -->
    <div class="stat-card" style="border-left: 3px solid #10b981">
      <div class="stat-icon" style="background:rgba(16,185,129,0.12);color:#34d399">
        ${renderIcon('zap')}
      </div>
      <div class="stat-content">
        <div class="stat-value" style="color:#34d399">${s.mtta_formatted}</div>
        <div class="stat-label">MTTA (First Response Time)</div>
        <div class="text-xs text-muted mt-1">Response Target: &le; 30 minutes</div>
      </div>
    </div>

    <!-- SLA Compliance Rate -->
    <div class="stat-card" style="border-left: 3px solid ${slaColor}">
      <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:#fbbf24">
        ${renderIcon('activity')}
      </div>
      <div class="stat-content">
        <div class="stat-value" style="color:${slaColor}">${s.sla_compliance_rate}%</div>
        <div class="stat-label">SLA Compliance Rate</div>
        <div class="text-xs text-muted mt-1">${s.sla_breached_count} breached tickets</div>
      </div>
    </div>

    <!-- FCR Rate -->
    <div class="stat-card" style="border-left: 3px solid #a855f7">
      <div class="stat-icon" style="background:rgba(168,85,247,0.12);color:#c084fc">
        ${renderIcon('sparkles')}
      </div>
      <div class="stat-content">
        <div class="stat-value" style="color:#c084fc">${s.fcr_rate}%</div>
        <div class="stat-label">First Contact Resolution (FCR)</div>
        <div class="text-xs text-muted mt-1">${s.fcr_count} tickets resolved on first contact</div>
      </div>
    </div>

    <!-- CSAT Score -->
    <div class="stat-card" style="border-left: 3px solid #f59e0b">
      <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:#fbbf24">
        ${renderIcon('star')}
      </div>
      <div class="stat-content">
        <div class="stat-value" style="color:#fbbf24">${s.csat_average} / 5.0</div>
        <div class="stat-label">Customer Satisfaction (CSAT)</div>
        <div class="text-xs text-muted mt-1">${s.csat_total_reviews} reviews (${s.csat_percentage}%)</div>
      </div>
    </div>
  `;
}

function renderKpiCharts(trends) {
  const trendCtx = document.getElementById('kpi-trend-chart');
  const slaCtx = document.getElementById('kpi-sla-chart');

  if (trendCtx) {
    const existing = Chart.getChart(trendCtx);
    if (existing) existing.destroy();

    new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trends.map(t => t.label),
        datasets: [
          {
            label: 'MTTR (Hours)',
            data: trends.map(t => t.mttr_hours),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Target (8 Hours)',
            data: trends.map(() => 8),
            borderColor: 'rgba(244,63,94,0.5)',
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          }
        ]
      },
      options: chartDefaults('line')
    });
  }

  if (slaCtx) {
    const existing = Chart.getChart(slaCtx);
    if (existing) existing.destroy();

    new Chart(slaCtx, {
      type: 'bar',
      data: {
        labels: trends.map(t => t.label),
        datasets: [{
          label: 'SLA Compliance (%)',
          data: trends.map(t => t.sla_rate),
          backgroundColor: trends.map(t => t.sla_rate >= 95 ? 'rgba(16,185,129,0.7)' : 'rgba(245,158,11,0.7)'),
          borderColor: trends.map(t => t.sla_rate >= 95 ? '#10b981' : '#f59e0b'),
          borderWidth: 1.5,
          borderRadius: 4,
        }]
      },
      options: {
        ...chartDefaults('bar'),
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { callback: v => v + '%' }
          }
        }
      }
    });
  }
}

function renderAgentScorecard(agents) {
  const container = document.getElementById('kpi-agents-table');
  if (!container) return;

  if (!agents || !agents.length) {
    container.innerHTML = `<div class="empty-state p-6"><div class="empty-icon text-muted">${renderIcon('users')}</div><div class="empty-title">No agent performance data</div></div>`;
    return;
  }

  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Rank & Agent</th>
          <th>Resolved</th>
          <th>MTTR</th>
          <th>SLA %</th>
          <th>KPI Score</th>
        </tr>
      </thead>
      <tbody>
        ${agents.map((a, idx) => {
          const rankColor = idx === 0 ? 'color:#fbbf24;font-weight:700' : idx === 1 ? 'color:#94a3b8;font-weight:600' : idx === 2 ? 'color:#b45309;font-weight:600' : 'color:var(--text-muted)';
          const scoreColor = a.performance_score >= 90 ? 'text-success' : a.performance_score >= 75 ? 'text-warning' : 'text-danger';
          return `
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <span style="${rankColor};width:24px;font-size:0.875rem">#${idx + 1}</span>
                  <div>
                    <div class="font-semibold text-sm">${escHtml(a.name)}</div>
                    <div class="text-xs text-muted">${escHtml(a.department || a.role)}</div>
                  </div>
                </div>
              </td>
              <td><span class="font-semibold">${a.resolved_count}</span> <span class="text-xs text-muted">(${a.active_count} active)</span></td>
              <td>${a.mttr_hours !== null ? a.mttr_hours + 'h' : '-'}</td>
              <td>
                <span class="badge ${a.sla_compliance_rate >= 95 ? 'badge-success' : 'badge-warning'}">
                  ${a.sla_compliance_rate}%
                </span>
              </td>
              <td>
                <span class="font-bold ${scoreColor}">${a.performance_score} / 100</span>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderDeptBreakdown(depts) {
  const container = document.getElementById('kpi-depts-table');
  if (!container) return;

  if (!depts || !depts.length) {
    container.innerHTML = `<div class="empty-state p-6"><div class="empty-icon text-muted">${renderIcon('dashboard')}</div><div class="empty-title">No department records</div></div>`;
    return;
  }

  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Department</th>
          <th>Total Tickets</th>
          <th>Active</th>
          <th>Resolved</th>
          <th>Avg Resolution</th>
        </tr>
      </thead>
      <tbody>
        ${depts.map(d => `
          <tr>
            <td><span class="font-semibold">${escHtml(d.department)}</span></td>
            <td>${d.total_tickets}</td>
            <td><span class="badge badge-warning">${d.active_tickets}</span></td>
            <td><span class="badge badge-success">${d.resolved_tickets}</span></td>
            <td>${d.avg_mttr_hours > 0 ? d.avg_mttr_hours + 'h' : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
