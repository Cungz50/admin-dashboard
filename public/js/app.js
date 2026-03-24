/**
 * AdminPanel SPA — Vanilla JS
 * Hash-based routing, fetch API, component rendering
 */

// Initialize theme from localStorage immediately (avoid flash)
(function() {
    const saved = localStorage.getItem('admin_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// ═══════════════════════════════════════════
// API Client
// ═══════════════════════════════════════════
const API = {
    base: 'api/index.php',

    async request(endpoint, action, options = {}) {
        const params = new URLSearchParams({ endpoint, action, ...options.params });
        const url = `${this.base}?${params}`;

        const fetchOpts = { method: options.method || 'GET', credentials: 'same-origin' };
        if (options.body) {
            fetchOpts.method = 'POST';
            fetchOpts.headers = { 'Content-Type': 'application/json' };
            fetchOpts.body = JSON.stringify(options.body);
        }

        const res = await fetch(url, fetchOpts);
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Terjadi kesalahan.');
        }
        return data;
    },

    // Auth
    login(username, password) { return this.request('auth', 'login', { body: { username, password } }); },
    logout() { return this.request('auth', 'logout', { method: 'POST' }); },
    me() { return this.request('auth', 'me'); },

    // Dashboard
    dashboardStats() { return this.request('dashboard', 'stats'); },

    // Users
    getUsers(search = '') { return this.request('users', 'list', { params: { search } }); },
    getUser(id) { return this.request('users', 'get', { params: { id } }); },
    createUser(data) { return this.request('users', 'create', { body: data }); },
    updateUser(data) { return this.request('users', 'update', { body: data }); },
    deleteUser(id) { return this.request('users', 'delete', { body: { id } }); },

    // Branches
    getBranches(search = '') { return this.request('branches', 'list', { params: { search } }); },
    getActiveBranches() { return this.request('branches', 'active'); },
    getBranch(id) { return this.request('branches', 'get', { params: { id } }); },
    createBranch(data) { return this.request('branches', 'create', { body: data }); },
    updateBranch(data) { return this.request('branches', 'update', { body: data }); },
    deleteBranch(id) { return this.request('branches', 'delete', { body: { id } }); },

    // Text Tool
    processText(data) { return this.request('text-tool', 'process', { body: data }); },

    // Price Check
    getPriceChecks() { return this.request('price-check', 'list'); },
    getPriceCheck(id) { return this.request('price-check', 'get', { params: { id } }); },
    getPriceReview() { return this.request('price-check', 'review'); },
    updatePriceCheck(data) { return this.request('price-check', 'update', { body: data }); },
    deletePriceCheck(id) { return this.request('price-check', 'delete', { body: { id } }); },
    async uploadPriceCheck(file) {
        const form = new FormData();
        form.append('datafile', file);
        const params = new URLSearchParams({ endpoint: 'price-check', action: 'upload' });
        const res = await fetch(`${this.base}?${params}`, { method: 'POST', body: form, credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Upload gagal.');
        return data;
    },

    // SJ Link
    generateSjLinks(sjNumbers) { return this.request('sj-link', 'generate', { body: { sj_numbers: sjNumbers } }); },
    getSjHistory() { return this.request('sj-link', 'history'); },
    getSjBatch(batch) { return this.request('sj-link', 'batch', { params: { batch } }); },
    deleteSjBatch(batch) { return this.request('sj-link', 'delete', { body: { batch } }); },

    // Faktur Template
    getFakturTemplates() { return this.request('faktur-template', 'list'); },
    getFakturEdit(id) { return this.request('faktur-template', 'edit', { params: { id } }); },
    updateFaktur(data) { return this.request('faktur-template', 'update', { body: data }); },
    deleteFaktur(id) { return this.request('faktur-template', 'delete', { body: { id } }); },
    async uploadFaktur(file) {
        const form = new FormData();
        form.append('csvfile', file);
        const params = new URLSearchParams({ endpoint: 'faktur-template', action: 'upload' });
        const res = await fetch(`${this.base}?${params}`, { method: 'POST', body: form, credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Upload gagal.');
        return data;
    },

    // Packing List
    getPackingLists() { return this.request('packing-list', 'list'); },
    getPackingList(id) { return this.request('packing-list', 'get', { params: { id } }); },
    generatePacking(data) { return this.request('packing-list', 'generate', { body: data }); },
    deletePacking(id) { return this.request('packing-list', 'delete', { body: { id } }); },

    // Tanda Terima
    getTandaTerimas() { return this.request('tanda-terima', 'list'); },
    getTandaTerima(id) { return this.request('tanda-terima', 'get', { params: { id } }); },
    storeTandaTerima(data) { return this.request('tanda-terima', 'store', { body: data }); },
    deleteTandaTerima(id) { return this.request('tanda-terima', 'delete', { body: { id } }); },

    // Monitoring Kwitansi
    getKwitansiList(filters = {}) {
        const params = {};
        if (filters.kdcab) params.kdcab = filters.kdcab;
        if (filters.tanggal) params.tanggal = filters.tanggal;
        if (filters.limit) params.limit = filters.limit;
        return this.request('monitoring', 'list', { params });
    },
    getKwitansi(id) { return this.request('monitoring', 'get', { params: { id } }); },
    storeKwitansi(data) { return this.request('monitoring', 'store', { body: data }); },
    updateKwitansi(data) { return this.request('monitoring', 'update', { body: data }); },
    deleteKwitansi(id) { return this.request('monitoring', 'delete', { body: { id } }); },
    bulkKwitansi(rows) { return this.request('monitoring', 'bulk', { body: { rows } }); },
    exportKwitansi() { return this.request('monitoring', 'export'); },

    // LPP (Laporan Posisi Persediaan)
    lppCabangList() { return this.request('lpp', 'cabang-list'); },
    lppPeriodeList(cabangId, bopbtk = '') {
        const params = { cabang_id: cabangId };
        if (bopbtk) params.bopbtk = bopbtk;
        return this.request('lpp', 'periode-list', { params });
    },
    lppDashboard(periodeId) { return this.request('lpp', 'dashboard', { params: { periode_id: periodeId } }); },
    lppDetail(periodeId, search = '', page = 1) {
        return this.request('lpp', 'detail', { params: { periode_id: periodeId, search, page } });
    },
    lppComparison() { return this.request('lpp', 'comparison'); },
    async lppUpload(form) {
        const params = new URLSearchParams({ endpoint: 'lpp', action: 'upload' });
        const res = await fetch(`${this.base}?${params}`, { method: 'POST', body: form, credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Upload gagal.');
        return data;
    },
    lppDeletePeriode(id) { return this.request('lpp', 'delete-periode', { body: { id } }); },
    lppRecentUploads() { return this.request('lpp', 'recent-uploads'); },
    lppKategoriList() { return this.request('lpp', 'kategori-list'); },
    lppAnalisisData(filters) { return this.request('lpp', 'analisis-data', { body: filters }); },
    lppComparisonByPeriode(cabangId) { return this.request('lpp', 'comparison-periode', { params: { cabang_id: cabangId } }); },

    // HPP (Harga Pokok Penjualan)
    hppSummary(periodeId) { return this.request('hpp', 'summary', { params: { periode_id: periodeId } }); },
    hppItems(periodeId, search = '', kategoriId = 0) {
        const params = { periode_id: periodeId };
        if (search) params.search = search;
        if (kategoriId) params.kategori_id = kategoriId;
        return this.request('hpp', 'items', { params });
    },
    hppSimItems(periodeId) { return this.request('hpp', 'sim-items', { params: { periode_id: periodeId } }); },
    hppKategoriList(periodeId) { return this.request('hpp', 'kategori-list', { params: { periode_id: periodeId } }); },
};

// ═══════════════════════════════════════════
// App State
// ═══════════════════════════════════════════
const App = {
    user: null,
    currentPage: '',
    isLoading: false,
};

// ═══════════════════════════════════════════
// Utility Helpers
// ═══════════════════════════════════════════
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('spa-toast');
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.id = 'spa-toast';
    toast.className = `toast toast-${type} toast-show`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
        </div>
        <div class="toast-body">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('toast-show'); setTimeout(() => toast.remove(), 400); }, 4000);
}

// ═══════════════════════════════════════════
// Router
// ═══════════════════════════════════════════
async function router() {
    const hash = location.hash.slice(1) || '/login';
    const [path, queryStr] = hash.split('?');
    const params = new URLSearchParams(queryStr || '');

    // Auth guard
    if (path !== '/login') {
        if (!App.user) {
            try {
                const res = await API.me();
                App.user = res.user;
            } catch {
                location.hash = '#/login';
                return;
            }
        }
    }

    // Route mapping
    App.currentPage = path;
    const app = document.getElementById('app');

    try {
        switch (path) {
            case '/login':
                app.innerHTML = renderLogin();
                bindLogin();
                break;
            case '/dashboard':
                app.innerHTML = renderLayout('Dashboard', await renderDashboard());
                bindLayout();
                animateCounters();
                break;
            case '/users':
                app.innerHTML = renderLayout('Users', await renderUsers());
                bindLayout();
                bindUsers();
                break;
            case '/users/create':
                app.innerHTML = renderLayout('Tambah User', await renderUserForm());
                bindLayout();
                bindUserForm();
                break;
            case '/users/edit':
                app.innerHTML = renderLayout('Edit User', await renderUserForm(params.get('id')));
                bindLayout();
                bindUserForm();
                break;
            case '/branches':
                app.innerHTML = renderLayout('Cabang', await renderBranches());
                bindLayout();
                bindBranches();
                break;
            case '/branches/create':
                app.innerHTML = renderLayout('Tambah Cabang', renderBranchForm());
                bindLayout();
                bindBranchForm();
                break;
            case '/branches/edit':
                app.innerHTML = renderLayout('Edit Cabang', await renderBranchFormEdit(params.get('id')));
                bindLayout();
                bindBranchForm();
                break;
            case '/text-tool':
                app.innerHTML = renderLayout('Text Tool', renderTextTool());
                bindLayout();
                bindTextTool();
                break;
            case '/price-check':
                app.innerHTML = renderLayout('Price Check', await renderPriceCheckHistory());
                bindLayout();
                bindPriceCheckHistory();
                break;
            case '/price-check/upload':
                app.innerHTML = renderLayout('Upload File', renderPriceCheckUpload());
                bindLayout();
                bindPriceCheckUpload();
                break;
            case '/price-check/review':
                app.innerHTML = renderLayout('Review Mismatch', await renderPriceCheckReview());
                bindLayout();
                bindPriceCheckReview();
                break;
            case '/price-check/complete':
                app.innerHTML = renderLayout('Hasil', await renderPriceCheckComplete(params.get('id')));
                bindLayout();
                break;
            case '/sj-link':
                app.innerHTML = renderLayout('SJ Linked', renderSjLinkPage());
                bindLayout();
                bindSjLink();
                break;
            case '/sj-link/history':
                app.innerHTML = renderLayout('Riwayat SJ', await renderSjHistory());
                bindLayout();
                bindSjHistory();
                break;
            case '/faktur-template':
                app.innerHTML = renderLayout('Faktur Template', await renderFakturHistory());
                bindLayout();
                bindFakturHistory();
                break;
            case '/faktur-template/upload':
                app.innerHTML = renderLayout('Upload Faktur', renderFakturUpload());
                bindLayout();
                bindFakturUpload();
                break;
            case '/faktur-template/edit':
                app.innerHTML = renderLayout('Edit Faktur', await renderFakturEdit(params.get('id')));
                bindLayout();
                bindFakturEdit();
                break;
            case '/packing-list':
                app.innerHTML = renderLayout('Packing List', await renderPackingHistory());
                bindLayout();
                bindPackingHistory();
                break;
            case '/packing-list/create':
                app.innerHTML = renderLayout('Upload Packing', renderPackingCreate());
                bindLayout();
                bindPackingCreate();
                break;
            case '/packing-list/preview':
                app.innerHTML = renderLayout('Preview', await renderPackingPreview(params.get('id')));
                bindLayout();
                break;
            case '/tanda-terima':
                app.innerHTML = renderLayout('Tanda Terima', await renderTandaTerimaHistory());
                bindLayout();
                bindTandaTerimaHistory();
                break;
            case '/tanda-terima/create':
                app.innerHTML = renderLayout('Buat Tanda Terima', renderTandaTerimaCreate());
                bindLayout();
                bindTandaTerimaCreate();
                break;
            case '/tanda-terima/print':
                await openTandaTerimaPrint(params.get('id'));
                break;
            case '/monitoring':
                app.innerHTML = renderLayout('Monitoring', await renderMonitoringPage());
                bindLayout();
                bindMonitoringPage();
                break;

            case '/monitoring/import':
                app.innerHTML = renderLayout('Import Data', renderMonitoringImport());
                bindLayout();
                bindMonitoringImport();
                break;
            // ── LPP Routes ──
            case '/lpp':
                app.innerHTML = renderLayout('LPP Dashboard', renderLppDashboard());
                bindLayout();
                bindLppDashboard();
                break;
            case '/lpp/detail':
                app.innerHTML = renderLayout('LPP Detail', renderLppDetail());
                bindLayout();
                bindLppDetail();
                break;
            case '/lpp/comparison':
                app.innerHTML = renderLayout('LPP Comparison', renderLppComparison());
                bindLayout();
                bindLppComparison();
                break;
            case '/lpp/analisis':
                app.innerHTML = renderLayout('LPP Analisis', renderLppAnalisis());
                bindLayout();
                bindLppAnalisis();
                break;
            case '/lpp/upload':
                app.innerHTML = renderLayout('LPP Upload', renderLppUpload());
                bindLayout();
                bindLppUpload();
                break;
            // ── HPP Routes ──
            case '/hpp':
                app.innerHTML = renderLayout('HPP System', renderHppPage());
                bindLayout();
                bindHppPage();
                break;
            default:
                location.hash = App.user ? '#/dashboard' : '#/login';
        }
    } catch (err) {
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            App.user = null;
            location.hash = '#/login';
        } else {
            showToast(err.message, 'danger');
        }
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// ═══════════════════════════════════════════
// Component: LAYOUT (sidebar + topbar + content)
// ═══════════════════════════════════════════
function renderLayout(pageTitle, content) {
    const user = App.user;
    const isAdmin = user?.role === 'admin';
    const currentPath = App.currentPage;

    function navActive(path) {
        if (path === '/users') return currentPath.startsWith('/users') ? 'active' : '';
        if (path === '/branches') return currentPath.startsWith('/branches') ? 'active' : '';
        if (path === '/price-check') return currentPath.startsWith('/price-check') ? 'active' : '';
        if (path === '/sj-link') return currentPath.startsWith('/sj-link') ? 'active' : '';
        if (path === '/faktur-template') return currentPath.startsWith('/faktur-template') ? 'active' : '';
        if (path === '/packing-list') return currentPath.startsWith('/packing-list') ? 'active' : '';
        if (path === '/tanda-terima') return currentPath.startsWith('/tanda-terima') ? 'active' : '';
        if (path === '/monitoring') return currentPath.startsWith('/monitoring') ? 'active' : '';
        if (path === '/lpp') return currentPath.startsWith('/lpp') ? 'active' : '';
        if (path === '/hpp') return currentPath.startsWith('/hpp') ? 'active' : '';
        return currentPath === path ? 'active' : '';
    }

    return `
    <div class="app-layout">
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <div class="logo-icon"><i class="fas fa-bolt"></i></div>
                    <span class="logo-text">AdminPanel</span>
                </div>
                <button class="sidebar-toggle" id="sidebarToggle" title="Toggle Sidebar">
                    <i class="fas fa-chevron-left"></i>
                </button>
            </div>
            <nav class="sidebar-nav">
                <div class="nav-section">
                    <span class="nav-section-title">Menu Utama</span>
                    <a href="#/dashboard" class="nav-link ${navActive('/dashboard')}">
                        <i class="fas fa-th-large"></i><span>Dashboard</span>
                    </a>
                    <a href="#/users" class="nav-link ${navActive('/users')}">
                        <i class="fas fa-users"></i><span>Users</span>
                    </a>
                    ${isAdmin ? `
                    <a href="#/branches" class="nav-link ${navActive('/branches')}">
                        <i class="fas fa-building"></i><span>Cabang</span>
                    </a>` : ''}
                </div>
                <div class="nav-section">
                    <span class="nav-section-title">Tools</span>
                    <a href="#/text-tool" class="nav-link ${navActive('/text-tool')}">
                        <i class="fas fa-wrench"></i><span>Text Tool</span>
                    </a>
                    <a href="#/price-check" class="nav-link ${navActive('/price-check')}">
                        <i class="fas fa-tags"></i><span>Price Check</span>
                    </a>
                    <a href="#/sj-link" class="nav-link ${navActive('/sj-link')}">
                        <i class="fas fa-link"></i><span>SJ Linked</span>
                    </a>
                    <a href="#/faktur-template" class="nav-link ${navActive('/faktur-template')}">
                        <i class="fas fa-file-invoice"></i><span>Faktur Template</span>
                    </a>
                    <a href="#/packing-list" class="nav-link ${navActive('/packing-list')}">
                        <i class="fas fa-box"></i><span>Packing List</span>
                    </a>
                    <a href="#/tanda-terima" class="nav-link ${navActive('/tanda-terima')}">
                        <i class="fas fa-receipt"></i><span>Tanda Terima</span>
                    </a>
                    <a href="#/monitoring" class="nav-link ${navActive('/monitoring')}">
                        <i class="fas fa-chart-bar"></i><span>Monitoring</span>
                    </a>
                </div>
                <div class="nav-section">
                    <span class="nav-section-title">Analytics</span>
                    <a href="#/lpp" class="nav-link ${navActive('/lpp')}">
                        <i class="fas fa-warehouse"></i><span>LPP</span>
                    </a>
                    <a href="#/hpp" class="nav-link ${navActive('/hpp')}">
                        <i class="fas fa-calculator"></i><span>HPP</span>
                    </a>
                </div>
            </nav>
            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="user-avatar user-avatar-sm">${getInitials(user?.full_name)}</div>
                    <div class="user-info">
                        <span class="user-name">${esc(user?.full_name)}</span>
                        <span class="user-role">${esc(user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '')}${user?.branch_name ? ' • ' + esc(user.branch_name) : ''}</span>
                    </div>
                </div>
                <a href="#" class="btn btn-logout" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i><span>Logout</span>
                </a>
            </div>
        </aside>

        <div class="main-wrapper" id="mainWrapper">
            <header class="topbar">
                <button class="topbar-toggle" id="mobileToggle"><i class="fas fa-bars"></i></button>
                <div class="topbar-title"><h1>${esc(pageTitle)}</h1></div>
                <div class="topbar-actions">
                    <button class="theme-toggle" id="themeToggleBtn" title="Ganti Tema">
                        <i class="fas ${document.documentElement.getAttribute('data-theme') === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
                    </button>
                    <div class="topbar-user-dropdown">
                        <button class="dropdown-trigger" id="userDropdownBtn">
                            <div class="user-avatar user-avatar-xs">${getInitials(user?.full_name)}</div>
                            <span>${esc(user?.full_name)}</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu" id="userDropdownMenu">
                            <div class="dropdown-item" style="cursor:default;opacity:.7;">
                                <i class="fas fa-building"></i> ${user?.branch_name ? esc(user.branch_name) : 'Semua Cabang'}
                            </div>
                            <div class="dropdown-divider"></div>
                            <a href="#" class="dropdown-item text-danger" id="dropdownLogout">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </a>
                        </div>
                    </div>
                </div>
            </header>
            <main class="main-content">${content}</main>
        </div>
    </div>`;
}

function bindLayout() {
    // Sidebar toggle
    const sidebar = document.getElementById('sidebar');
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            document.documentElement.style.setProperty('--sidebar-width', '0px');
            sidebar.style.transform = 'translateX(-100%)';
        } else {
            document.documentElement.style.setProperty('--sidebar-width', '270px');
            sidebar.style.transform = 'translateX(0)';
        }
    });

    // Mobile toggle
    document.getElementById('mobileToggle')?.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    // User dropdown
    const ddBtn = document.getElementById('userDropdownBtn');
    const ddMenu = document.getElementById('userDropdownMenu');
    ddBtn?.addEventListener('click', (e) => { e.stopPropagation(); ddBtn.classList.toggle('active'); ddMenu.classList.toggle('show'); });
    document.addEventListener('click', () => { ddBtn?.classList.remove('active'); ddMenu?.classList.remove('show'); });

    // Logout
    const doLogout = async (e) => {
        e.preventDefault();
        try { await API.logout(); } catch {}
        App.user = null;
        location.hash = '#/login';
        showToast('Logout berhasil.');
    };
    document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
    document.getElementById('dropdownLogout')?.addEventListener('click', doLogout);

    // Theme toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next === 'dark' ? '' : next);
        if (next === 'dark') html.removeAttribute('data-theme');
        localStorage.setItem('admin_theme', next);
        const icon = document.querySelector('#themeToggleBtn i');
        if (icon) { icon.className = 'fas ' + (next === 'light' ? 'fa-moon' : 'fa-sun'); }
    });
}

