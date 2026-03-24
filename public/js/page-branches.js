// page-branches.js — Branches List + Branch Form components
// ═══════════════════════════════════════════
// Component: BRANCHES LIST
// ═══════════════════════════════════════════
async function renderBranches() {
    const { branches } = await API.getBranches();

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-building"></i> Manajemen Cabang</h1>
            <p>Kelola kantor cabang</p>
        </div>
        <div class="page-header-actions">
            <a href="#/branches/create" class="btn btn-primary"><i class="fas fa-plus"></i> Tambah Cabang</a>
        </div>
    </div>
    <div class="branches-grid">
        ${branches.length === 0 ? '<div class="empty-state"><i class="fas fa-building"></i><p>Belum ada cabang.</p></div>' :
        branches.map(b => `
        <div class="branch-card">
            <div class="branch-card-header">
                <div class="branch-code">${esc(b.code)}</div>
                <span class="status-badge status-${b.status}">${esc(b.status)}</span>
            </div>
            <h3 class="branch-name">${esc(b.name)}</h3>
            ${b.address ? `<p class="branch-detail"><i class="fas fa-map-marker-alt"></i> ${esc(b.address)}</p>` : ''}
            ${b.phone ? `<p class="branch-detail"><i class="fas fa-phone"></i> ${esc(b.phone)}</p>` : ''}
            <div class="branch-meta">
                <span><i class="fas fa-users"></i> ${b.user_count} users</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(b.created_at)}</span>
            </div>
            <div class="branch-actions">
                <a href="#/branches/edit?id=${b.id}" class="btn btn-sm btn-outline"><i class="fas fa-edit"></i> Edit</a>
                <button class="btn btn-sm btn-outline-danger branch-delete-btn" data-id="${b.id}" data-name="${esc(b.name)}"><i class="fas fa-trash"></i> Hapus</button>
            </div>
        </div>`).join('')}
    </div>`;
}

function bindBranches() {
    document.querySelectorAll('.branch-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`Yakin hapus cabang "${btn.dataset.name}"? User di cabang ini akan jadi tanpa cabang.`)) return;
            try {
                await API.deleteBranch(btn.dataset.id);
                showToast('Cabang berhasil dihapus.');
                router();
            } catch (err) { showToast(err.message, 'danger'); }
        });
    });
}

// ═══════════════════════════════════════════
// Component: BRANCH FORM
// ═══════════════════════════════════════════
function renderBranchForm(branch = null) {
    const isEdit = !!branch;
    return `
    <div class="form-card">
        <div class="form-card-header">
            <h2><i class="fas fa-${isEdit ? 'edit' : 'plus'}"></i> ${isEdit ? 'Edit Cabang' : 'Tambah Cabang Baru'}</h2>
        </div>
        <form id="branchForm">
            ${isEdit ? `<input type="hidden" name="id" value="${branch.id}">` : ''}
            <div class="form-grid">
                <div class="form-group">
                    <label>Nama Cabang</label>
                    <input type="text" name="name" class="form-input" value="${esc(branch?.name)}" required placeholder="Contoh: Cabang Jakarta">
                </div>
                <div class="form-group">
                    <label>Kode Cabang</label>
                    <input type="text" name="code" class="form-input" value="${esc(branch?.code)}" required maxlength="20" placeholder="Contoh: JKT" style="text-transform:uppercase">
                </div>
                <div class="form-group form-group-full">
                    <label>Alamat</label>
                    <textarea name="address" class="form-input" rows="3" placeholder="Alamat lengkap cabang">${esc(branch?.address)}</textarea>
                </div>
                <div class="form-group">
                    <label>Telepon</label>
                    <input type="text" name="phone" class="form-input" value="${esc(branch?.phone)}" placeholder="021-xxxx">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="form-input">
                        <option value="active" ${branch?.status === 'active' || !branch ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${branch?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <a href="#/branches" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Batal</a>
                <button type="submit" class="btn btn-primary" id="branchSubmitBtn">
                    <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Simpan'}
                </button>
            </div>
        </form>
    </div>`;
}

async function renderBranchFormEdit(id) {
    const { branch } = await API.getBranch(id);
    return renderBranchForm(branch);
}

function bindBranchForm() {
    document.getElementById('branchForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('branchSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        const data = Object.fromEntries(new FormData(e.target));

        try {
            if (data.id) {
                data.id = parseInt(data.id);
                await API.updateBranch(data);
                showToast('Cabang berhasil diupdate.');
            } else {
                await API.createBranch(data);
                showToast('Cabang berhasil ditambahkan.');
            }
            location.hash = '#/branches';
        } catch (err) {
            showToast(err.message, 'danger');
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-save"></i> ${data.id ? 'Update' : 'Simpan'}`;
        }
    });
}

