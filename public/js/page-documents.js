// page-documents.js — SJ Link, Faktur Template, Packing List, Tanda Terima
// ═══════════════════════════════════════════
// Component: SJ LINKED — GENERATOR
// ═══════════════════════════════════════════
function renderSjLinkPage() {
    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-link"></i> SJ Linked</h1>
            <p>Generate link delivery order dari nomor SJ (6 digit pertama = YYMMDD)</p>
        </div>
        <div class="page-header-actions">
            <a href="#/sj-link/history" class="btn btn-secondary"><i class="fas fa-history"></i> Riwayat</a>
        </div>
    </div>

    <div class="text-tool-grid">
        <div class="tt-panel">
            <div class="tt-panel-header">
                <h3><i class="fas fa-keyboard"></i> Input Nomor SJ</h3>
            </div>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Masukkan nomor SJ, satu per baris. Contoh: <code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;">250320-0001</code></p>
            <textarea class="form-textarea" id="sjInput" rows="14" placeholder="250320-0001&#10;250320-0002&#10;250321-0003"></textarea>
            <div class="tt-form-actions">
                <button class="btn btn-primary" id="sjGenerateBtn"><i class="fas fa-bolt"></i> Generate Links</button>
                <button class="btn btn-secondary" id="sjClearBtn"><i class="fas fa-eraser"></i> Clear</button>
            </div>
        </div>

        <div class="tt-panel">
            <div class="tt-panel-header">
                <h3><i class="fas fa-link"></i> Generated Links</h3>
                <div class="output-meta">
                    <span class="line-badge" id="sjResultCount">0 links</span>
                </div>
            </div>
            <div id="sjResultArea">
                <div class="tt-output-empty">
                    <div class="empty-illustration"><i class="fas fa-link"></i></div>
                    <p>Masukkan nomor SJ dan klik Generate</p>
                </div>
            </div>
        </div>
    </div>`;
}

function bindSjLink() {
    document.getElementById('sjClearBtn')?.addEventListener('click', () => {
        document.getElementById('sjInput').value = '';
        document.getElementById('sjResultArea').innerHTML = `<div class="tt-output-empty"><div class="empty-illustration"><i class="fas fa-link"></i></div><p>Masukkan nomor SJ dan klik Generate</p></div>`;
        document.getElementById('sjResultCount').textContent = '0 links';
    });

    document.getElementById('sjGenerateBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('sjInput').value.trim();
        if (!input) { showToast('Masukkan minimal 1 nomor SJ.', 'warning'); return; }

        const sjNumbers = input.split('\n').map(s => s.trim()).filter(Boolean);
        const btn = document.getElementById('sjGenerateBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            const res = await API.generateSjLinks(sjNumbers);
            showToast(res.message, res.fail_count > 0 ? 'warning' : 'success');
            document.getElementById('sjResultCount').textContent = res.success_count + ' links';

            const validResults = res.results.filter(r => r.valid);
            const invalidResults = res.results.filter(r => !r.valid);

            let html = '';
            if (validResults.length > 0) {
                html += `<div style="margin-bottom:12px;display:flex;gap:8px;">
                    <button class="btn btn-sm btn-outline" id="sjOpenAllBtn"><i class="fas fa-external-link-alt"></i> Open All (${validResults.length})</button>
                    <button class="btn btn-sm btn-outline" id="sjCopyAllBtn"><i class="fas fa-copy"></i> Copy All URLs</button>
                </div>`;
                html += `<div style="max-height:400px;overflow-y:auto;"><table class="data-table"><thead><tr><th>SJ Number</th><th>Tanggal</th><th>Link</th></tr></thead><tbody>`;
                validResults.forEach(r => {
                    html += `<tr>
                        <td><code style="font-size:12px;">${esc(r.sj_number)}</code></td>
                        <td class="text-muted">${r.delivery_date}</td>
                        <td><a href="${esc(r.generated_url)}" target="_blank" class="btn-outline" style="font-size:12px;padding:3px 8px;"><i class="fas fa-external-link-alt"></i> Open</a></td>
                    </tr>`;
                });
                html += `</tbody></table></div>`;
            }
            if (invalidResults.length > 0) {
                html += `<div style="margin-top:16px;padding:12px;background:var(--danger-bg);border-radius:8px;font-size:13px;color:var(--danger);">
                    <strong><i class="fas fa-exclamation-triangle"></i> ${invalidResults.length} SJ tidak valid:</strong><br>
                    ${invalidResults.map(r => `<code>${esc(r.sj_number)}</code>`).join(', ')}
                </div>`;
            }

            document.getElementById('sjResultArea').innerHTML = html;

            // Bind open all
            document.getElementById('sjOpenAllBtn')?.addEventListener('click', () => {
                validResults.forEach(r => window.open(r.generated_url, '_blank'));
            });
            document.getElementById('sjCopyAllBtn')?.addEventListener('click', () => {
                const urls = validResults.map(r => r.generated_url).join('\n');
                navigator.clipboard.writeText(urls).then(() => showToast('URLs tersalin ke clipboard!'));
            });

        } catch (err) { showToast(err.message, 'danger'); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Links'; }
    });
}

// ═══════════════════════════════════════════
// Component: SJ LINKED — HISTORY
// ═══════════════════════════════════════════
async function renderSjHistory() {
    const { batches } = await API.getSjHistory();

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-history"></i> Riwayat SJ Linked</h1>
            <p>Semua batch SJ link yang pernah digenerate</p>
        </div>
        <div class="page-header-actions">
            <a href="#/sj-link" class="btn btn-primary"><i class="fas fa-plus"></i> Generate Baru</a>
        </div>
    </div>

    ${batches.length === 0 ? `
        <div class="form-card" style="text-align:center;padding:60px;">
            <div class="empty-illustration" style="margin:0 auto 20px;"><i class="fas fa-link"></i></div>
            <h3 style="color:var(--text-heading);margin-bottom:8px;">Belum ada riwayat</h3>
            <p style="color:var(--text-muted);margin-bottom:24px;">Generate SJ link terlebih dahulu</p>
            <a href="#/sj-link" class="btn btn-primary"><i class="fas fa-bolt"></i> Generate</a>
        </div>
    ` : `
        <div class="table-card">
            <table class="data-table">
                <thead><tr><th>Batch</th><th>Jumlah Link</th><th>Tanggal SJ</th><th>Dibuat</th><th>Aksi</th></tr></thead>
                <tbody>
                    ${batches.map(b => `<tr>
                        <td><code style="font-size:12px;">${esc(b.session_batch)}</code></td>
                        <td><span class="status-badge status-active">${b.link_count}</span></td>
                        <td class="text-muted">${b.min_date}${b.min_date !== b.max_date ? ' — ' + b.max_date : ''}</td>
                        <td class="text-muted">${formatDate(b.created_at)}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-icon btn-icon-delete sj-delete-btn" data-batch="${esc(b.session_batch)}" title="Hapus"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `}`;
}

function bindSjHistory() {
    document.querySelectorAll('.sj-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Yakin hapus batch ini?')) return;
            try {
                await API.deleteSjBatch(btn.dataset.batch);
                showToast('Batch berhasil dihapus.');
                router();
            } catch (err) { showToast(err.message, 'danger'); }
        });
    });
}

// ═══════════════════════════════════════════
// Component: FAKTUR TEMPLATE — HISTORY
// ═══════════════════════════════════════════
async function renderFakturHistory() {
    const { records } = await API.getFakturTemplates();

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-file-invoice"></i> Faktur Template</h1>
            <p>Upload CSV faktur, edit No Faktur Pajak berdasarkan DPP, dan download hasilnya</p>
        </div>
        <div class="page-header-actions">
            <a href="#/faktur-template/upload" class="btn btn-primary"><i class="fas fa-upload"></i> Upload CSV</a>
        </div>
    </div>

    ${records.length === 0 ? `
        <div class="form-card" style="text-align:center;padding:60px 40px;">
            <div class="empty-illustration" style="margin:0 auto 20px;"><i class="fas fa-file-invoice"></i></div>
            <h3 style="color:var(--text-heading);margin-bottom:8px;">Belum ada faktur template</h3>
            <p style="color:var(--text-muted);margin-bottom:24px;">Upload file CSV untuk mulai</p>
            <a href="#/faktur-template/upload" class="btn btn-primary"><i class="fas fa-upload"></i> Upload Sekarang</a>
        </div>
    ` : `
        <div class="table-card">
            <table class="data-table">
                <thead><tr><th>File</th><th>Total</th><th>Invalid</th><th>Updated</th><th>No Faktur</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr></thead>
                <tbody>
                    ${records.map(r => `<tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:36px;height:36px;border-radius:8px;background:rgba(6,182,212,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-file-csv" style="color:var(--info);"></i></div>
                                <div class="user-cell-name">${esc(r.original_filename)}</div>
                            </div>
                        </td>
                        <td>${r.total_records}</td>
                        <td>${r.invalid_records > 0 ? `<span class="status-badge status-inactive">${r.invalid_records}</span>` : '-'}</td>
                        <td>${r.updated_records || '-'}</td>
                        <td>${r.faktur_number ? `<code style="font-size:12px;">${esc(r.faktur_number)}</code>` : '-'}</td>
                        <td><span class="status-badge status-${r.status === 'downloaded' ? 'active' : r.status === 'updated' ? 'active' : 'inactive'}">${r.status}</span></td>
                        <td class="text-muted">${formatDate(r.created_at)}</td>
                        <td>
                            <div class="action-btns">
                                <a href="#/faktur-template/edit?id=${r.id}" class="btn-icon btn-icon-edit" title="Edit"><i class="fas fa-edit"></i></a>
                                ${r.updated_filepath ? `<a href="api/index.php?endpoint=faktur-template&action=download&id=${r.id}" class="btn-icon btn-icon-edit" title="Download"><i class="fas fa-download"></i></a>` : ''}
                                <button class="btn-icon btn-icon-delete ft-delete-btn" data-id="${r.id}" data-name="${esc(r.original_filename)}" title="Hapus"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `}`;
}

function bindFakturHistory() {
    document.querySelectorAll('.ft-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`Yakin hapus "${btn.dataset.name}"?`)) return;
            try {
                await API.deleteFaktur(btn.dataset.id);
                showToast('Template berhasil dihapus.');
                router();
            } catch (err) { showToast(err.message, 'danger'); }
        });
    });
}

// ═══════════════════════════════════════════
// Component: FAKTUR TEMPLATE — UPLOAD
// ═══════════════════════════════════════════
function renderFakturUpload() {
    return `
    <div class="form-card">
        <div class="form-card-header">
            <h2><i class="fas fa-upload"></i> Upload File Faktur</h2>
        </div>
        <p style="color:var(--text-muted);margin-bottom:24px;font-size:0.85rem;">
            Upload file <code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;">.csv</code> berformat semicolon-delimited dengan kolom: No BPB, Jenis Faktur Pajak, No Faktur Pajak, Tgl Faktur Pajak, Nilai DPP, Nilai PPN, Item Non BKP.
        </p>
        <div class="pc-dropzone" id="ftDropzone">
            <div class="pc-dropzone-content">
                <div class="empty-illustration" style="margin-bottom:16px;"><i class="fas fa-file-csv"></i></div>
                <p style="font-weight:600;color:var(--text-heading);margin-bottom:4px;">Drag & drop CSV di sini</p>
                <p style="font-size:13px;color:var(--text-muted);">atau klik untuk pilih file (.csv / .txt, max 10MB)</p>
            </div>
            <input type="file" id="ftFileInput" accept=".csv,.txt" style="display:none;">
        </div>
        <div id="ftFileInfo" style="display:none;margin-top:16px;">
            <div class="pc-file-badge">
                <i class="fas fa-file-csv" style="color:var(--info);"></i>
                <span id="ftFileName" style="flex:1;font-weight:500;"></span>
                <button type="button" class="pc-file-remove" id="ftFileRemove"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="form-actions" style="margin-top:24px;">
            <a href="#/faktur-template" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
            <button class="btn btn-primary" id="ftUploadBtn" disabled><i class="fas fa-upload"></i> Upload & Parse</button>
        </div>
    </div>`;
}

function bindFakturUpload() {
    const dropzone = document.getElementById('ftDropzone');
    const fileInput = document.getElementById('ftFileInput');
    const fileInfo = document.getElementById('ftFileInfo');
    const fileName = document.getElementById('ftFileName');
    const removeBtn = document.getElementById('ftFileRemove');
    const uploadBtn = document.getElementById('ftUploadBtn');
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
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'txt'].includes(ext)) { showToast('Hanya file .csv atau .txt.', 'danger'); return; }
        if (file.size > 10 * 1024 * 1024) { showToast('File terlalu besar. Max 10MB.', 'danger'); return; }
        selectedFile = file;
        fileName.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        fileInfo.style.display = 'block'; dropzone.style.display = 'none'; uploadBtn.disabled = false;
    }
    removeBtn.addEventListener('click', () => {
        selectedFile = null; fileInput.value = '';
        fileInfo.style.display = 'none'; dropzone.style.display = 'flex'; uploadBtn.disabled = true;
    });

    uploadBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        try {
            const res = await API.uploadFaktur(selectedFile);
            showToast(res.message);
            location.hash = '#/faktur-template/edit?id=' + res.id;
        } catch (err) {
            showToast(err.message, 'danger');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload & Parse';
        }
    });
}

// ═══════════════════════════════════════════
// Component: FAKTUR TEMPLATE — EDIT
// ═══════════════════════════════════════════
async function renderFakturEdit(id) {
    let editData;
    try { editData = await API.getFakturEdit(id); }
    catch { return `<div class="form-card" style="text-align:center;padding:60px;"><p>Record tidak ditemukan atau session expired.</p><a href="#/faktur-template" class="btn btn-primary">Kembali</a></div>`; }

    const { record, csv_data, dpp_values } = editData;

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-edit"></i> Edit Faktur: ${esc(record.original_filename)}</h1>
            <p>${csv_data.length} baris valid | ${record.invalid_records} baris invalid dihapus</p>
        </div>
        <div class="page-header-actions">
            ${record.updated_filepath ? `<a href="api/index.php?endpoint=faktur-template&action=download&id=${record.id}" class="btn btn-primary"><i class="fas fa-download"></i> Download</a>` : ''}
            <a href="#/faktur-template" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
        </div>
    </div>

    <div class="text-tool-grid">
        <div class="tt-panel">
            <div class="tt-panel-header"><h3><i class="fas fa-edit"></i> Update No Faktur Pajak</h3></div>
            <form id="ftEditForm">
                <input type="hidden" name="record_id" value="${record.id}">
                <div class="form-group" style="margin-bottom:16px;">
                    <label><i class="fas fa-money-bill"></i> Nilai DPP</label>
                    ${dpp_values.length > 0 ? `
                        <select class="form-input" id="ftDppSelect" style="margin-bottom:8px;">
                            <option value="">— Pilih dari daftar —</option>
                            ${dpp_values.map(d => `<option value="${d.value}">${Number(d.value).toLocaleString('id-ID', {minimumFractionDigits:2})} (${d.count} baris)</option>`).join('')}
                        </select>
                    ` : ''}
                    <input type="number" step="0.01" class="form-input" id="ftDppInput" placeholder="Masukkan nilai DPP" required>
                </div>
                <div class="form-group" style="margin-bottom:16px;">
                    <label><i class="fas fa-hashtag"></i> No Faktur Pajak <span style="color:var(--danger);">*</span></label>
                    <input type="text" class="form-input" id="ftFakturInput" placeholder="0000000000000000" maxlength="16" pattern="\\d{16}" required>
                    <span class="form-hint">Harus 16 digit angka</span>
                </div>
                <div class="form-actions" style="border:none;padding:0;">
                    <button type="submit" class="btn btn-primary" id="ftUpdateBtn"><i class="fas fa-save"></i> Update</button>
                </div>
            </form>
        </div>

        <div class="tt-panel">
            <div class="tt-panel-header">
                <h3><i class="fas fa-table"></i> Preview Data</h3>
                <span class="line-badge" id="ftRowCount">${csv_data.length} baris</span>
            </div>
            <div style="max-height:450px;overflow:auto;" id="ftPreviewArea">
                ${renderFakturTable(csv_data)}
            </div>
        </div>
    </div>`;
}

function renderFakturTable(data) {
    if (!data || data.length === 0) return '<p class="text-muted">Tidak ada data.</p>';
    return `<table class="data-table" style="font-size:12px;">
        <thead><tr><th>No BPB</th><th>Jenis</th><th>No Faktur Pajak</th><th>Tgl Faktur</th><th>DPP</th><th>PPN</th></tr></thead>
        <tbody>${data.slice(0, 100).map(r => `<tr>
            <td><code>${esc(r['No BPB'] || '')}</code></td>
            <td>${esc(r['Jenis Faktur Pajak'] || '')}</td>
            <td>${r['No Faktur Pajak'] ? `<span style="color:var(--success);font-weight:600;">${esc(r['No Faktur Pajak'])}</span>` : '<span class="text-muted">—</span>'}</td>
            <td class="text-muted">${esc(r['Tgl Faktur Pajak'] || '')}</td>
            <td style="text-align:right;">${Number(r['Nilai DPP'] || 0).toLocaleString('id-ID')}</td>
            <td style="text-align:right;">${Number(r['Nilai PPN'] || 0).toLocaleString('id-ID')}</td>
        </tr>`).join('')}${data.length > 100 ? `<tr><td colspan="6" class="text-muted" style="text-align:center;">... dan ${data.length - 100} baris lainnya</td></tr>` : ''}</tbody>
    </table>`;
}

function bindFakturEdit() {
    document.getElementById('ftDppSelect')?.addEventListener('change', (e) => {
        if (e.target.value) document.getElementById('ftDppInput').value = e.target.value;
    });

    document.getElementById('ftEditForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dpp = document.getElementById('ftDppInput').value;
        const faktur = document.getElementById('ftFakturInput').value;
        if (!dpp || parseFloat(dpp) <= 0) { showToast('Nilai DPP harus lebih dari 0.', 'warning'); return; }
        if (!/^\d{16}$/.test(faktur)) { showToast('No Faktur harus 16 digit angka.', 'warning'); return; }

        const btn = document.getElementById('ftUpdateBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        try {
            const res = await API.updateFaktur({ dpp_value: parseFloat(dpp), faktur_number: faktur });
            showToast(res.message);
            // Refresh preview
            if (res.csv_data) {
                document.getElementById('ftPreviewArea').innerHTML = renderFakturTable(res.csv_data);
            }
        } catch (err) { showToast(err.message, 'danger'); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update'; }
    });
}

// ═══════════════════════════════════════════
// Component: PACKING LIST — HISTORY
// ═══════════════════════════════════════════
async function renderPackingHistory() {
    const { records } = await API.getPackingLists();

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-box"></i> Packing List</h1>
            <p>Upload Excel alokasi, generate packing list per toko</p>
        </div>
        <div class="page-header-actions">
            <a href="#/packing-list/create" class="btn btn-primary"><i class="fas fa-plus"></i> Buat Baru</a>
        </div>
    </div>

    ${records.length === 0 ? `
        <div class="form-card" style="text-align:center;padding:60px 40px;">
            <div class="empty-illustration" style="margin:0 auto 20px;"><i class="fas fa-box-open"></i></div>
            <h3 style="color:var(--text-heading);margin-bottom:8px;">Belum ada packing list</h3>
            <p style="color:var(--text-muted);margin-bottom:24px;">Upload file Excel alokasi untuk generate packing list</p>
            <a href="#/packing-list/create" class="btn btn-primary"><i class="fas fa-plus"></i> Buat Sekarang</a>
        </div>
    ` : `
        <div class="table-card">
            <table class="data-table">
                <thead><tr><th>Batch</th><th>Stuffing Date</th><th>Toko</th><th>Dibuat</th><th>Aksi</th></tr></thead>
                <tbody>
                    ${records.map(r => `<tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:36px;height:36px;border-radius:8px;background:rgba(249,115,22,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-box" style="color:var(--warning);"></i></div>
                                <div class="user-cell-name" style="font-weight:600;">${esc(r.batch_number)}</div>
                            </div>
                        </td>
                        <td class="text-muted">${r.stuffing_date || '-'}</td>
                        <td><span class="status-badge status-active">${r.stores_count || 0} toko</span></td>
                        <td class="text-muted">${formatDate(r.created_at)}</td>
                        <td>
                            <div class="action-btns">
                                <a href="#/packing-list/preview?id=${r.id}" class="btn-icon btn-icon-edit" title="Preview"><i class="fas fa-eye"></i></a>
                                <button class="btn-icon btn-icon-delete pl-delete-btn" data-id="${r.id}" data-name="${esc(r.batch_number)}" title="Hapus"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `}`;
}

function bindPackingHistory() {
    document.querySelectorAll('.pl-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`Yakin hapus batch "${btn.dataset.name}"?`)) return;
            try {
                await API.deletePacking(btn.dataset.id);
                showToast('Packing list berhasil dihapus.');
                router();
            } catch (err) { showToast(err.message, 'danger'); }
        });
    });
}

// ═══════════════════════════════════════════
// Component: PACKING LIST — CREATE (Upload Excel)
// ═══════════════════════════════════════════
function renderPackingCreate() {
    const today = new Date().toISOString().split('T')[0];
    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-upload"></i> Upload Packing List</h1>
            <p>Upload file Excel alokasi untuk generate packing list</p>
        </div>
        <div class="page-header-actions">
            <a href="#/packing-list" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
        </div>
    </div>

    <div id="plUploadSection">
        <div class="form-card">
            <div class="form-grid" style="grid-template-columns:1fr 1fr;margin-bottom:24px;">
                <div class="form-group">
                    <label><i class="fas fa-hashtag"></i> Batch Number <span style="color:var(--danger);">*</span></label>
                    <input type="text" class="form-input" id="plBatchInput" placeholder="e.g. BATCH-001" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-calendar"></i> Stuffing Date <span style="color:var(--danger);">*</span></label>
                    <input type="date" class="form-input" id="plDateInput" value="${today}" required>
                </div>
            </div>

            <div class="pc-dropzone" id="plDropzone">
                <div class="pc-dropzone-content">
                    <div class="empty-illustration" style="margin-bottom:16px;"><i class="fas fa-file-excel"></i></div>
                    <p style="font-weight:600;color:var(--text-heading);margin-bottom:4px;">Drag & drop Excel file di sini</p>
                    <p style="font-size:13px;color:var(--text-muted);">Format: .xlsx / .xls — harus ada kolom CABANG dan KODE TOKO</p>
                </div>
                <input type="file" id="plFileInput" accept=".xlsx,.xls" style="display:none;">
            </div>
            <div id="plFileInfo" style="display:none;margin-top:16px;">
                <div class="pc-file-badge">
                    <i class="fas fa-file-excel" style="color:#22c55e;"></i>
                    <span id="plFileName" style="flex:1;font-weight:500;"></span>
                    <button type="button" class="pc-file-remove" id="plFileRemove"><i class="fas fa-times"></i></button>
                </div>
            </div>
        </div>
    </div>

    <div id="plPreviewSection" style="display:none;margin-top:24px;">
        <div class="form-card">
            <div class="form-card-header" style="display:flex;justify-content:space-between;align-items:center;">
                <h2><i class="fas fa-eye" style="color:var(--warning);"></i> Preview Data Alokasi</h2>
                <span class="status-badge status-active" id="plStoreCount"></span>
            </div>
            <div style="overflow-x:auto;max-height:500px;" id="plPreviewTable"></div>
            <div class="form-actions" style="margin-top:20px;">
                <button class="btn btn-secondary" id="plCancelBtn"><i class="fas fa-times"></i> Cancel</button>
                <button class="btn btn-primary" id="plGenerateBtn"><i class="fas fa-check-circle"></i> Generate Packing Lists</button>
            </div>
        </div>
    </div>`;
}

function bindPackingCreate() {
    const dropzone = document.getElementById('plDropzone');
    const fileInput = document.getElementById('plFileInput');
    const fileInfo = document.getElementById('plFileInfo');
    const fileName = document.getElementById('plFileName');
    const removeBtn = document.getElementById('plFileRemove');
    let parsedStores = null;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault(); dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleExcel(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files.length) handleExcel(fileInput.files[0]); });

    removeBtn.addEventListener('click', () => {
        parsedStores = null; fileInput.value = '';
        fileInfo.style.display = 'none'; dropzone.style.display = 'flex';
        document.getElementById('plPreviewSection').style.display = 'none';
    });

    function handleExcel(file) {
        if (!file.name.match(/\.(xlsx|xls)$/i)) { showToast('Hanya file Excel (.xlsx, .xls).', 'danger'); return; }
        const batch = document.getElementById('plBatchInput').value.trim();
        if (!batch) { showToast('Isi Batch Number terlebih dahulu.', 'warning'); document.getElementById('plBatchInput').focus(); return; }
        const stuffDate = document.getElementById('plDateInput').value;
        if (!stuffDate) { showToast('Pilih Stuffing Date terlebih dahulu.', 'warning'); return; }

        fileName.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        fileInfo.style.display = 'block'; dropzone.style.display = 'none';

        // Parse Excel client-side with SheetJS
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 'A', defval: '' });

                parsedStores = parseExcelRows(rows);
                if (parsedStores.length === 0) { showToast('Tidak ada data toko ditemukan.', 'danger'); return; }

                showPreview(parsedStores);
            } catch (err) { showToast('Error parsing Excel: ' + err.message, 'danger'); }
        };
        reader.readAsArrayBuffer(file);
    }

    function parseExcelRows(rows) {
        // Find header row with CABANG and KODE TOKO
        let headerIdx = -1, colMap = {};
        for (let i = 0; i < rows.length; i++) {
            const vals = Object.entries(rows[i]);
            const lower = vals.map(([k, v]) => [k, String(v).toLowerCase().trim()]);
            const hasCabang = lower.find(([, v]) => v === 'cabang');
            const hasKode = lower.find(([, v]) => v === 'kode toko');
            if (hasCabang && hasKode) {
                headerIdx = i;
                for (const [k, v] of lower) {
                    if (v === 'cabang') colMap.cabang = k;
                    if (v === 'kode toko') colMap.kode_toko = k;
                    if (v === 'nama toko') colMap.nama_toko = k;
                    if (v === 'alamat') colMap.alamat = k;
                    if (v === 'pic toko') colMap.pic_toko = k;
                }
                // Item columns = all columns after PIC TOKO
                const allCols = Object.keys(rows[i]);
                const picIdx = allCols.indexOf(colMap.pic_toko || '');
                colMap.itemCols = [];
                if (picIdx >= 0) {
                    for (let j = picIdx + 1; j < allCols.length; j++) {
                        const hdr = String(rows[i][allCols[j]]).trim();
                        if (hdr) colMap.itemCols.push({ key: allCols[j], name: hdr });
                    }
                }
                break;
            }
        }
        if (headerIdx < 0) throw new Error('Format Excel tidak valid. Harus ada kolom CABANG dan KODE TOKO.');

        const stores = [];
        let urutan = 1;
        for (let i = headerIdx + 1; i < rows.length; i++) {
            const r = rows[i];
            const kodeToko = String(r[colMap.kode_toko] || '').trim();
            if (!kodeToko) continue;

            const items = [];
            for (const ic of colMap.itemCols) {
                const qty = parseFloat(r[ic.key]) || 0;
                if (qty > 0) {
                    const lines = ic.name.split('\n');
                    items.push({ plu: lines[0]?.trim() || '', name: lines[1]?.trim() || lines[0]?.trim() || '', order: qty });
                }
            }
            if (items.length === 0) continue;

            stores.push({
                cabang: String(r[colMap.cabang] || '').trim(),
                kodeToko,
                namaToko: String(r[colMap.nama_toko] || '').trim(),
                alamat: String(r[colMap.alamat] || '').trim(),
                picToko: String(r[colMap.pic_toko] || '').trim(),
                urutanBongkar: urutan++,
                items,
            });
        }
        return stores;
    }

    function showPreview(stores) {
        document.getElementById('plPreviewSection').style.display = 'block';
        document.getElementById('plStoreCount').textContent = stores.length + ' toko';

        let html = `<table class="data-table"><thead><tr>
            <th>Urutan</th><th>Cabang</th><th>Kode Toko</th><th>Nama Toko</th><th>Alamat</th><th>PIC</th><th>Items</th>
        </tr></thead><tbody>`;
        stores.forEach(s => {
            html += `<tr>
                <td style="font-weight:600;color:var(--primary);">${s.urutanBongkar}</td>
                <td>${esc(s.cabang)}</td>
                <td><code style="font-size:12px;">${esc(s.kodeToko)}</code></td>
                <td>${esc(s.namaToko)}</td>
                <td class="text-muted" style="font-size:12px;">${esc(s.alamat)}</td>
                <td class="text-muted">${esc(s.picToko)}</td>
                <td><span class="status-badge status-active">${s.items.length} items</span></td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('plPreviewTable').innerHTML = html;
        document.getElementById('plPreviewSection').scrollIntoView({ behavior: 'smooth' });
    }

    document.getElementById('plCancelBtn')?.addEventListener('click', () => {
        parsedStores = null;
        document.getElementById('plPreviewSection').style.display = 'none';
        fileInfo.style.display = 'none'; dropzone.style.display = 'flex';
        fileInput.value = '';
    });

    document.getElementById('plGenerateBtn')?.addEventListener('click', async () => {
        if (!parsedStores || parsedStores.length === 0) return;
        const btn = document.getElementById('plGenerateBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            const res = await API.generatePacking({
                batch_number: document.getElementById('plBatchInput').value.trim(),
                stuffing_date: document.getElementById('plDateInput').value,
                stores: parsedStores,
            });
            showToast(res.message);
            location.hash = '#/packing-list/preview?id=' + res.id;
        } catch (err) {
            showToast(err.message, 'danger');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Generate Packing Lists';
        }
    });
}

// ═══════════════════════════════════════════
// Component: PACKING LIST — PREVIEW
// ═══════════════════════════════════════════
async function renderPackingPreview(id) {
    let data;
    try { data = await API.getPackingList(id); }
    catch { return `<div class="form-card" style="text-align:center;padding:60px;"><p>Record tidak ditemukan.</p><a href="#/packing-list" class="btn btn-primary">Kembali</a></div>`; }

    const { record, stores } = data;

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-box"></i> ${esc(record.batch_number)}</h1>
            <p>Stuffing: ${record.stuffing_date || '-'} | ${record.stores_count} toko | ${record.total_items} total items</p>
        </div>
        <div class="page-header-actions">
            <a href="#/packing-list" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:20px;">
        ${stores.map((s, i) => `
        <div class="form-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div>
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Urutan Bongkar #${s.urutanBongkar || (i+1)}</div>
                    <h3 style="color:var(--text-heading);margin:0;">${esc(s.namaToko || s.kodeToko)}</h3>
                </div>
                <span class="status-badge status-active">${s.items?.length || 0} items</span>
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
                <div><i class="fas fa-store" style="width:16px;"></i> <strong>${esc(s.kodeToko)}</strong> — ${esc(s.cabang)}</div>
                ${s.alamat ? `<div><i class="fas fa-map-marker-alt" style="width:16px;"></i> ${esc(s.alamat)}</div>` : ''}
                ${s.picToko ? `<div><i class="fas fa-user" style="width:16px;"></i> ${esc(s.picToko)}</div>` : ''}
            </div>
            ${s.items && s.items.length > 0 ? `
            <table class="data-table" style="font-size:12px;">
                <thead><tr><th>PLU</th><th>Item</th><th style="text-align:right;">Qty</th></tr></thead>
                <tbody>
                    ${s.items.map(it => `<tr>
                        <td><code>${esc(it.plu)}</code></td>
                        <td>${esc(it.name)}</td>
                        <td style="text-align:right;font-weight:600;">${it.order}</td>
                    </tr>`).join('')}
                </tbody>
            </table>` : ''}
        </div>`).join('')}
    </div>`;
}

// ═══════════════════════════════════════════
// Component: TANDA TERIMA — HISTORY
// ═══════════════════════════════════════════
async function renderTandaTerimaHistory() {
    const { records } = await API.getTandaTerimas();

    function fmtRp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-receipt"></i> Tanda Terima Tagihan</h1>
            <p>Buat dan cetak tanda terima tagihan</p>
        </div>
        <div class="page-header-actions">
            <a href="#/tanda-terima/create" class="btn btn-primary"><i class="fas fa-plus"></i> Buat Baru</a>
        </div>
    </div>

    ${records.length === 0 ? `
        <div class="form-card" style="text-align:center;padding:60px 40px;">
            <div class="empty-illustration" style="margin:0 auto 20px;"><i class="fas fa-receipt"></i></div>
            <h3 style="color:var(--text-heading);margin-bottom:8px;">Belum ada tanda terima</h3>
            <p style="color:var(--text-muted);margin-bottom:24px;">Buat tanda terima tagihan baru</p>
            <a href="#/tanda-terima/create" class="btn btn-primary"><i class="fas fa-plus"></i> Buat Sekarang</a>
        </div>
    ` : `
        <div class="table-card">
            <table class="data-table">
                <thead><tr><th>Penerima</th><th>Tanggal</th><th>Items</th><th>Total Tagihan</th><th>Dibuat</th><th>Aksi</th></tr></thead>
                <tbody>
                    ${records.map(r => `<tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:36px;height:36px;border-radius:8px;background:rgba(168,85,247,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-receipt" style="color:#a855f7;"></i></div>
                                <div class="user-cell-name" style="font-weight:600;">${esc(r.penerima)}</div>
                            </div>
                        </td>
                        <td class="text-muted">${r.tanggal}</td>
                        <td><span class="status-badge status-active">${r.items_count} item</span></td>
                        <td style="font-weight:600;">${fmtRp(r.total_tagihan)}</td>
                        <td class="text-muted">${formatDate(r.created_at)}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-icon btn-icon-edit tt-print-btn" data-id="${r.id}" title="Cetak"><i class="fas fa-print"></i></button>
                                <button class="btn-icon btn-icon-delete tt-delete-btn" data-id="${r.id}" data-name="${esc(r.penerima)}" title="Hapus"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `}`;
}

function bindTandaTerimaHistory() {
    document.querySelectorAll('.tt-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`Yakin hapus tanda terima "${btn.dataset.name}"?`)) return;
            try {
                await API.deleteTandaTerima(btn.dataset.id);
                showToast('Tanda Terima berhasil dihapus.');
                router();
            } catch (err) { showToast(err.message, 'danger'); }
        });
    });
    document.querySelectorAll('.tt-print-btn').forEach(btn => {
        btn.addEventListener('click', () => { openTandaTerimaPrint(btn.dataset.id); });
    });
}

// ═══════════════════════════════════════════
// Component: TANDA TERIMA — CREATE
// ═══════════════════════════════════════════
function renderTandaTerimaCreate() {
    const today = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();
    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-plus-circle"></i> Buat Tanda Terima</h1>
            <p>Input tanda terima tagihan baru</p>
        </div>
        <div class="page-header-actions">
            <a href="#/tanda-terima" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
        </div>
    </div>

    <div class="form-card">
        <div class="form-card-header"><h2><i class="fas fa-edit"></i> Form Input</h2></div>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;margin-bottom:24px;">
            <div class="form-group">
                <label><i class="fas fa-user"></i> Penerima <span style="color:var(--danger);">*</span></label>
                <input type="text" class="form-input" id="ttPenerima" placeholder="Nama penerima" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-calendar"></i> Tanggal Penyerahan <span style="color:var(--danger);">*</span></label>
                <input type="date" class="form-input" id="ttTanggal" value="${today}" required>
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="color:var(--text-heading);margin:0;"><i class="fas fa-list"></i> Detail Tagihan</h3>
            <button class="btn btn-sm btn-outline" id="ttAddRowBtn"><i class="fas fa-plus"></i> Tambah Baris</button>
        </div>

        <div style="overflow-x:auto;">
            <table class="data-table" id="ttItemsTable" style="font-size:13px;">
                <thead><tr>
                    <th>No Kwitansi</th>
                    <th>No Faktur</th>
                    <th>Jumlah Tagihan</th>
                    <th>Periode</th>
                    <th>No TTFA</th>
                    <th style="width:50px;">Aksi</th>
                </tr></thead>
                <tbody>
                    <tr class="tt-item-row">
                        <td>
                            <div style="display:flex;align-items:center;gap:4px;flex-wrap:nowrap;">
                                <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${window.APP_KW_PREFIX || 'KW.XXX-YYY/'}</span>
                                <input type="text" class="form-input tt-kw-number" style="width:65px;padding:6px;font-size:12px;" maxlength="5" placeholder="01390">
                                <span style="font-size:11px;color:var(--text-muted);">/</span>
                                <input type="text" class="form-input tt-kw-month" style="width:45px;padding:6px;font-size:12px;" maxlength="4" placeholder="VII">
                                <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">/${year}</span>
                            </div>
                        </td>
                        <td><input type="text" class="form-input tt-faktur" style="padding:6px;font-size:12px;" placeholder="No Faktur"></td>
                        <td><input type="text" class="form-input tt-tagihan" style="padding:6px;font-size:12px;" placeholder="Rp 0"></td>
                        <td>
                            <div style="display:flex;gap:4px;align-items:center;">
                                <input type="date" class="form-input tt-dari" style="padding:6px;font-size:11px;">
                                <span style="color:var(--text-muted);">—</span>
                                <input type="date" class="form-input tt-sampai" style="padding:6px;font-size:11px;">
                            </div>
                        </td>
                        <td><input type="text" class="form-input tt-ttfa" style="padding:6px;font-size:12px;" placeholder="No TTFA"></td>
                        <td><button class="btn-icon btn-icon-delete tt-row-remove" title="Hapus"><i class="fas fa-times"></i></button></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="form-actions" style="margin-top:24px;">
            <a href="#/tanda-terima" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
            <button class="btn btn-primary" id="ttSubmitBtn"><i class="fas fa-save"></i> Simpan & Cetak</button>
        </div>
    </div>`;
}

function bindTandaTerimaCreate() {
    const year = new Date().getFullYear();

    // Currency formatter
    function setupCurrency(input) {
        input.addEventListener('input', function() {
            let val = this.value.replace(/\D/g, '');
            if (val) {
                this.value = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val).replace(/,00$/, '');
            }
        });
    }

    // Number only for kwitansi
    function setupKwNumber(input) {
        input.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });
    }

    // Month roman validation
    function setupKwMonth(input) {
        input.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
    }

    // Setup existing rows
    document.querySelectorAll('.tt-tagihan').forEach(setupCurrency);
    document.querySelectorAll('.tt-kw-number').forEach(setupKwNumber);
    document.querySelectorAll('.tt-kw-month').forEach(setupKwMonth);

    // Add row
    document.getElementById('ttAddRowBtn').addEventListener('click', function() {
        const tbody = document.querySelector('#ttItemsTable tbody');
        const rowCount = tbody.querySelectorAll('.tt-item-row').length;
        const newNum = (1390 + rowCount).toString().padStart(5, '0');

        const tr = document.createElement('tr');
        tr.className = 'tt-item-row';
        tr.innerHTML = `
            <td>
                <div style="display:flex;align-items:center;gap:4px;flex-wrap:nowrap;">
                    <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${window.APP_KW_PREFIX || 'KW.XXX-YYY/'}</span>
                    <input type="text" class="form-input tt-kw-number" style="width:65px;padding:6px;font-size:12px;" maxlength="5" placeholder="${newNum}" value="${newNum}">
                    <span style="font-size:11px;color:var(--text-muted);">/</span>
                    <input type="text" class="form-input tt-kw-month" style="width:45px;padding:6px;font-size:12px;" maxlength="4" placeholder="VII" value="VII">
                    <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">/${year}</span>
                </div>
            </td>
            <td><input type="text" class="form-input tt-faktur" style="padding:6px;font-size:12px;" placeholder="No Faktur"></td>
            <td><input type="text" class="form-input tt-tagihan" style="padding:6px;font-size:12px;" placeholder="Rp 0"></td>
            <td>
                <div style="display:flex;gap:4px;align-items:center;">
                    <input type="date" class="form-input tt-dari" style="padding:6px;font-size:11px;">
                    <span style="color:var(--text-muted);">—</span>
                    <input type="date" class="form-input tt-sampai" style="padding:6px;font-size:11px;">
                </div>
            </td>
            <td><input type="text" class="form-input tt-ttfa" style="padding:6px;font-size:12px;" placeholder="No TTFA"></td>
            <td><button class="btn-icon btn-icon-delete tt-row-remove" title="Hapus"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(tr);
        setupCurrency(tr.querySelector('.tt-tagihan'));
        setupKwNumber(tr.querySelector('.tt-kw-number'));
        setupKwMonth(tr.querySelector('.tt-kw-month'));
    });

    // Remove row
    document.addEventListener('click', function(e) {
        const removeBtn = e.target.closest('.tt-row-remove');
        if (removeBtn) {
            const rows = document.querySelectorAll('.tt-item-row');
            if (rows.length > 1) removeBtn.closest('tr').remove();
            else showToast('Minimal harus ada satu baris!', 'warning');
        }
    });

    // Submit
    document.getElementById('ttSubmitBtn').addEventListener('click', async function() {
        const penerima = document.getElementById('ttPenerima').value.trim();
        const tanggal = document.getElementById('ttTanggal').value;
        if (!penerima) { showToast('Penerima harus diisi.', 'warning'); return; }
        if (!tanggal) { showToast('Tanggal harus diisi.', 'warning'); return; }

        const rows = document.querySelectorAll('.tt-item-row');
        const items = [];
        let valid = true;

        rows.forEach((row, i) => {
            const kwNum = row.querySelector('.tt-kw-number').value.trim();
            const kwMonth = row.querySelector('.tt-kw-month').value.trim();
            const faktur = row.querySelector('.tt-faktur').value.trim();
            const tagihan = row.querySelector('.tt-tagihan').value.trim();
            const dari = row.querySelector('.tt-dari').value;
            const sampai = row.querySelector('.tt-sampai').value;
            const ttfa = row.querySelector('.tt-ttfa').value.trim();

            if (!kwNum || !kwMonth || !faktur || !tagihan) {
                showToast(`Baris ${i + 1}: Kwitansi, Faktur, dan Tagihan wajib diisi.`, 'warning');
                valid = false;
                return;
            }

            const noKwitansi = `${window.APP_KW_PREFIX || 'KW.XXX-YYY/'}${kwNum.padStart(5, '0')}/${kwMonth}/${year}`;
            items.push({ no_kwitansi: noKwitansi, no_faktur: faktur, jumlah_tagihan: tagihan, periode_dari: dari, periode_sampai: sampai, no_ttfa: ttfa });
        });

        if (!valid || items.length === 0) return;

        const btn = this;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        try {
            const res = await API.storeTandaTerima({ penerima, tanggal, items });
            showToast(res.message);
            // Open print
            await openTandaTerimaPrint(res.id);
            location.hash = '#/tanda-terima';
        } catch (err) {
            showToast(err.message, 'danger');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Simpan & Cetak';
        }
    });
}

// ═══════════════════════════════════════════
// Component: TANDA TERIMA — PRINT
// ═══════════════════════════════════════════
async function openTandaTerimaPrint(id) {
    try {
        const { record } = await API.getTandaTerima(id);
        const items = record.items || [];

        function fmtRp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
        function fmtDate(d) {
            if (!d) return '-';
            const dt = new Date(d);
            return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        function fmtDateLong(d) {
            if (!d) return '-';
            const dt = new Date(d);
            return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        const printHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Cetak Tanda Terima</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;margin:10px;background:#fff}
h2,h3{margin:5px 0;text-align:center}
h3{text-align:left}
p{margin:2px 0}
table{border-collapse:collapse;width:100%;margin-top:10px;font-size:10px}
td,th{border:1px solid #000;padding:4px;text-align:center}
th{background-color:#f2f2f2}
.note{margin-top:15px;font-size:9px}
.ttd-container{margin-top:25px;display:flex;justify-content:space-between;font-size:10px}
.ttd-box{width:45%;text-align:center}
.ttd-space{height:50px}
@page{size:8.5in 5.5in;margin:10mm}
@media print{body{margin:0;padding:0;print-color-adjust:exact}}
</style></head><body>
<h3>${window.APP_COMPANY_NAME || 'PT. Your Company Name'}</h3>
<p>${window.APP_COMPANY_ADDRESS || 'Alamat Perusahaan'}<br>Telp ${window.APP_COMPANY_PHONE || '(021) XXXX-XXXX'}</p>
<h2>TANDA TERIMA TAGIHAN</h2>
<p>Sudah diterima dari / diberikan kepada: <strong>${esc(record.penerima).toUpperCase()}</strong></p>
<table>
<thead><tr><th>NO</th><th>NOMOR KWITANSI</th><th>NOMOR FAKTUR PAJAK</th><th>JUMLAH TAGIHAN</th><th>PERIODE</th><th>NO.TTFA</th></tr></thead>
<tbody>
${items.map((it, i) => `<tr>
<td>${i + 1}</td>
<td>${esc(it.no_kwitansi || '')}</td>
<td>${esc(it.no_faktur || '')}</td>
<td>${fmtRp(it.jumlah_tagihan)}</td>
<td>${it.periode_dari && it.periode_sampai ? fmtDate(it.periode_dari) + ' - ' + fmtDate(it.periode_sampai) : '-'}</td>
<td>${esc(it.no_ttfa || '')}</td>
</tr>`).join('')}
</tbody></table>
<div class="note"><strong>NOTE:</strong><br>Jika Tanda Terima Tagihan ini sudah diterima,<br><strong>Mohon discan & dikirim ke email: ${window.APP_FINANCE_EMAIL || 'finance@yourdomain.com'}</strong></div>
<div class="ttd-container">
<div class="ttd-box"><p>Penerima,</p><div class="ttd-space"></div><p>(...........................................)</p></div>
<div class="ttd-box"><p>${fmtDateLong(record.tanggal)}</p><p>Yang Menyerahkan,</p><div class="ttd-space"></div><p>(...........................................)</p></div>
</div>
<script>window.addEventListener('load',function(){window.print();});</script>
</body></html>`;

        const w = window.open('', '_blank', 'width=850,height=550');
        w.document.write(printHtml);
        w.document.close();

    } catch (err) {
        showToast(err.message || 'Gagal load data untuk print.', 'danger');
    }
}

