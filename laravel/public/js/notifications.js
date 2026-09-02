/**
 * Knowledge Base, Users, Assets, Profile Pages
 */

// ============================================
// KNOWLEDGE BASE
// ============================================
window.loadKnowledge = async function(params = {}) {
  const content = document.getElementById('page-content');
  const user = appState.user;
  const isAgent = ['admin','manager','agent'].includes(user.role);

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Knowledge Base</h1>
        <p class="page-subtitle">Technical guides, standard operating procedures (SOP), and self-service documentation</p>
      </div>
      ${isAgent ? `
        <button class="btn btn-primary" onclick="showNewArticleModal()">
          ${renderIcon('plus')}
          <span>Write Article</span>
        </button>
      ` : ''}
    </div>

    <!-- Search & Filter -->
    <div class="card mb-4">
      <div class="card-body p-3">
        <div class="flex gap-3 items-center flex-wrap">
          <div class="search-input-wrap" style="flex:1;min-width:200px">
            <span class="search-icon">${renderIcon('search')}</span>
            <input type="text" class="form-control" id="kb-search" placeholder="Search articles, topics, or keywords...">
          </div>
          <select class="form-control" id="kb-category" style="width:180px">
            <option value="">All Categories</option>
          </select>
        </div>
      </div>
    </div>

    <div id="kb-grid" class="kb-grid">
      ${[1,2,3,4,5,6].map(() => `
        <div class="kb-card">
          <div class="skeleton" style="height:20px;width:80%;margin-bottom:8px"></div>
          <div class="skeleton" style="height:14px;width:60%"></div>
          <div class="skeleton" style="height:14px;width:40%"></div>
        </div>
      `).join('')}
    </div>
  `;

  try {
    const data = await knowledgeApi.list({ limit: 50 });
    renderKBArticles(data.articles);

    // Populate categories
    const catSelect = document.getElementById('kb-category');
    if (catSelect) {
      data.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
        catSelect.appendChild(opt);
      });
    }
  } catch(e) {
    toast.error('Failed to load knowledge base');
  }

  // Search handler
  document.getElementById('kb-search')?.addEventListener('input', debounce(async (e) => {
    const q = e.target.value;
    const cat = document.getElementById('kb-category')?.value || '';
    const data = await knowledgeApi.list({ search: q, category: cat, limit: 50 }).catch(() => ({ articles: [] }));
    renderKBArticles(data.articles);
  }, 400));

  document.getElementById('kb-category')?.addEventListener('change', async (e) => {
    const q = document.getElementById('kb-search')?.value || '';
    const data = await knowledgeApi.list({ search: q, category: e.target.value, limit: 50 }).catch(() => ({ articles: [] }));
    renderKBArticles(data.articles);
  });
};

function renderKBArticles(articles) {
  const grid = document.getElementById('kb-grid');
  if (!grid) return;

  if (!articles.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon text-muted">${renderIcon('book')}</div>
        <div class="empty-title">No articles found</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = articles.map(a => `
    <div class="kb-card" onclick="navigateTo('article-${a.id}')">
      <div>
        <span class="badge badge-info" style="font-size:0.7rem">${escHtml(a.category)}</span>
      </div>
      <div class="kb-card-title">${escHtml(a.title)}</div>
      <div class="kb-card-meta">
        <span>${a.views} views</span>
        <span>·</span>
        <span>${a.helpful_count} helpful</span>
        <span>·</span>
        <span>${formatDateShort(a.updated_at)}</span>
      </div>
      ${a.tags ? `
        <div class="kb-tags">
          ${(JSON.parse(a.tags || '[]')).slice(0, 4).map(tag => `<span class="kb-tag">${escHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="text-xs text-muted">by ${escHtml(a.author_name)}</div>
    </div>
  `).join('');
}

// Helper to render HTML or Markdown
window.renderArticleBody = function(content) {
  if (!content) return '';
  if (/<(p|h1|h2|h3|h4|ul|ol|li|blockquote|pre|strong|em|u|s|span|div|a|img)[^>]*>/i.test(content)) {
    return content;
  }
  return renderMarkdown(content);
};

window.initQuillEditor = function(selector, initialHtml = '') {
  window.currentQuill = null;
  const container = document.querySelector(selector);
  if (!container) return;

  if (typeof Quill === 'undefined') {
    container.innerHTML = `<textarea class="form-control" id="quill-fallback-input" rows="10">${escHtml(initialHtml)}</textarea>`;
    return;
  }

  const quill = new Quill(selector, {
    theme: 'snow',
    placeholder: 'Write your IT guide or troubleshooting steps here...',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'clean']
      ]
    }
  });

  if (initialHtml) {
    if (/<[a-z][\s\S]*>/i.test(initialHtml)) {
      quill.clipboard.dangerouslyPasteHTML(initialHtml);
    } else {
      quill.setText(initialHtml);
    }
  }

  window.currentQuill = quill;
};

window.loadArticleDetail = async function(id) {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="flex-center" style="height:60vh"><div class="spinner spinner-lg"></div></div>`;

  try {
    const article = await knowledgeApi.get(id);
    const user = appState.user;
    const isAgent = ['admin','manager','agent'].includes(user.role);

    content.innerHTML = `
      <div class="page-header">
        <div class="flex items-center gap-3">
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('knowledge')">
            ${renderIcon('arrowLeft')}
            <span>Knowledge Base</span>
          </button>
        </div>
        ${isAgent ? `
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" onclick="showEditArticleModal(${article.id})">
            ${renderIcon('edit')}
            <span>Edit</span>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteArticle(${article.id})">
            ${renderIcon('trash')}
          </button>
        </div>
        ` : ''}
      </div>

      <div style="max-width:900px;display:grid;grid-template-columns:1fr 280px;gap:1.5rem;align-items:start">
        <div class="card">
          <div class="card-body">
            <div class="flex items-center gap-2 mb-3">
              <span class="badge badge-info">${escHtml(article.category)}</span>
              <span class="text-xs text-muted">by ${escHtml(article.author_name)}</span>
              <span class="text-xs text-muted">·</span>
              <span class="text-xs text-muted">${formatDateShort(article.updated_at)}</span>
            </div>
            <h1 style="font-size:1.4rem;font-weight:700;color:var(--text-primary);margin-bottom:1.25rem">${escHtml(article.title)}</h1>
            <div class="article-content ql-editor" style="padding:0">${renderArticleBody(article.content)}</div>

            <!-- Tags -->
            ${article.tags ? `
            <div class="kb-tags mt-4">
              ${(JSON.parse(article.tags || '[]')).map(t => `<span class="kb-tag">#${escHtml(t)}</span>`).join('')}
            </div>
            ` : ''}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:1rem;position:sticky;top:calc(var(--topbar-height) + 1rem)">
          <div class="card">
            <div class="card-body" style="display:flex;flex-direction:column;gap:0.75rem">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">Views</span>
                <span class="font-semibold text-xs">${article.views}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">Helpful</span>
                <span class="font-semibold text-xs text-success">${article.helpful_count}</span>
              </div>
              <hr class="divider">
              <p class="text-xs text-muted">Was this article helpful?</p>
              <button class="btn btn-success w-full btn-sm" id="helpful-btn" onclick="markHelpful(${article.id})">Yes, Helpful</button>
              <button class="btn btn-secondary w-full btn-sm" onclick="navigateTo('new-ticket')">Still need help? Open a Ticket</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-title">Article not found</div><button class="btn btn-primary mt-4" onclick="navigateTo('knowledge')">Back</button></div>`;
  }
};

window.markHelpful = async function(id) {
  try {
    await knowledgeApi.helpful(id);
    toast.success('Thank you for your feedback!');
    document.getElementById('helpful-btn').disabled = true;
  } catch(e) {}
};

window.showNewArticleModal = function() {
  modal.show(`
    <div class="modal-header">
      <span class="modal-title font-bold text-sm">Write New Article</span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="form-group">
          <label class="form-label font-medium text-xs">Article Title *</label>
          <input type="text" class="form-control" id="art-title" placeholder="e.g. Corporate VPN & Remote Access Setup Guide">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Category</label>
            <input type="text" class="form-control" id="art-category" placeholder="Network, Software, Hardware...">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Tags (comma separated)</label>
            <input type="text" class="form-control" id="art-tags" placeholder="vpn, network, remote">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label font-medium text-xs">Article Body *</label>
          <div id="art-editor-container"></div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="saveArticle()">Publish Article</button>
    </div>
  `, { size: 'modal-lg' });

  setTimeout(() => {
    initQuillEditor('#art-editor-container');
  }, 60);
};

window.saveArticle = async function(id = null) {
  const title = document.getElementById('art-title')?.value.trim();
  const category = document.getElementById('art-category')?.value.trim() || 'General';
  const rawTags = document.getElementById('art-tags')?.value || '';
  const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);

  let content = '';
  if (window.currentQuill) {
    content = window.currentQuill.root.innerHTML;
  } else {
    content = document.getElementById('quill-fallback-input')?.value || '';
  }

  if (!title || !content || content === '<p><br></p>') {
    toast.warning('Article title and body are required');
    return;
  }

  try {
    if (id) {
      await knowledgeApi.update(id, { title, content, category, tags });
    } else {
      await knowledgeApi.create({ title, content, category, tags });
    }
    modal.close();
    toast.success(id ? 'Article updated successfully' : 'New article published successfully');
    loadKnowledge();
  } catch(e) {
    toast.error('Failed to save article', e.message);
  }
};

window.showEditArticleModal = async function(id) {
  try {
    const article = await knowledgeApi.get(id);
    modal.show(`
      <div class="modal-header">
        <span class="modal-title font-bold text-sm">Edit Article</span>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Article Title *</label>
            <input type="text" class="form-control" id="art-title" value="${escHtml(article.title)}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Category</label>
              <input type="text" class="form-control" id="art-category" value="${escHtml(article.category)}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Tags</label>
              <input type="text" class="form-control" id="art-tags" value="${escHtml((JSON.parse(article.tags || '[]')).join(', '))}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Article Body *</label>
            <div id="art-editor-container"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveArticle(${id})">Save Changes</button>
      </div>
    `, { size: 'modal-lg' });

    setTimeout(() => {
      initQuillEditor('#art-editor-container', article.content);
    }, 60);
  } catch(e) {
    toast.error('Failed to load article');
  }
};

window.deleteArticle = function(id) {
  modal.confirm('Delete Article', 'This article will be permanently deleted.', async () => {
    await knowledgeApi.delete(id).catch(e => toast.error('Failed to delete', e.message));
    toast.success('Article deleted');
    navigateTo('knowledge');
  });
};

// ============================================
// USER MANAGEMENT
// ============================================
window.loadUsers = async function() {
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">User Management</h1>
        <p class="page-subtitle">Manage user accounts, role-based access control (RBAC), and team assignments</p>
      </div>
      <button class="btn btn-primary" onclick="showNewUserModal()">
        ${renderIcon('plus')}
        <span>Add New User</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-4" style="width:100%">
      <div class="card-body p-3">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="search-input-wrap" style="flex:1;min-width:240px">
            <span class="search-icon">${renderIcon('search')}</span>
            <input type="text" class="form-control" id="user-search" placeholder="Search name, email, department, or specialty...">
          </div>
          <select class="form-control" id="user-role-filter" style="width:140px">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="agent">Agent (Technician)</option>
            <option value="user">Standard User</option>
          </select>
          <select class="form-control" id="user-it-filter" style="width:160px">
            <option value="">All Teams</option>
            <option value="true">⭐ IT Support Team</option>
            <option value="false">Non-IT Staff</option>
          </select>
          <select class="form-control" id="user-auth-filter" style="width:150px">
            <option value="">All Sources</option>
            <option value="ldap">🏢 LDAP / Zimbra</option>
            <option value="local">🔑 Local Account</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Users Table Card -->
    <div class="card" style="width:100%">
      <div class="table-responsive" id="users-table">
        <div class="flex-center p-6"><div class="spinner spinner-lg"></div></div>
      </div>
    </div>
  `;

  fetchAndRenderUsers();

  document.getElementById('user-search')?.addEventListener('input', debounce(() => fetchAndRenderUsers(), 400));
  document.getElementById('user-role-filter')?.addEventListener('change', () => fetchAndRenderUsers());
  document.getElementById('user-it-filter')?.addEventListener('change', () => fetchAndRenderUsers());
  document.getElementById('user-auth-filter')?.addEventListener('change', () => fetchAndRenderUsers());
};

async function fetchAndRenderUsers() {
  const params = {};
  const search = document.getElementById('user-search')?.value;
  const role = document.getElementById('user-role-filter')?.value;
  const is_it_support = document.getElementById('user-it-filter')?.value;
  const auth_source = document.getElementById('user-auth-filter')?.value;

  if (search) params.search = search;
  if (role) params.role = role;
  if (is_it_support) params.is_it_support = is_it_support;
  if (auth_source) params.auth_source = auth_source;

  try {
    const users = await usersApi.list(params);
    renderUsersTable(users);
  } catch(e) {
    toast.error('Failed to load users');
  }
}

function renderUsersTable(users) {
  const el = document.getElementById('users-table');
  if (!el) return;

  if (!users.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon text-muted">${renderIcon('users')}</div><div class="empty-title">No users found</div></div>`;
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>User & Identity</th>
          <th>Team / Special Tag</th>
          <th>Role</th>
          <th>Department</th>
          <th>IT Team Status</th>
          <th>Account Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>
              <div class="flex items-center gap-2.5">
                <div class="avatar" style="${u.is_it_support ? 'border:2px solid #6366f1;box-shadow:0 0 8px rgba(99,102,241,0.4)' : ''}">${getInitials(u.name)}</div>
                <div>
                  <div class="font-bold flex items-center gap-1.5">
                    <span>${escHtml(u.name)}</span>
                    ${u.auth_source === 'ldap' ? `
                      <span class="badge badge-secondary" style="font-size:0.65rem;padding:1px 5px;background:rgba(59,130,246,0.15);color:#60a5fa" title="LDAP / Zimbra Integrated Account">LDAP</span>
                    ` : ''}
                  </div>
                  <div class="text-xs text-muted font-mono">${escHtml(u.email)}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="flex flex-col gap-1">
                ${u.is_it_support ? `
                  <span class="badge badge-primary font-bold" style="font-size:0.72rem;background:#4338ca;color:#e0e7ff;border:1px solid #6366f1;width:max-content">
                    ⭐ IT SUPPORT TEAM
                  </span>
                  ${u.it_specialty ? `<span class="text-xs text-secondary font-medium">${escHtml(u.it_specialty)}</span>` : ''}
                ` : `
                  <span class="badge badge-secondary text-muted" style="font-size:0.7rem;width:max-content">Standard User</span>
                `}
              </div>
            </td>
            <td><span class="badge role-badge-${u.role}">${u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span></td>
            <td class="text-sm">${escHtml(u.department || '-')}</td>
            <td>
              <button class="btn btn-xs ${u.is_it_support ? 'btn-primary' : 'btn-ghost'}" 
                onclick="quickToggleItSupport(${u.id}, ${!u.is_it_support})"
                style="${u.is_it_support ? 'background:rgba(99,102,241,0.2);color:#818cf8;border:1px solid #6366f1' : 'border:1px dashed var(--border-primary);color:var(--text-muted)'}"
                title="${u.is_it_support ? 'Click to revoke IT Support designation' : 'Click to assign as IT Support team member'}">
                ${u.is_it_support ? '✓ IT Member' : '+ Set IT Team'}
              </button>
            </td>
            <td>
              <button class="btn btn-xs" 
                onclick="toggleUserActive(${u.id}, ${u.is_active}, '${escHtml(u.name)}')"
                style="${u.is_active 
                  ? 'background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.3);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer' 
                  : 'background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer'}"
                title="${u.is_active ? 'Status: Active (Can Login). Click to deactivate account' : 'Status: Inactive (Blocked). Click to reactivate'}">
                <span class="status-dot ${u.is_active ? 'status-dot-active' : 'status-dot-inactive'}"></span>
                <span>${u.is_active ? 'Active' : 'Inactive'}</span>
              </button>
            </td>
            <td>
              <div class="flex items-center gap-1">
                <button class="btn btn-sm btn-ghost" onclick="showUserSessionsModal(${u.id}, '${escHtml(u.name)}')" title="View Active Login Sessions & Security Manager" style="color:#818cf8;display:inline-flex;align-items:center;gap:4px">
                  <span>🔑</span>
                  <span class="text-xs" style="font-weight:600">Sessions</span>
                </button>
                <button class="btn btn-sm btn-ghost" onclick="showEditUserModal(${u.id})" title="Edit User, Role, & Status" style="color:var(--text-secondary)">
                  ${renderIcon('edit')}
                </button>
                ${u.id !== appState.user.id ? `
                  <button class="btn btn-sm btn-ghost ${u.is_active ? 'text-warning' : 'text-success'}" 
                    onclick="toggleUserActive(${u.id}, ${u.is_active}, '${escHtml(u.name)}')" 
                    title="${u.is_active ? 'Deactivate Account (Revoke Login Access)' : 'Reactivate Account (Allow Login)'}">
                    ${u.is_active ? '🚫' : '✓'}
                  </button>
                  ${(u.email !== 'admin@itsm.com' && u.id !== 1) ? `
                    <button class="btn btn-sm btn-ghost text-danger" 
                      onclick="confirmDeleteUser(${u.id}, '${escHtml(u.name)}', '${escHtml(u.email)}')" 
                      title="Permanently Delete User">
                      ${renderIcon('trash')}
                    </button>
                  ` : ''}
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function validateEmailFormat(email) {
  if (!email || !email.includes('@')) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }
  const parts = email.split('@');
  if (parts.length !== 2) {
    return { valid: false, message: 'Email address must contain a single @ separator.' };
  }
  const [local, domain] = parts;
  if (local.length < 2 || /^(test|dummy|fake|asdf|qwerty|temp|sample|testing)$/i.test(local)) {
    return { valid: false, message: 'Dummy username (e.g. test, dummy, fake) is not allowed. Please enter a real user email.' };
  }
  if (!domain.includes('.') || domain.split('.').pop().length < 2) {
    return { valid: false, message: 'Email domain must have a valid top-level domain (e.g. .com, .id).' };
  }
  const blockedDomains = [
    'example.com', 'example.org', 'example.net', 'test.com', 'test.net',
    'dummy.com', 'fake.com', 'invalid.com', 'sample.com', 'temp.com',
    'asdf.com', 'qwerty.com', 'mailinator.com', '10minutemail.com', 'tempmail.com',
    'throwawaymail.com', 'yopmail.com', 'trashmail.com'
  ];
  if (blockedDomains.includes(domain.toLowerCase())) {
    return { valid: false, message: `Domain '@${domain}' is a dummy/disposable domain. Please use a valid corporate or recognized email (e.g. name@company.com, name@gmail.com).` };
  }
  return { valid: true };
}

window.quickToggleItSupport = async function(id, setAsIt) {
  try {
    const res = await usersApi.toggleItSupport(id, { is_it_support: setAsIt });
    toast.success(res.message || 'IT Support status updated successfully');
    fetchAndRenderUsers();
  } catch(e) {
    toast.error('Failed to change IT Support status', e.message);
  }
};

window.handleRealtimeEmailValidation = debounce(async function(email) {
  const inputEl = document.getElementById('nu-email');
  const feedbackEl = document.getElementById('nu-email-feedback');
  if (!inputEl || !feedbackEl) return;

  const trimmed = (email || '').trim();
  if (!trimmed) {
    inputEl.style.borderColor = '';
    feedbackEl.innerHTML = `<span class="text-muted">Must be a valid real domain. Disposable/dummy emails are blocked.</span>`;
    return;
  }

  // 1. Fast preliminary client-side check
  const localCheck = validateEmailFormat(trimmed);
  if (!localCheck.valid) {
    inputEl.style.borderColor = '#ef4444';
    feedbackEl.innerHTML = `<span style="color:#ef4444;font-weight:500">⚠️ ${escHtml(localCheck.message)}</span>`;
    return;
  }

  // 2. Query backend live validation & global DNS MX mail checker
  feedbackEl.innerHTML = `<span style="color:#818cf8;display:inline-flex;align-items:center;gap:4px"><span>⏳</span><span>Checking global DNS Mail Server (MX) records...</span></span>`;

  try {
    const res = await usersApi.checkEmail(trimmed);
    if (!res.valid) {
      inputEl.style.borderColor = '#ef4444';
      feedbackEl.innerHTML = `<span style="color:#ef4444;font-weight:600">❌ ${escHtml(res.message)}</span>`;
    } else if (!res.available) {
      inputEl.style.borderColor = '#f59e0b';
      feedbackEl.innerHTML = `<span style="color:#f59e0b;font-weight:600">⚠️ ${escHtml(res.message)}</span>`;
    } else {
      inputEl.style.borderColor = '#10b981';
      const mxHost = res.mx_host ? ` <code style="background:rgba(16,185,129,0.15);color:#34d399;padding:1px 5px;border-radius:4px;font-size:0.7rem">MX: ${escHtml(res.mx_host)}</code>` : '';
      feedbackEl.innerHTML = `<span style="color:#10b981;font-weight:600">✓ Verified Active Global Mailbox${mxHost}</span>`;
    }
  } catch(e) {
    inputEl.style.borderColor = '#10b981';
    feedbackEl.innerHTML = `<span style="color:#10b981;font-weight:600">✓ Valid email format</span>`;
  }
}, 250);

window.showNewUserModal = function() {
  modal.show(`
    <div class="modal-header">
      <span class="modal-title font-bold text-sm">Add New User</span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Full Name *</label>
            <input type="text" class="form-control" id="nu-name" placeholder="Full name">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Corporate / Real Email *</label>
            <input type="email" class="form-control" id="nu-email" placeholder="user@company.com" oninput="handleRealtimeEmailValidation(this.value)" onblur="handleRealtimeEmailValidation(this.value)">
            <div class="text-xs mt-1" id="nu-email-feedback">
              <span class="text-muted">Must be a valid real domain. Disposable/dummy emails are blocked.</span>
            </div>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Password *</label>
            <input type="password" class="form-control" id="nu-password" placeholder="Minimum 8 characters">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Role</label>
            <select class="form-control" id="nu-role" onchange="document.getElementById('nu-is-it').checked = ['agent','admin','manager'].includes(this.value)">
              <option value="user">User</option>
              <option value="agent">Agent (Technician)</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <!-- IT Support Tagging Section -->
        <div class="p-3 card" style="background:var(--bg-input);border-radius:8px">
          <label class="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" id="nu-is-it">
            <span class="font-bold text-xs text-primary">⭐ Assign as IT Support Team Member</span>
          </label>
          <div class="form-group mb-0">
            <label class="form-label font-medium text-xs">IT Specialty / Area of Expertise</label>
            <input type="text" class="form-control text-xs" id="nu-specialty" placeholder="e.g. Helpdesk Tier 1, Network & Infra, SysAdmin Zimbra, Desktop Hardware...">
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Department</label>
            <input type="text" class="form-control" id="nu-dept" placeholder="IT, Finance, HR...">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Phone Number</label>
            <input type="text" class="form-control" id="nu-phone" placeholder="+62...">
          </div>
        </div>

        <!-- Automatic Welcome & Verification Email Dispatch -->
        <div class="p-3 card" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:8px">
          <label class="flex items-start gap-2.5 cursor-pointer mb-0">
            <input type="checkbox" id="nu-send-email" checked style="margin-top:2px">
            <div>
              <span class="font-bold text-xs text-primary flex items-center gap-1.5">
                <span>📧</span>
                <span>Send Welcome & Verification Email with Login Details</span>
              </span>
              <div class="text-xs text-muted mt-0.5" style="line-height:1.4">
                Automatically delivers account confirmation, portal URL, and login credentials to the user's verified inbox via SMTP Gateway.
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="createUser()">Save User</button>
    </div>
  `);
};

window.createUser = async function() {
  const isIt = !!document.getElementById('nu-is-it')?.checked;
  const sendEmail = !!document.getElementById('nu-send-email')?.checked;
  const emailVal = document.getElementById('nu-email').value.trim();

  const emailCheck = validateEmailFormat(emailVal);
  if (!emailCheck.valid) {
    toast.warning(emailCheck.message);
    document.getElementById('nu-email').focus();
    return;
  }

  const data = {
    name: document.getElementById('nu-name').value.trim(),
    email: emailVal,
    password: document.getElementById('nu-password').value,
    role: document.getElementById('nu-role').value,
    is_it_support: isIt,
    it_specialty: document.getElementById('nu-specialty')?.value.trim() || (isIt ? 'General IT Support' : null),
    department: document.getElementById('nu-dept').value.trim(),
    phone: document.getElementById('nu-phone').value.trim(),
    send_email: sendEmail,
  };
  if (!data.name || !data.email || !data.password) { toast.warning('Name, email, and password are required'); return; }

  try {
    const res = await usersApi.create(data);
    modal.close();
    if (res.email_sent) {
      toast.success(`User created & welcome/verification email sent to ${data.email}`);
    } else {
      toast.success('User created successfully');
    }
    fetchAndRenderUsers();
  } catch(e) {
    toast.error('Failed to create user', e.message);
  }
};

window.resendUserVerification = async function(id, userName) {
  try {
    toast.info(`Dispatching welcome/verification email to ${userName}...`);
    const res = await usersApi.resendVerification(id);
    if (res.success) {
      toast.success(res.message || 'Verification email successfully sent!');
    } else {
      toast.warning(res.message || 'Email gateway message logged.');
    }
  } catch(e) {
    toast.error('Failed to send verification email', e.message);
  }
};

window.showEditUserModal = async function(id) {
  try {
    const u = await usersApi.get(id);
    const isSelf = u.id === appState.user.id;
    const isSuperadmin = u.email === 'admin@itsm.com' || u.id === 1;

    modal.show(`
      <div class="modal-header">
        <span class="modal-title font-bold text-sm">Edit User & Account Settings</span>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Full Name *</label>
              <input type="text" class="form-control" id="eu-name" value="${escHtml(u.name)}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Email</label>
              <input type="email" class="form-control" id="eu-email" value="${escHtml(u.email)}" disabled style="opacity:0.75;background:var(--bg-input)">
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Access Role (RBAC)</label>
              <select class="form-control" id="eu-role" ${isSelf ? 'disabled title="Cannot change own account role"' : ''}>
                <option value="user" ${u.role==='user'?'selected':''}>User</option>
                <option value="agent" ${u.role==='agent'?'selected':''}>Agent (Technician)</option>
                <option value="manager" ${u.role==='manager'?'selected':''}>Manager</option>
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Login Account Status</label>
              <select class="form-control font-medium" id="eu-is-active" ${isSelf ? 'disabled title="Cannot deactivate own account"' : ''}>
                <option value="true" ${u.is_active ? 'selected' : ''}>🟢 Active (Can Login)</option>
                <option value="false" ${!u.is_active ? 'selected' : ''}>🔴 Inactive (Access Blocked)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Department</label>
            <input type="text" class="form-control" id="eu-dept" value="${escHtml(u.department || '')}" placeholder="e.g. IT Infrastructure, Finance, Marketing...">
          </div>

          <!-- IT Support Tag & Specialty Section -->
          <div class="p-3 card" style="background:var(--bg-input);border-radius:8px">
            <label class="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" id="eu-is-it" ${u.is_it_support ? 'checked' : ''}>
              <span class="font-bold text-xs text-primary">⭐ Assign as IT Support Team Member</span>
            </label>
            <div class="form-group mb-0">
              <label class="form-label font-medium text-xs">IT Specialty / Expertise</label>
              <input type="text" class="form-control text-xs" id="eu-specialty" placeholder="e.g. Helpdesk Tier 1, Network & Infra, SysAdmin Zimbra, Hardware..." value="${escHtml(u.it_specialty || '')}">
              <div class="text-xs text-muted mt-1">This tag helps managers identify specialist skills during ticket assignments.</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">New Password (leave blank to keep current)</label>
            <input type="password" class="form-control" id="eu-pass" placeholder="Minimum 8 new characters...">
          </div>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm text-primary" onclick="resendUserVerification(${u.id}, '${escHtml(u.name)}')" title="Resend Welcome Email with login details to user's registered inbox" style="border:1px solid rgba(99,102,241,0.3)">
            📧 Resend Welcome Email
          </button>
          ${(!isSelf && !isSuperadmin) ? `
            <button class="btn btn-ghost text-danger btn-sm" onclick="modal.close(); confirmDeleteUser(${u.id}, '${escHtml(u.name)}', '${escHtml(u.email)}')">
              ${renderIcon('trash')} Delete
            </button>
          ` : ''}
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
          <button class="btn btn-primary" onclick="updateUser(${u.id})">Save Changes</button>
        </div>
      </div>
    `);
  } catch(e) { toast.error('Failed to load user data'); }
};

window.updateUser = async function(id) {
  const isIt = !!document.getElementById('eu-is-it')?.checked;
  const isActiveEl = document.getElementById('eu-is-active');
  const roleEl = document.getElementById('eu-role');

  const data = {
    name: document.getElementById('eu-name').value.trim(),
    department: document.getElementById('eu-dept').value.trim(),
    is_it_support: isIt,
    it_specialty: document.getElementById('eu-specialty')?.value.trim() || (isIt ? 'General IT Support' : null),
  };

  if (roleEl && !roleEl.disabled) {
    data.role = roleEl.value;
  }
  if (isActiveEl && !isActiveEl.disabled) {
    data.is_active = isActiveEl.value === 'true';
  }

  const pass = document.getElementById('eu-pass').value;
  if (pass) data.password = pass;

  try {
    const res = await usersApi.update(id, data);
    modal.close();
    toast.success('User details, active status, and IT profile updated successfully');
    fetchAndRenderUsers();
  } catch(e) { toast.error(e.message || 'Failed to update user'); }
};

window.toggleUserActive = async function(id, isActive, name) {
  const actionTitle = isActive ? 'Deactivate User Account' : 'Reactivate User Account';
  const actionDesc = isActive 
    ? `Are you sure you want to <b>deactivate</b> the account for <b>${escHtml(name)}</b>?<br><br><span class="text-xs text-muted">⚠️ The user will not be able to log in to the portal, but all historical tickets and audit logs remain intact.</span>`
    : `Are you sure you want to <b>reactivate</b> the account for <b>${escHtml(name)}</b> so they can log in to the portal?`;

  modal.show(`
    <div class="modal-header" style="${isActive ? 'border-bottom:1px solid rgba(245,158,11,0.2)' : 'border-bottom:1px solid rgba(34,197,94,0.2)'}">
      <span class="modal-title font-bold text-sm flex items-center gap-2">
        <span style="font-size:1.1rem">${isActive ? '⚠️' : '✅'}</span>
        ${actionTitle}
      </span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <p class="text-sm text-secondary" style="line-height:1.6">${actionDesc}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn ${isActive ? 'btn-warning' : 'btn-success'}" onclick="executeToggleUserActive(${id}, ${!isActive})">
        ${isActive ? 'Yes, Deactivate Account' : 'Yes, Reactivate Account'}
      </button>
    </div>
  `);
};

window.executeToggleUserActive = async function(id, shouldBeActive) {
  try {
    const res = await usersApi.toggleActive(id, { is_active: shouldBeActive });
    modal.close();
    toast.success(res.message || 'User account status updated successfully');
    fetchAndRenderUsers();
  } catch(e) {
    toast.error(e.message || 'Failed to change user status');
  }
};

window.confirmDeleteUser = function(id, name, email) {
  modal.show(`
    <div class="modal-header" style="border-bottom:1px solid rgba(239,68,68,0.2)">
      <span class="modal-title font-bold text-sm flex items-center gap-2 text-danger">
        <span>🗑️</span> Permanently Delete User
      </span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:0.85rem">
        <p class="text-sm" style="line-height:1.5">
          Are you sure you want to <b>permanently delete</b> this user account from the system?
        </p>
        <div class="p-3 card" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px">
          <div class="font-bold text-sm">${escHtml(name)}</div>
          <div class="text-xs text-muted font-mono mt-0.5">${escHtml(email)}</div>
        </div>
        <div class="text-xs text-muted" style="line-height:1.4">
          💡 <i>Tip: If you only want to revoke access without deleting history, choose <b>"Deactivate Only"</b>.</i>
        </div>
      </div>
    </div>
    <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <div class="flex gap-2">
        <button class="btn btn-ghost text-warning" onclick="executeToggleUserActive(${id}, false)" style="border:1px solid rgba(245,158,11,0.3)">
          Deactivate Only
        </button>
        <button class="btn btn-danger" onclick="executeDeleteUser(${id})">
          Delete Permanently
        </button>
      </div>
    </div>
  `);
};

window.executeDeleteUser = async function(id) {
  try {
    const res = await usersApi.delete(id);
    modal.close();
    toast.success(res.message || 'User permanently deleted from system');
    fetchAndRenderUsers();
  } catch(e) {
    toast.error(e.message || 'Failed to delete user');
  }
};

// ============================================
// USER ACTIVE SESSION MANAGER
// ============================================
window.showUserSessionsModal = async function(id, userName) {
  try {
    modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`, { size: 'modal-lg' });
    const data = await usersApi.getSessions(id);
    const u = data.user;
    const tokens = data.tokens || [];
    const sessions = data.sessions || [];
    const total = data.total_active_sessions || 0;

    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2.5">
          <span style="font-size:1.3rem">🛡️</span>
          <div>
            <span class="modal-title font-bold text-sm">Session Security & Active Devices — ${escHtml(u.name)}</span>
            <div class="text-xs text-muted font-mono">${escHtml(u.email)} • Role: ${u.role.toUpperCase()}</div>
          </div>
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <!-- Summary Banner -->
        <div class="p-3 mb-4 flex items-center justify-between flex-wrap gap-3" style="background:var(--bg-input);border:1px solid var(--border-primary);border-radius:8px">
          <div class="flex items-center gap-3">
            <div class="stat-value text-primary" style="font-size:1.5rem;font-weight:700">${total}</div>
            <div>
              <div class="font-bold text-xs">Active Login Sessions / Tokens</div>
              <div class="text-xs text-muted">Web browsers, mobile apps & API tokens currently authenticated</div>
            </div>
          </div>
          ${total > 0 ? `
            <button class="btn btn-danger btn-sm" onclick="clearAllUserSessions(${u.id}, '${escHtml(u.name)}')">
              ${renderIcon('trash')}
              <span>Clear All Sessions (Force Logout)</span>
            </button>
          ` : `
            <span class="badge badge-secondary text-xs">No active sessions</span>
          `}
        </div>

        <!-- Sessions List -->
        <div class="card">
          <div class="card-header py-2 flex items-center justify-between">
            <span class="card-title text-xs font-semibold">Active Login Tokens & Device Connections</span>
            <button class="btn btn-ghost btn-xs text-primary" onclick="showUserSessionsModal(${u.id}, '${escHtml(u.name)}')">
              ${renderIcon('refresh')} Refresh
            </button>
          </div>
          <div class="table-responsive" style="max-height:300px;overflow-y:auto">
            ${(tokens.length || sessions.length) ? `
              <table class="table text-xs">
                <thead>
                  <tr>
                    <th>Session / Device Client</th>
                    <th>Authentication Type</th>
                    <th>Created</th>
                    <th>Last Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${tokens.map(t => `
                    <tr>
                      <td>
                        <div class="font-bold text-primary flex items-center gap-1.5">
                          <span>💻</span>
                          <span>${escHtml(t.name)}</span>
                          ${t.is_current ? '<span class="badge badge-success text-xs" style="font-size:0.65rem">Your Current Session</span>' : ''}
                        </div>
                        <div class="text-xs text-muted font-mono">Token ID #${t.id}</div>
                      </td>
                      <td><span class="badge badge-info text-xs">Sanctum Token</span></td>
                      <td>${formatDateShort(t.created_at)}</td>
                      <td><span class="text-accent font-medium">${t.last_used_at ? formatDateShort(t.last_used_at) : 'Active Now'}</span></td>
                      <td>
                        <button class="btn btn-xs btn-ghost text-danger" onclick="revokeSingleUserSession(${u.id}, ${t.id}, '${escHtml(u.name)}')" title="Terminate this session">
                          Revoke
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                  ${sessions.map(s => `
                    <tr>
                      <td>
                        <div class="font-bold text-primary flex items-center gap-1.5">
                          <span>🌐</span>
                          <span class="truncate" style="max-width:200px">${escHtml(s.user_agent || 'Web Browser')}</span>
                        </div>
                        <div class="text-xs text-muted font-mono">IP: ${escHtml(s.ip_address || '-')}</div>
                      </td>
                      <td><span class="badge badge-secondary text-xs">Web Session</span></td>
                      <td>-</td>
                      <td><span class="text-accent font-medium">${formatDateShort(s.last_activity)}</span></td>
                      <td>
                        <button class="btn btn-xs btn-ghost text-danger" onclick="revokeSingleUserSession(${u.id}, '${s.id}', '${escHtml(u.name)}')" title="Terminate this session">
                          Revoke
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="p-6 text-center text-muted text-xs">
                <div>🔒 No active login sessions recorded for this user.</div>
              </div>
            `}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Close</button>
      </div>
    `, { size: 'modal-lg' });
  } catch(e) {
    toast.error('Failed to load user sessions', e.message);
  }
};

window.clearAllUserSessions = async function(id, userName) {
  modal.confirm('Force Logout / Clear Sessions', `Are you sure you want to terminate <b>ALL</b> active login sessions for <b>${escHtml(userName)}</b>?<br><br>The user will be immediately logged out from all browsers and devices.`, async () => {
    try {
      const res = await usersApi.clearSessions(id);
      toast.success(res.message || 'All user sessions cleared successfully');
      showUserSessionsModal(id, userName);
      fetchAndRenderUsers();
    } catch(e) {
      toast.error('Failed to clear sessions', e.message);
    }
  });
};

window.revokeSingleUserSession = async function(userId, sessionId, userName) {
  try {
    const res = await usersApi.deleteSession(userId, sessionId);
    toast.success(res.message || 'Session revoked successfully');
    showUserSessionsModal(userId, userName);
    fetchAndRenderUsers();
  } catch(e) {
    toast.error('Failed to revoke session', e.message);
  }
};

// ============================================
// ASSET MANAGEMENT
// ============================================
window.loadAssets = async function() {
  const content = document.getElementById('page-content');
  const user = appState.user;
  const isAdmin = ['admin','manager'].includes(user.role);

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Asset Inventory</h1>
        <p class="page-subtitle">Hardware assets, software licenses, and IT equipment lifecycle tracking</p>
      </div>
      ${isAdmin ? `
        <button class="btn btn-primary" onclick="showNewAssetModal()">
          ${renderIcon('plus')}
          <span>Add New Asset</span>
        </button>
      ` : ''}
    </div>

    <!-- Asset Stats -->
    <div id="asset-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem">
      ${[1,2,3,4].map(() => `<div class="stat-card"><div class="skeleton" style="width:100%;height:60px"></div></div>`).join('')}
    </div>

    <!-- Filters -->
    <div class="card mb-4">
      <div class="card-body p-3">
        <div class="flex gap-3 items-center flex-wrap">
          <div class="search-input-wrap" style="flex:1;min-width:200px">
            <span class="search-icon">${renderIcon('search')}</span>
            <input type="text" class="form-control" id="asset-search" placeholder="Search asset name, serial number, location...">
          </div>
          <select class="form-control" id="asset-type" style="width:150px">
            <option value="">All Types</option>
            <option value="laptop">Laptop</option>
            <option value="desktop">Desktop</option>
            <option value="server">Server</option>
            <option value="network">Network</option>
            <option value="software">Software</option>
            <option value="mobile">Mobile</option>
            <option value="printer">Printer</option>
            <option value="other">Other</option>
          </select>
          <select class="form-control" id="asset-status" style="width:150px">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="table-wrapper" id="assets-table">
        <div class="flex-center p-6"><div class="spinner spinner-lg"></div></div>
      </div>
    </div>
  `;

  // Load stats
  assetsApi.stats().then(renderAssetStats).catch(() => {});

  fetchAndRenderAssets();

  document.getElementById('asset-search')?.addEventListener('input', debounce(() => fetchAndRenderAssets(), 400));
  document.getElementById('asset-type')?.addEventListener('change', () => fetchAndRenderAssets());
  document.getElementById('asset-status')?.addEventListener('change', () => fetchAndRenderAssets());
};

function renderAssetStats(stats) {
  const el = document.getElementById('asset-stats');
  if (!el) return;
  el.innerHTML = [
    { iconName: 'assets', color: 'rgba(99,102,241,0.12)', iconColor: '#818cf8', value: stats.total, label: 'Total Assets' },
    { iconName: 'check', color: 'rgba(16,185,129,0.12)', iconColor: '#34d399', value: (stats.byStatus.find(s => s.status === 'active') || {}).count || 0, label: 'Active' },
    { iconName: 'clock', color: 'rgba(245,158,11,0.12)', iconColor: '#fbbf24', value: (stats.byStatus.find(s => s.status === 'maintenance') || {}).count || 0, label: 'Maintenance' },
    { iconName: 'activity', color: 'rgba(6,182,212,0.12)', iconColor: '#22d3ee', value: formatCurrency(stats.totalValue), label: 'Total Value' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.color};color:${s.iconColor}">${renderIcon(s.iconName)}</div>
      <div class="stat-content">
        <div class="stat-value" style="font-size:1.15rem">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>
  `).join('');
}

async function fetchAndRenderAssets() {
  const params = {};
  const s = document.getElementById('asset-search')?.value;
  const t = document.getElementById('asset-type')?.value;
  const st = document.getElementById('asset-status')?.value;
  if (s) params.search = s;
  if (t) params.type = t;
  if (st) params.status = st;

  try {
    const data = await assetsApi.list(params);
    renderAssetsTable(data.assets);
  } catch(e) { toast.error('Failed to load assets'); }
}

function renderAssetsTable(assets) {
  const el = document.getElementById('assets-table');
  if (!el) return;

  if (!assets.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon text-muted">${renderIcon('assets')}</div><div class="empty-title">No assets found</div></div>`;
    return;
  }

  const isAdmin = ['admin','manager'].includes(appState.user.role);

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Asset</th>
          <th>Type</th>
          <th>Serial Number</th>
          <th>Status</th>
          <th>Assigned To</th>
          <th>Location</th>
          <th>Value</th>
          ${isAdmin ? '<th>Actions</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${assets.map(a => `
          <tr>
            <td>
              <div>
                <div class="font-medium">${escHtml(a.name)}</div>
                <div class="text-xs text-muted">${escHtml(a.brand || '')} ${escHtml(a.model || '')}</div>
              </div>
            </td>
            <td><span class="text-sm font-medium">${a.type}</span></td>
            <td class="text-sm text-muted" style="font-family:monospace">${escHtml(a.serial_number || '-')}</td>
            <td>
              <div class="flex items-center gap-2">
                <div class="status-dot status-dot-${a.status}"></div>
                <span class="text-sm">${a.status}</span>
              </div>
            </td>
            <td class="text-sm">${escHtml(a.assigned_to_name || '-')}</td>
            <td class="text-sm text-muted">${escHtml(a.location || '-')}</td>
            <td class="text-sm">${a.purchase_value ? formatCurrency(a.purchase_value) : '-'}</td>
            ${isAdmin ? `
            <td>
              <div class="flex gap-1">
                <button class="btn btn-sm btn-ghost" onclick="showEditAssetModal(${a.id})">
                  ${renderIcon('edit')}
                </button>
                <button class="btn btn-sm btn-ghost text-danger" onclick="deleteAsset(${a.id})">
                  ${renderIcon('trash')}
                </button>
              </div>
            </td>
            ` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.showNewAssetModal = async function() {
  const users = await usersApi.list({ is_active: 'true' }).catch(() => []);
  modal.show(`
    <div class="modal-header">
      <span class="modal-title font-bold text-sm">Add New Asset</span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Asset Name *</label>
            <input type="text" class="form-control" id="na-name" placeholder="MacBook Pro 16 M2">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Asset Type</label>
            <select class="form-control" id="na-type">
              <option value="laptop">Laptop</option>
              <option value="desktop">Desktop</option>
              <option value="server">Server</option>
              <option value="network">Network</option>
              <option value="software">Software</option>
              <option value="mobile">Mobile</option>
              <option value="printer">Printer</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Brand / Manufacturer</label>
            <input type="text" class="form-control" id="na-brand" placeholder="Apple, Dell, Cisco...">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Model</label>
            <input type="text" class="form-control" id="na-model" placeholder="Device model">
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Serial Number</label>
            <input type="text" class="form-control" id="na-serial" placeholder="SN123456789">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Status</label>
            <select class="form-control" id="na-status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Assigned To</label>
            <select class="form-control" id="na-assigned">
              <option value="">-- Unassigned --</option>
              ${users.map(u => `<option value="${u.id}">${escHtml(u.name)} (${escHtml(u.department || '')})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Location</label>
            <input type="text" class="form-control" id="na-location" placeholder="HQ 3rd Fl, Server Room...">
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label font-medium text-xs">Purchase Value</label>
            <input type="number" class="form-control" id="na-value" placeholder="25000000">
          </div>
          <div class="form-group">
            <label class="form-label font-medium text-xs">Purchase Date</label>
            <input type="date" class="form-control" id="na-purchase-date">
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="createAsset()">Save Asset</button>
    </div>
  `, { size: 'modal-lg' });
};

window.createAsset = async function() {
  const data = {
    name: document.getElementById('na-name').value.trim(),
    type: document.getElementById('na-type').value,
    brand: document.getElementById('na-brand').value.trim(),
    model: document.getElementById('na-model').value.trim(),
    serial_number: document.getElementById('na-serial').value.trim(),
    status: document.getElementById('na-status').value,
    assigned_to: document.getElementById('na-assigned').value || null,
    location: document.getElementById('na-location').value.trim(),
    purchase_value: document.getElementById('na-value').value || null,
    purchase_date: document.getElementById('na-purchase-date').value || null,
  };
  if (!data.name) { toast.warning('Asset name is required'); return; }

  try {
    await assetsApi.create(data);
    modal.close();
    toast.success('Asset created successfully');
    fetchAndRenderAssets();
    assetsApi.stats().then(renderAssetStats);
  } catch(e) { toast.error('Failed to add asset', e.message); }
};

window.showEditAssetModal = async function(id) {
  try {
    const [asset, users] = await Promise.all([
      assetsApi.get(id),
      usersApi.list({ is_active: 'true' }).catch(() => []),
    ]);

    modal.show(`
      <div class="modal-header">
        <span class="modal-title font-bold text-sm">Edit Asset</span>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Asset Name *</label>
              <input type="text" class="form-control" id="ea-name" value="${escHtml(asset.name)}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Type</label>
              <select class="form-control" id="ea-type">
                ${['laptop','desktop','server','network','software','mobile','printer','other'].map(t => `<option value="${t}" ${asset.type===t?'selected':''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Status</label>
              <select class="form-control" id="ea-status">
                ${['active','inactive','maintenance','retired'].map(s => `<option value="${s}" ${asset.status===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Assigned To</label>
              <select class="form-control" id="ea-assigned">
                <option value="">-- Unassigned --</option>
                ${users.map(u => `<option value="${u.id}" ${asset.assigned_to===u.id?'selected':''}>${escHtml(u.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Location</label>
              <input type="text" class="form-control" id="ea-location" value="${escHtml(asset.location || '')}">
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Serial Number</label>
              <input type="text" class="form-control" id="ea-serial" value="${escHtml(asset.serial_number || '')}">
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="updateAsset(${id})">Save Changes</button>
      </div>
    `);
  } catch(e) { toast.error('Failed to load asset data'); }
};

window.updateAsset = async function(id) {
  const data = {
    name: document.getElementById('ea-name').value.trim(),
    type: document.getElementById('ea-type').value,
    status: document.getElementById('ea-status').value,
    assigned_to: document.getElementById('ea-assigned').value || null,
    location: document.getElementById('ea-location').value.trim(),
    serial_number: document.getElementById('ea-serial').value.trim(),
  };

  try {
    await assetsApi.update(id, data);
    modal.close();
    toast.success('Asset updated successfully');
    fetchAndRenderAssets();
    assetsApi.stats().then(renderAssetStats);
  } catch(e) { toast.error('Failed to update asset', e.message); }
};

window.deleteAsset = function(id) {
  modal.confirm('Delete Asset', 'This asset will be permanently deleted from the system.', async () => {
    try {
      await assetsApi.delete(id);
      toast.success('Asset deleted');
      fetchAndRenderAssets();
      assetsApi.stats().then(renderAssetStats);
    } catch(e) { toast.error('Failed to delete asset'); }
  });
};

// ============================================
// PROFILE PAGE
// ============================================
window.loadProfile = async function() {
  const content = document.getElementById('page-content');

  // Fetch fresh user data
  try {
    const freshUser = await authApi.me();
    Object.assign(appState.user, freshUser);
  } catch(e) {}

  const u = appState.user;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Profile</h1>
        <p class="page-subtitle">Manage account credentials and personal security settings</p>
      </div>
    </div>

    <div style="max-width:700px;display:flex;flex-direction:column;gap:1.5rem">
      <!-- Profile Card -->
      <div class="card">
        <div class="card-header"><span class="card-title text-xs font-semibold">Profile Information</span></div>
        <div class="card-body">
          <div class="flex items-center gap-4 mb-4">
            <div class="avatar avatar-xl">${getInitials(u.name)}</div>
            <div>
              <div class="font-bold text-lg">${escHtml(u.name)}</div>
              <div class="text-xs text-muted">${escHtml(u.email)}</div>
              <span class="badge role-badge-${u.role} mt-2">${u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span>
            </div>
          </div>

          <form id="profile-form" style="display:flex;flex-direction:column;gap:1rem">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label font-medium text-xs">Full Name</label>
                <input type="text" class="form-control" id="pf-name" value="${escHtml(u.name)}">
              </div>
              <div class="form-group">
                <label class="form-label font-medium text-xs">Department</label>
                <input type="text" class="form-control" id="pf-dept" value="${escHtml(u.department || '')}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label font-medium text-xs">Phone Number</label>
              <input type="text" class="form-control" id="pf-phone" value="${escHtml(u.phone || '')}" placeholder="+1...">
            </div>
            <div class="flex" style="justify-content:flex-end">
              <button type="submit" class="btn btn-primary">Save Profile</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Change Password -->
      <div class="card">
        <div class="card-header"><span class="card-title text-xs font-semibold">Change Password</span></div>
        <div class="card-body">
          <form id="password-form" style="display:flex;flex-direction:column;gap:1rem">
            <div class="form-group">
              <label class="form-label font-medium text-xs">Current Password</label>
              <input type="password" class="form-control" id="pw-current" placeholder="Current password">
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label font-medium text-xs">New Password</label>
                <input type="password" class="form-control" id="pw-new" placeholder="Minimum 8 characters">
              </div>
              <div class="form-group">
                <label class="form-label font-medium text-xs">Confirm New Password</label>
                <input type="password" class="form-control" id="pw-confirm" placeholder="Repeat new password">
              </div>
            </div>
            <div class="flex" style="justify-content:flex-end">
              <button type="submit" class="btn btn-warning">Update Password</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="card" style="border-color:rgba(244,63,94,0.2)">
        <div class="card-header" style="border-color:rgba(244,63,94,0.2)"><span class="card-title text-danger text-xs font-semibold">Sign Out</span></div>
        <div class="card-body">
          <p class="mb-4 text-xs text-muted">You will be signed out of this account session on this device.</p>
          <button class="btn btn-danger btn-sm" onclick="logout()">Sign Out of Portal</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await authApi.updateMe({
        name: document.getElementById('pf-name').value.trim(),
        department: document.getElementById('pf-dept').value.trim(),
        phone: document.getElementById('pf-phone').value.trim(),
      });
      appState.user.name = document.getElementById('pf-name').value.trim();
      localStorage.setItem('itsm_user', JSON.stringify(appState.user));
      toast.success('Profile updated successfully');
    } catch(e) { toast.error('Failed to update profile', e.message); }
  });

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPw = document.getElementById('pw-new').value;
    const confirmPw = document.getElementById('pw-confirm').value;
    if (newPw !== confirmPw) { toast.warning('New passwords do not match'); return; }
    if (newPw.length < 8) { toast.warning('Password must be at least 8 characters'); return; }

    try {
      await authApi.changePassword({
        current_password: document.getElementById('pw-current').value,
        new_password: newPw,
      });
      toast.success('Password changed successfully');
      document.getElementById('password-form').reset();
    } catch(e) { toast.error('Failed to change password', e.message); }
  });
};
