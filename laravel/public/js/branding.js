/**
 * Branding, Company Profile & Theme Customizer Module
 * Allows Superadmin / Admin to customize logo, app title, version 1.0.0, copyright (@mdenniandrian_), and color themes.
 */

window.presetsList = [
  {
    id: 'obsidian_indigo',
    name: 'Obsidian Indigo (Default)',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    teal: '#06b6d4',
  },
  {
    id: 'deep_ocean',
    name: 'Deep Ocean Blue',
    primary: '#0284c7',
    secondary: '#38bdf8',
    teal: '#06b6d4',
  },
  {
    id: 'emerald_cyber',
    name: 'Cyber Emerald',
    primary: '#059669',
    secondary: '#10b981',
    teal: '#14b8a6',
  },
  {
    id: 'cyberpunk_violet',
    name: 'Cyberpunk Violet',
    primary: '#9333ea',
    secondary: '#c084fc',
    teal: '#e879f9',
  },
  {
    id: 'sunset_crimson',
    name: 'Sunset Crimson',
    primary: '#e11d48',
    secondary: '#f43f5e',
    teal: '#fb7185',
  },
  {
    id: 'electric_amber',
    name: 'Electric Amber',
    primary: '#d97706',
    secondary: '#f59e0b',
    teal: '#fbbf24',
  }
];

window.loadBranding = async function() {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="flex-center" style="height:50vh">
      <div class="spinner spinner-lg"></div>
    </div>
  `;

  try {
    const res = await brandingApi.get();
    const b = res.branding || {};
    renderBrandingPage(b);
  } catch (err) {
    content.innerHTML = `
      <div class="card p-6 text-center">
        <div class="text-danger font-bold mb-2">Failed to Load Brand & Theme Settings</div>
        <p class="text-muted text-sm mb-4">${escHtml(err.message)}</p>
        <button class="btn btn-primary btn-sm" onclick="loadBranding()">Try Again</button>
      </div>
    `;
  }
};

function renderBrandingPage(b) {
  const content = document.getElementById('page-content');
  if (!content) return;

  const currentPrimary = b.primary_color || '#6366f1';
  const currentSecondary = b.secondary_color || '#8b5cf6';
  const currentTeal = b.teal_color || '#06b6d4';
  const logoUrl = b.logo_url || '';
  const faviconUrl = b.favicon_url || '';
  const logoType = b.logo_type || 'icon_text';

  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="flex items-center gap-2">
          <span class="badge badge-primary font-bold" style="font-size:0.7rem">SUPERADMIN & ADMIN ONLY</span>
          <span class="badge badge-secondary" style="font-size:0.7rem">v${escHtml(b.app_version || '1.0.0')}</span>
        </div>
        <h1 class="page-title" style="font-size:1.4rem;margin-top:0.25rem">Brand, Logo, Company Profile & UI Theme Studio</h1>
        <p class="text-muted text-xs">Customize custom logo, favicon browser icon, application title, version tag, copyright author, and real-time color themes.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="resetBrandingDefaults()">
          ${renderIcon('refresh')}
          <span>Reset to Default</span>
        </button>
        <button class="btn btn-primary btn-sm" id="save-branding-btn" onclick="saveBrandingSettings()">
          ${renderIcon('check')}
          <span>Save Changes</span>
        </button>
      </div>
    </div>

    <!-- Main Studio 2-Column Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(460px, 1fr));gap:1.25rem;align-items:stretch">
      
      <!-- Card 1: Logo & Navbrand Customization -->
      <div class="card p-4" style="border:1px solid var(--border-hover);display:flex;flex-direction:column;gap:1rem">
        <div class="flex items-center justify-between flex-wrap gap-2 pb-2" style="border-bottom:1px solid var(--border-primary)">
          <div class="flex items-center gap-2">
            <div class="stat-icon" style="background:var(--accent-primary-glow);color:var(--accent-primary)">${renderIcon('sparkles')}</div>
            <div>
              <div class="font-bold text-sm">Custom Logo & Sidebar Navbrand</div>
              <div class="text-muted" style="font-size:0.72rem">Upload company logo and switch between icon+text or full wide banner</div>
            </div>
          </div>
          <span class="badge badge-primary font-bold" style="font-size:0.68rem">LOGO STUDIO</span>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Upload Company Logo</label>
          <div class="flex items-center gap-2">
            <input type="file" id="brand-logo-file" accept="image/*" class="form-control" style="padding:0.4rem;font-size:0.75rem" onchange="handleLogoFileUpload(this)">
            <button class="btn btn-secondary btn-sm" type="button" onclick="clearCustomLogo()" title="Clear Custom Logo">Remove</button>
          </div>
          <span class="text-muted" style="font-size:0.7rem">Supports PNG, JPG, SVG, or WebP (Max. 4MB).</span>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Or Enter Image Logo URL</label>
          <input type="text" class="form-control" id="brand-logo-url" value="${escHtml(logoUrl)}" placeholder="https://company.com/logo.png or data:image/..." oninput="onLogoUrlChange()">
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Navbrand Display Mode</label>
          <select class="form-control" id="brand-logo-type" onchange="liveUpdatePreview()">
            <option value="icon_text" ${logoType === 'icon_text' ? 'selected' : ''}>Square Icon / Image + App Name Text</option>
            <option value="image_banner" ${logoType === 'image_banner' ? 'selected' : ''}>Full Wide Logo Banner (Blank text / full-width image logo)</option>
          </select>
        </div>

        <!-- Live Navbrand Sidebar Preview Box -->
        <div class="p-3 card mt-auto" style="background:var(--bg-input);border-radius:10px;display:flex;flex-direction:column;gap:0.5rem">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-muted">Sidebar Navbrand Header Preview:</span>
            <span class="badge badge-secondary" style="font-size:0.65rem">SIDEBAR MOCKUP</span>
          </div>
          
          <div class="p-3 card" style="background:var(--bg-sidebar);border:1px solid var(--border-primary);border-radius:8px" id="studio-navbrand-preview">
            <!-- Dynamic Preview Content -->
          </div>

          <div class="text-xs text-muted" style="font-size:0.7rem;line-height:1.3">
            💡 <b>Wide Logo Tip:</b> If your logo already contains text, select <i>"Full Wide Logo Banner"</i> or leave <i>"App Name"</i> blank.
          </div>
        </div>
      </div>

      <!-- Card 2: Favicon & Browser Tab Customization -->
      <div class="card p-4" style="border:1px solid var(--border-hover);display:flex;flex-direction:column;gap:1rem">
        <div class="flex items-center justify-between flex-wrap gap-2 pb-2" style="border-bottom:1px solid var(--border-primary)">
          <div class="flex items-center gap-2">
            <div class="stat-icon" style="background:rgba(6,182,212,0.15);color:#22d3ee">${renderIcon('globe')}</div>
            <div>
              <div class="font-bold text-sm">Browser Tab Favicon & Meta Title</div>
              <div class="text-muted" style="font-size:0.72rem">Customize the favicon icon and title displayed on browser tabs</div>
            </div>
          </div>
          <span class="badge badge-primary font-bold" style="font-size:0.68rem">TAB FAVICON</span>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Upload Dedicated Favicon (.ico, .png, .svg)</label>
          <div class="flex items-center gap-2">
            <input type="file" id="brand-favicon-file" accept="image/*,.ico" class="form-control" style="padding:0.4rem;font-size:0.75rem" onchange="handleFaviconFileUpload(this)">
            <button class="btn btn-secondary btn-sm" type="button" onclick="clearCustomFavicon()" title="Clear Custom Favicon">Remove</button>
          </div>
          <span class="text-muted" style="font-size:0.7rem">Square ratio (32x32, 64x64, 128x128 or SVG) recommended.</span>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Or Enter Favicon URL</label>
          <input type="text" class="form-control" id="brand-favicon-url" value="${escHtml(faviconUrl)}" placeholder="https://company.com/favicon.png or data:image/..." oninput="onFaviconUrlChange()">
        </div>

        <div>
          <button class="btn btn-secondary btn-xs flex items-center gap-1.5" type="button" onclick="useLogoAsFavicon()">
            ${renderIcon('sparkles')}
            <span>Auto-use Company Logo as Favicon</span>
          </button>
        </div>

        <!-- Live Browser Tab Mockup -->
        <div class="p-3 card mt-auto" style="background:var(--bg-input);border-radius:10px;display:flex;flex-direction:column;gap:0.5rem">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-muted">Browser Window Tab Live Preview:</span>
            <span class="badge badge-secondary" style="font-size:0.65rem">TAB MOCKUP</span>
          </div>

          <!-- Tab Bar Mockup -->
          <div style="background:#1e222d;border-radius:8px 8px 0 0;padding:6px 10px 0 10px;border:1px solid #2d3343;border-bottom:none">
            <div style="display:inline-flex;align-items:center;gap:8px;background:var(--bg-card);padding:6px 12px;border-radius:8px 8px 0 0;max-width:260px;min-width:180px;box-shadow:0 -1px 4px rgba(0,0,0,0.2)" id="studio-browser-tab-preview">
              <img id="studio-favicon-img" src="" alt="Favicon" style="width:16px;height:16px;object-fit:contain;border-radius:3px;flex-shrink:0;display:none">
              <div id="studio-favicon-svg-default" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--accent-primary);flex-shrink:0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span id="studio-tab-title" class="font-semibold text-xs truncate" style="color:var(--text-primary);font-size:0.72rem">${escHtml(b.meta_title || 'ITSM Portal')}</span>
              <span style="color:#64748b;font-size:0.75rem;margin-left:auto;cursor:default">&times;</span>
            </div>
          </div>
          <!-- Tab URL Bar Mockup -->
          <div style="background:var(--bg-card);border:1px solid #2d3343;border-top:none;border-radius:0 0 8px 8px;padding:6px 10px;display:flex;align-items:center;gap:6px">
            <span style="color:#10b981;font-size:0.7rem">🔒</span>
            <span class="font-mono text-xs text-muted" style="font-size:0.68rem;letter-spacing:-0.02em">https://portal.company.com/app.html</span>
          </div>
        </div>
      </div>

      <!-- Card 3: Application & Company Identity -->
      <div class="card p-4" style="border:1px solid var(--border-hover);display:flex;flex-direction:column;gap:1rem">
        <div class="flex items-center justify-between flex-wrap gap-2 pb-2" style="border-bottom:1px solid var(--border-primary)">
          <div class="flex items-center gap-2">
            <div class="stat-icon" style="background:var(--accent-primary-glow);color:var(--accent-primary)">${renderIcon('profile')}</div>
            <div>
              <div class="font-bold text-sm">Application & Company Identity</div>
              <div class="text-muted" style="font-size:0.72rem">Portal branding, subtitle slogan, and official support contact details</div>
            </div>
          </div>
          <span class="badge badge-primary font-bold" style="font-size:0.68rem">COMPANY PROFILE</span>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Application Name (App Name) &mdash; <span class="text-muted font-normal">Optional</span></label>
          <input type="text" class="form-control" id="brand-app-name" value="${escHtml((b.app_name !== undefined && b.app_name !== null) ? b.app_name : '')}" placeholder="Leave blank if using a full-width wordmark banner..." oninput="liveUpdatePreview()">
          <span class="text-muted" style="font-size:0.7rem">If left blank, your logo image renders across full width without duplicate text.</span>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Portal Subtitle / Slogan</label>
          <input type="text" class="form-control" id="brand-app-subtitle" value="${escHtml((b.app_subtitle !== undefined && b.app_subtitle !== null) ? b.app_subtitle : '')}" placeholder="e.g. Service Management (optional)" oninput="liveUpdatePreview()">
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Browser Tab Title (Meta Title)</label>
          <input type="text" class="form-control" id="brand-meta-title" value="${escHtml(b.meta_title || 'ITSM Portal - Enterprise Service Desk')}" placeholder="e.g. ITSM Portal - Enterprise Service Desk" oninput="liveUpdatePreview()">
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Company / Organization Name</label>
          <input type="text" class="form-control" id="brand-company-name" value="${escHtml(b.company_name || 'PT Bangden Digital Solusindo')}" placeholder="e.g. PT Bangden Digital Solusindo">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div class="form-group mb-0">
            <label class="form-label font-semibold text-xs">Helpdesk Email</label>
            <input type="email" class="form-control" id="brand-company-email" value="${escHtml(b.company_email || 'no-reply@bangden.my.id')}" placeholder="support@company.com">
          </div>
          <div class="form-group mb-0">
            <label class="form-label font-semibold text-xs">Hotline / Phone</label>
            <input type="text" class="form-control" id="brand-company-phone" value="${escHtml(b.company_phone || '+62 812-3456-7890')}" placeholder="+62 812-3456-7890">
          </div>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Official Company Website</label>
          <input type="url" class="form-control" id="brand-company-website" value="${escHtml(b.company_website || 'https://bangden.my.id')}" placeholder="https://bangden.my.id">
        </div>
      </div>

      <!-- Card 4: Version & Copyright Info -->
      <div class="card p-4" style="border:1px solid var(--border-hover);display:flex;flex-direction:column;gap:1rem">
        <div class="flex items-center justify-between flex-wrap gap-2 pb-2" style="border-bottom:1px solid var(--border-primary)">
          <div class="flex items-center gap-2">
            <div class="stat-icon" style="background:rgba(16,185,129,0.12);color:#34d399">${renderIcon('zap')}</div>
            <div>
              <div class="font-bold text-sm">Application Version & Copyright</div>
              <div class="text-muted" style="font-size:0.72rem">Release version tagging and footer author credits</div>
            </div>
          </div>
          <span class="badge badge-primary font-bold" style="font-size:0.68rem">VERSION CONTROL</span>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Application Version</label>
          <div class="flex items-center gap-2">
            <input type="text" class="form-control font-mono font-bold" id="brand-app-version" value="${escHtml(b.app_version || '1.0.0')}" placeholder="1.0.0" style="max-width:140px" oninput="liveUpdatePreview()">
            <span class="badge badge-success font-mono font-bold" style="font-size:0.72rem">v1.0.0 ACTIVE</span>
          </div>
          <span class="text-muted" style="font-size:0.7rem">Version is placed under the navbrand logo and in the portal footer.</span>
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Copyright Notice (Footer)</label>
          <input type="text" class="form-control font-medium" id="brand-copyright-text" value="${escHtml(b.copyright_text || 'Made by @mdenniandrian_')}" placeholder="Made by @mdenniandrian_" oninput="liveUpdatePreview()">
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Author Handle / Creator</label>
          <input type="text" class="form-control" id="brand-copyright-author" value="${escHtml(b.copyright_author || '@mdenniandrian_')}" placeholder="@mdenniandrian_">
        </div>

        <div class="form-group mb-0">
          <label class="form-label font-semibold text-xs">Author Profile Link (URL)</label>
          <input type="url" class="form-control" id="brand-copyright-url" value="${escHtml(b.copyright_author_url || 'https://instagram.com/mdenniandrian_')}" placeholder="https://instagram.com/mdenniandrian_">
        </div>

        <!-- Live Footer Badge Mockup -->
        <div class="p-3 card mt-auto" style="background:var(--bg-input);border-radius:8px">
          <div class="text-xs text-muted mb-1">Sidebar Footer Preview:</div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm" id="preview-footer-name">${escHtml(b.app_name || 'ITSM Portal')}</span>
            <a href="${escHtml(b.copyright_author_url || 'https://instagram.com/mdenniandrian_')}" target="_blank" class="font-semibold text-xs" style="color:var(--accent-primary)" id="preview-footer-copyright">
              ${escHtml(b.copyright_text || 'Made by @mdenniandrian_')}
            </a>
          </div>
        </div>
      </div>

      <!-- Card 5: Palet Preset & Color Picker (Full Width Spanning 1 / -1) -->
      <div class="card p-4" style="border:1px solid var(--border-hover);display:flex;flex-direction:column;gap:1.25rem;grid-column:1 / -1">
        <div class="flex items-center justify-between flex-wrap gap-2 pb-2" style="border-bottom:1px solid var(--border-primary)">
          <div class="flex items-center gap-2">
            <div class="stat-icon" style="background:var(--accent-primary-glow);color:var(--accent-primary)">${renderIcon('sparkles')}</div>
            <div>
              <div class="font-bold text-sm">Theme Palettes & Live Color Picker</div>
              <div class="text-muted" style="font-size:0.72rem">Choose a curated 1-click theme preset or customize theme accent colors</div>
            </div>
          </div>
          <span class="badge badge-primary font-bold" style="font-size:0.68rem">LIVE PREVIEW ACTIVE</span>
        </div>

        <!-- Preset Palettes -->
        <div>
          <label class="form-label font-semibold text-xs mb-2">Preset Color Themes (1-Click Theme)</label>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:0.75rem">
            ${window.presetsList.map(p => `
              <div class="card p-3 preset-card" onclick="applyPreset('${p.id}')" style="cursor:pointer;border:1px solid var(--border-primary);border-radius:8px;transition:all var(--transition-fast)" id="preset-${p.id}">
                <div class="flex items-center gap-2 mb-2">
                  <div style="width:14px;height:14px;border-radius:50%;background:${p.primary};box-shadow:0 0 8px ${p.primary}66"></div>
                  <div class="font-bold text-xs">${escHtml(p.name)}</div>
                </div>
                <div class="flex gap-1.5">
                  <span style="flex:1;height:6px;border-radius:3px;background:${p.primary}"></span>
                  <span style="flex:1;height:6px;border-radius:3px;background:${p.secondary}"></span>
                  <span style="flex:1;height:6px;border-radius:3px;background:${p.teal}"></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Custom Color Pickers Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:1rem">
          
          <!-- Primary Color -->
          <div class="card p-3" style="background:var(--bg-input);border-radius:8px">
            <label class="form-label font-semibold text-xs mb-1.5">Primary Accent Color</label>
            <div class="flex items-center gap-2">
              <input type="color" id="brand-color-primary" value="${currentPrimary}" oninput="onColorPickerChange()" style="width:40px;height:38px;padding:2px;border:none;border-radius:6px;cursor:pointer;background:transparent">
              <input type="text" class="form-control font-mono text-xs uppercase" id="brand-hex-primary" value="${currentPrimary}" oninput="onHexInputChange('primary')" maxlength="7">
            </div>
            <span class="text-muted mt-1" style="font-size:0.68rem;display:block">Primary buttons, active tabs, and logo accents</span>
          </div>

          <!-- Secondary Color -->
          <div class="card p-3" style="background:var(--bg-input);border-radius:8px">
            <label class="form-label font-semibold text-xs mb-1.5">Secondary Color (Gradient End)</label>
            <div class="flex items-center gap-2">
              <input type="color" id="brand-color-secondary" value="${currentSecondary}" oninput="onColorPickerChange()" style="width:40px;height:38px;padding:2px;border:none;border-radius:6px;cursor:pointer;background:transparent">
              <input type="text" class="form-control font-mono text-xs uppercase" id="brand-hex-secondary" value="${currentSecondary}" oninput="onHexInputChange('secondary')" maxlength="7">
            </div>
            <span class="text-muted mt-1" style="font-size:0.68rem;display:block">Brand gradients, avatars, and banner glows</span>
          </div>

          <!-- Teal / Highlight Color -->
          <div class="card p-3" style="background:var(--bg-input);border-radius:8px">
            <label class="form-label font-semibold text-xs mb-1.5">Highlight Color (Teal / Status)</label>
            <div class="flex items-center gap-2">
              <input type="color" id="brand-color-teal" value="${currentTeal}" oninput="onColorPickerChange()" style="width:40px;height:38px;padding:2px;border:none;border-radius:6px;cursor:pointer;background:transparent">
              <input type="text" class="form-control font-mono text-xs uppercase" id="brand-hex-teal" value="${currentTeal}" oninput="onHexInputChange('teal')" maxlength="7">
            </div>
            <span class="text-muted mt-1" style="font-size:0.68rem;display:block">Success indicators and integration badges</span>
          </div>
        </div>

        <!-- Real-time Live Interactive Mockup Box -->
        <div class="p-4 card" style="background:var(--bg-surface);border:1px dashed var(--border-hover);border-radius:10px">
          <div class="text-xs font-bold text-muted mb-3 flex items-center gap-1.5">
            <span>${renderIcon('sparkles')}</span>
            <span>Live UI Component Preview with Active Palette:</span>
          </div>
          <div class="flex items-center flex-wrap gap-3">
            <button class="btn btn-primary btn-sm">Primary Button</button>
            <button class="btn btn-secondary btn-sm">Secondary Button</button>
            <span class="badge badge-primary font-bold">Brand Badge</span>
            <span class="badge badge-open">Status Open</span>
            <div class="avatar">${getInitials(appState.user?.name || 'Admin')}</div>
            <div class="stat-icon" style="background:var(--accent-primary-glow);color:var(--accent-primary)">${renderIcon('ticket')}</div>
          </div>
        </div>

      </div>

    </div>
  `;

  liveUpdatePreview();
}

window.handleLogoFileUpload = async function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('logo', file);

  try {
    toast.info('Uploading logo...');
    const res = await brandingApi.uploadLogo(formData);
    document.getElementById('brand-logo-url').value = res.logo_url;
    toast.success('Logo uploaded successfully!');
    liveUpdatePreview();
  } catch (err) {
    toast.error('Failed to upload logo', err.message);
  }
};

window.clearCustomLogo = function() {
  document.getElementById('brand-logo-url').value = '';
  document.getElementById('brand-logo-file').value = '';
  liveUpdatePreview();
  toast.info('Custom logo removed. Default icon restored.');
};

window.onLogoUrlChange = function() {
  liveUpdatePreview();
};

window.handleFaviconFileUpload = async function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('favicon', file);

  try {
    toast.info('Uploading favicon...');
    const res = await brandingApi.uploadFavicon(formData);
    document.getElementById('brand-favicon-url').value = res.favicon_url;
    toast.success('Favicon uploaded successfully!');
    liveUpdatePreview();
  } catch (err) {
    toast.error('Failed to upload favicon', err.message);
  }
};

window.clearCustomFavicon = function() {
  document.getElementById('brand-favicon-url').value = '';
  document.getElementById('brand-favicon-file').value = '';
  liveUpdatePreview();
  toast.info('Custom favicon removed.');
};

window.onFaviconUrlChange = function() {
  liveUpdatePreview();
};

window.useLogoAsFavicon = function() {
  const logoUrl = document.getElementById('brand-logo-url')?.value.trim() || '';
  if (!logoUrl) {
    toast.warning('No logo set', 'Please upload or enter a logo URL first.');
    return;
  }
  document.getElementById('brand-favicon-url').value = logoUrl;
  liveUpdatePreview();
  toast.success('Logo copied to Favicon URL!');
};

window.applyPreset = function(presetId) {
  const p = window.presetsList.find(item => item.id === presetId);
  if (!p) return;

  document.getElementById('brand-color-primary').value = p.primary;
  document.getElementById('brand-hex-primary').value = p.primary;

  document.getElementById('brand-color-secondary').value = p.secondary;
  document.getElementById('brand-hex-secondary').value = p.secondary;

  document.getElementById('brand-color-teal').value = p.teal;
  document.getElementById('brand-hex-teal').value = p.teal;

  // Highlight active preset card
  document.querySelectorAll('.preset-card').forEach(c => c.style.borderColor = 'var(--border-primary)');
  const el = document.getElementById(`preset-${presetId}`);
  if (el) el.style.borderColor = 'var(--accent-primary)';

  onColorPickerChange();
  toast.info(`Color preset applied: ${p.name}`);
};

window.onColorPickerChange = function() {
  const primary = document.getElementById('brand-color-primary').value;
  const secondary = document.getElementById('brand-color-secondary').value;
  const teal = document.getElementById('brand-color-teal').value;

  document.getElementById('brand-hex-primary').value = primary;
  document.getElementById('brand-hex-secondary').value = secondary;
  document.getElementById('brand-hex-teal').value = teal;

  applyLiveThemeVariables(primary, secondary, teal);
};

window.onHexInputChange = function(type) {
  let hex = document.getElementById(`brand-hex-${type}`).value.trim();
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (/^#[0-9A-F]{6}$/i.test(hex)) {
    document.getElementById(`brand-color-${type}`).value = hex;
    const primary = document.getElementById('brand-color-primary').value;
    const secondary = document.getElementById('brand-color-secondary').value;
    const teal = document.getElementById('brand-color-teal').value;
    applyLiveThemeVariables(primary, secondary, teal);
  }
};

window.liveUpdatePreview = function() {
  const name = document.getElementById('brand-app-name')?.value || '';
  const subtitle = document.getElementById('brand-app-subtitle')?.value || '';
  const version = document.getElementById('brand-app-version')?.value || '1.0.0';
  const copyright = document.getElementById('brand-copyright-text')?.value || 'Made by @mdenniandrian_';
  const metaTitle = document.getElementById('brand-meta-title')?.value || 'ITSM Portal - Enterprise Service Desk';
  const logoUrl = document.getElementById('brand-logo-url')?.value.trim() || '';
  const faviconUrl = document.getElementById('brand-favicon-url')?.value.trim() || '';
  const logoType = document.getElementById('brand-logo-type')?.value || 'icon_text';

  const pName = document.getElementById('preview-footer-name');
  if (pName) pName.textContent = name || 'ITSM Portal';

  const pCopy = document.getElementById('preview-footer-copyright');
  if (pCopy) pCopy.textContent = copyright;

  // Render the live navbrand mockup in Studio
  const studioNavbrand = document.getElementById('studio-navbrand-preview');
  if (studioNavbrand) {
    if (logoUrl) {
      studioNavbrand.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:flex-start;gap:0.35rem;width:100%;min-width:0">
          <div style="width:100%;max-width:100%;display:flex;align-items:center;min-width:0">
            <img src="${escHtml(logoUrl)}" alt="Logo" style="max-height:40px;max-width:100%;width:auto;object-fit:contain;object-position:left center;display:block">
          </div>
          ${(name || subtitle) ? `
            <div style="display:flex;flex-direction:column;gap:1px;width:100%;min-width:0;margin-top:2px">
              ${name ? `<div class="font-bold text-sm" style="letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(name)}</div>` : ''}
              <div class="flex items-center gap-1.5 flex-wrap" style="margin-top:1px">
                ${subtitle ? `<span class="text-muted" style="font-size:0.65rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(subtitle)}</span>` : ''}
                <span class="badge badge-secondary" style="font-size:0.6rem;padding:0px 5px">v${escHtml(version)}</span>
              </div>
            </div>
          ` : `
            <div class="flex items-center gap-1.5" style="margin-top:2px">
              <span class="badge badge-secondary" style="font-size:0.6rem;padding:0px 5px">v${escHtml(version)}</span>
            </div>
          `}
        </div>
      `;
    } else {
      studioNavbrand.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;width:100%;min-width:0">
          <div style="background:var(--gradient-brand);color:white;width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style="flex:1;min-width:0;overflow:hidden">
            ${name ? `<div class="font-bold text-sm" style="letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(name)}</div>` : ''}
            <div class="flex items-center gap-1.5" style="margin-top:2px">
              ${subtitle ? `<div class="text-muted" style="font-size:0.65rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(subtitle)}</div>` : ''}
              <span class="badge badge-secondary" style="font-size:0.6rem;padding:0px 5px">v${escHtml(version)}</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Live Browser Tab Preview
  const tabTitleEl = document.getElementById('studio-tab-title');
  if (tabTitleEl) tabTitleEl.textContent = metaTitle || 'ITSM Portal';

  const tabImg = document.getElementById('studio-favicon-img');
  const tabSvg = document.getElementById('studio-favicon-svg-default');
  const effectiveFavicon = faviconUrl || logoUrl;

  if (effectiveFavicon && tabImg && tabSvg) {
    tabImg.src = effectiveFavicon;
    tabImg.style.display = 'inline-block';
    tabSvg.style.display = 'none';
  } else if (tabImg && tabSvg) {
    tabImg.style.display = 'none';
    tabSvg.style.display = 'flex';
  }

  // Update actual browser tab live!
  if (effectiveFavicon && typeof window.updateFavicon === 'function') {
    window.updateFavicon(effectiveFavicon);
  }
  if (metaTitle) {
    document.title = metaTitle;
  }

  // Update real sidebar brand header live
  if (typeof window.renderSidebarBrand === 'function') {
    window.renderSidebarBrand({
      app_name: name,
      app_subtitle: subtitle,
      app_version: version,
      logo_url: logoUrl,
      logo_type: logoType,
    });
  }
};

function applyLiveThemeVariables(primary, secondary, teal) {
  const styleEl = document.getElementById('custom-branding-style') || document.createElement('style');
  styleEl.id = 'custom-branding-style';
  
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
  if (!document.getElementById('custom-branding-style')) {
    document.head.appendChild(styleEl);
  }
}

window.saveBrandingSettings = async function() {
  const btn = document.getElementById('save-branding-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner spinner-xs" style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;vertical-align:middle"></span> Saving...`;
  }

  const payload = {
    app_name: document.getElementById('brand-app-name').value.trim() || null,
    app_subtitle: document.getElementById('brand-app-subtitle').value.trim() || null,
    meta_title: document.getElementById('brand-meta-title').value.trim(),
    logo_url: document.getElementById('brand-logo-url').value.trim() || null,
    favicon_url: document.getElementById('brand-favicon-url')?.value.trim() || null,
    logo_type: document.getElementById('brand-logo-type').value,
    company_name: document.getElementById('brand-company-name').value.trim(),
    company_email: document.getElementById('brand-company-email').value.trim(),
    company_phone: document.getElementById('brand-company-phone').value.trim(),
    company_website: document.getElementById('brand-company-website').value.trim(),
    app_version: document.getElementById('brand-app-version').value.trim(),
    copyright_text: document.getElementById('brand-copyright-text').value.trim(),
    copyright_author: document.getElementById('brand-copyright-author').value.trim(),
    copyright_author_url: document.getElementById('brand-copyright-url').value.trim(),
    primary_color: document.getElementById('brand-color-primary').value,
    secondary_color: document.getElementById('brand-color-secondary').value,
    teal_color: document.getElementById('brand-color-teal').value,
  };

  try {
    const res = await brandingApi.update(payload);
    toast.success(res.message || 'Brand, Logo, Version, Copyright, and Color Theme settings saved successfully!');
    
    if (typeof window.applyBrandingTheme === 'function') {
      window.applyBrandingTheme(res.branding);
    }
    
    // Refresh shell elements
    renderBrandingPage(res.branding);
  } catch (err) {
    toast.error('Failed to save brand settings', err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${renderIcon('check')} <span>Save Changes</span>`;
    }
  }
};

window.resetBrandingDefaults = function() {
  modal.confirm(
    'Reset Brand & Themes',
    'Are you sure you want to reset all logo, portal title, copyright, version, and color theme settings to default?',
    async () => {
      try {
        const res = await brandingApi.reset();
        toast.success(res.message || 'Theme and company profile reset to default.');
        if (typeof window.applyBrandingTheme === 'function') {
          window.applyBrandingTheme(res.branding);
        }
        renderBrandingPage(res.branding);
      } catch (err) {
        toast.error('Failed to reset settings', err.message);
      }
    }
  );
};
