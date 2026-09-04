// IT Lease & Inventory Management Application - REST Client Logic

// State management
let state = {
  devices: [],
  loans: [],
  activities: [],
  users: [],
  currentUser: null,
  activeView: 'dashboard',
  inventoryLayout: 'grid',
  filters: {
    search: '',
    type: 'all',
    location: 'all',
    status: 'all'
  },
  currentDeviceEditId: null,
  charts: {
    statusChart: null,
    locationChart: null
  },
  historySubTab: 'loans',
  auditFilters: {
    search: '',
    admin: 'all',
    type: 'all'
  },
  leaseFilters: {
    search: '',
    provider: 'all',
    status: 'all'
  }
};

// Helper: show/hide error message for a field
function setFieldError(inputEl, errorEl, message) {
  if (message) {
    inputEl.classList.add('is-invalid');
    if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
  } else {
    inputEl.classList.remove('is-invalid');
    if (errorEl) { errorEl.style.display = 'none'; }
  }
}

// Helper: clear all field errors in a form
function clearFormErrors(formEl) {
  formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  formEl.querySelectorAll('.error-msg').forEach(el => { el.style.display = 'none'; });
}

// API calls wrapper
const API = {
  getHeaders: () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  },

  login: async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd logowania.');
    return data;
  },

  register: async (name, email, password, role) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd rejestracji.');
    return data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: API.getHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd zmiany hasła.');
    return data;
  },

  requestPasswordReset: async (email) => {
    const res = await fetch('/api/auth/forgot-password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd wysyłania kodu resetującego.');
    return data;
  },

  forgotPasswordReset: async (email, code, newPassword) => {
    const res = await fetch('/api/auth/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd resetowania hasła.');
    return data;
  },

  getProfile: async () => {
    const res = await fetch('/api/auth/me', { headers: API.getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sesja wygasła.');
    return data;
  },

  getUsers: async () => {
    const res = await fetch('/api/users', { headers: API.getHeaders() });
    return await res.json();
  },

  getStats: async () => {
    const res = await fetch('/api/stats', { headers: API.getHeaders() });
    return await res.json();
  },
  
  getDevices: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`/api/devices?${query}`, { headers: API.getHeaders() });
    return await res.json();
  },

  getDeviceById: async (id) => {
    const res = await fetch(`/api/devices/${id}`, { headers: API.getHeaders() });
    return await res.json();
  },

  addDevice: async (deviceData) => {
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: API.getHeaders(),
      body: JSON.stringify(deviceData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd dodawania urządzenia.');
    return data;
  },

  updateDevice: async (id, deviceData) => {
    const res = await fetch(`/api/devices/${id}`, {
      method: 'PUT',
      headers: API.getHeaders(),
      body: JSON.stringify(deviceData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd aktualizacji urządzenia.');
    return data;
  },

  deleteDevice: async (id) => {
    const res = await fetch(`/api/devices/${id}`, {
      method: 'DELETE',
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd usuwania urządzenia.');
    return data;
  },

  transferDevice: async (id) => {
    const res = await fetch(`/api/devices/${id}/transfer`, {
      method: 'POST',
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd przesunięcia urządzenia.');
    return data;
  },

  issueLoan: async (id, loanData) => {
    const res = await fetch(`/api/devices/${id}/loan`, {
      method: 'POST',
      headers: API.getHeaders(),
      body: JSON.stringify(loanData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd wypożyczania sprzętu.');
    return data;
  },

  returnLoan: async (id, returnData) => {
    const res = await fetch(`/api/devices/${id}/return`, {
      method: 'POST',
      headers: API.getHeaders(),
      body: JSON.stringify(returnData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd rejestracji zwrotu.');
    return data;
  },

  getDeviceHistory: async (id) => {
    const res = await fetch(`/api/devices/${id}/history`, { headers: API.getHeaders() });
    return await res.json();
  },

  getActiveLoans: async () => {
    const res = await fetch('/api/loans/active', { headers: API.getHeaders() });
    return await res.json();
  },

  getFullHistory: async () => {
    const res = await fetch('/api/history', { headers: API.getHeaders() });
    return await res.json();
  },

  deleteHistoryEntry: async (id) => {
    const res = await fetch(`/api/history/${id}`, {
      method: 'DELETE',
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd usuwania wpisu historii.');
    return data;
  },

  clearCompletedHistory: async () => {
    const res = await fetch('/api/history/completed', {
      method: 'DELETE',
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd czyszczenia historii.');
    return data;
  },

  getActivities: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`/api/activities?${query}`, { headers: API.getHeaders() });
    return await res.json();
  },

  confirmTransfer: async (id, confirmData) => {
    const res = await fetch(`/api/devices/${id}/confirm-transfer`, {
      method: 'POST',
      headers: API.getHeaders(),
      body: JSON.stringify(confirmData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd zatwierdzania odbioru.');
    return data;
  },

  clearActivities: async () => {
    const res = await fetch('/api/activities', {
      method: 'DELETE',
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Błąd czyszczenia rejestru aktywności.');
    return data;
  }
};

// Role helpers
function getRole() { return state.currentUser ? state.currentUser.role : null; }
function isAdmin()     { return getRole() === 'admin'; }
function isIT()        { return getRole() === 'it'; }
function isAccountant(){ return getRole() === 'accountant'; }
function canManageDevices() { return isAdmin() || isIT(); }

// Role config per view
const ROLE_CONFIG = {
  admin: {
    label: 'Administrator IT', color: 'var(--color-danger)',
    nav: ['dashboard', 'inventory', 'loans', 'leasing', 'history'],
    startView: 'dashboard'
  },
  it: {
    label: 'Pracownik IT', color: 'var(--color-info)',
    nav: ['dashboard', 'inventory', 'loans', 'history'],
    startView: 'dashboard'
  },
  accountant: {
    label: 'Księgowy / Leasing', color: '#a78bfa',
    nav: ['inventory', 'leasing'],
    startView: 'leasing'
  }
};

// Apply full role-based UI permissions
function updatePermissions() {
  if (!state.currentUser) return;

  const role = getRole();
  const cfg  = ROLE_CONFIG[role] || ROLE_CONFIG['it'];

  // Update name + role badge
  const nameEl  = document.getElementById('active-user-name');
  const badgeEl = document.getElementById('user-role-badge');
  if (nameEl)  nameEl.innerText  = state.currentUser.name;
  if (badgeEl) { badgeEl.innerText = cfg.label; badgeEl.style.color = cfg.color; }

  // Show/hide nav links based on allowed views
  document.querySelectorAll('.nav-link').forEach(link => {
    const view = link.getAttribute('data-view');
    const allowed = cfg.nav.includes(view);
    link.closest('.nav-item').style.display = allowed ? '' : 'none';
  });

  // ─── Global action visibility ───────────────────────────────────
  // "Dodaj Komputer" header button — only IT/Admin
  const addBtn = document.getElementById('add-device-btn');
  if (addBtn) addBtn.style.display = canManageDevices() ? 'inline-flex' : 'none';

  // Change password button (always visible for all)
  const chPassBtn = document.getElementById('change-pass-btn');
  if (chPassBtn) chPassBtn.style.display = '';

  // Clear history/activities — Admin only
  const clearHistoryBtn    = document.getElementById('clear-history-btn');
  const clearActivitiesBtn = document.getElementById('clear-activities-btn');
  if (clearHistoryBtn)    clearHistoryBtn.style.display    = isAdmin() ? 'inline-flex' : 'none';
  if (clearActivitiesBtn) clearActivitiesBtn.style.display = isAdmin() ? 'inline-flex' : 'none';

  // Show/hide dashboard quick actions per role
  const qaAddEl = document.getElementById('qa-add-device');
  const qaBrowseEl = document.getElementById('qa-browse');
  const qaLoansEl = document.getElementById('qa-loans');
  const qaLeaseEl = document.getElementById('qa-lease');

  if (qaAddEl) qaAddEl.style.display = canManageDevices() ? 'inline-flex' : 'none';
  if (qaBrowseEl) qaBrowseEl.style.display = canManageDevices() ? 'inline-flex' : 'none';
  if (qaLoansEl) qaLoansEl.style.display = canManageDevices() ? 'inline-flex' : 'none';
  if (qaLeaseEl) qaLeaseEl.style.display = (isAdmin() || isAccountant()) ? 'inline-flex' : 'none';

  // Navigate to the correct start view for this role
  switchView(cfg.startView);
}


// Render Dashboard
async function renderDashboard() {
  try {
    const stats = await API.getStats();
    const total = stats.total || 1; // avoid divide by zero

    // Update stat cards with animated values
    const statEls = [
      { id: 'stat-total', val: stats.total, barId: 'stat-total-bar', pct: 100 },
      { id: 'stat-available', val: stats.available, barId: 'stat-available-bar', pct: Math.round((stats.available / total) * 100) },
      { id: 'stat-loaned', val: stats.loaned, barId: 'stat-loaned-bar', pct: Math.round((stats.loaned / total) * 100) },
      { id: 'stat-maintenance', val: stats.maintenance, barId: 'stat-maintenance-bar', pct: Math.round((stats.maintenance / total) * 100) }
    ];
    statEls.forEach(({ id, val, barId, pct }) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
      const bar = document.getElementById(barId);
      if (bar) { bar.style.width = '0%'; setTimeout(() => { bar.style.width = pct + '%'; }, 100); }
    });

    // Update nav badge counts
    const loansCountBadge = document.getElementById('nav-count-loans');
    if (loansCountBadge) {
      if (stats.loaned > 0) { loansCountBadge.textContent = stats.loaned; loansCountBadge.style.display = 'inline-block'; }
      else { loansCountBadge.style.display = 'none'; }
    }
    const invCountBadge = document.getElementById('nav-count-inventory');
    if (invCountBadge) {
      if (stats.total > 0) { invCountBadge.textContent = stats.total; invCountBadge.style.display = 'inline-block'; }
      else { invCountBadge.style.display = 'none'; }
    }

    // Render recent activities
    const activityContainer = document.getElementById('recent-activities');
    activityContainer.innerHTML = '';
    const activities = await API.getActivities({ limit: 6 });

    if (activities.length === 0) {
      activityContainer.innerHTML = `<div class="empty-state" style="padding: 2rem;"><i class="fas fa-bell-slash"></i><p>Brak aktywności do wyświetlenia.</p></div>`;
    } else {
      activities.forEach(act => {
        const iconMap = { loan: 'fa-handshake', return: 'fa-undo-alt', maintenance: 'fa-tools', transfer: 'fa-truck', system: 'fa-cogs' };
        const iconClass = iconMap[act.type] || 'fa-laptop';
        activityContainer.innerHTML += `
          <div class="activity-item ${act.type}">
            <div class="activity-icon"><i class="fas ${iconClass}" aria-hidden="true"></i></div>
            <div class="activity-details">
              <div class="activity-title">${act.title}</div>
              <div class="activity-meta">
                <span><i class="fas fa-user" style="margin-right:0.2rem; opacity:0.5;"></i>${act.user}</span>
                <span>${act.date || ''}</span>
              </div>
            </div>
          </div>
        `;
      });
    }

    updateCharts(stats);
  } catch (err) {
    console.error('Dashboard render error:', err);
    showToast('Błąd ładowania danych dashboardu.', 'error');
  }
}

// Render Device List (Inventory)
async function renderInventory() {
  const grid = document.getElementById('device-grid');
  const tableContainer = document.getElementById('device-table-container');
  const tableBody = document.getElementById('device-table-body');
  const canManage = canManageDevices();
  const adminOnly = isAdmin();
  
  try {
    const devices = await API.getDevices(state.filters);
    state.devices = devices;
    
    const activeLoans = await API.getActiveLoans();

    // Toggle container display based on selection
    if (state.inventoryLayout === 'grid') {
      grid.style.display = 'grid';
      tableContainer.style.display = 'none';
      grid.innerHTML = '';
    } else {
      grid.style.display = 'none';
      tableContainer.style.display = 'block';
      tableBody.innerHTML = '';
    }

    // Update results counter
    const countBar = document.getElementById('inventory-count-bar');
    const countEl = document.getElementById('inventory-result-count');
    if (countBar && countEl) { countBar.style.display = 'block'; countEl.textContent = devices.length; }

    if (devices.length === 0) {
      const emptyHtml = `<div class="empty-state"><i class="fas fa-search"></i><p>Brak urządzeń spełniających kryteria wyszukiwania.</p></div>`;
      if (state.inventoryLayout === 'grid') {
        grid.innerHTML = `<div style="grid-column: 1/-1;">${emptyHtml}</div>`;
      } else {
        tableBody.innerHTML = `<tr><td colspan="6">${emptyHtml}</td></tr>`;
      }
      return;
    }

    devices.forEach(device => {
      let statusBadge = '';
      let statusText = '';
      if (device.status === 'available') {
        statusBadge = 'badge-available';
        statusText = 'Dostępny';
      } else if (device.status === 'loaned') {
        statusBadge = 'badge-loaned';
        statusText = 'Wypożyczony';
      } else if (device.status === 'maintenance') {
        statusBadge = 'badge-maintenance';
        statusText = 'W serwisie';
      } else if (device.status === 'retired') {
        statusBadge = 'badge-retired';
        statusText = 'Wycofany';
      } else if (device.status === 'in_transit') {
        statusBadge = 'badge-in_transit';
        statusText = 'W drodze';
      }

      const typeIcon = device.type === 'laptop' ? 'fa-laptop' : 'fa-desktop';
      
      let borrowerName = '';
      let borrowerHtml = '';
      if (device.status === 'loaned') {
        const deviceIdString = device._id || device.id;
        const activeLoan = activeLoans.find(l => {
          const lDevId = l.device?._id || l.device?.id || l.deviceId;
          return lDevId.toString() === deviceIdString.toString();
        });

        if (activeLoan) {
          borrowerName = activeLoan.employeeName;
          borrowerHtml = `<div class="spec-row"><span class="spec-name">Wypożyczający:</span> <span class="spec-val" style="color: var(--accent-indigo); font-weight:600;">${activeLoan.employeeName}</span></div>`;
        }
      }

      // Route indicator for in_transit status
      let transitHtml = '';
      if (device.status === 'in_transit') {
        transitHtml = `
          <div class="spec-row" style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 8px; padding: 0.4rem 0.6rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.15rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.725rem;">
              <span style="color: var(--text-muted);"><i class="fas fa-truck"></i> Transport:</span>
              <span style="color: #22d3ee; font-weight: 700;">${device.transferFrom} ➔ ${device.transferTo}</span>
            </div>
            <div style="font-size: 0.65rem; color: var(--text-muted); text-align: right;">
              Wysłał: ${device.transferInitiatedBy || 'IT'} (${device.transferInitiatedAt ? device.transferInitiatedAt.split(' ')[0] : ''})
            </div>
          </div>
        `;
      }

      let actionButtons = '';
      const deviceIdStr = device._id || device.id;

      if (canManage) {
        if (device.status === 'available') {
          actionButtons = `<button class="btn btn-primary" onclick="openLoanModal('${deviceIdStr}')">Wypożycz</button>`;
        } else if (device.status === 'loaned') {
          actionButtons = `<button class="btn btn-success" onclick="openReturnModal('${deviceIdStr}')">Zwróć</button>`;
        } else if (device.status === 'in_transit') {
          actionButtons = `<button class="btn btn-info" onclick="openConfirmTransferModal('${deviceIdStr}')" style="background:var(--color-info);border-color:var(--color-info);color:#fff;">Odbierz</button>`;
        }
      }

      let adminControls = '';
      if (canManage || isAccountant()) {
        const isTransferDisabled = (device.status === 'loaned' || device.status === 'in_transit') ? 'disabled' : '';
        const isDeleteDisabled   = (device.status === 'loaned' || device.status === 'in_transit') ? 'disabled' : '';
        adminControls = `
          <button class="btn btn-secondary btn-icon-only" onclick="openEditDeviceModal('${deviceIdStr}')" title="Edytuj dane">
            <i class="fas fa-edit"></i>
          </button>
          ${canManage ? `<button class="btn btn-info btn-icon-only" onclick="transferDeviceLocation('${deviceIdStr}')" title="Przesuń do: ${device.location === 'Warszawa' ? 'Kraków' : 'Warszawa'}" ${isTransferDisabled}>
            <i class="fas fa-exchange-alt"></i>
          </button>` : ''}
          ${adminOnly ? `<button class="btn btn-danger btn-icon-only" onclick="confirmDeleteDevice('${deviceIdStr}', '${device.brand} ${device.model}', '${device.assetTag}')" title="Usuń komputer" ${isDeleteDisabled}>
            <i class="fas fa-trash-alt"></i>
          </button>` : ''}
        `;
      }

      // Check if price discrepancies exist to highlight
      let discrepancyCardBorder = '';
      let discrepancyBadge = '';
      if (device.expectedLeaseCost !== device.actualLeaseCost) {
        discrepancyCardBorder = 'style="border-color: rgba(239, 68, 68, 0.45); background: rgba(239, 68, 68, 0.02);"';
        discrepancyBadge = `<span class="badge badge-retired" style="font-size: 0.6rem; padding: 0.15rem 0.35rem; position: absolute; top: 0.5rem; left: 0.5rem;" title="Niezgodność raty leasingu!"><i class="fas fa-exclamation-triangle"></i> błąd raty</span>`;
      }

      if (state.inventoryLayout === 'grid') {
        grid.innerHTML += `
          <div class="device-card" ${discrepancyCardBorder}>
            ${discrepancyBadge}
            <div>
              <div class="device-card-header">
                <div>
                  <div class="device-title"><i class="fas ${typeIcon}" style="margin-right: 0.5rem; color: var(--text-secondary);"></i>${device.brand} ${device.model}</div>
                  <div class="device-meta">
                    <span>Asset: <strong class="device-meta-val">${device.assetTag}</strong></span>
                    <span>S/N: <strong class="device-meta-val">${device.serialNumber}</strong></span>
                  </div>
                </div>
                <span class="badge ${statusBadge}">${statusText}</span>
              </div>
 
              <div class="device-specs">
                <div class="spec-row"><span class="spec-name">Procesor:</span> <span class="spec-val">${device.specs.cpu || 'N/A'}</span></div>
                <div class="spec-row"><span class="spec-name">Pamięć RAM:</span> <span class="spec-val">${device.specs.ram || 'N/A'}</span></div>
                <div class="spec-row"><span class="spec-name">Dysk:</span> <span class="spec-val">${device.specs.ssd || 'N/A'}</span></div>
                ${borrowerHtml}
                ${transitHtml}
              </div>
              
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; font-style: italic;">
                ${device.notes ? 'Uwagi: ' + device.notes.substring(0, 100) + (device.notes.length > 100 ? '...' : '') : ''}
              </div>
            </div>
 
            <div class="device-footer">
              <div class="location-badge">
                <i class="fas fa-map-marker-alt"></i>
                <span>Siedziba: <strong>${device.status === 'in_transit' ? device.transferFrom + ' ➔ ' + device.transferTo : device.location}</strong></span>
              </div>
              <div class="card-actions">
                <button class="btn btn-secondary btn-icon-only" onclick="viewDeviceHistory('${deviceIdStr}')" title="Historia wypożyczeń">
                  <i class="fas fa-history"></i>
                </button>
                ${adminControls}
                ${actionButtons}
              </div>
            </div>
          </div>
        `;
      } else {
        // Table row render
        const specsText = `${device.specs.cpu || 'N/A'} | ${device.specs.ram || 'N/A'} | ${device.specs.ssd || 'N/A'}`;
        const borrowerTableText = borrowerName ? `<div style="font-size: 0.725rem; color: var(--accent-indigo); font-weight: 600; margin-top: 0.25rem;">Zajęty: ${borrowerName}</div>` : '';
        const discrepancyWarning = device.expectedLeaseCost !== device.actualLeaseCost ? `<span style="color: var(--color-danger); font-size:0.75rem; font-weight:700;" title="Niezgodność kosztów!"><i class="fas fa-exclamation-circle"></i> błąd raty</span>` : '';
        
        let locationCol = '';
        if (device.status === 'in_transit') {
          locationCol = `
            <div style="font-size: 0.8rem; color: #22d3ee;">
              <i class="fas fa-truck" style="margin-right: 0.25rem;"></i> W drodze do ${device.transferTo}
            </div>
          `;
        } else {
          locationCol = `
            <i class="fas fa-map-marker-alt" style="color: var(--color-info); margin-right: 0.25rem; font-size: 0.8rem;"></i>
            ${device.location}
          `;
        }

        tableBody.innerHTML += `
          <tr ${device.expectedLeaseCost !== device.actualLeaseCost ? 'style="background: rgba(239, 68, 68, 0.01);"' : ''}>
            <td>
              <div style="font-weight: 700; color: #fff;">${device.assetTag}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">S/N: ${device.serialNumber}</div>
            </td>
            <td>
              <div style="font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                <span style="display: flex; align-items: center; gap: 0.5rem;">
                  <i class="fas ${typeIcon}" style="color: var(--text-muted); font-size: 0.9rem;"></i>
                  ${device.brand} ${device.model}
                </span>
                ${discrepancyWarning}
              </div>
            </td>
            <td style="font-size: 0.825rem; color: var(--text-secondary);">${specsText}</td>
            <td>
              ${locationCol}
            </td>
            <td>
              <span class="badge ${statusBadge}" style="padding: 0.25rem 0.5rem; font-size: 0.675rem; border-radius: 6px;">${statusText}</span>
              ${borrowerTableText}
            </td>
            <td>
              <div class="card-actions">
                <button class="btn btn-secondary btn-icon-only" onclick="viewDeviceHistory('${deviceIdStr}')" title="Historia wypożyczeń">
                  <i class="fas fa-history"></i>
                </button>
                ${adminControls}
                ${actionButtons}
              </div>
            </td>
          </tr>
        `;
      }
    });
  } catch (err) {
    console.error('Inventory render error:', err);
  }
}

// Switch inventory layout
function setInventoryLayout(layout) {
  state.inventoryLayout = layout;
  
  const gridBtn = document.getElementById('layout-grid-btn');
  const tableBtn = document.getElementById('layout-table-btn');
  
  if (!gridBtn || !tableBtn) return;

  if (layout === 'grid') {
    gridBtn.style.background = 'var(--bg-glass-hover)';
    gridBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    tableBtn.style.background = 'transparent';
    tableBtn.style.borderColor = 'transparent';
  } else {
    tableBtn.style.background = 'var(--bg-glass-hover)';
    tableBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    gridBtn.style.background = 'transparent';
    gridBtn.style.borderColor = 'transparent';
  }
  
  renderInventory();
}

// Render active loans tab
async function renderLoans() {
  const tableBody = document.getElementById('loans-table-body');
  tableBody.innerHTML = '';
  const canManage = canManageDevices();

  try {
    const activeLoans = await API.getActiveLoans();

    // Update count badge
    const loansBadge = document.getElementById('loans-count-badge');
    if (loansBadge) loansBadge.textContent = activeLoans.length > 0 ? `Aktualnie wypożyczonych: ${activeLoans.length}` : '';

    if (activeLoans.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-handshake-slash"></i><p>Brak aktywnych wypożyczeń w tej chwili. Sprzęt dostępny w magazynie.</p></div></td></tr>`;
      return;
    }

    activeLoans.forEach(loan => {
      const device = loan.device || {};
      const devId = device._id || device.id || loan.deviceId;

      let returnBtn = '';
      if (canManage) {
        returnBtn = `
          <button class="btn btn-success" style="padding:0.5rem 1rem;font-size:0.8rem;" onclick="openReturnModal('${devId}')">
            <i class="fas fa-undo-alt" style="margin-right:0.25rem;"></i>Zwróć
          </button>
        `;
      }

      tableBody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight: 600;">${device.brand || 'Komputer'} ${device.model || ''}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${device.assetTag || 'N/A'} | S/N: ${device.serialNumber || 'N/A'}</div>
          </td>
          <td>
            <div class="employee-info">
              <span style="font-weight: 500;">${loan.employeeName}</span>
              <span class="employee-email">${loan.employeeEmail}</span>
            </div>
          </td>
          <td>${loan.employeeDept}</td>
          <td><i class="fas fa-map-marker-alt" style="margin-right: 0.25rem; color: var(--color-info);"></i>${device.location || 'Brak'}</td>
          <td>
            <div>Od: ${loan.loanDate}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Planowany zwrot: ${loan.expectedReturnDate}</div>
          </td>
          <td>
            ${returnBtn}
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Active loans render error:', err);
  }
}

// Render complete loan and return log history
async function renderHistory() {
  const tableBody = document.getElementById('history-table-body');
  tableBody.innerHTML = '';
  const isAdmin = state.currentUser && state.currentUser.role === 'admin';

  try {
    const history = await API.getFullHistory();
    history.sort((a, b) => new Date(b.loanDate) - new Date(a.loanDate));

    if (history.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">
            Brak jakichkolwiek wpisów w historii.
          </td>
        </tr>
      `;
      return;
    }

    history.forEach(loan => {
      const device = loan.device || {};
      const deviceName = device.brand ? `${device.brand} ${device.model}` : 'Nieznany sprzęt';
      const deviceTag = device.assetTag || 'N/A';
      
      let statusLabel = '';
      if (loan.status === 'active') {
        statusLabel = '<span class="badge badge-loaned" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;">W toku</span>';
      } else {
        statusLabel = '<span class="badge badge-available" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;">Zwrócony</span>';
      }

      // Render row delete button for admin
      let rowActions = '';
      if (isAdmin && loan.status !== 'active') {
        const loanIdStr = loan._id || loan.id;
        rowActions = `
          <button class="btn btn-secondary btn-icon-only" style="padding: 0.25rem; width: 28px; height: 28px; font-size: 0.7rem; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.2);" onclick="deleteHistoryEntry('${loanIdStr}')" title="Usuń ten wpis">
            <i class="fas fa-trash-alt"></i>
          </button>
        `;
      }

      tableBody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight: 500;">${deviceName}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Asset: ${deviceTag}</div>
          </td>
          <td>
            <div class="employee-info">
              <span>${loan.employeeName}</span>
              <span class="employee-email">${loan.employeeEmail}</span>
            </div>
          </td>
          <td>${loan.employeeDept}</td>
          <td>${loan.loanDate}</td>
          <td>${loan.actualReturnDate ? loan.actualReturnDate : '<span style="color: var(--text-muted);">---</span>'}</td>
          <td>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              ${statusLabel}
              ${rowActions}
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('History log render error:', err);
  }
}

// Dynamic Charts Render with Chart.js
function updateCharts(stats) {
  const statusCtx = document.getElementById('statusChart').getContext('2d');
  if (state.charts.statusChart) {
    state.charts.statusChart.destroy();
  }

  state.charts.statusChart = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: ['Dostępne', 'Wypożyczone', 'W serwisie', 'Wycofane'],
      datasets: [{
        data: [stats.available, stats.loaned, stats.maintenance, stats.retired],
        backgroundColor: [
          '#10b981', // green
          '#6366f1', // indigo
          '#f59e0b', // amber
          '#ef4444'  // red
        ],
        borderWidth: 2,
        borderColor: '#0c0f17'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#f3f4f6',
            font: { family: 'Inter', size: 11 }
          }
        }
      },
      cutout: '65%'
    }
  });

  const locCtx = document.getElementById('locationChart').getContext('2d');
  if (state.charts.locationChart) {
    state.charts.locationChart.destroy();
  }

  state.charts.locationChart = new Chart(locCtx, {
    type: 'bar',
    data: {
      labels: ['Warszawa', 'Kraków'],
      datasets: [{
        label: 'Ilość komputerów',
        data: [stats.hqWarszawa, stats.hqKrakow],
        backgroundColor: ['#3b82f6', '#06b6d4'],
        borderRadius: 8,
        barThickness: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af', font: { family: 'Inter' }, stepSize: 1 }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', font: { family: 'Inter' } }
        }
      }
    }
  });
}

// Router/Tab Switcher
function switchView(viewName) {
  state.activeView = viewName;

  const titles = {
    dashboard: { h1: 'Dashboard', sub: 'Podsumowanie zasobów IT oraz statusu leasingu' },
    inventory:  { h1: 'Baza Sprzętu IT', sub: 'Przeglądaj, filtruj i zarządzaj wszystkimi urządzeniami' },
    loans:      { h1: 'Aktywne Wypożyczenia', sub: 'Sprzęt aktualnie w posiadaniu pracowników firmy' },
    leasing:    { h1: 'Leasing i Koszty', sub: 'Analiza kosztów rat leasingowych i rozbieżności finansowych' },
    history:    { h1: 'Historia i Dziennik Audytowy', sub: 'Pełny rejestr operacji oraz dziennik administracyjny IT' }
  };
  const t = titles[viewName] || { h1: viewName, sub: '' };
  const titleEl = document.getElementById('view-title');
  const subEl   = document.getElementById('view-subtitle');
  if (titleEl) titleEl.innerText = t.h1;
  if (subEl)   subEl.innerText   = t.sub;

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-view') === viewName) link.classList.add('active');
  });

  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
  const panel = document.getElementById(`view-${viewName}`);
  if (panel) panel.classList.add('active');

  if (viewName === 'dashboard') renderDashboard();
  else if (viewName === 'inventory') renderInventory();
  else if (viewName === 'loans')     renderLoans();
  else if (viewName === 'leasing')   renderLeasing();
  else if (viewName === 'history')   renderHistory();
}

// Modal Toggle Helpers
function toggleModal(modalId, action) {
  const modal = document.getElementById(modalId);
  if (action === 'open') {
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
  }
}

// Modals Specific Functions
function openAddDeviceModal() {
  document.getElementById('device-modal-title').innerText = 'Dodaj Nowy Komputer';
  document.getElementById('device-form').reset();
  state.currentDeviceEditId = null;
  document.getElementById('dev-status').disabled = false;
  toggleModal('modal-device', 'open');
}

async function openEditDeviceModal(deviceId) {
  try {
    const device = await API.getDeviceById(deviceId);
    state.currentDeviceEditId = deviceId;
    document.getElementById('device-modal-title').innerText = 'Edytuj Dane Komputera';

    document.getElementById('dev-asset').value = device.assetTag;
    document.getElementById('dev-type').value = device.type;
    document.getElementById('dev-brand').value = device.brand;
    document.getElementById('dev-model').value = device.model;
    document.getElementById('dev-serial').value = device.serialNumber;
    document.getElementById('dev-location').value = device.location;
    document.getElementById('dev-status').value = device.status;
    document.getElementById('dev-cpu').value = device.specs?.cpu || '';
    document.getElementById('dev-ram').value = device.specs?.ram || '';
    document.getElementById('dev-ssd').value = device.specs?.ssd || '';
    document.getElementById('dev-notes').value = device.notes || '';

    // Leasing & Financial details loading
    document.getElementById('dev-lease-provider').value = device.leaseProvider || '';
    document.getElementById('dev-device-value').value = device.deviceValue || 0;
    document.getElementById('dev-lease-cost-expected').value = device.expectedLeaseCost || 0;
    document.getElementById('dev-lease-cost-actual').value = device.actualLeaseCost || 0;
    document.getElementById('dev-lease-start').value = device.leaseStartDate || '';
    document.getElementById('dev-lease-end').value = device.leaseEndDate || '';

    // Role-based restrictions
    const roleIt = isIT();
    const roleAccountant = isAccountant();

    // Disable leasing/financial fields for IT
    document.getElementById('dev-lease-provider').disabled = roleIt;
    document.getElementById('dev-device-value').disabled = roleIt;
    document.getElementById('dev-lease-cost-expected').disabled = roleIt;
    document.getElementById('dev-lease-cost-actual').disabled = roleIt;
    document.getElementById('dev-lease-start').disabled = roleIt;
    document.getElementById('dev-lease-end').disabled = roleIt;

    // Disable hardware/specs fields for Accountant
    document.getElementById('dev-asset').disabled = roleAccountant;
    document.getElementById('dev-type').disabled = roleAccountant;
    document.getElementById('dev-brand').disabled = roleAccountant;
    document.getElementById('dev-model').disabled = roleAccountant;
    document.getElementById('dev-serial').disabled = roleAccountant;
    document.getElementById('dev-location').disabled = roleAccountant;
    document.getElementById('dev-cpu').disabled = roleAccountant;
    document.getElementById('dev-ram').disabled = roleAccountant;
    document.getElementById('dev-ssd').disabled = roleAccountant;
    document.getElementById('dev-notes').disabled = roleAccountant;

    // Logic for Status field
    if (device.status === 'loaned' || device.status === 'in_transit' || roleAccountant) {
      document.getElementById('dev-status').disabled = true;
    } else {
      document.getElementById('dev-status').disabled = false;
    }

    toggleModal('modal-device', 'open');
  } catch (err) {
    showToast('Błąd podczas wczytywania komputera: ' + err.message, 'error');
  }
}

// Save/Add Device Submit
async function handleDeviceSubmit(event) {
  event.preventDefault();

  const assetTagInput = document.getElementById('dev-asset');
  const brandInput = document.getElementById('dev-brand');
  const modelInput = document.getElementById('dev-model');
  const serialNumberInput = document.getElementById('dev-serial');
  const type = document.getElementById('dev-type').value;
  const location = document.getElementById('dev-location').value;
  const status = document.getElementById('dev-status').value;
  const cpu = document.getElementById('dev-cpu').value;
  const ram = document.getElementById('dev-ram').value;
  const ssd = document.getElementById('dev-ssd').value;
  const notes = document.getElementById('dev-notes').value;

  // Leasing & Financial details
  const leaseProvider = document.getElementById('dev-lease-provider').value.trim();
  const deviceValue = Number(document.getElementById('dev-device-value').value) || 0;
  const expectedLeaseCost = Number(document.getElementById('dev-lease-cost-expected').value) || 0;
  const actualLeaseCost = Number(document.getElementById('dev-lease-cost-actual').value) || 0;
  const leaseStartDate = document.getElementById('dev-lease-start').value;
  const leaseEndDate = document.getElementById('dev-lease-end').value;

  // Reset validation state
  clearFormErrors(document.getElementById('device-form'));

  const assetTag = assetTagInput.value.trim();
  const brand = brandInput.value.trim();
  const model = modelInput.value.trim();
  const serialNumber = serialNumberInput.value.trim();

  let valid = true;
  if (!assetTag) { setFieldError(assetTagInput, document.getElementById('dev-asset-error'), 'Asset Tag jest wymagany.'); valid = false; }
  if (!brand)    { setFieldError(brandInput, document.getElementById('dev-brand-error'), 'Marka jest wymagana.'); valid = false; }
  if (!model)    { setFieldError(modelInput, document.getElementById('dev-model-error'), 'Model jest wymagany.'); valid = false; }
  if (!serialNumber) { setFieldError(serialNumberInput, document.getElementById('dev-serial-error'), 'Numer seryjny jest wymagany.'); valid = false; }

  // Validate lease dates: end must be after start
  const leaseStart = document.getElementById('dev-lease-start').value;
  const leaseEnd   = document.getElementById('dev-lease-end').value;
  if (leaseStart && leaseEnd && new Date(leaseEnd) <= new Date(leaseStart)) {
    setFieldError(document.getElementById('dev-lease-end'), null, '');
    document.getElementById('dev-lease-end').classList.add('is-invalid');
    showToast('Data zakończenia leasingu musi być późniejsza niż data rozpoczęcia.', 'warning');
    valid = false;
  }

  if (!valid) {
    showToast('Uzupełnij wymagane pola formularza.', 'warning');
    return;
  }

  const payload = {
    assetTag, brand, model, serialNumber,
    type, location, status,
    specs: { cpu, ram, ssd },
    notes,
    leaseProvider, deviceValue, expectedLeaseCost, actualLeaseCost, leaseStartDate, leaseEndDate
  };

  try {
    if (state.currentDeviceEditId) {
      await API.updateDevice(state.currentDeviceEditId, payload);
      showToast('Zaktualizowano dane urządzenia.', 'success');
    } else {
      // Create is only for Admin/IT so they can't be Accountant
      await API.addDevice(payload);
      showToast('Urządzenie dodane do bazy.', 'success');
    }
    
    toggleModal('modal-device', 'close');
    renderInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete Device Trigger
function confirmDeleteDevice(deviceId, name, tag) {
  state.currentDeviceEditId = deviceId;
  document.getElementById('delete-device-info').innerText = `${name} (${tag})`;
  
  const confirmInput = document.getElementById('delete-confirm-input');
  confirmInput.value = '';
  
  const confirmBtn = document.getElementById('delete-confirm-btn');
  confirmBtn.disabled = true;
  confirmBtn.style.opacity = '0.6';
  confirmBtn.style.cursor = 'not-allowed';
  
  toggleModal('modal-confirm-delete', 'open');
}

// Transfer location Trigger
async function transferDeviceLocation(deviceId) {
  const device = state.devices.find(d => (d._id || d.id) === deviceId);
  if (!device) return;

  const currentLoc = device.location;
  const targetLoc = currentLoc === 'Warszawa' ? 'Kraków' : 'Warszawa';
  const deviceName = `${device.brand} ${device.model} (${device.assetTag})`;

  showConfirm(
    `Czy na pewno chcesz wysłać w transport urządzenie <strong>${deviceName}</strong> z oddziału <strong>${currentLoc}</strong> do oddziału <strong>${targetLoc}</strong>? Sprzęt przejdzie w status "W drodze" i będzie wymagał potwierdzenia odbioru na miejscu.`,
    'Wysyłka sprzętu (Transfer)',
    async () => {
      try {
        const res = await API.transferDevice(deviceId);
        showToast(res.message, 'success');
        renderInventory();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  );
}

// Issue Loan Modal
async function openLoanModal(deviceId) {
  try {
    const device = await API.getDeviceById(deviceId);
    state.currentDeviceEditId = deviceId;
    document.getElementById('loan-device-info').innerText = `${device.brand} ${device.model} (${device.assetTag})`;
    document.getElementById('loan-form').reset();
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('loan-date').value = todayStr;
    
    const expectedReturn = new Date();
    expectedReturn.setMonth(expectedReturn.getMonth() + 6);
    document.getElementById('loan-return-date').value = expectedReturn.toISOString().split('T')[0];

    toggleModal('modal-loan', 'open');
  } catch (err) {
    showToast('Błąd otwierania formularza: ' + err.message, 'error');
  }
}

// Submit Loan
async function handleLoanSubmit(event) {
  event.preventDefault();

  const nameInput = document.getElementById('loan-name');
  const emailInput = document.getElementById('loan-email');
  const deptInput = document.getElementById('loan-dept');
  const dateInput = document.getElementById('loan-date');
  const returnInput = document.getElementById('loan-return-date');

  clearFormErrors(document.getElementById('loan-form'));

  const employeeName = nameInput.value.trim();
  const employeeEmail = emailInput.value.trim();
  const employeeDept = deptInput.value.trim();
  const loanDate = dateInput.value;
  const expectedReturnDate = returnInput.value;

  let valid = true;
  if (employeeName.length < 3) {
    setFieldError(nameInput, document.getElementById('loan-name-error'), 'Wpisz pełne imię i nazwisko (min. 3 znaki).');
    valid = false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(employeeEmail)) {
    setFieldError(emailInput, document.getElementById('loan-email-error'), 'Podaj poprawny adres e-mail.');
    valid = false;
  }
  if (!employeeDept) {
    setFieldError(deptInput, document.getElementById('loan-dept-error'), 'Podaj nazwę działu.');
    valid = false;
  }
  if (!loanDate) {
    setFieldError(dateInput, document.getElementById('loan-date-error'), 'Data wydania jest wymagana.');
    valid = false;
  }
  if (!expectedReturnDate || new Date(expectedReturnDate) <= new Date(loanDate)) {
    setFieldError(returnInput, document.getElementById('loan-return-error'), 'Data zwrotu musi być późniejsza niż data wydania.');
    valid = false;
  }
  if (!valid) {
    showToast('Sprawdź poprawność danych formularza.', 'warning');
    return;
  }

  const loanData = { employeeName, employeeEmail, employeeDept, loanDate, expectedReturnDate };

  try {
    await API.issueLoan(state.currentDeviceEditId, loanData);
    showToast('Sprzęt został wydany pracownikowi.', 'success');
    toggleModal('modal-loan', 'close');
    renderInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Open Return Modal
async function openReturnModal(deviceId) {
  try {
    const device = await API.getDeviceById(deviceId);
    const activeLoans = await API.getActiveLoans();
    
    const deviceIdString = device._id || device.id;
    const activeLoan = activeLoans.find(l => {
      const lDevId = l.device?._id || l.device?.id || l.deviceId;
      return lDevId.toString() === deviceIdString.toString();
    });

    if (!activeLoan) {
      showToast('Nie znaleziono aktywnego wypożyczenia dla tego urządzenia.', 'warning');
      return;
    }

    state.currentDeviceEditId = deviceId;
    // Cache the active loan date on the form input to validate return date
    document.getElementById('return-form').dataset.loanDate = activeLoan.loanDate;
    
    document.getElementById('return-device-info').innerText = `${device.brand} ${device.model} (${device.assetTag})`;
    document.getElementById('return-borrower-info').innerText = `Wypożyczający: ${activeLoan.employeeName} (${activeLoan.employeeDept})`;
    document.getElementById('return-form').reset();
    
    document.getElementById('return-date').value = new Date().toISOString().split('T')[0];

    toggleModal('modal-return', 'open');
  } catch (err) {
    showToast('Błąd wczytywania formularza zwrotu: ' + err.message, 'error');
  }
}

// Submit Return
async function handleReturnSubmit(event) {
  event.preventDefault();

  const dateInput = document.getElementById('return-date');
  const condition = document.getElementById('return-condition').value;
  const returnNotes = document.getElementById('return-notes').value;
  const loanDateStr = document.getElementById('return-form').dataset.loanDate;

  dateInput.classList.remove('is-invalid');
  const actualReturnDate = dateInput.value;

  if (!actualReturnDate) {
    dateInput.classList.add('is-invalid');
    showToast('Data zwrotu jest wymagana.', 'warning');
    return;
  }

  if (loanDateStr && new Date(actualReturnDate) < new Date(loanDateStr)) {
    dateInput.classList.add('is-invalid');
    showToast(`Faktyczna data zwrotu nie może być wcześniejsza niż data wypożyczenia (${loanDateStr}).`, 'warning');
    return;
  }

  const returnData = { actualReturnDate, condition, notes: returnNotes };

  try {
    await API.returnLoan(state.currentDeviceEditId, returnData);
    showToast('Zwrot sprzętu został pomyślnie zarejestrowany.', 'success');
    toggleModal('modal-return', 'close');
    
    if (state.activeView === 'loans') {
      renderLoans();
    } else {
      renderInventory();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Single Device History lookup modal
async function viewDeviceHistory(deviceId) {
  try {
    const device = await API.getDeviceById(deviceId);
    document.getElementById('history-device-info').innerText = `${device.brand} ${device.model} (${device.assetTag})`;
    
    const historyList = document.getElementById('device-history-list');
    historyList.innerHTML = '';

    const deviceLoans = await API.getDeviceHistory(deviceId);

    if (deviceLoans.length === 0) {
      historyList.innerHTML = `<li style="padding: 1rem; text-align: center; color: var(--text-muted);">Urządzenie nie było jeszcze nigdy wypożyczane.</li>`;
    } else {
      deviceLoans.forEach(l => {
        let returnSpan = '';
        if (l.status === 'active') {
          returnSpan = `<span class="badge badge-loaned" style="font-size:0.65rem; padding: 0.2rem 0.4rem;">Wypożyczony (do ${l.expectedReturnDate})</span>`;
        } else {
          returnSpan = `<span class="badge badge-available" style="font-size:0.65rem; padding: 0.2rem 0.4rem;">Zwrócono (${l.actualReturnDate})</span>`;
        }

        historyList.innerHTML += `
          <li style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-glass); list-style: none; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <strong style="color: var(--text-primary);">${l.employeeName}</strong>
              ${returnSpan}
            </div>
            <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 0.75rem;">
              <span>Dział: ${l.employeeDept} (${l.employeeEmail})</span>
              <span>Data: ${l.loanDate}</span>
            </div>
          </li>
        `;
      });
    }

    toggleModal('modal-history', 'open');
  } catch (err) {
    showToast('Błąd wczytywania historii: ' + err.message, 'error');
  }
}

// Open Confirm Transfer Modal
async function openConfirmTransferModal(deviceId) {
  try {
    const device = await API.getDeviceById(deviceId);
    state.currentDeviceEditId = deviceId;

    document.getElementById('confirm-transfer-device-info').innerText = `${device.brand} ${device.model} (${device.assetTag})`;
    
    const routeText = `Trasa: ${device.transferFrom || 'N/A'} ➔ ${device.transferTo || 'N/A'} (Wysłane przez: ${device.transferInitiatedBy || 'IT'} dnia: ${device.transferInitiatedAt ? device.transferInitiatedAt.split(' ')[0] : 'N/A'})`;
    document.getElementById('confirm-transfer-route-info').innerText = routeText;
    
    document.getElementById('confirm-transfer-form').reset();
    document.getElementById('confirm-transfer-date').value = new Date().toISOString().split('T')[0];

    toggleModal('modal-confirm-transfer', 'open');
  } catch (err) {
    showToast('Błąd otwierania potwierdzenia odbioru: ' + err.message, 'error');
  }
}

// Handle Confirm Transfer Submit
async function handleConfirmTransferSubmit(event) {
  event.preventDefault();

  const dateInput = document.getElementById('confirm-transfer-date');
  const condition = document.getElementById('confirm-transfer-condition').value;
  const notes = document.getElementById('confirm-transfer-notes').value.trim();

  dateInput.classList.remove('is-invalid');
  if (!dateInput.value) {
    dateInput.classList.add('is-invalid');
    showToast('Data odbioru jest wymagana.', 'warning');
    return;
  }

  const confirmData = {
    arrivalDate: dateInput.value,
    condition,
    notes
  };

  try {
    const res = await API.confirmTransfer(state.currentDeviceEditId, confirmData);
    showToast(res.message, 'success');
    toggleModal('modal-confirm-transfer', 'close');
    renderInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Render Leasing View
async function renderLeasing() {
  try {
    const devices = await API.getDevices({ limit: 1000 }); // fetch all
    const tableBody = document.getElementById('leasing-table-body');
    tableBody.innerHTML = '';

    // Populate provider filter options dynamic list
    const providerSelect = document.getElementById('lease-filter-provider');
    if (providerSelect) {
      const currentProviderVal = providerSelect.value || 'all';
      const providers = new Set();
      devices.forEach(d => {
        if (d.leaseProvider && d.leaseProvider.trim() !== '') {
          providers.add(d.leaseProvider.trim());
        }
      });
      providerSelect.innerHTML = '<option value="all">Wszyscy dostawcy</option>';
      providers.forEach(p => {
        providerSelect.innerHTML += `<option value="${p}">${p}</option>`;
      });
      if (providers.has(currentProviderVal) || currentProviderVal === 'all') {
        providerSelect.value = currentProviderVal;
      } else {
        providerSelect.value = 'all';
      }
    }

    let totalMonthly = 0;
    let warszawaMonthly = 0;
    let krakowMonthly = 0;
    let discrepanciesCount = 0;

    const expiringList = document.getElementById('expiring-leases-list');
    expiringList.innerHTML = '';
    
    const today = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(today.getMonth() + 6);

    const expiringDevices = [];

    // Filter devices based on UI selections
    const filteredDevices = devices.filter(device => {
      const provider = device.leaseProvider || '';
      const expCost = device.expectedLeaseCost || 0;
      const actCost = device.actualLeaseCost || 0;
      
      // We only care about devices that have lease information
      if (!provider && expCost === 0 && actCost === 0) return false;

      // Filter: Search query
      if (state.leaseFilters.search) {
        const keyword = state.leaseFilters.search.toLowerCase().trim();
        const matchesSearch = 
          device.brand.toLowerCase().includes(keyword) ||
          device.model.toLowerCase().includes(keyword) ||
          device.assetTag.toLowerCase().includes(keyword) ||
          (device.leaseProvider && device.leaseProvider.toLowerCase().includes(keyword));
        if (!matchesSearch) return false;
      }

      // Filter: Provider
      if (state.leaseFilters.provider !== 'all') {
        if (device.leaseProvider !== state.leaseFilters.provider) return false;
      }

      // Filter: Status (discrepancies)
      if (state.leaseFilters.status !== 'all') {
        const diff = actCost - expCost;
        if (state.leaseFilters.status === 'match' && diff !== 0) return false;
        if (state.leaseFilters.status === 'mismatch' && diff === 0) return false;
      }

      return true;
    });

    // Calculate global stats based on all devices (not only filtered)
    devices.forEach(device => {
      const provider = device.leaseProvider || '';
      const expCost = device.expectedLeaseCost || 0;
      const actCost = device.actualLeaseCost || 0;
      
      if (!provider && expCost === 0 && actCost === 0) return;

      totalMonthly += actCost;
      if (device.location === 'Warszawa') {
        warszawaMonthly += actCost;
      } else if (device.location === 'Kraków') {
        krakowMonthly += actCost;
      }

      const diff = actCost - expCost;
      if (diff !== 0) {
        discrepanciesCount++;
      }

      // Check lease expiration globally for notice board
      if (device.leaseEndDate) {
        const endD = new Date(device.leaseEndDate);
        if (endD >= today && endD <= sixMonthsLater) {
          expiringDevices.push(device);
        }
      }
    });

    // Render filtered devices in the table
    filteredDevices.forEach(device => {
      const provider = device.leaseProvider || '';
      const expCost = device.expectedLeaseCost || 0;
      const actCost = device.actualLeaseCost || 0;
      const diff = actCost - expCost;
      
      let statusHtml = '';
      if (diff === 0) {
        statusHtml = `<span class="lease-match"><i class="fas fa-check-circle"></i> Zgodne</span>`;
      } else {
        const diffText = diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`;
        statusHtml = `<span class="lease-mismatch"><i class="fas fa-exclamation-triangle"></i> Niezgodne (${diffText} PLN)</span>`;
      }

      const deviceIdStr = device._id || device.id;
      const isAdmin = state.currentUser && state.currentUser.role === 'admin';
      const editBtn = isAdmin ? `
        <button class="btn btn-secondary btn-icon-only" style="padding: 0.2rem; width: 26px; height: 26px; font-size: 0.7rem;" onclick="openEditDeviceModal('${deviceIdStr}')" title="Edytuj koszty leasingu">
          <i class="fas fa-edit"></i>
        </button>
      ` : '';

      tableBody.innerHTML += `
        <tr ${diff !== 0 ? 'style="background: rgba(239, 68, 68, 0.02);"' : ''}>
          <td>
            <div style="font-weight: 600; color: #fff;">${device.brand} ${device.model}</div>
            <div style="font-size: 0.725rem; color: var(--text-muted);">${device.assetTag}</div>
          </td>
          <td>${provider || 'Nieznany'}</td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">
            ${device.leaseStartDate ? device.leaseStartDate : 'N/A'}<br>➔ ${device.leaseEndDate ? device.leaseEndDate : 'N/A'}
          </td>
          <td>${expCost.toFixed(2)} PLN</td>
          <td style="font-weight: 600;">${actCost.toFixed(2)} PLN</td>
          <td>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              ${statusHtml}
              ${editBtn}
            </div>
          </td>
        </tr>
      `;
    });

    // Update stats cards
    document.getElementById('lease-stat-total').innerText = `${totalMonthly.toFixed(2)} PLN`;
    document.getElementById('lease-stat-warszawa').innerText = `${warszawaMonthly.toFixed(2)} PLN`;
    document.getElementById('lease-stat-krakow').innerText = `${krakowMonthly.toFixed(2)} PLN`;

    const discrepancyCard = document.getElementById('lease-discrepancy-card');
    const discrepancyValue = document.getElementById('lease-stat-discrepancies');
    const discrepancyDesc = document.getElementById('discrepancy-desc');
    const discrepancyIcon = document.getElementById('discrepancy-icon');

    if (discrepanciesCount > 0) {
      discrepancyCard.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.03))';
      discrepancyCard.style.borderColor = 'rgba(239, 68, 68, 0.25)';
      discrepancyValue.innerText = `${discrepanciesCount} pozycji`;
      discrepancyValue.style.color = 'var(--color-danger)';
      discrepancyDesc.innerText = 'Wykryto różnice cen rat z faktury';
      discrepancyIcon.style.background = 'rgba(239, 68, 68, 0.2)';
      discrepancyIcon.innerHTML = '<i class="fas fa-exclamation-circle" style="color: var(--color-danger);"></i>';
    } else {
      discrepancyCard.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.03))';
      discrepancyCard.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      discrepancyValue.innerText = 'Brak';
      discrepancyValue.style.color = 'var(--color-success)';
      discrepancyDesc.innerText = 'Koszty zgodne z oczekiwanymi';
      discrepancyIcon.style.background = 'rgba(16, 185, 129, 0.2)';
      discrepancyIcon.innerHTML = '<i class="fas fa-check-circle" style="color: var(--color-success);"></i>';
    }

    // Render expiring leases list
    if (expiringDevices.length === 0) {
      expiringList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem 1rem; font-size: 0.85rem;"><i class="fas fa-check" style="color: var(--color-success); font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>Brak umów wygasających w ciągu najbliższych 6 miesięcy.</div>`;
    } else {
      expiringDevices.forEach(d => {
        const timeDiff = new Date(d.leaseEndDate) - today;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        const color = daysLeft < 30 ? 'var(--color-danger)' : 'var(--color-warning)';
        
        expiringList.innerHTML += `
          <div class="activity-item maintenance" style="border-left-color: ${color};">
            <div class="activity-icon" style="background: rgba(245, 158, 11, 0.1); color: ${color};">
              <i class="fas fa-hourglass-half"></i>
            </div>
            <div class="activity-details">
              <div class="activity-title" style="font-weight:600; color:#fff;">${d.brand} ${d.model} (${d.assetTag})</div>
              <div class="activity-meta">
                <span>Leasing: <strong>${d.leaseProvider}</strong></span>
                <span style="color:${color}; font-weight:700;">Wygasa: ${d.leaseEndDate} (${daysLeft} dni)</span>
              </div>
            </div>
          </div>
        `;
      });
    }

    if (tableBody.innerHTML === '') {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-calculator" style="font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.5;"></i>Brak wprowadzonych danych leasingowych. Dodaj lub edytuj dane komputera, aby uzupełnić te informacje.</td></tr>`;
    }

    // Initialize calculator values
    calculateLeaseSimulation();

  } catch (err) {
    showToast('Błąd pobierania danych leasingowych: ' + err.message, 'error');
  }
}

// Leasing simulator cost calculator (compound interest model PMT)
function calculateLeaseSimulation() {
  const valueInput = document.getElementById('calc-value');
  const periodSelect = document.getElementById('calc-period');
  const interestInput = document.getElementById('calc-interest');
  const buyoutInput = document.getElementById('calc-buyout');

  if (!valueInput || !periodSelect || !interestInput || !buyoutInput) return;

  const V = parseFloat(valueInput.value) || 0;
  const N = parseInt(periodSelect.value) || 36;
  const interestRate = parseFloat(interestInput.value) || 0;
  const buyoutPct = parseFloat(buyoutInput.value) || 0;

  const B = V * (buyoutPct / 100);

  let monthlyInstallment = 0;
  if (interestRate === 0) {
    monthlyInstallment = (V - B) / N;
  } else {
    const r = (interestRate / 100) / 12;
    const factor = Math.pow(1 + r, N);
    monthlyInstallment = (V * r * factor - B * r) / (factor - 1);
  }

  if (monthlyInstallment < 0) monthlyInstallment = 0;

  const totalTCO = (monthlyInstallment * N) + B;
  const interestCost = totalTCO - V;

  // Render simulation results
  const monthlyCostEl = document.getElementById('sim-monthly-cost');
  const buyoutCostEl = document.getElementById('sim-buyout-cost');
  const totalTcoEl = document.getElementById('sim-total-tco');
  const interestCostEl = document.getElementById('sim-interest-cost');

  if (monthlyCostEl) monthlyCostEl.innerText = `${monthlyInstallment.toFixed(2)} PLN`;
  if (buyoutCostEl) buyoutCostEl.innerText = `${B.toFixed(2)} PLN`;
  if (totalTcoEl) totalTcoEl.innerText = `${totalTCO.toFixed(2)} PLN`;
  if (interestCostEl) interestCostEl.innerText = `${interestCost.toFixed(2)} PLN`;
}

// Export leasing calculator simulation results to PDF
function exportLeaseSimulationPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cleanPolish = (str) => {
    if (!str) return 'N/A';
    return str
      .replace(/[ąĄ]/g, 'a').replace(/[ćĆ]/g, 'c')
      .replace(/[ęĘ]/g, 'e').replace(/[łŁ]/g, 'l')
      .replace(/[ńŃ]/g, 'n').replace(/[óÓ]/g, 'o')
      .replace(/[śŚ]/g, 's').replace(/[źŹ]/g, 'z')
      .replace(/[żŻ]/g, 'z');
  };

  const V = parseFloat(document.getElementById('calc-value').value) || 0;
  const N = parseInt(document.getElementById('calc-period').value) || 36;
  const interestRate = parseFloat(document.getElementById('calc-interest').value) || 0;
  const buyoutPct = parseFloat(document.getElementById('calc-buyout').value) || 0;

  const B = V * (buyoutPct / 100);
  let monthlyInstallment = 0;
  if (interestRate === 0) {
    monthlyInstallment = (V - B) / N;
  } else {
    const r = (interestRate / 100) / 12;
    const factor = Math.pow(1 + r, N);
    monthlyInstallment = (V * r * factor - B * r) / (factor - 1);
  }
  if (monthlyInstallment < 0) monthlyInstallment = 0;

  const totalTCO = (monthlyInstallment * N) + B;
  const interestCost = totalTCO - V;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.text("IT LEASE HUB - SYMULACJA KOSZTOW LEASINGU", 14, 20);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generowane przez: ${cleanPolish(state.currentUser ? state.currentUser.name : 'System')}`, 14, 28);
  doc.text(`Data symulacji: ${new Date().toLocaleString()}`, 14, 34);

  doc.line(14, 38, 196, 38);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PARAMETRY WEJSCIOWE:", 14, 48);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Wartosc poczatkowa sprzetu:  ${V.toFixed(2)} PLN`, 14, 58);
  doc.text(`Okres leasingu:               ${N} miesiecy`, 14, 65);
  doc.text(`Roczne oprocentowanie:        ${interestRate.toFixed(1)}%`, 14, 72);
  doc.text(`Wykup jednorazowy:            ${buyoutPct.toFixed(0)}% (${B.toFixed(2)} PLN)`, 14, 79);

  doc.line(14, 86, 196, 86);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.text("WYNIKI OBLICZEN (NETTO):", 14, 96);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Szacowana rata miesieczna:    ${monthlyInstallment.toFixed(2)} PLN`, 14, 108);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Koszt wykupu:                 ${B.toFixed(2)} PLN`, 14, 118);
  doc.text(`Koszt odsetek (finansowanie): ${interestCost.toFixed(2)} PLN`, 14, 125);
  doc.text(`Calkowita suma oplat (TCO):   ${totalTCO.toFixed(2)} PLN`, 14, 132);

  doc.line(14, 140, 196, 140);
  
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text("Prezentowane obliczenia maja charakter szacunkowy i nie stanowia oferty handlowej.", 14, 150);

  doc.save(`Symulacja_Leasingu_${new Date().toISOString().split('T')[0]}.pdf`);
}


// Set active sub-tab inside History View
function setHistorySubTab(subTab) {
  state.historySubTab = subTab;
  
  const loansBtn = document.getElementById('history-tab-loans-btn');
  const auditBtn = document.getElementById('history-tab-audit-btn');
  
  const loansSubview = document.getElementById('subview-history-loans');
  const auditSubview = document.getElementById('subview-history-audit');
  
  const loansActions = document.getElementById('loans-history-actions');

  if (subTab === 'loans') {
    loansBtn.classList.add('active-tab-btn');
    loansBtn.style.background = 'var(--accent-indigo)';
    
    auditBtn.classList.remove('active-tab-btn');
    auditBtn.style.background = 'transparent';

    loansSubview.style.display = 'block';
    auditSubview.style.display = 'none';
    if (loansActions) loansActions.style.display = 'block';

    renderHistory();
  } else {
    auditBtn.classList.add('active-tab-btn');
    auditBtn.style.background = 'var(--accent-indigo)';
    
    loansBtn.classList.remove('active-tab-btn');
    loansBtn.style.background = 'transparent';

    loansSubview.style.display = 'none';
    auditSubview.style.display = 'block';
    if (loansActions) loansActions.style.display = 'none';

    renderAuditLog();
    loadAuditAdminFilter();
  }
}

// Load administrators options for Audit Filter
async function loadAuditAdminFilter() {
  try {
    const users = await API.getUsers();
    const adminSelect = document.getElementById('audit-filter-admin');
    if (!adminSelect) return;
    
    // Save current selection
    const currentVal = adminSelect.value;
    
    adminSelect.innerHTML = '<option value="all">Wszyscy administratorzy</option>';
    
    // Unique list of admins from users
    users.forEach(u => {
      adminSelect.innerHTML += `<option value="${u.name}">${u.name}</option>`;
    });

    adminSelect.value = currentVal;
  } catch (err) {
    console.error('Failed to load admin filter options', err);
  }
}

// Reset Audit log filters
function resetAuditFilters() {
  document.getElementById('audit-search-input').value = '';
  document.getElementById('audit-filter-admin').value = 'all';
  document.getElementById('audit-filter-type').value = 'all';
  
  state.auditFilters = { search: '', admin: 'all', type: 'all' };
  renderAuditLog();
}

// Reset Leasing filters
function resetLeaseFilters() {
  const searchEl = document.getElementById('lease-search-input');
  const providerEl = document.getElementById('lease-filter-provider');
  const statusEl = document.getElementById('lease-filter-status');
  
  if (searchEl) searchEl.value = '';
  if (providerEl) providerEl.value = 'all';
  if (statusEl) statusEl.value = 'all';
  
  state.leaseFilters = { search: '', provider: 'all', status: 'all' };
  renderLeasing();
}

// Render IT System Audit Log
async function renderAuditLog() {
  const tableBody = document.getElementById('audit-table-body');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  try {
    const activities = await API.getActivities(state.auditFilters);
    
    if (activities.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem;">
            <i class="fas fa-user-shield" style="font-size: 2.5rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i>
            Brak zdarzeń w dzienniku audytowym odpowiadających filtrom.
          </td>
        </tr>
      `;
      return;
    }

    activities.forEach(act => {
      let typeLabel = '';
      if (act.type === 'loan') {
        typeLabel = '<span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.25);">Wypożyczenie</span>';
      } else if (act.type === 'return') {
        typeLabel = '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25);">Zwrot</span>';
      } else if (act.type === 'maintenance') {
        typeLabel = '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.25);">Edycja / Serwis</span>';
      } else if (act.type === 'transfer') {
        typeLabel = '<span class="badge" style="background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.25);">Transfer</span>';
      } else if (act.type === 'system') {
        typeLabel = '<span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.25);">System</span>';
      }

      const rawDate = act.date || act.createdAt;
      const formattedDate = rawDate ? rawDate : 'N/A';

      tableBody.innerHTML += `
        <tr>
          <td style="font-size: 0.775rem; color: var(--text-muted); font-weight: 500;">
            ${formattedDate}
          </td>
          <td>
            <div style="font-weight: 600; color: #fff;">${act.admin || act.user || 'System'}</div>
          </td>
          <td>${typeLabel}</td>
          <td style="font-weight: 500; font-size: 0.85rem; color: var(--text-secondary);">${act.title}</td>
          <td>
            <div class="audit-details-text">${act.details || '<span style="color: var(--text-muted); font-style: italic;">Brak szczegółów</span>'}</div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Audit log render error:', err);
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-danger);">Błąd ładowania logów: ${err.message}</td></tr>`;
  }
}

// jsPDF client-side inventory exporter
function generateInventoryPDF() {
  if (state.devices.length === 0) {
    showToast('Brak danych inwentaryzacyjnych do wygenerowania raportu.', 'warning');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const cleanPolish = (str) => {
    if (!str) return 'N/A';
    return str
      .replace(/[ąĄ]/g, 'a').replace(/[ćĆ]/g, 'c')
      .replace(/[ęĘ]/g, 'e').replace(/[łŁ]/g, 'l')
      .replace(/[ńŃ]/g, 'n').replace(/[óÓ]/g, 'o')
      .replace(/[śŚ]/g, 's').replace(/[źŹ]/g, 'z')
      .replace(/[żŻ]/g, 'z');
  };

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.text("IT LEASE HUB - RAPORT INWENTARYZACYJNY", 14, 20);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generowane przez: ${cleanPolish(state.currentUser ? state.currentUser.name : 'System')}`, 14, 28);
  doc.text(`Data raportu: ${new Date().toLocaleString()}`, 14, 34);
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ASSET TAG", 14, 45);
  doc.text("PRODUCENT / MODEL", 45, 45);
  doc.text("S/N (NUMER SERYJNY)", 105, 45);
  doc.text("SIEDZIBA", 155, 45);
  doc.text("STATUS", 182, 45);
  
  doc.line(14, 48, 196, 48);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  let y = 54;
  
  state.devices.forEach(device => {
    if (y > 275) {
      doc.addPage();
      y = 20;
      doc.setFont("Helvetica", "bold");
      doc.text("ASSET TAG", 14, y);
      doc.text("PRODUCENT / MODEL", 45, y);
      doc.text("S/N (NUMER SERYJNY)", 105, y);
      doc.text("SIEDZIBA", 155, y);
      doc.text("STATUS", 182, y);
      doc.line(14, y + 3, 196, y + 3);
      y += 10;
      doc.setFont("Helvetica", "normal");
    }
    
    const statusLabel = {
      available: 'Dostepny',
      loaned: 'Wypozyczony',
      maintenance: 'W serwisie',
      retired: 'Wycofany'
    }[device.status] || device.status;
    
    doc.text(cleanPolish(device.assetTag), 14, y);
    doc.text(cleanPolish(`${device.brand} ${device.model}`.substring(0, 32)), 45, y);
    doc.text(cleanPolish(device.serialNumber), 105, y);
    doc.text(cleanPolish(device.location), 155, y);
    doc.text(statusLabel, 182, y);
    
    y += 8;
  });
  
  doc.save(`Raport_IT_Lease_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Log / History deletion triggers
async function deleteHistoryEntry(loanId) {
  showConfirm('Czy na pewno chcesz usunąć ten wpis z rejestru historii? Ta operacja jest nieodwracalna.', 'Potwierdź usunięcie', async () => {
    try {
      const res = await API.deleteHistoryEntry(loanId);
      showToast(res.message, 'success');
      renderHistory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function clearCompletedHistory() {
  showConfirm('Czy na pewno chcesz usunąć WSZYSTKIE ukończone (zwrócone) wpisy z historii? Rekordy aktywnych wypożyczeń zostaną zachowane.', 'Wyczyść historię', async () => {
    try {
      const res = await API.clearCompletedHistory();
      showToast(res.message, 'success');
      renderHistory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function clearActivitiesLog() {
  showConfirm('Czy na pewno chcesz wyczyścić historię ostatnich aktywności na Dashboardzie?', 'Wyczyść logi aktywności', async () => {
    try {
      const res = await API.clearActivities();
      showToast(res.message, 'success');
      renderDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Toast Notification Helper
function showToast(message, type = 'info', duration = 4500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Limit to 4 toasts
  while (container.children.length >= 4) {
    container.firstChild.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const iconMap = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const titleMap = { success: 'Sukces', error: 'Błąd', warning: 'Uwaga', info: 'Informacja' };
  const icon = iconMap[type] || 'fa-info-circle';

  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icon}" aria-hidden="true"></i></div>
    <div class="toast-content">
      <div class="toast-title">${titleMap[type] || 'Info'}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Zamknij powiadomienie"><i class="fas fa-times" aria-hidden="true"></i></button>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);

  const autoRemove = setTimeout(() => dismissToast(toast), duration);

  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(autoRemove);
    dismissToast(toast);
  });
}

function dismissToast(toast) {
  toast.classList.remove('show');
  toast.classList.add('hide');
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 350);
}

// Programmatic Confirm Modal
function showConfirm(message, title = 'Potwierdź operację', onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.style.zIndex = '99999';
  
  const container = document.createElement('div');
  container.className = 'modal-container';
  container.style.maxWidth = '440px';
  
  container.innerHTML = `
    <div class="modal-header" style="border-bottom-color: rgba(255,255,255,0.1);">
      <h2 style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem;">
        <i class="fas fa-question-circle" style="color: var(--accent-indigo);"></i> ${title}
      </h2>
      <button class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" style="padding: 1.5rem 1rem;">
      <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-primary);">${message}</p>
    </div>
    <div class="modal-footer" style="background: rgba(0,0,0,0.15); display: flex; justify-content: flex-end; gap: 0.5rem;">
      <button type="button" class="btn btn-secondary modal-cancel-btn">Anuluj</button>
      <button type="button" class="btn btn-primary modal-confirm-btn">Potwierdź</button>
    </div>
  `;
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  const close = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 250);
  };
  
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('.modal-cancel-btn').addEventListener('click', close);
  overlay.querySelector('.modal-confirm-btn').addEventListener('click', () => {
    close();
    onConfirm();
  });
}

// Handle Login Submit
async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const emailErr = document.getElementById('login-email-error');
  const passwordErr = document.getElementById('login-password-error');
  
  emailErr.style.display = 'none';
  passwordErr.style.display = 'none';
  emailInput.classList.remove('is-invalid');
  passwordInput.classList.remove('is-invalid');
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) return;
  
  try {
    const data = await API.login(email, password);
    localStorage.setItem('token', data.token);
    state.currentUser = data.user;
    
    document.getElementById('auth-login-form').reset();
    document.getElementById('auth-overlay').classList.remove('active');
    
    showToast(`Zalogowano pomyślnie jako ${data.user.name}`, 'success');
    updatePermissions();
  } catch (err) {
    showToast(err.message, 'error');
    passwordInput.classList.add('is-invalid');
    passwordErr.innerText = err.message;
    passwordErr.style.display = 'block';
  }
}

// Handle Register Submit
async function handleRegisterSubmit(event) {
  event.preventDefault();
  
  const nameInput = document.getElementById('register-name');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const roleInput = document.getElementById('register-role');
  
  const nameErr = document.getElementById('register-name-error');
  const emailErr = document.getElementById('register-email-error');
  const passwordErr = document.getElementById('register-password-error');
  
  nameErr.style.display = 'none';
  emailErr.style.display = 'none';
  passwordErr.style.display = 'none';
  nameInput.classList.remove('is-invalid');
  emailInput.classList.remove('is-invalid');
  passwordInput.classList.remove('is-invalid');
  
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const role = roleInput.value;
  
  let valid = true;
  if (name.length < 3) {
    nameInput.classList.add('is-invalid');
    nameErr.innerText = 'Nazwa musi mieć co najmniej 3 znaki.';
    nameErr.style.display = 'block';
    valid = false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    emailInput.classList.add('is-invalid');
    emailErr.innerText = 'Niepoprawny format adresu e-mail.';
    emailErr.style.display = 'block';
    valid = false;
  }
  
  if (password.length < 6) {
    passwordInput.classList.add('is-invalid');
    passwordErr.innerText = 'Hasło musi mieć co najmniej 6 znaków.';
    passwordErr.style.display = 'block';
    valid = false;
  }
  
  if (!valid) return;
  
  try {
    const data = await API.register(name, email, password, role);
    showToast(data.message, 'success');
    toggleAuthMode('login');
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').focus();
  } catch (err) {
    showToast(err.message, 'error');
    emailInput.classList.add('is-invalid');
    emailErr.innerText = err.message;
    emailErr.style.display = 'block';
  }
}

// Switch between Login, Register, and Forgot password modes
function toggleAuthMode(mode) {
  const loginForm = document.getElementById('auth-login-form');
  const registerForm = document.getElementById('auth-register-form');
  const forgotForm = document.getElementById('auth-forgot-form');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  
  loginForm.classList.remove('active');
  registerForm.classList.remove('active');
  forgotForm.classList.remove('active');
  
  if (mode === 'register') {
    registerForm.classList.add('active');
    title.innerText = 'Utwórz nowe konto';
    subtitle.innerText = 'Zarejestruj się w systemie inwentaryzacji';
  } else if (mode === 'forgot') {
    forgotForm.classList.add('active');
    title.innerText = 'Resetowanie Hasła';
    subtitle.innerText = 'Przywróć dostęp przy pomocy pytania pomocniczego';
    
    // Reset forgot steps
    document.getElementById('forgot-step-1').style.display = 'block';
    document.getElementById('forgot-step-2').style.display = 'none';
    document.getElementById('auth-forgot-form').reset();
  } else {
    loginForm.classList.add('active');
    title.innerText = 'Zaloguj się do IT Lease Hub';
    subtitle.innerText = 'Wprowadź dane dostępowe do systemu';
  }
}

// Handle Logout
function handleLogout() {
  showConfirm('Czy na pewno chcesz się wylogować z systemu?', 'Wylogowanie', () => {
    localStorage.removeItem('token');
    state.currentUser = null;
    document.getElementById('auth-overlay').classList.add('active');
    showToast('Wylogowano pomyślnie.', 'info');
  });
}

// Handle Forgot Password Form Step 1 (Next)
async function handleForgotPasswordNext() {
  const emailInput = document.getElementById('forgot-email');
  const emailErr = document.getElementById('forgot-email-error');
  
  emailErr.style.display = 'none';
  emailInput.classList.remove('is-invalid');
  
  const email = emailInput.value.trim();
  if (!email) {
    emailInput.classList.add('is-invalid');
    return;
  }
  
  try {
    const data = await API.requestPasswordReset(email);
    showToast(data.message, 'success');
    
    // Reset step 2 fields
    const codeInput = document.getElementById('forgot-code');
    const passwordInput = document.getElementById('forgot-new-password');
    const confirmInput = document.getElementById('forgot-confirm-password');
    if (codeInput) codeInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (confirmInput) confirmInput.value = '';
    
    // Switch to step 2
    document.getElementById('forgot-step-1').style.display = 'none';
    document.getElementById('forgot-step-2').style.display = 'block';
  } catch (err) {
    showToast(err.message, 'error');
    emailInput.classList.add('is-invalid');
    emailErr.innerText = err.message;
    emailErr.style.display = 'block';
  }
}

// Handle Forgot Password Form Step 2 (Submit Reset)
async function handleForgotPasswordSubmit(event) {
  event.preventDefault();
  
  const emailInput = document.getElementById('forgot-email');
  const codeInput = document.getElementById('forgot-code');
  const passwordInput = document.getElementById('forgot-new-password');
  const confirmInput = document.getElementById('forgot-confirm-password');
  
  const codeErr = document.getElementById('forgot-code-error');
  const passwordErr = document.getElementById('forgot-password-error');
  const confirmErr = document.getElementById('forgot-confirm-password-error');
  
  if (codeErr) codeErr.style.display = 'none';
  if (passwordErr) passwordErr.style.display = 'none';
  if (confirmErr) confirmErr.style.display = 'none';
  
  codeInput.classList.remove('is-invalid');
  passwordInput.classList.remove('is-invalid');
  confirmInput.classList.remove('is-invalid');
  
  const email = emailInput.value.trim();
  const code = codeInput.value.trim();
  const newPassword = passwordInput.value;
  const confirmPassword = confirmInput.value;
  
  let valid = true;
  if (!/^\d{6}$/.test(code)) {
    codeInput.classList.add('is-invalid');
    if (codeErr) {
      codeErr.innerText = 'Kod resetujący musi składać się z 6 cyfr.';
      codeErr.style.display = 'block';
    }
    valid = false;
  }
  
  if (newPassword.length < 6) {
    passwordInput.classList.add('is-invalid');
    if (passwordErr) {
      passwordErr.innerText = 'Hasło musi mieć co najmniej 6 znaków.';
      passwordErr.style.display = 'block';
    }
    valid = false;
  }
  
  if (newPassword !== confirmPassword) {
    confirmInput.classList.add('is-invalid');
    if (confirmErr) {
      confirmErr.innerText = 'Hasła nie są identyczne.';
      confirmErr.style.display = 'block';
    }
    valid = false;
  }
  
  if (!valid) return;
  
  try {
    const data = await API.forgotPasswordReset(email, code, newPassword);
    showToast(data.message, 'success');
    toggleAuthMode('login');
  } catch (err) {
    showToast(err.message, 'error');
    codeInput.classList.add('is-invalid');
    if (codeErr) {
      codeErr.innerText = err.message;
      codeErr.style.display = 'block';
    }
  }
}

// Handle Change Password (Logged in profile)
async function handleChangePasswordSubmit(event) {
  event.preventDefault();
  
  const oldPassInput = document.getElementById('change-old-password');
  const newPassInput = document.getElementById('change-new-password');
  const confirmPassInput = document.getElementById('change-confirm-password');
  
  [oldPassInput, newPassInput, confirmPassInput].forEach(inp => inp.classList.remove('is-invalid'));
  
  const oldPassword = oldPassInput.value;
  const newPassword = newPassInput.value;
  const confirmPassword = confirmPassInput.value;
  
  let valid = true;
  if (!oldPassword) { oldPassInput.classList.add('is-invalid'); valid = false; }
  
  if (newPassword.length < 6) {
    newPassInput.classList.add('is-invalid');
    showToast('Nowe hasło musi mieć co najmniej 6 znaków.', 'warning');
    valid = false;
  }
  
  if (newPassword !== confirmPassword) {
    confirmPassInput.classList.add('is-invalid');
    showToast('Nowe hasło i potwierdzenie nie są zgodne.', 'warning');
    valid = false;
  }
  
  if (!valid) return;
  
  try {
    const data = await API.changePassword(oldPassword, newPassword);
    showToast(data.message, 'success');
    toggleModal('modal-change-password', 'close');
    document.getElementById('change-password-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
    oldPassInput.classList.add('is-invalid');
  }
}

// Filter listeners setup
function setupFilters() {
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('filter-type');
  const statusFilter = document.getElementById('filter-status');
  const locationChips = document.querySelectorAll('.location-chip');

  let searchTimeout = null;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value;
      renderInventory();
    }, 300);
  });

  typeFilter.addEventListener('change', (e) => {
    state.filters.type = e.target.value;
    renderInventory();
  });

  statusFilter.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    renderInventory();
  });

  locationChips.forEach(chip => {
    chip.addEventListener('click', () => {
      locationChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      state.filters.location = chip.getAttribute('data-location');
      renderInventory();
    });
  });

  // Audit log filters listeners
  const auditSearchInput = document.getElementById('audit-search-input');
  const auditAdminFilter = document.getElementById('audit-filter-admin');
  const auditTypeFilter = document.getElementById('audit-filter-type');

  if (auditSearchInput) {
    let auditSearchTimeout = null;
    auditSearchInput.addEventListener('input', (e) => {
      clearTimeout(auditSearchTimeout);
      auditSearchTimeout = setTimeout(() => {
        state.auditFilters.search = e.target.value;
        renderAuditLog();
      }, 300);
    });
  }

  if (auditAdminFilter) {
    auditAdminFilter.addEventListener('change', (e) => {
      state.auditFilters.admin = e.target.value;
      renderAuditLog();
    });
  }

  if (auditTypeFilter) {
    auditTypeFilter.addEventListener('change', (e) => {
      state.auditFilters.type = e.target.value;
      renderAuditLog();
    });
  }

  // Leasing filters listeners
  const leaseSearchInput = document.getElementById('lease-search-input');
  const leaseFilterProvider = document.getElementById('lease-filter-provider');
  const leaseFilterStatus = document.getElementById('lease-filter-status');

  if (leaseSearchInput) {
    let leaseSearchTimeout = null;
    leaseSearchInput.addEventListener('input', (e) => {
      clearTimeout(leaseSearchTimeout);
      leaseSearchTimeout = setTimeout(() => {
        state.leaseFilters.search = e.target.value;
        renderLeasing();
      }, 300);
    });
  }

  if (leaseFilterProvider) {
    leaseFilterProvider.addEventListener('change', (e) => {
      state.leaseFilters.provider = e.target.value;
      renderLeasing();
    });
  }

  if (leaseFilterStatus) {
    leaseFilterStatus.addEventListener('change', (e) => {
      state.leaseFilters.status = e.target.value;
      renderLeasing();
    });
  }
}

// Initialize Application on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  // Navigation Click Handlers
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      switchView(view);
    });
  });

  // Connect Forms submits
  document.getElementById('device-form').addEventListener('submit', handleDeviceSubmit);
  document.getElementById('loan-form').addEventListener('submit', handleLoanSubmit);
  document.getElementById('return-form').addEventListener('submit', handleReturnSubmit);
  document.getElementById('confirm-transfer-form').addEventListener('submit', handleConfirmTransferSubmit);
  
  // Auth Submit and Toggle Listeners
  document.getElementById('auth-login-form').addEventListener('submit', handleLoginSubmit);
  document.getElementById('auth-register-form').addEventListener('submit', handleRegisterSubmit);
  document.getElementById('auth-forgot-form').addEventListener('submit', handleForgotPasswordSubmit);
  document.getElementById('change-password-form').addEventListener('submit', handleChangePasswordSubmit);
  
  document.getElementById('go-to-register-btn').addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode('register');
  });
  document.getElementById('go-to-login-btn').addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode('login');
  });
  document.getElementById('go-to-forgot-btn').addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode('forgot');
  });
  document.getElementById('go-back-to-login-btn').addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode('login');
  });
  document.getElementById('forgot-next-btn').addEventListener('click', handleForgotPasswordNext);

  // Setup Delete confirm modal prompt validation
  const deleteConfirmInput = document.getElementById('delete-confirm-input');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

  deleteConfirmInput.addEventListener('input', (e) => {
    if (e.target.value.trim() === 'USUŃ') {
      deleteConfirmBtn.disabled = false;
      deleteConfirmBtn.style.opacity = '1';
      deleteConfirmBtn.style.cursor = 'pointer';
    } else {
      deleteConfirmBtn.disabled = true;
      deleteConfirmBtn.style.opacity = '0.6';
      deleteConfirmBtn.style.cursor = 'not-allowed';
    }
  });

  deleteConfirmBtn.addEventListener('click', async () => {
    if (deleteConfirmBtn.disabled) return;
    try {
      await API.deleteDevice(state.currentDeviceEditId);
      toggleModal('modal-confirm-delete', 'close');
      showToast('Urządzenie zostało usunięte z bazy danych.', 'success');
      renderInventory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Mobile sidebar toggle handler
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  function openSidebar() {
    sidebar.classList.add('active');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
    sidebarToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('active');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    sidebarToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.contains('active') ? closeSidebar() : openSidebar();
    });
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => closeSidebar());
    });
  }

  // Close modals on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
      });
      closeSidebar();
    }
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Setup live filter hooks
  setupFilters();

  // Validate JWT session state on launch
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const data = await API.getProfile();
      state.currentUser = data.user;
      
      // Hide auth screen overlay
      document.getElementById('auth-overlay').classList.remove('active');
      showToast(`Witaj ponownie, ${data.user.name}!`, 'success');
      
      // Load app
      updatePermissions();
      switchView('dashboard');
    } catch (err) {
      console.warn('Session verification failed, showing login screen:', err.message);
      localStorage.removeItem('token');
      document.getElementById('auth-overlay').classList.add('active');
    }
  } else {
    // Show auth screen overlay
    document.getElementById('auth-overlay').classList.add('active');
  }
});
