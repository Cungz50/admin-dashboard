// page-users.js — Users List + User Form components
// ═══════════════════════════════════════════
// Component: USERS LIST
// ═══════════════════════════════════════════
async function renderUsers() {
    const isAdmin = App.user?.role === 'admin';
    const { users } = await API.getUsers();

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-users"></i> User Management</h1>
            <p>Kelola semua user dalam sistem</p>
        </div>
        <div class="page-header-actions">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="userSearch" placeholder="Cari user..." class="form-input">
            </div>
            ${isAdmin ? `<a href="#/users/create" class="btn btn-primary"><i class="fas fa-user-plus"></i> Tambah User</a>` : ''}
        </div>
    </div>
    <div class="table-card">
        <table class="data-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Cabang</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    ${isAdmin ? '<th>Aksi</th>' : ''}
                </tr>
            </thead>
            <tbody id="usersTableBody">
                ${renderUserRows(users, isAdmin)}
            </tbody>
        </table>
    </div>

    <div class="modal-overlay" id="deleteModal">
        <div class="modal">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Konfirmasi Hapus</h3>
                <button class="modal-close" onclick="document.getElementById('deleteModal').classList.remove('show')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p>Apakah Anda yakin ingin menghapus user <strong id="deleteUserName"></strong>?</p>
                <p class="text-muted">Tindakan ini tidak bisa dibatalkan.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('deleteModal').classList.remove('show')">Batal</button>
                <button class="btn btn-danger" id="confirmDeleteBtn"><i class="fas fa-trash"></i> Hapus</button>
            </div>
        </div>
    </div>`;
}

function renderUserRows(users, isAdmin) {
    if (users.length === 0) return '<tr><td colspan="7" class="text-center">Tidak ada user ditemukan.</td></tr>';
    return users.map(u => `
    <tr>
        <td>
            <div class="user-cell">
                <div class="user-avatar user-avatar-sm">${getInitials(u.full_name)}</div>
                <div>
                    <div class="user-cell-name">${esc(u.full_name)}</div>
                    <div class="user-cell-username">@${esc(u.username)}</div>
                </div>
            </div>
        </td>
        <td>${esc(u.email)}</td>
        <td><span class="role-badge role-${u.role}">${esc(u.role)}</span></td>
        <td>${u.branch_name ? esc(u.branch_name) : '<span class="text-muted">—</span>'}</td>
        <td><span class="status-badge status-${u.status}">${esc(u.status)}</span></td>
        <td class="text-muted">${formatDate(u.last_login)}</td>
        ${isAdmin ? `
        <td>
            <div class="action-btns">
                <a href="#/users/edit?id=${u.id}" class="btn-icon btn-icon-edit" title="Edit"><i class="fas fa-edit"></i></a>
                <button class="btn-icon btn-icon-delete" title="Hapus" data-id="${u.id}" data-name="${esc(u.full_name)}"><i class="fas fa-trash"></i></button>
            </div>
        </td>` : ''}
    </tr>`).join('');
}

function bindUsers() {
    let searchTimeout;
    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                const { users } = await API.getUsers(e.target.value);
                document.getElementById('usersTableBody').innerHTML = renderUserRows(users, App.user?.role === 'admin');
                bindDeleteButtons();
            } catch (err) { showToast(err.message, 'danger'); }
        }, 300);
    });
    bindDeleteButtons();
}

function bindDeleteButtons() {
    document.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id, name = btn.dataset.name;
            document.getElementById('deleteUserName').textContent = name;
            document.getElementById('deleteModal').classList.add('show');
            document.getElementById('confirmDeleteBtn').onclick = async () => {
                try {
                    await API.deleteUser(id);
                    showToast('User berhasil dihapus.');
                    document.getElementById('deleteModal').classList.remove('show');
                    router(); // refresh
                } catch (err) { showToast(err.message, 'danger'); }
            };
        });
    });
}

// ═══════════════════════════════════════════
// Component: USER FORM (create / edit)
// ═══════════════════════════════════════════
async function renderUserForm(editId = null) {
    let user = null;
    if (editId) {
        const res = await API.getUser(editId);
        user = res.user;
    }

    let branches = [];
    try { branches = (await API.getActiveBranches()).branches; } catch {}

    const isEdit = !!user;

    return `
    <div class="form-card">
        <div class="form-card-header">
            <h2><i class="fas fa-${isEdit ? 'edit' : 'user-plus'}"></i> ${isEdit ? 'Edit User' : 'Tambah User Baru'}</h2>
        </div>
        <form id="userForm">
            ${isEdit ? `<input type="hidden" name="id" value="${user.id}">` : ''}
            <div class="form-grid">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" class="form-input" value="${esc(user?.username)}" required minlength="3" placeholder="Username">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" class="form-input" value="${esc(user?.email)}" required placeholder="email@example.com">
                </div>
                <div class="form-group">
                    <label>Nama Lengkap</label>
                    <input type="text" name="full_name" class="form-input" value="${esc(user?.full_name)}" required placeholder="Nama lengkap">
                </div>
                <div class="form-group">
                    <label>Password ${isEdit ? '(kosongkan jika tidak diubah)' : ''}</label>
                    <input type="password" name="password" class="form-input" ${!isEdit ? 'required' : ''} minlength="6" placeholder="Min. 6 karakter">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select name="role" class="form-input">
                        <option value="user" ${user?.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="editor" ${user?.role === 'editor' ? 'selected' : ''}>Editor</option>
                        <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="form-input">
                        <option value="active" ${user?.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Cabang</label>
                    <select name="branch_id" class="form-input">
                        <option value="">— Tidak ada (admin) —</option>
                        ${branches.map(b => `<option value="${b.id}" ${user?.branch_id == b.id ? 'selected' : ''}>${esc(b.name)} (${esc(b.code)})</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <a href="#/users" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Batal</a>
                <button type="submit" class="btn btn-primary" id="userSubmitBtn">
                    <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Simpan'}
                </button>
            </div>
        </form>
    </div>`;
}

function bindUserForm() {
    document.getElementById('userForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById('userSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        const data = Object.fromEntries(new FormData(form));
        if (data.branch_id === '') data.branch_id = null;
        else data.branch_id = parseInt(data.branch_id);

        try {
            if (data.id) {
                data.id = parseInt(data.id);
                await API.updateUser(data);
                showToast('User berhasil diupdate.');
            } else {
                await API.createUser(data);
                showToast('User berhasil ditambahkan.');
            }
            location.hash = '#/users';
        } catch (err) {
            showToast(err.message, 'danger');
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-save"></i> ${data.id ? 'Update' : 'Simpan'}`;
        }
    });
}

