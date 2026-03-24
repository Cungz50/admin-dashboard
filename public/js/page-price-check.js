// page-price-check.js — Price Check (History, Upload, Review, Complete)
// ═══════════════════════════════════════════
// Component: PRICE CHECK — HISTORY
// ═══════════════════════════════════════════
async function renderPriceCheckHistory() {
    const { records } = await API.getPriceChecks();

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-tags"></i> Price Check</h1>
            <p>Upload file harga, deteksi mismatch, dan perbaiki otomatis</p>
        </div>
        <div class="page-header-actions">
            <a href="#/price-check/upload" class="btn btn-primary"><i class="fas fa-upload"></i> Upload File</a>
        </div>
    </div>

    ${records.length === 0 ? `
        <div class="form-card" style="text-align:center;padding:60px 40px;">
            <div class="empty-illustration" style="margin:0 auto 20px;"><i class="fas fa-tags"></i></div>
            <h3 style="color:var(--text-heading);margin-bottom:8px;">Belum ada price check</h3>
            <p style="color:var(--text-muted);margin-bottom:24px;">Upload file .txt untuk mulai mengecek harga</p>
            <a href="#/price-check/upload" class="btn btn-primary"><i class="fas fa-upload"></i> Upload Sekarang</a>
        </div>
    ` : `
        <div class="table-card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Total</th>
                        <th>Mismatch</th>
                        <th>Fixed</th>
                        <th>Skip</th>
                        <th>Status</th>
                        <th>Tanggal</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                    <tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:36px;height:36px;border-radius:8px;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-file-alt" style="color:var(--primary);"></i></div>
                                <div class="user-cell-name">${esc(r.original_filename)}</div>
                            </div>
                        </td>
                        <td>${r.total_records}</td>
                        <td>${r.mismatch_count > 0 ? `<span class="status-badge status-inactive">${r.mismatch_count}</span>` : '<span class="status-badge status-active">0</span>'}</td>
                        <td>${r.updated_count || '-'}</td>
                        <td>${r.skipped_count || '-'}</td>
                        <td><span class="status-badge status-${r.status === 'completed' ? 'active' : 'inactive'}">${r.status}</span></td>
                        <td class="text-muted">${formatDate(r.created_at)}</td>
                        <td>
                            <div class="action-btns">
                                ${r.fixed_filepath ? `<a href="api/index.php?endpoint=price-check&action=download&id=${r.id}" class="btn-icon btn-icon-edit" title="Download"><i class="fas fa-download"></i></a>` : ''}
                                <button class="btn-icon btn-icon-delete pc-delete-btn" data-id="${r.id}" data-name="${esc(r.original_filename)}" title="Hapus"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `}`;
}

function bindPriceCheckHistory() {
    document.querySelectorAll('.pc-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`Yakin hapus "${btn.dataset.name}"?`)) return;
            try {
                await API.deletePriceCheck(btn.dataset.id);
                showToast('Record berhasil dihapus.');
                router();
            } catch (err) { showToast(err.message, 'danger'); }
        });
    });
}

// ═══════════════════════════════════════════
// Component: PRICE CHECK — UPLOAD
// ═══════════════════════════════════════════
function renderPriceCheckUpload() {
    return `
    <div class="form-card">
        <div class="form-card-header">
            <h2><i class="fas fa-upload"></i> Upload File Harga</h2>
        </div>
        <p style="color:var(--text-muted);margin-bottom:24px;font-size:0.85rem;">
            Upload file <code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;">.txt</code> berformat pipe-delimited. Sistem akan mengecek apakah <strong>PRICE</strong> (kolom 9) cocok dengan <strong>PRICE_IDM</strong> (kolom 15).
        </p>
        <div class="pc-dropzone" id="pcDropzone">
            <div class="pc-dropzone-content">
                <div class="empty-illustration" style="margin-bottom:16px;"><i class="fas fa-cloud-upload-alt"></i></div>
                <p style="font-weight:600;color:var(--text-heading);margin-bottom:4px;">Drag & drop file di sini</p>
                <p style="font-size:13px;color:var(--text-muted);">atau klik untuk pilih file (.txt, max 10MB)</p>
            </div>
            <input type="file" id="pcFileInput" accept=".txt" style="display:none;">
        </div>
        <div id="pcFileInfo" style="display:none;margin-top:16px;">
            <div class="pc-file-badge">
                <i class="fas fa-file-alt" style="color:var(--primary);"></i>
                <span id="pcFileName" style="flex:1;font-weight:500;"></span>
                <button type="button" class="pc-file-remove" id="pcFileRemove"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="form-actions" style="margin-top:24px;">
            <a href="#/price-check" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
            <button class="btn btn-primary" id="pcUploadBtn" disabled><i class="fas fa-search"></i> Analisa File</button>
        </div>
    </div>`;
}

function bindPriceCheckUpload() {
    const dropzone = document.getElementById('pcDropzone');
    const fileInput = document.getElementById('pcFileInput');
    const fileInfo = document.getElementById('pcFileInfo');
    const fileName = document.getElementById('pcFileName');
    const removeBtn = document.getElementById('pcFileRemove');
    const uploadBtn = document.getElementById('pcUploadBtn');
    let selectedFile = null;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault(); dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files.length) setFile(fileInput.files[0]); });

    function setFile(file) {
        if (!file.name.endsWith('.txt')) { showToast('Hanya file .txt yang diperbolehkan.', 'danger'); return; }
        if (file.size > 10 * 1024 * 1024) { showToast('File terlalu besar. Max 10MB.', 'danger'); return; }
        selectedFile = file;
        fileName.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        fileInfo.style.display = 'block';
        dropzone.style.display = 'none';
        uploadBtn.disabled = false;
    }

    removeBtn.addEventListener('click', () => {
        selectedFile = null; fileInput.value = '';
        fileInfo.style.display = 'none'; dropzone.style.display = 'flex';
        uploadBtn.disabled = true;
    });

    uploadBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menganalisa...';
        try {
            const res = await API.uploadPriceCheck(selectedFile);
            if (res.has_mismatch) {
                showToast(res.message, 'warning');
                location.hash = '#/price-check/review';
            } else {
                showToast(res.message);
                location.hash = '#/price-check';
            }
        } catch (err) {
            showToast(err.message, 'danger');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-search"></i> Analisa File';
        }
    });
}

// ═══════════════════════════════════════════
// Component: PRICE CHECK — REVIEW MISMATCH
// ═══════════════════════════════════════════
async function renderPriceCheckReview() {
    let reviewData;
    try {
        reviewData = await API.getPriceReview();
    } catch {
        return `
        <div class="form-card" style="text-align:center;padding:60px;">
            <div class="empty-illustration" style="margin:0 auto 20px;"><i class="fas fa-exclamation-triangle"></i></div>
            <h3 style="color:var(--text-heading);margin-bottom:8px;">Session Expired</h3>
            <p style="color:var(--text-muted);margin-bottom:24px;">Data review tidak ditemukan. Silakan upload ulang.</p>
            <a href="#/price-check/upload" class="btn btn-primary"><i class="fas fa-upload"></i> Upload Ulang</a>
        </div>`;
    }

    const { mismatch, id } = reviewData;

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i> Review Mismatch</h1>
            <p>Ditemukan <strong>${mismatch.length}</strong> baris dengan harga tidak cocok</p>
        </div>
    </div>

    <form id="pcReviewForm">
        <input type="hidden" name="recordId" value="${id}">
        <div class="table-card" style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:40px;">
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;text-transform:none;letter-spacing:0;font-weight:500;color:var(--text-muted);">
                                <input type="checkbox" id="pcSkipAll"> Skip
                            </label>
                        </th>
                        <th>#</th>
                        <th>Doc No</th>
                        <th>Prod Code</th>
                        <th>PRICE</th>
                        <th>PRICE_IDM</th>
                        <th>Selisih</th>
                        <th>Fix → IDM</th>
                    </tr>
                </thead>
                <tbody>
                    ${mismatch.map((m, i) => `
                    <tr class="pc-row" data-index="${m.index}">
                        <td><input type="checkbox" class="pc-skip-cb" name="skip[]" value="${m.index}"></td>
                        <td class="text-muted">${i + 1}</td>
                        <td><code style="font-size:12px;">${esc(m.docno)}</code></td>
                        <td><code style="font-size:12px;">${esc(m.prdcd)}</code></td>
                        <td style="font-weight:600;color:var(--success);">${m.price.toFixed(3)}</td>
                        <td style="font-weight:600;color:var(--danger);">${m.price_idm.toFixed(3)}</td>
                        <td><span class="status-badge ${m.selisih > 0 ? 'status-active' : 'status-inactive'}">${m.selisih > 0 ? '+' : ''}${m.selisih.toFixed(3)}</span></td>
                        <td><input type="number" step="0.001" class="form-input pc-fix-input" name="price_idm_${m.index}" value="${m.price.toFixed(3)}" style="width:120px;padding:6px 10px;font-size:13px;"></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>

        <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
            <div style="font-size:13px;color:var(--text-muted);">
                <i class="fas fa-info-circle"></i> Centang <strong>Skip</strong> untuk melewati baris. <strong>Fix → IDM</strong> mengganti PRICE_IDM di file output.
            </div>
            <div class="form-actions" style="border:none;padding:0;">
                <a href="#/price-check" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Batal</a>
                <button type="submit" class="btn btn-primary" id="pcFixBtn"><i class="fas fa-magic"></i> Perbaiki File</button>
            </div>
        </div>
    </form>`;
}

function bindPriceCheckReview() {
    document.getElementById('pcSkipAll')?.addEventListener('change', (e) => {
        document.querySelectorAll('.pc-skip-cb').forEach(cb => {
            cb.checked = e.target.checked;
            const row = cb.closest('tr');
            const input = row.querySelector('.pc-fix-input');
            if (input) input.disabled = cb.checked;
            row.style.opacity = cb.checked ? '0.4' : '1';
        });
    });

    document.querySelectorAll('.pc-skip-cb').forEach(cb => {
        cb.addEventListener('change', () => {
            const row = cb.closest('tr');
            const input = row.querySelector('.pc-fix-input');
            if (input) input.disabled = cb.checked;
            row.style.opacity = cb.checked ? '0.4' : '1';
        });
    });

    document.getElementById('pcReviewForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('pcFixBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

        const skipList = [];
        document.querySelectorAll('.pc-skip-cb:checked').forEach(cb => skipList.push(parseInt(cb.value)));

        const priceIdmMap = {};
        document.querySelectorAll('.pc-fix-input').forEach(input => {
            const idx = input.name.replace('price_idm_', '');
            priceIdmMap[idx] = input.value;
        });

        try {
            const res = await API.updatePriceCheck({ price_idm: priceIdmMap, skip: skipList });
            showToast(res.message);
            location.hash = '#/price-check/complete?id=' + res.record.id;
        } catch (err) {
            showToast(err.message, 'danger');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> Perbaiki File';
        }
    });
}

// ═══════════════════════════════════════════
// Component: PRICE CHECK — COMPLETE
// ═══════════════════════════════════════════
async function renderPriceCheckComplete(id) {
    let record;
    try { record = (await API.getPriceCheck(id)).record; }
    catch { return `<div class="form-card" style="text-align:center;padding:60px;"><p>Record tidak ditemukan.</p><a href="#/price-check" class="btn btn-primary">Kembali</a></div>`; }

    return `
    <div class="form-card" style="text-align:center;padding:48px;">
        <div style="width:80px;height:80px;border-radius:50%;background:var(--success-bg);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;color:var(--success);">
            <i class="fas fa-check-circle"></i>
        </div>
        <h2 style="color:var(--text-heading);margin-bottom:8px;">File Berhasil Diperbaiki!</h2>
        <p style="color:var(--text-muted);margin-bottom:28px;">File harga sudah diupdate dan siap didownload.</p>

        <div style="background:var(--bg-input);border-radius:12px;padding:20px;margin-bottom:28px;text-align:left;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
                <div style="color:var(--text-muted);">File:</div>
                <div style="font-weight:600;">${esc(record.original_filename)}</div>
                <div style="color:var(--text-muted);">Total Record:</div>
                <div style="font-weight:600;">${record.total_records}</div>
                <div style="color:var(--text-muted);">Mismatch:</div>
                <div><span class="status-badge status-inactive">${record.mismatch_count}</span></div>
                <div style="color:var(--text-muted);">Diperbaiki:</div>
                <div><span class="status-badge status-active">${record.updated_count}</span></div>
                <div style="color:var(--text-muted);">Diskip:</div>
                <div style="font-weight:600;">${record.skipped_count}</div>
            </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:center;">
            <a href="#/price-check" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
            <a href="api/index.php?endpoint=price-check&action=download&id=${record.id}" class="btn btn-primary"><i class="fas fa-download"></i> Download File</a>
        </div>
    </div>`;
}

