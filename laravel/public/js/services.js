/**
 * Service Catalog & Request Fulfillment Module
 */

window.servicesState = {
  activeCategory: 'all',
  servicesList: [],
  editingFormFields: [],
};

window.loadServices = async function() {
  const user = window.appState?.user || {};
  const isAdmin = ['admin', 'manager', 'superadmin'].includes(user.role);

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="page-title">IT Service Catalog</h1>
        <p class="page-subtitle">Request hardware procurement, account access, licensed software, or network infrastructure services</p>
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        ${isAdmin ? `
          <button class="btn btn-primary btn-sm flex items-center gap-2" onclick="showServiceEditorModal()">
            ${renderIcon('plus')}
            <span>Add Service Item</span>
          </button>
        ` : ''}
        <button class="btn btn-secondary btn-sm flex items-center gap-2" onclick="loadServicesList()">
          ${renderIcon('refresh')}
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Category Filter Tabs -->
    <div class="card mb-6">
      <div class="card-body py-3">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex gap-2 flex-wrap" id="service-category-tabs">
            <button class="btn btn-sm btn-primary" onclick="setServiceCategory('all', this)">All Services</button>
            <button class="btn btn-sm btn-secondary" onclick="setServiceCategory('Hardware & Equipment', this)">Hardware & Equipment</button>
            <button class="btn btn-sm btn-secondary" onclick="setServiceCategory('Account & Access', this)">Account & Access</button>
            <button class="btn btn-sm btn-secondary" onclick="setServiceCategory('Software & Licenses', this)">Software & Licenses</button>
            <button class="btn btn-sm btn-secondary" onclick="setServiceCategory('Network & Infrastructure', this)">Network & Infrastructure</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Catalog Cards Grid -->
    <div id="services-grid-container" class="grid-3" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.25rem">
      <div class="flex-center p-8" style="grid-column:1/-1"><div class="spinner spinner-lg"></div></div>
    </div>
  `;

  await loadServicesList();
};

window.setServiceCategory = function(cat, btn) {
  window.servicesState.activeCategory = cat;
  document.querySelectorAll('#service-category-tabs button').forEach(b => b.className = 'btn btn-sm btn-secondary');
  if (btn) btn.className = 'btn btn-sm btn-primary';
  renderServicesGrid();
};

window.loadServicesList = async function() {
  const container = document.getElementById('services-grid-container');
  if (!container) return;

  try {
    const res = await servicesApi.catalog();
    window.servicesState.servicesList = res.services || [];
    updateCategoryTabs();
    renderServicesGrid();
  } catch(e) {
    toast.error('Failed to load service catalog', e.message);
  }
};

function updateCategoryTabs() {
  const tabsContainer = document.getElementById('service-category-tabs');
  if (!tabsContainer) return;

  const defaultCategories = ['Hardware & Equipment', 'Account & Access', 'Software & Licenses', 'Network & Infrastructure'];
  const items = window.servicesState.servicesList || [];
  const foundCategories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const allCategories = [...new Set([...defaultCategories, ...foundCategories])];

  const active = window.servicesState.activeCategory;

  tabsContainer.innerHTML = `
    <button class="btn btn-sm ${active === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="setServiceCategory('all', this)">All Services</button>
    ${allCategories.map(cat => `
      <button class="btn btn-sm ${active === cat ? 'btn-primary' : 'btn-secondary'}" onclick="setServiceCategory('${escHtml(cat)}', this)">${escHtml(cat)}</button>
    `).join('')}
  `;
}

function renderServicesGrid() {
  const container = document.getElementById('services-grid-container');
  if (!container) return;

  const user = window.appState?.user || {};
  const isAdmin = ['admin', 'manager', 'superadmin'].includes(user.role);

  let list = window.servicesState.servicesList || [];
  if (window.servicesState.activeCategory !== 'all') {
    list = list.filter(s => s.category === window.servicesState.activeCategory);
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state p-8 card" style="grid-column:1/-1;text-align:center">
        <div class="empty-icon text-muted mb-3">${renderIcon('catalog')}</div>
        <div class="empty-title font-bold text-base mb-1">No service items found</div>
        <p class="text-xs text-muted mb-4">No services match the selected category filter.</p>
        ${isAdmin ? `
          <button class="btn btn-primary btn-sm" onclick="showServiceEditorModal()">
            ${renderIcon('plus')}
            <span>Create First Service in this Category</span>
          </button>
        ` : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(s => `
    <div class="card service-card" style="display:flex;flex-direction:column;justify-content:space-between;border-top:3px solid var(--accent-primary);position:relative">
      <div>
        <div class="card-header pb-2" style="align-items:flex-start;justify-content:space-between">
          <div class="flex items-center gap-3" style="max-width:calc(100% - ${isAdmin ? '60px' : '0px'})">
            <div style="background:rgba(99,102,241,0.1);color:#818cf8;width:42px;height:42px;min-width:42px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(99,102,241,0.25)">
              ${renderIcon('catalog')}
            </div>
            <div>
              <h3 class="font-bold text-sm text-primary" style="line-height:1.3">${escHtml(s.name)}</h3>
              <div class="flex items-center gap-1 mt-1 flex-wrap">
                <span class="badge badge-info" style="font-size:0.65rem">${escHtml(s.category)}</span>
                ${s.requires_approval ? `<span class="badge badge-warning" style="font-size:0.65rem" title="Manager approval required">Approval Req.</span>` : ''}
                ${!s.is_active ? `<span class="badge badge-danger" style="font-size:0.65rem">Inactive</span>` : ''}
              </div>
            </div>
          </div>

          ${isAdmin ? `
            <div class="flex items-center gap-1">
              <button class="btn btn-ghost btn-xs text-muted" title="Edit Service" onclick="showServiceEditorModal(${s.id})" style="padding:4px 6px">
                ${renderIcon('edit')}
              </button>
              <button class="btn btn-ghost btn-xs text-danger" title="Delete Service" onclick="confirmDeleteServiceItem(${s.id}, '${escHtml(s.name.replace(/'/g, "\\'"))}')" style="padding:4px 6px">
                ${renderIcon('trash')}
              </button>
            </div>
          ` : ''}
        </div>

        <div class="card-body py-2">
          <p class="text-xs text-secondary mb-3" style="line-height:1.5;min-height:38px">
            ${escHtml(s.description || 'No description provided for this service.')}
          </p>

          <div class="flex items-center justify-between text-xs p-2 card mb-1" style="background:var(--bg-input);border:1px solid var(--border-color)">
            <span class="text-muted flex items-center gap-1">${renderIcon('clock')} Target SLA:</span>
            <span class="font-bold text-accent">${s.estimated_delivery_hours} Hours</span>
          </div>
        </div>
      </div>

      <div class="card-footer" style="padding:0.75rem 1rem;background:rgba(255,255,255,0.02);border-top:1px solid var(--border-color)">
        <button class="btn btn-primary btn-sm w-full flex items-center justify-center gap-2" onclick="showServiceRequestModal(${s.id})">
          ${renderIcon('ticket')}
          <span>Request Service</span>
        </button>
      </div>
    </div>
  `).join('');
}

// ============================================
// SERVICE REQUEST FORM (EMPLOYEE SUBMISSION)
// ============================================

window.showServiceRequestModal = async function(id) {
  try {
    modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`, { size: 'modal-lg' });
    const s = await servicesApi.get(id);
    const fields = s.form_fields || [];

    modal.show(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="modal-title font-bold text-sm">Service Request: ${escHtml(s.name)}</span>
        </div>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div class="p-3 mb-4 card" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.25)">
          <div class="font-bold text-xs text-accent mb-1">Service Details & Target SLA:</div>
          <p class="text-xs text-secondary mb-1">${escHtml(s.description || '')}</p>
          <div class="flex items-center gap-3 text-xs text-muted mt-2">
            <span>⏱️ Delivery SLA: <b>${s.estimated_delivery_hours} Hours</b></span>
            ${s.requires_approval ? `<span class="badge badge-warning" style="font-size:0.65rem">Manager Approval Required</span>` : '<span class="badge badge-success" style="font-size:0.65rem">Direct Fulfillment</span>'}
          </div>
        </div>

        <form id="service-request-form" onsubmit="event.preventDefault()">
          <div style="display:flex;flex-direction:column;gap:1rem">
            ${fields.length ? fields.map(f => `
              <div class="form-group">
                <label class="form-label font-medium text-xs">${escHtml(f.label)} ${f.required ? '<span class="text-danger">*</span>' : ''}</label>
                ${f.type === 'select' ? `
                  <select class="form-control" id="srv-field-${f.name}" ${f.required ? 'required' : ''}>
                    <option value="">-- Choose Option --</option>
                    ${(f.options || []).map(opt => `<option value="${escHtml(opt)}">${escHtml(opt)}</option>`).join('')}
                  </select>
                ` : f.type === 'textarea' ? `
                  <textarea class="form-control" id="srv-field-${f.name}" rows="3" placeholder="${escHtml(f.placeholder || '')}" ${f.required ? 'required' : ''}></textarea>
                ` : f.type === 'number' ? `
                  <input type="number" class="form-control" id="srv-field-${f.name}" placeholder="${escHtml(f.placeholder || '')}" ${f.required ? 'required' : ''}>
                ` : `
                  <input type="text" class="form-control" id="srv-field-${f.name}" placeholder="${escHtml(f.placeholder || '')}" ${f.required ? 'required' : ''}>
                `}
              </div>
            `).join('') : `
              <div class="p-3 card text-center text-xs text-muted" style="background:var(--bg-input)">
                No special fields required. You can add specific details in the notes below.
              </div>
            `}

            <div class="form-group">
              <label class="form-label font-medium text-xs">Additional Notes / Instructions (Optional)</label>
              <textarea class="form-control" id="srv-notes" rows="2" placeholder="Any additional requirements or supporting context..."></textarea>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="submitServiceRequestOrder(${s.id})">Submit Request</button>
      </div>
    `, { size: 'modal-lg' });

  } catch(e) {
    toast.error('Failed to load service request form', e.message);
  }
};

window.submitServiceRequestOrder = async function(serviceId) {
  try {
    const s = await servicesApi.get(serviceId);
    const fields = s.form_fields || [];
    const formData = {};

    for (const f of fields) {
      const el = document.getElementById(`srv-field-${f.name}`);
      const val = el ? el.value.trim() : '';
      if (f.required && !val) {
        toast.warning(`Field "${f.label}" is required.`);
        return;
      }
      formData[f.name] = val;
    }

    const notes = document.getElementById('srv-notes')?.value.trim() || '';

    const res = await servicesApi.submit({
      service_catalog_id: serviceId,
      form_data: formData,
      notes,
    });

    modal.close();
    toast.success('Service Request Submitted Successfully!', `Ticket #${res.ticket.ticket_number} created.`);
    navigateTo('tickets');
  } catch(e) {
    toast.error('Failed to submit service request', e.message);
  }
};

// ============================================
// SERVICE CATALOG MANAGEMENT (ADMIN / MANAGER)
// ============================================

window.showServiceEditorModal = async function(serviceId = null) {
  let item = {
    name: '',
    category: 'Hardware & Equipment',
    description: '',
    estimated_delivery_hours: 24,
    requires_approval: false,
    is_active: true,
    form_fields: [
      { name: 'item_specification', label: 'Item / Specification Details', type: 'text', required: true, placeholder: 'e.g. 16GB RAM, 512GB SSD', options: [] },
      { name: 'justification', label: 'Business Justification', type: 'textarea', required: true, placeholder: 'Why is this item needed for work?', options: [] },
    ],
  };

  if (serviceId) {
    try {
      modal.show(`<div class="flex-center p-8"><div class="spinner spinner-lg"></div></div>`, { size: 'modal-lg' });
      item = await servicesApi.get(serviceId);
      if (!Array.isArray(item.form_fields)) item.form_fields = [];
    } catch(e) {
      toast.error('Failed to fetch service item details', e.message);
      return;
    }
  }

  window.servicesState.editingFormFields = JSON.parse(JSON.stringify(item.form_fields || []));

  renderServiceEditorModalContent(serviceId, item);
};

function renderServiceEditorModalContent(serviceId, item) {
  const isEdit = Boolean(serviceId);
  const existingCategories = ['Hardware & Equipment', 'Account & Access', 'Software & Licenses', 'Network & Infrastructure', 'General Services'];
  if (item.category && !existingCategories.includes(item.category)) {
    existingCategories.push(item.category);
  }

  modal.show(`
    <div class="modal-header">
      <div class="flex items-center gap-2">
        <span class="modal-title font-bold text-sm">${isEdit ? 'Edit Service Catalog Item' : 'Add New Service Catalog Item'}</span>
      </div>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body" style="max-height:calc(85vh - 120px);overflow-y:auto">
      <form id="service-editor-form" onsubmit="event.preventDefault()">
        <div style="display:flex;flex-direction:column;gap:1rem">
          
          <!-- Basic Info -->
          <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label font-medium text-xs">Service Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="edit-srv-name" value="${escHtml(item.name || '')}" placeholder="e.g. MacBook Pro M3 Provisioning, VPN Access Setup" required>
            </div>

            <div class="form-group">
              <label class="form-label font-medium text-xs">Category <span class="text-danger">*</span></label>
              <select class="form-control" id="edit-srv-category" onchange="toggleCustomCategoryInput(this.value)">
                ${existingCategories.map(cat => `<option value="${escHtml(cat)}" ${item.category === cat ? 'selected' : ''}>${escHtml(cat)}</option>`).join('')}
                <option value="__custom__">+ Custom Category...</option>
              </select>
              <input type="text" class="form-control mt-2" id="edit-srv-custom-category" placeholder="Enter custom category name" style="display:none">
            </div>

            <div class="form-group">
              <label class="form-label font-medium text-xs">Target Delivery SLA (Hours) <span class="text-danger">*</span></label>
              <input type="number" class="form-control" id="edit-srv-sla" value="${item.estimated_delivery_hours || 24}" min="1" max="720" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label font-medium text-xs">Service Description</label>
            <textarea class="form-control" id="edit-srv-desc" rows="2" placeholder="Brief description of what this service covers and who is eligible...">${escHtml(item.description || '')}</textarea>
          </div>

          <!-- Options Toggles -->
          <div class="grid-2 p-3 card" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;background:var(--bg-input)">
            <label class="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" id="edit-srv-approval" ${item.requires_approval ? 'checked' : ''}>
              <span>Requires Manager Approval before fulfillment</span>
            </label>
            <label class="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" id="edit-srv-active" ${item.is_active !== false ? 'checked' : ''}>
              <span>Published & Active in Catalog</span>
            </label>
          </div>

          <!-- Custom Request Form Fields Builder -->
          <div class="card p-3" style="border:1px solid var(--accent-primary-glow)">
            <div class="flex items-center justify-between gap-2 mb-3">
              <div>
                <h4 class="font-bold text-xs text-primary">Custom Request Form Fields</h4>
                <p class="text-xs text-muted">Define the specific questions/inputs required from the requester when ordering this service.</p>
              </div>
              <button type="button" class="btn btn-secondary btn-xs flex items-center gap-1" onclick="addFormFieldRow()">
                ${renderIcon('plus')}
                <span>Add Field</span>
              </button>
            </div>

            <div id="form-fields-container" style="display:flex;flex-direction:column;gap:0.75rem">
              <!-- Rendered by renderFormFieldsBuilder() -->
            </div>
          </div>

        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="saveServiceCatalogItem(${serviceId || 'null'})">
        ${isEdit ? 'Save Changes' : 'Create Service Item'}
      </button>
    </div>
  `, { size: 'modal-lg' });

  renderFormFieldsBuilder();
}

window.toggleCustomCategoryInput = function(val) {
  const customInput = document.getElementById('edit-srv-custom-category');
  if (!customInput) return;
  customInput.style.display = val === '__custom__' ? 'block' : 'none';
  if (val === '__custom__') customInput.focus();
};

function renderFormFieldsBuilder() {
  const container = document.getElementById('form-fields-container');
  if (!container) return;

  const fields = window.servicesState.editingFormFields || [];

  if (!fields.length) {
    container.innerHTML = `
      <div class="p-3 text-center text-xs text-muted card" style="background:rgba(255,255,255,0.01)">
        No custom fields defined. Requesters will only fill out standard notes. Click <b>"+ Add Field"</b> above to add input fields.
      </div>
    `;
    return;
  }

  container.innerHTML = fields.map((f, idx) => `
    <div class="card p-3" style="background:var(--bg-input);border:1px solid var(--border-color);position:relative">
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="badge badge-info" style="font-size:0.65rem">Field #${idx + 1}</span>
        <button type="button" class="btn btn-ghost btn-xs text-danger" title="Remove Field" onclick="removeFormFieldRow(${idx})" style="padding:2px 6px">✕</button>
      </div>

      <div class="grid-3" style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:0.75rem;align-items:start">
        <div class="form-group mb-0">
          <label class="form-label font-medium text-xs mb-1">Field Label <span class="text-danger">*</span></label>
          <input type="text" class="form-control" placeholder="e.g. Storage Capacity, Justification" value="${escHtml(f.label || '')}" oninput="updateFormFieldData(${idx}, 'label', this.value)" required>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-medium text-xs mb-1">Type</label>
          <select class="form-control" onchange="updateFormFieldData(${idx}, 'type', this.value); renderFormFieldsBuilder();">
            <option value="text" ${f.type === 'text' ? 'selected' : ''}>Text Input</option>
            <option value="textarea" ${f.type === 'textarea' ? 'selected' : ''}>Textarea</option>
            <option value="select" ${f.type === 'select' ? 'selected' : ''}>Dropdown Select</option>
            <option value="number" ${f.type === 'number' ? 'selected' : ''}>Number Input</option>
          </select>
        </div>

        <div class="form-group mb-0 flex items-center gap-2 pt-4">
          <label class="flex items-center gap-1 text-xs cursor-pointer">
            <input type="checkbox" ${f.required ? 'checked' : ''} onchange="updateFormFieldData(${idx}, 'required', this.checked)">
            <span>Required</span>
          </label>
        </div>
      </div>

      ${f.type === 'select' ? `
        <div class="form-group mt-2 mb-0">
          <label class="form-label font-medium text-xs mb-1">Dropdown Options (Comma separated) <span class="text-danger">*</span></label>
          <input type="text" class="form-control" placeholder="Option 1, Option 2, Option 3" value="${escHtml((f.options || []).join(', '))}" oninput="updateFormFieldData(${idx}, 'options_raw', this.value)">
        </div>
      ` : `
        <div class="form-group mt-2 mb-0">
          <label class="form-label font-medium text-xs mb-1">Placeholder (Optional)</label>
          <input type="text" class="form-control" placeholder="Helpful hint for requester..." value="${escHtml(f.placeholder || '')}" oninput="updateFormFieldData(${idx}, 'placeholder', this.value)">
        </div>
      `}
    </div>
  `).join('');
}

window.addFormFieldRow = function() {
  window.servicesState.editingFormFields.push({
    name: 'field_' + (window.servicesState.editingFormFields.length + 1),
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
  });
  renderFormFieldsBuilder();
};

window.removeFormFieldRow = function(idx) {
  window.servicesState.editingFormFields.splice(idx, 1);
  renderFormFieldsBuilder();
};

window.updateFormFieldData = function(idx, prop, value) {
  const f = window.servicesState.editingFormFields[idx];
  if (!f) return;

  if (prop === 'options_raw') {
    f.options = value.split(',').map(o => o.trim()).filter(Boolean);
  } else if (prop === 'label') {
    f.label = value;
    f.name = value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || `field_${idx + 1}`;
  } else {
    f[prop] = value;
  }
};

window.saveServiceCatalogItem = async function(serviceId = null) {
  const name = document.getElementById('edit-srv-name')?.value.trim();
  if (!name) {
    toast.warning('Please enter a service name.');
    return;
  }

  let category = document.getElementById('edit-srv-category')?.value;
  if (category === '__custom__') {
    category = document.getElementById('edit-srv-custom-category')?.value.trim();
    if (!category) {
      toast.warning('Please enter a custom category name.');
      return;
    }
  }

  const sla = parseInt(document.getElementById('edit-srv-sla')?.value, 10) || 24;
  const description = document.getElementById('edit-srv-desc')?.value.trim() || '';
  const requires_approval = document.getElementById('edit-srv-approval')?.checked || false;
  const is_active = document.getElementById('edit-srv-active')?.checked || false;

  const form_fields = (window.servicesState.editingFormFields || []).map((f, i) => ({
    name: f.name || `field_${i + 1}`,
    label: f.label || `Field ${i + 1}`,
    type: f.type || 'text',
    required: Boolean(f.required),
    placeholder: f.placeholder || '',
    options: f.type === 'select' ? (f.options || []) : [],
  }));

  const payload = {
    name,
    category,
    description,
    estimated_delivery_hours: sla,
    requires_approval,
    is_active,
    form_fields,
  };

  try {
    if (serviceId) {
      await servicesApi.update(serviceId, payload);
      toast.success('Service Updated', `Service catalog item '${name}' has been updated.`);
    } else {
      await servicesApi.create(payload);
      toast.success('Service Created', `New service catalog item '${name}' has been created.`);
    }

    modal.close();
    await loadServicesList();
  } catch(e) {
    toast.error('Failed to save service catalog item', e.message);
  }
};

window.confirmDeleteServiceItem = function(serviceId, serviceName) {
  modal.show(`
    <div class="modal-header">
      <span class="modal-title font-bold text-sm text-danger flex items-center gap-2">
        ${renderIcon('trash')}
        <span>Delete Service Catalog Item</span>
      </span>
      <button class="modal-close" onclick="modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <p class="text-sm text-primary mb-2">Are you sure you want to delete <b>"${escHtml(serviceName)}"</b> from the Service Catalog?</p>
      <p class="text-xs text-muted">Past tickets submitted under this service catalog item will remain intact, but employees will no longer be able to submit new requests for it.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-danger" onclick="executeDeleteServiceItem(${serviceId})">
        ${renderIcon('trash')}
        <span>Yes, Delete Service</span>
      </button>
    </div>
  `, { size: 'modal-sm' });
};

window.executeDeleteServiceItem = async function(serviceId) {
  try {
    await servicesApi.delete(serviceId);
    modal.close();
    toast.success('Service Deleted', 'The service catalog item has been removed.');
    await loadServicesList();
  } catch(e) {
    toast.error('Failed to delete service item', e.message);
  }
};
