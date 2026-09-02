/**
 * Tickets Page - List, Detail, Create, Edit
 */

let ticketFilters = { status: '', priority: '', category: '', search: '', page: 1 };
let availableAgents = [];

// ============================================
// TICKET LIST
// ============================================
window.loadTickets = async function(extraParams = {}) {
  if (extraParams.search) {
    ticketFilters = { ...ticketFilters, search: extraParams.search, page: 1 };
  }

  const content = document.getElementById('page-content');
  const user = appState.user;
  const isAgent = ['admin','manager','agent'].includes(user.role);

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Ticket Management</h1>
        <p class="page-subtitle">Track, prioritize, and manage all IT service requests and incident tickets</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="loadTickets()">${renderIcon('refresh')} Refresh</button>
        <button class="btn btn-primary" onclick="navigateTo('new-ticket')">${renderIcon('plus')} Create Ticket</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-4">
      <div class="card-body p-3">
        <div class="flex gap-3 flex-wrap items-center">
          <div class="search-input-wrap" style="flex:1;min-width:200px">
            <span class="search-icon">${renderIcon('search')}</span>
            <input type="text" class="form-control" id="ticket-search" placeholder="Search ticket number, subject, requester..." value="${escHtml(ticketFilters.search || '')}">
          </div>
          <select class="form-control" id="filter-status" style="width:160px">
            <option value="">All Statuses</option>
            <option value="open" ${ticketFilters.status==='open'?'selected':''}>Open</option>
            <option value="in_progress" ${ticketFilters.status==='in_progress'?'selected':''}>In Progress</option>
            <option value="pending" ${ticketFilters.status==='pending'?'selected':''}>Pending</option>
            <option value="resolved" ${ticketFilters.status==='resolved'?'selected':''}>Resolved</option>
            <option value="closed" ${ticketFilters.status==='closed'?'selected':''}>Closed</option>
          </select>
          <select class="form-control" id="filter-priority" style="width:150px">
            <option value="">All Priorities</option>
            <option value="critical" ${ticketFilters.priority==='critical'?'selected':''}>Critical</option>
            <option value="high" ${ticketFilters.priority==='high'?'selected':''}>High</option>
            <option value="medium" ${ticketFilters.priority==='medium'?'selected':''}>Medium</option>
            <option value="low" ${ticketFilters.priority==='low'?'selected':''}>Low</option>
          </select>
          <select class="form-control" id="filter-category" style="width:180px">
            <option value="">All Categories</option>
            <option value="incident" ${ticketFilters.category==='incident'?'selected':''}>Incident</option>
            <option value="service_request" ${ticketFilters.category==='service_request'?'selected':''}>Service Request</option>
            <option value="problem" ${ticketFilters.category==='problem'?'selected':''}>Problem</option>
            <option value="change_request" ${ticketFilters.category==='change_request'?'selected':''}>Change Request</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="resetTicketFilters()">Reset</button>
        </div>
      </div>
    </div>

    <!-- Tickets Table -->
    <div class="card">
      <div class="table-wrapper" id="tickets-table">
        <div class="flex-center p-6"><div class="spinner spinner-lg"></div></div>
      </div>
    </div>

    <!-- Pagination -->
    <div id="tickets-pagination"></div>
  `;

  // Setup filter events
  const searchInput = document.getElementById('ticket-search');
  searchInput.addEventListener('input', debounce(() => {
    ticketFilters.search = searchInput.value;
    ticketFilters.page = 1;
    fetchAndRenderTickets();
  }, 400));

  ['filter-status','filter-priority','filter-category'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      const key = id.replace('filter-', '');
      ticketFilters[key] = e.target.value;
      ticketFilters.page = 1;
      fetchAndRenderTickets();
    });
  });

  // Load agents for assignment
  if (isAgent) {
    usersApi.agents().then(agents => { availableAgents = agents; }).catch(() => {});
  }

  fetchAndRenderTickets();
};

async function fetchAndRenderTickets() {
  const params = {};
  if (ticketFilters.status) params.status = ticketFilters.status;
  if (ticketFilters.priority) params.priority = ticketFilters.priority;
  if (ticketFilters.category) params.category = ticketFilters.category;
  if (ticketFilters.search) params.search = ticketFilters.search;
  params.page = ticketFilters.page;
  params.limit = 15;

  try {
    const data = await ticketsApi.list(params);
    renderTicketsTable(data.tickets);
    renderPagination(data.pagination, (page) => {
      ticketFilters.page = page;
      fetchAndRenderTickets();
    });
  } catch(e) {
    document.getElementById('tickets-table').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon text-muted">${renderIcon('problems')}</div>
        <div class="empty-title">Failed to load tickets</div>
        <div class="empty-desc">${e.message}</div>
      </div>
    `;
  }
}

function renderTicketsTable(tickets) {
  const el = document.getElementById('tickets-table');
  if (!el) return;

  if (!tickets.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon text-muted">${renderIcon('ticket')}</div>
        <div class="empty-title">No tickets found</div>
        <div class="empty-desc">Try adjusting your filters or submit a new ticket</div>
        <button class="btn btn-primary mt-4" onclick="navigateTo('new-ticket')">Create Ticket</button>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th style="width:130px">Ticket #</th>
          <th>Subject</th>
          <th>Category</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Requester</th>
          <th>Assignee</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${tickets.map(t => {
          const sla = getSLAStatus(t.sla_resolution_due, t.sla_resolution_breached);
          return `
            <tr onclick="navigateTo('ticket-${t.id}')" style="cursor:pointer">
              <td>
                <div>
                  <span class="ticket-number">${escHtml(t.ticket_number)}</span>
                  ${sla ? `<div class="sla-timer ${sla.class}" style="margin-top:2px;font-size:0.65rem">${sla.label}</div>` : ''}
                </div>
              </td>
              <td>
                <div class="ticket-title">${escHtml(t.title)}</div>
                ${t.comment_count > 0 ? `<div class="text-xs text-muted mt-1">${t.comment_count} comments</div>` : ''}
              </td>
              <td><span class="badge badge-${t.category}">${categoryLabel(t.category)}</span></td>
              <td><span class="badge badge-${t.status}">${statusLabel(t.status)}</span></td>
              <td><span class="badge badge-${t.priority}">${priorityLabel(t.priority)}</span></td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="avatar" style="width:24px;height:24px;font-size:0.6rem">${getInitials(t.requester_name)}</div>
                  <span class="text-sm">${escHtml(t.requester_name || '-')}</span>
                </div>
              </td>
              <td>
                ${t.assignee_name
                  ? `<div class="flex items-center gap-2"><div class="avatar" style="width:24px;height:24px;font-size:0.6rem">${getInitials(t.assignee_name)}</div><span class="text-sm">${escHtml(t.assignee_name)}</span></div>`
                  : '<span class="text-muted text-sm">Unassigned</span>'
                }
              </td>
              <td class="text-sm text-muted">${timeAgo(t.created_at)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function resetTicketFilters() {
  ticketFilters = { status: '', priority: '', category: '', search: '', page: 1 };
  loadTickets();
}

function renderPagination(pagination, onPage) {
  const el = document.getElementById('tickets-pagination');
  if (!el || pagination.pages <= 1) { if (el) el.innerHTML = ''; return; }

  const { page, pages } = pagination;
  let html = '<div class="pagination">';
  html += `<button class="page-btn" onclick="(${onPage})(${page-1})" ${page <= 1 ? 'disabled' : ''}>◀</button>`;

  let start = Math.max(1, page - 2);
  let end = Math.min(pages, page + 2);

  if (start > 1) html += `<button class="page-btn" onclick="(${onPage})(1)">1</button>${start > 2 ? '<span class="page-btn" style="border:none;background:none;color:var(--text-muted)">...</span>' : ''}`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="(${onPage})(${i})">${i}</button>`;
  }
  if (end < pages) html += `${end < pages - 1 ? '<span class="page-btn" style="border:none;background:none;color:var(--text-muted)">...</span>' : ''}<button class="page-btn" onclick="(${onPage})(${pages})">${pages}</button>`;

  html += `<button class="page-btn" onclick="(${onPage})(${page+1})" ${page >= pages ? 'disabled' : ''}>▶</button>`;
  html += '</div>';
  el.innerHTML = html;
}

// ============================================
// TICKET DETAIL
// ============================================
window.loadTicketDetail = async function(id) {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="flex-center" style="height:60vh"><div class="spinner spinner-lg"></div></div>`;

  try {
    const [ticket, agents] = await Promise.all([
      ticketsApi.get(id),
      usersApi.agents().catch(() => [])
    ]);
    availableAgents = agents;
    renderTicketDetail(ticket);
  } catch(e) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon text-muted">${renderIcon('problems')}</div>
        <div class="empty-title">Ticket not found</div>
        <button class="btn btn-primary mt-4" onclick="navigateTo('tickets')">Back to Tickets</button>
      </div>
    `;
  }
};

function renderTicketDetail(ticket) {
  const content = document.getElementById('page-content');
  const user = appState.user;
  const isAgent = ['admin','manager','agent'].includes(user.role);
  const isAdmin = ['admin','manager'].includes(user.role);

  const sla = getSLAStatus(ticket.sla_resolution_due, ticket.sla_resolution_breached);

  content.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('tickets')">
          ${renderIcon('arrowLeft')}
          <span>Back</span>
        </button>
        <div>
          <div class="flex items-center gap-2">
            <span class="ticket-number font-bold text-accent" style="font-size:0.95rem">#${escHtml(ticket.ticket_number)}</span>
            <span class="badge badge-${ticket.status}">${statusLabel(ticket.status)}</span>
            <span class="badge badge-${ticket.priority}">${priorityLabel(ticket.priority)}</span>
            ${sla ? `<span class="sla-timer ${sla.class}">${renderIcon('clock')} ${sla.label}</span>` : ''}
          </div>
          <h1 class="page-title" style="font-size:1.25rem;margin-top:0.25rem">${escHtml(ticket.title)}</h1>
        </div>
      </div>
      <div class="flex gap-2">
        ${isAgent ? `
        <button class="btn btn-secondary btn-sm" onclick="showEditTicketModal(${JSON.stringify(ticket).replace(/"/g, '&quot;')})">
          ${renderIcon('edit')}
          <span>Edit</span>
        </button>
        ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteTicket(${ticket.id})">${renderIcon('trash')} Delete</button>` : ''}
        ` : ''}
      </div>
    </div>

    <div class="ticket-detail-grid">
      <!-- Left: Description & Comments -->
      <div style="display:flex;flex-direction:column;gap:1rem">
        <!-- CSAT Rating Banner if Resolved / Closed -->
        ${['resolved', 'closed'].includes(ticket.status) ? `
          <div class="card p-3" style="border:1px solid ${ticket.satisfaction_rating ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'};background:${ticket.satisfaction_rating ? 'rgba(16,185,129,0.04)' : 'rgba(99,102,241,0.04)'}">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-3">
                <div style="color:${ticket.satisfaction_rating ? '#10b981' : '#818cf8'};display:flex;align-items:center">${renderIcon('star')}</div>
                <div>
                  <div class="font-bold text-sm text-primary">
                    ${ticket.satisfaction_rating ? `Customer Rating: ${ticket.satisfaction_rating} / 5.0` : 'Customer Satisfaction Survey (CSAT)'}
                  </div>
                  <div class="text-xs text-muted">
                    ${ticket.satisfaction_feedback ? `"${escHtml(ticket.satisfaction_feedback)}"` : ticket.satisfaction_rating ? 'Thank you for your feedback!' : 'Please let us know how we did resolving your request.'}
                  </div>
                </div>
              </div>
              ${!ticket.satisfaction_rating && (user.id === ticket.requester_id || user.role === 'admin') ? `
                <button class="btn btn-primary btn-sm" onclick="showCsatModal(${ticket.id})">Leave Rating</button>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Description -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Description</span>
          </div>
          <div class="card-body">
            <div style="white-space:pre-wrap;line-height:1.8;color:var(--text-secondary);font-size:0.875rem">${escHtml(ticket.description)}</div>
          </div>
        </div>

        <!-- Comments -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Comments & Work Notes</span>
            <span class="text-muted text-xs">${ticket.comments.length} comments</span>
          </div>
          <div class="card-body p-0">
            ${ticket.comments.length ? `
              <div style="padding:1rem">
                ${ticket.comments.map(c => `
                  <div class="comment-item ${c.is_internal ? 'internal' : ''}">
                    <div class="avatar">${getInitials(c.user_name)}</div>
                    <div class="comment-body">
                      <div class="comment-header">
                        <span class="comment-author font-semibold text-xs">${escHtml(c.user_name)}</span>
                        ${c.is_internal ? '<span class="badge badge-warning" style="font-size:0.65rem">Internal</span>' : ''}
                        <span class="comment-time text-xs text-muted">${formatDate(c.created_at)}</span>
                      </div>
                      <div class="comment-content text-xs mt-1">${escHtml(c.content)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="empty-state" style="padding:2rem"><div class="empty-desc text-xs text-muted">No comments yet</div></div>'}
          </div>

          <!-- Add Comment -->
          <div class="card-footer">
            <div class="flex items-center gap-2 mb-3">
              <div class="avatar">${getInitials(user.name)}</div>
              <span class="font-medium text-xs">${escHtml(user.name)}</span>
            </div>
            <div class="comment-box" id="comment-box-wrap">
              <textarea id="comment-input" placeholder="Write a comment or work note update..." rows="3"></textarea>
              <div class="comment-box-footer">
                ${isAgent ? `
                <label class="toggle-switch">
                  <input type="checkbox" class="toggle-input" id="internal-toggle">
                  <div class="toggle-slider"></div>
                  <span class="text-xs text-muted">Internal Note (Agent Only)</span>
                </label>
                ` : '<div></div>'}
                <button class="btn btn-primary btn-sm" id="submit-comment-btn" onclick="submitComment(${ticket.id})">
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity History -->
        <div class="card">
          <div class="card-header">
            <span class="card-title text-xs font-semibold">Activity Timeline</span>
          </div>
          <div class="card-body">
            ${ticket.history.length ? `
              <div class="timeline">
                ${ticket.history.map(h => `
                  <div class="timeline-item">
                    <div class="timeline-dot" style="background:var(--accent-primary)"></div>
                    <div class="timeline-content">
                      <div class="timeline-text text-xs">
                        <strong>${escHtml(h.user_name)}</strong>
                        ${h.action === 'created' ? `created this ticket` : `changed ${escHtml(h.field_name || '')} from <strong>${escHtml(h.old_value || '-')}</strong> to <strong>${escHtml(h.new_value || '-')}</strong>`}
                      </div>
                      <div class="timeline-time text-xs text-muted">${formatDate(h.changed_at)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="text-center text-muted text-xs">No activity history recorded</div>'}
          </div>
        </div>
      </div>

      <!-- Right: Sidebar Info -->
      <div style="display:flex;flex-direction:column;gap:1rem">
        <!-- Quick Actions -->
        ${isAgent ? `
        <div class="card">
          <div class="card-header"><span class="card-title text-xs font-semibold">Quick Actions</span></div>
          <div class="card-body" id="ticket-quick-actions" style="display:flex;flex-direction:column;gap:0.5rem">
            ${ticket.status === 'open' ? `<button class="btn btn-warning w-full" onclick="quickUpdateStatus(${ticket.id}, 'in_progress', this)">Start Working (In Progress)</button>` : ''}
            ${ticket.status === 'in_progress' ? `<button class="btn btn-secondary w-full" onclick="quickUpdateStatus(${ticket.id}, 'pending', this)">Mark Pending</button>` : ''}
            ${['open','in_progress','pending'].includes(ticket.status) ? `<button class="btn btn-success w-full" onclick="quickUpdateStatus(${ticket.id}, 'resolved', this)">Resolve Ticket</button>` : ''}
            ${ticket.status === 'resolved' ? `<button class="btn btn-secondary w-full" onclick="quickUpdateStatus(${ticket.id}, 'closed', this)">Close Ticket</button>` : ''}
            ${ticket.status === 'resolved' || ticket.status === 'closed' ? `<button class="btn btn-secondary w-full" onclick="quickUpdateStatus(${ticket.id}, 'open', this)">Reopen Ticket</button>` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Ticket Details -->
        <div class="card">
          <div class="card-header"><span class="card-title text-xs font-semibold">Ticket Information</span></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:1rem">
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Category</span>
              <span class="badge badge-${ticket.category}">${categoryLabel(ticket.category)}</span>
            </div>
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Status</span>
              <span class="badge badge-${ticket.status}">${statusIcon(ticket.status)} ${statusLabel(ticket.status)}</span>
            </div>
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Priority</span>
              <span class="badge badge-${ticket.priority}">${priorityIcon(ticket.priority)} ${priorityLabel(ticket.priority)}</span>
            </div>
            <hr class="divider">
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Requester</span>
              <div class="flex items-center gap-2 mt-1">
                <div class="avatar" style="width:28px;height:28px;font-size:0.65rem">${getInitials(ticket.requester_name)}</div>
                <div>
                  <div class="text-sm font-medium">${escHtml(ticket.requester_name)}</div>
                  <div class="text-xs text-muted">${escHtml(ticket.requester_department || '')}</div>
                </div>
              </div>
            </div>
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Assignee</span>
              ${ticket.assignee_name ? `
                <div class="flex items-center gap-2 mt-1">
                  <div class="avatar" style="width:28px;height:28px;font-size:0.65rem">${getInitials(ticket.assignee_name)}</div>
                  <div class="text-sm font-medium">${escHtml(ticket.assignee_name)}</div>
                </div>
              ` : `<span class="text-muted text-sm">Unassigned</span>`}
            </div>

            ${isAgent ? `
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Assign to Agent</span>
              <select class="form-control mt-1" id="assign-select" onchange="assignTicket(${ticket.id}, this.value)">
                <option value="">-- Select Agent --</option>
                ${availableAgents.map(a => `<option value="${a.id}" ${ticket.assignee_id == a.id ? 'selected' : ''}>${escHtml(a.name)}</option>`).join('')}
              </select>
            </div>
            ` : ''}

            <hr class="divider">
            <!-- SLA Info -->
            ${ticket.sla_name ? `
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">SLA Policy</span>
              <span class="ticket-meta-value">${escHtml(ticket.sla_name)}</span>
            </div>
            ` : ''}
            ${ticket.sla_resolution_due ? `
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Resolution Target</span>
              <span class="ticket-meta-value ${ticket.sla_resolution_breached ? 'text-danger' : ''}">${formatDate(ticket.sla_resolution_due)}</span>
            </div>
            ` : ''}
            <hr class="divider">
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Created At</span>
              <span class="ticket-meta-value">${formatDate(ticket.created_at)}</span>
            </div>
            ${ticket.first_response_at ? `
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">First Response</span>
              <span class="ticket-meta-value">${formatDate(ticket.first_response_at)}</span>
            </div>
            ` : ''}
            ${ticket.resolved_at ? `
            <div class="ticket-meta-item">
              <span class="ticket-meta-label">Resolved At</span>
              <span class="ticket-meta-value">${formatDate(ticket.resolved_at)}</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// COMMENT SUBMIT
// ============================================
window.submitComment = async function(ticketId) {
  const input = document.getElementById('comment-input');
  const isInternal = document.getElementById('internal-toggle')?.checked || false;
  const content = input.value.trim();
  const btn = document.getElementById('submit-comment-btn');

  if (!content) { toast.warning('Comment message cannot be empty'); return; }

  btn.disabled = true;
  btn.textContent = 'Posting...';

  try {
    await ticketsApi.addComment(ticketId, { content, is_internal: isInternal });
    toast.success('Comment posted successfully');
    loadTicketDetail(ticketId);
  } catch(e) {
    toast.error('Failed to post comment', e.message);
    btn.disabled = false;
    btn.textContent = 'Post Comment';
  }
};

// ============================================
// QUICK ACTIONS
// ============================================
window.quickUpdateStatus = async function(id, status, btn) {
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner spinner-xs" style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;vertical-align:middle"></span> Updating...`;
  }

  // Prevent double clicking on any other quick action buttons while saving
  const container = document.getElementById('ticket-quick-actions');
  if (container) {
    container.querySelectorAll('button').forEach(b => b.disabled = true);
  }

  try {
    await ticketsApi.update(id, { status });
    toast.success(`Status updated to ${statusLabel(status)}`);
    await loadTicketDetail(id);
    loadOpenTicketCount();
  } catch(e) {
    toast.error('Failed to update status', e.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.origText || 'Update';
    }
    if (container) {
      container.querySelectorAll('button').forEach(b => b.disabled = false);
    }
  }
};

window.assignTicket = async function(id, assigneeId) {
  try {
    await ticketsApi.update(id, { assignee_id: assigneeId || null });
    toast.success('Ticket assigned successfully');
  } catch(e) {
    toast.error('Failed to assign ticket', e.message);
  }
};

window.deleteTicket = function(id) {
  modal.confirm('Delete Ticket', 'Are you sure you want to permanently delete this ticket? This action cannot be undone.', async () => {
    try {
      await ticketsApi.delete(id);
      toast.success('Ticket deleted successfully');
      navigateTo('tickets');
    } catch(e) {
      toast.error('Failed to delete ticket', e.message);
    }
  });
};

// ============================================
// EDIT TICKET MODAL
// ============================================
window.showEditTicketModal = function(ticket) {
  modal.show(`
    <div class="modal-header">
      <span class="modal-title font-bold text-sm">Edit Ticket ${escHtml(ticket.ticket_number)}</span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="form-group">
          <label class="form-label font-medium text-xs">Subject</label>
          <input type="text" class="form-control" id="edit-title" value="${escHtml(ticket.title)}">
        </div>
        <div class="form-group">
          <label class="form-label font-medium text-xs">Description</label>
          <textarea class="form-control" id="edit-desc" rows="5">${escHtml(ticket.description)}</textarea>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Priority</label>
            <select class="form-control" id="edit-priority">
              <option value="critical" ${ticket.priority==='critical'?'selected':''}>Critical</option>
              <option value="high" ${ticket.priority==='high'?'selected':''}>High</option>
              <option value="medium" ${ticket.priority==='medium'?'selected':''}>Medium</option>
              <option value="low" ${ticket.priority==='low'?'selected':''}>Low</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Status</label>
            <select class="form-control" id="edit-status">
              <option value="open" ${ticket.status==='open'?'selected':''}>Open</option>
              <option value="in_progress" ${ticket.status==='in_progress'?'selected':''}>In Progress</option>
              <option value="pending" ${ticket.status==='pending'?'selected':''}>Pending</option>
              <option value="resolved" ${ticket.status==='resolved'?'selected':''}>Resolved</option>
              <option value="closed" ${ticket.status==='closed'?'selected':''}>Closed</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label font-medium text-xs">Category</label>
          <select class="form-control" id="edit-category">
            <option value="incident" ${ticket.category==='incident'?'selected':''}>Incident</option>
            <option value="service_request" ${ticket.category==='service_request'?'selected':''}>Service Request</option>
            <option value="problem" ${ticket.category==='problem'?'selected':''}>Problem</option>
            <option value="change_request" ${ticket.category==='change_request'?'selected':''}>Change Request</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" id="save-edit-btn" onclick="saveTicketEdit(${ticket.id})">Save Changes</button>
    </div>
  `);
};

window.saveTicketEdit = async function(id) {
  const data = {
    title: document.getElementById('edit-title').value,
    description: document.getElementById('edit-desc').value,
    priority: document.getElementById('edit-priority').value,
    status: document.getElementById('edit-status').value,
    category: document.getElementById('edit-category').value,
  };

  const btn = document.getElementById('save-edit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner spinner-xs" style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;vertical-align:middle"></span> Saving...`;
  }

  try {
    await ticketsApi.update(id, data);
    modal.close();
    toast.success('Ticket updated successfully');
    await loadTicketDetail(id);
    loadOpenTicketCount();
  } catch(e) {
    toast.error('Failed to save changes', e.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  }
};

// ============================================
// NEW TICKET FORM
// ============================================
window.loadNewTicket = async function() {
  const content = document.getElementById('page-content');
  let agents = [];

  const user = appState.user;
  const isAgent = ['admin','manager','agent'].includes(user.role);

  if (isAgent) {
    agents = await usersApi.agents().catch(() => []);
  }

  content.innerHTML = `
    <div class="page-header flex items-center justify-between gap-4 flex-wrap mb-4">
      <div>
        <h1 class="page-title">Create New Ticket</h1>
        <p class="page-subtitle">Submit a service request or report an IT incident</p>
      </div>
      <button class="btn btn-secondary flex items-center gap-2" onclick="navigateTo('tickets')">
        ${renderIcon('arrowLeft')}
        <span>Back to Tickets</span>
      </button>
    </div>

    <div class="new-ticket-grid">
      <!-- Main Form (Left Column) -->
      <div class="card">
        <div class="card-header pb-3">
          <div class="flex items-center gap-2">
            <span class="text-accent" style="display:flex;align-items:center">${renderIcon('ticket')}</span>
            <span class="card-title font-bold text-sm">Ticket Information</span>
          </div>
        </div>
        <div class="card-body">
          <form id="new-ticket-form" style="display:flex;flex-direction:column;gap:1.25rem">
            <div class="form-group">
              <div class="flex items-center justify-between mb-1.5">
                <label class="form-label font-bold text-xs mb-0">Ticket Subject <span class="text-danger">*</span></label>
                <button type="button" class="btn btn-ghost btn-xs text-accent flex items-center gap-1" onclick="autoTriageTicket()" title="Automatic keyword analysis for priority and category triage">
                  ${renderIcon('zap')}
                  <span>Auto-Triage</span>
                </button>
              </div>
              <input type="text" class="form-control" id="nt-title" placeholder="Briefly describe the issue or request (e.g. Cannot access VPN, Outlook crashing)..." required oninput="handleSmartDeflectionSuggest(this.value)">
            </div>

            <div class="form-group">
              <label class="form-label font-bold text-xs">Detailed Description <span class="text-danger">*</span></label>
              <textarea class="form-control" id="nt-description" rows="7" placeholder="Describe the problem in detail:&#10;1. What happened?&#10;2. Steps already attempted to resolve it&#10;3. Specific error message or affected device hostname / IP&#10;4. Business impact or deadline..." required oninput="handleSmartDeflectionSuggest(document.getElementById('nt-title').value + ' ' + this.value)"></textarea>
            </div>

            <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div class="form-group mb-0">
                <label class="form-label font-bold text-xs">Category <span class="text-danger">*</span></label>
                <select class="form-control" id="nt-category" required>
                  <option value="incident">Incident (Service Outage / Issue)</option>
                  <option value="service_request">Service Request (Access / Hardware)</option>
                  <option value="problem">Problem (Root Cause Investigation)</option>
                  <option value="change_request">Change Request (System Modification)</option>
                </select>
              </div>
              <div class="form-group mb-0">
                <label class="form-label font-bold text-xs">Priority <span class="text-danger">*</span></label>
                <select class="form-control" id="nt-priority" required onchange="updateSlaMatrixHighlight(this.value)">
                  <option value="low">Low (Standard Request / Low Impact)</option>
                  <option value="medium" selected>Medium (Normal Priority)</option>
                  <option value="high">High (Major Impact / Multiple Users)</option>
                  <option value="critical">Critical (Outage / Production Down)</option>
                </select>
              </div>
            </div>

            ${isAgent ? `
            <div class="form-group">
              <label class="form-label font-bold text-xs">Assign to Agent</label>
              <select class="form-control" id="nt-assignee">
                <option value="">-- Unassigned --</option>
                ${agents.map(a => `<option value="${a.id}">${escHtml(a.name)} (${escHtml(a.department || '')})</option>`).join('')}
              </select>
            </div>
            ` : ''}

            <div class="flex gap-2 pt-2" style="justify-content:flex-end">
              <button type="button" class="btn btn-secondary" onclick="navigateTo('tickets')">Cancel</button>
              <button type="submit" class="btn btn-primary flex items-center gap-2" id="submit-ticket-btn">
                <span id="submit-ticket-text">Submit Ticket</span>
                <div id="submit-ticket-spinner" class="spinner" style="display:none"></div>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Contextual Assistant Sidebar (Right Column) -->
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        
        <!-- Smart Solutions & Deflection Assistant Card -->
        <div class="card" id="smart-deflection-sidebar-card" style="border:1px solid rgba(99,102,241,0.25)">
          <div class="card-header pb-2" style="background:rgba(99,102,241,0.06);border-bottom:1px solid rgba(99,102,241,0.15)">
            <div class="flex items-center gap-2">
              <span class="text-accent" style="display:flex;align-items:center">${renderIcon('sparkles')}</span>
              <span class="card-title text-xs font-bold text-accent">Smart Resolution Assistant</span>
            </div>
          </div>
          <div class="card-body py-3">
            <div id="smart-deflection-sidebar-content">
              <p class="text-xs text-muted mb-2.5" style="line-height:1.5">Type your issue subject or description to automatically search verified self-service solutions from our Knowledge Base.</p>
              <div class="p-3 card" style="background:var(--bg-input);border:1px dashed var(--border-color);text-align:center">
                <span class="text-xs text-muted">Awaiting your issue details...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Priority & SLA Target Matrix Card -->
        <div class="card">
          <div class="card-header pb-2">
            <div class="flex items-center gap-2">
              <span class="text-primary" style="display:flex;align-items:center">${renderIcon('clock')}</span>
              <span class="card-title text-xs font-bold">Priority & SLA Target Matrix</span>
            </div>
          </div>
          <div class="card-body py-3">
            <div style="display:flex;flex-direction:column;gap:0.5rem" id="priority-sla-matrix">
              <div class="p-2.5 card sla-matrix-item" id="sla-box-critical" style="background:var(--bg-input);border:1px solid var(--border-color)">
                <div class="flex items-center justify-between">
                  <span class="badge badge-critical" style="font-size:0.65rem">Critical (P1)</span>
                  <span class="text-xs font-bold text-danger">1h Resp / 4h Res</span>
                </div>
                <div class="text-xs text-muted mt-1" style="font-size:0.7rem">Server down, data loss, production outage</div>
              </div>

              <div class="p-2.5 card sla-matrix-item" id="sla-box-high" style="background:var(--bg-input);border:1px solid var(--border-color)">
                <div class="flex items-center justify-between">
                  <span class="badge badge-high" style="font-size:0.65rem">High (P2)</span>
                  <span class="text-xs font-bold" style="color:#f97316">2h Resp / 8h Res</span>
                </div>
                <div class="text-xs text-muted mt-1" style="font-size:0.7rem">Significant service impairment affecting department</div>
              </div>

              <div class="p-2.5 card sla-matrix-item active-sla" id="sla-box-medium" style="background:var(--bg-input);border:1px solid var(--border-color)">
                <div class="flex items-center justify-between">
                  <span class="badge badge-medium" style="font-size:0.65rem">Medium (P3)</span>
                  <span class="text-xs font-bold" style="color:#eab308">4h Resp / 24h Res</span>
                </div>
                <div class="text-xs text-muted mt-1" style="font-size:0.7rem">Individual issue with temporary workaround available</div>
              </div>

              <div class="p-2.5 card sla-matrix-item" id="sla-box-low" style="background:var(--bg-input);border:1px solid var(--border-color)">
                <div class="flex items-center justify-between">
                  <span class="badge badge-low" style="font-size:0.65rem">Low (P4)</span>
                  <span class="text-xs font-bold text-success">8h Resp / 72h Res</span>
                </div>
                <div class="text-xs text-muted mt-1" style="font-size:0.7rem">General non-urgent inquiry or standard request</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Submission Best Practices Card -->
        <div class="card">
          <div class="card-header pb-2">
            <div class="flex items-center gap-2">
              <span class="text-primary" style="display:flex;align-items:center">${renderIcon('zap')}</span>
              <span class="card-title text-xs font-bold">Tips for Faster Resolution</span>
            </div>
          </div>
          <div class="card-body py-3">
            <ul class="text-xs text-secondary mb-0" style="padding-left:1.15rem;line-height:1.6">
              <li>Specify exact application, host, or affected user.</li>
              <li>Include full error codes or screenshots if available.</li>
              <li>Mention steps you've already attempted.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  `;

  document.getElementById('new-ticket-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-ticket-btn');
    const txt = document.getElementById('submit-ticket-text');
    const spin = document.getElementById('submit-ticket-spinner');

    const data = {
      title: document.getElementById('nt-title').value.trim(),
      description: document.getElementById('nt-description').value.trim(),
      category: document.getElementById('nt-category').value,
      priority: document.getElementById('nt-priority').value,
    };

    const assignee = document.getElementById('nt-assignee');
    if (assignee) data.assignee_id = assignee.value || null;

    btn.disabled = true;
    txt.textContent = 'Submitting...';
    spin.style.display = 'block';

    try {
      const ticket = await ticketsApi.create(data);
      toast.success('Ticket created successfully!', ticket.ticket_number);
      navigateTo(`ticket-${ticket.id}`);
      loadOpenTicketCount();
    } catch(err) {
      toast.error('Failed to create ticket', err.message);
      btn.disabled = false;
      txt.textContent = 'Submit Ticket';
      spin.style.display = 'none';
    }
  });
};

window.updateSlaMatrixHighlight = function(prio) {
  document.querySelectorAll('.sla-matrix-item').forEach(el => el.classList.remove('active-sla'));
  const activeBox = document.getElementById(`sla-box-${prio}`);
  if (activeBox) activeBox.classList.add('active-sla');
};

// ============================================
// SMART KNOWLEDGE DEFLECTION & AUTO-TRIAGE
// ============================================

window.handleSmartDeflectionSuggest = debounce(async function(query) {
  const container = document.getElementById('smart-deflection-sidebar-content');
  if (!container) return;

  if (!query || query.trim().length < 3) {
    container.innerHTML = `
      <p class="text-xs text-muted mb-2.5" style="line-height:1.5">Type your issue subject or description to automatically search verified self-service solutions from our Knowledge Base.</p>
      <div class="p-3 card" style="background:var(--bg-input);border:1px dashed var(--border-color);text-align:center">
        <span class="text-xs text-muted">Awaiting your issue details...</span>
      </div>
    `;
    return;
  }

  try {
    const res = await ticketsApi.suggest(query);
    const articles = res.articles || [];

    if (!articles.length) {
      container.innerHTML = `
        <div class="p-3 card" style="background:var(--bg-input);border:1px dashed var(--border-color);text-align:center">
          <span class="text-xs text-muted">No instant matching articles found. Your ticket will be dispatched to an IT technician.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="flex items-center gap-1.5 mb-2 text-accent font-bold text-xs">
        ${renderIcon('sparkles')}
        <span>Instant Recommended Solutions:</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${articles.map(a => `
          <div class="p-2.5 card hover-bg" style="cursor:pointer;background:var(--bg-input);border:1px solid var(--border-color)" onclick="showKnowledgeArticleModalDirect(${a.id})">
            <div class="font-semibold text-xs text-primary mb-1">${escHtml(a.title)}</div>
            <div class="text-xs text-muted truncate mb-2" style="max-width:320px">${escHtml(a.snippet)}</div>
            <button type="button" class="btn btn-secondary btn-xs w-full flex items-center justify-center gap-1">
              <span>View Solution</span>
            </button>
          </div>
        `).join('')}
      </div>
    `;
  } catch(e) {
    console.warn('Smart deflection search error:', e);
  }
}, 300);

window.autoTriageTicket = function() {
  const title = (document.getElementById('nt-title')?.value || '').toLowerCase();
  const desc = (document.getElementById('nt-description')?.value || '').toLowerCase();
  const fullText = title + ' ' + desc;

  const catSelect = document.getElementById('nt-category');
  const prioSelect = document.getElementById('nt-priority');

  let suggestedPrio = 'medium';
  let suggestedCat = 'incident';

  if (fullText.includes('server') || fullText.includes('down') || fullText.includes('mati total') || fullText.includes('lumpuh') || fullText.includes('darurat') || fullText.includes('outage') || fullText.includes('crash')) {
    suggestedPrio = 'critical';
    suggestedCat = 'incident';
  } else if (fullText.includes('error') || fullText.includes('rusak') || fullText.includes('gangguan') || fullText.includes('lemot') || fullText.includes('broken') || fullText.includes('bug')) {
    suggestedPrio = 'high';
    suggestedCat = 'incident';
  } else if (fullText.includes('minta') || fullText.includes('request') || fullText.includes('akses') || fullText.includes('install') || fullText.includes('buat akun') || fullText.includes('access')) {
    suggestedPrio = 'low';
    suggestedCat = 'service_request';
  } else if (fullText.includes('upgrade') || fullText.includes('migrasi') || fullText.includes('perubahan') || fullText.includes('migration') || fullText.includes('patch')) {
    suggestedPrio = 'high';
    suggestedCat = 'change_request';
  }

  if (catSelect) catSelect.value = suggestedCat;
  if (prioSelect) prioSelect.value = suggestedPrio;

  toast.info('Auto-Triage Complete', `Category set to "${suggestedCat}" & Priority "${suggestedPrio}"`);
};

window.showKnowledgeArticleModalDirect = async function(articleId) {
  try {
    const a = await api.get(`/knowledge/${articleId}`);
    modal.show(`
      <div class="modal-header">
        <span class="modal-title font-bold text-sm">${escHtml(a.title)}</span>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="font-size:0.875rem;line-height:1.8;color:var(--text-secondary)">
          ${a.content}
        </div>
      </div>
      <div class="modal-footer" style="justify-content:space-between">
        <div class="text-xs text-muted">Did this article resolve your problem?</div>
        <div class="flex gap-2">
          <button class="btn btn-success btn-sm" onclick="modal.close();toast.success('Issue resolved without submitting a ticket.')">Yes, Issue Resolved</button>
          <button class="btn btn-secondary btn-sm" onclick="modal.close()">Continue with Ticket</button>
        </div>
      </div>
    `, { size: 'modal-lg' });
  } catch(e) {
    toast.error('Failed to load article');
  }
};

// ============================================
// CSAT RATING MODAL
// ============================================

window.showCsatModal = function(ticketId) {
  modal.show(`
    <div class="modal-header text-center" style="display:block">
      <div style="display:inline-flex;padding:12px;background:rgba(99,102,241,0.1);border-radius:50%;color:#818cf8;margin-bottom:0.5rem">
        ${renderIcon('star')}
      </div>
      <div class="modal-title font-bold" style="font-size:1.15rem">Customer Satisfaction Survey (CSAT)</div>
      <div class="text-xs text-muted mt-1">Rate the resolution speed and support quality of our IT team</div>
    </div>
    <div class="modal-body text-center">
      <!-- 5-Star Interactive Selector -->
      <div class="flex-center gap-3 my-4" id="csat-star-container">
        ${[1, 2, 3, 4, 5].map(star => `
          <button type="button" class="csat-star-btn cursor-pointer btn-ghost p-1" data-rating="${star}" onclick="selectCsatStar(${star})" style="font-size:1.75rem;color:#64748b;transition:all 0.15s;border:none;background:none">
            ★
          </button>
        `).join('')}
      </div>
      <input type="hidden" id="selected-csat-score" value="5">
      <div class="text-xs font-bold text-accent mb-4" id="csat-rating-label">Very Satisfied (5.0 / 5.0)</div>

      <div class="form-group text-left">
        <label class="form-label font-medium text-xs">Your Feedback & Comments (Optional)</label>
        <textarea class="form-control" id="csat-feedback-text" rows="3" placeholder="Share your experience or suggestions for our technical support team..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Maybe Later</button>
      <button class="btn btn-primary" onclick="submitCsatRating(${ticketId})">Submit Rating</button>
    </div>
  `);

  selectCsatStar(5);
};

window.selectCsatStar = function(score) {
  const input = document.getElementById('selected-csat-score');
  const label = document.getElementById('csat-rating-label');
  if (input) input.value = score;

  const labels = {
    1: 'Very Dissatisfied (1.0 / 5.0)',
    2: 'Dissatisfied (2.0 / 5.0)',
    3: 'Neutral (3.0 / 5.0)',
    4: 'Satisfied (4.0 / 5.0)',
    5: 'Very Satisfied (5.0 / 5.0)',
  };
  if (label) label.textContent = labels[score] || `${score}.0 / 5.0`;

  document.querySelectorAll('.csat-star-btn').forEach(btn => {
    const starVal = parseInt(btn.getAttribute('data-rating'));
    if (starVal <= score) {
      btn.style.color = '#f59e0b';
      btn.style.transform = 'scale(1.15)';
    } else {
      btn.style.color = '#475569';
      btn.style.transform = 'scale(1.0)';
    }
  });
};

window.submitCsatRating = async function(ticketId) {
  const rating = parseInt(document.getElementById('selected-csat-score')?.value) || 5;
  const feedback = document.getElementById('csat-feedback-text')?.value.trim() || '';

  try {
    await ticketsApi.rate(ticketId, { rating, feedback });
    modal.close();
    toast.success('Thank you!', 'Your feedback rating has been submitted.');
    loadTicketDetail(ticketId);
  } catch(e) {
    toast.error('Failed to submit rating', e.message);
  }
};

