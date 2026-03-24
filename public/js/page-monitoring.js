// page-monitoring.js — Monitoring Main + Import PDF
// ═══════════════════════════════════════════
// Component: MONITORING — MAIN PAGE
// ═══════════════════════════════════════════
async function renderMonitoringPage() {
    const { records, stats } = await API.getKwitansiList();
    function fmtNum(n) { return Number(n || 0).toLocaleString('id-ID'); }

    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-chart-bar"></i> Monitoring Kwitansi</h1>
            <p>Data kwitansi dan faktur pajak</p>
        </div>
        <div class="page-header-actions" style="display:flex;gap:8px;">
            <a href="#/monitoring/import" class="btn btn-primary"><i class="fas fa-file-pdf"></i> Upload PDF</a>
            <button class="btn btn-outline" id="monExportBtn"><i class="fas fa-file-csv"></i> Export CSV</button>
        </div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--gradient-info);"><i class="fas fa-file-alt"></i></div>
            <div class="stat-info"><span class="stat-label">Total Kwitansi</span><span class="stat-value">${fmtNum(stats.total)}</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--gradient-success);"><i class="fas fa-calendar-day"></i></div>
            <div class="stat-info"><span class="stat-label">Hari Ini</span><span class="stat-value">${fmtNum(stats.today)}</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--gradient-warning);"><i class="fas fa-calendar-alt"></i></div>
            <div class="stat-info"><span class="stat-label">Bulan Ini</span><span class="stat-value">${fmtNum(stats.this_month)}</span></div>
        </div>
    </div>

    <!-- Filter -->
    <div class="form-card" style="margin-bottom:20px;">
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
            <div class="form-group" style="flex:1;min-width:150px;">
                <label>Kode Cabang</label>
                <input type="text" class="form-input" id="monFilterKdcab" placeholder="G001">
            </div>
            <div class="form-group" style="flex:1;min-width:150px;">
                <label>Tanggal</label>
                <input type="date" class="form-input" id="monFilterTanggal">
            </div>
            <div class="form-group" style="flex:1;min-width:120px;">
                <label>Limit</label>
                <select class="form-input" id="monFilterLimit">
                    <option value="10">10</option>
                    <option value="50" selected>50</option>
                    <option value="100">100</option>
                    <option value="all">Semua</option>
                </select>
            </div>
            <button class="btn btn-primary" id="monFilterBtn" style="height:42px;"><i class="fas fa-search"></i> Filter</button>
        </div>
    </div>

    <!-- Table -->
    <div class="table-card">
        <div style="overflow-x:auto;">
            <table class="data-table" style="font-size:13px;" id="monTable">
                <thead><tr>
                    <th>No</th><th>KDCAB</th><th>Tanggal</th><th>No Kwitansi</th><th>No Faktur</th>
                    <th style="text-align:right;">DPP</th><th style="text-align:right;">PPN</th><th style="text-align:right;">Total</th><th>Aksi</th>
                </tr></thead>
                <tbody id="monTableBody">
                    ${records.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted);">Data tidak ditemukan</td></tr>' :
                    records.map((r, i) => `<tr>
                        <td>${i + 1}</td>
                        <td><span class="status-badge status-active" style="font-size:11px;">${esc(r.kdcab)}</span></td>
                        <td class="text-muted">${r.tanggal}</td>
                        <td style="font-size:12px;">${esc(r.no_kwitansi)}</td>
                        <td style="font-size:12px;">${esc(r.no_faktur)}</td>
                        <td style="text-align:right;">${fmtNum(r.dpp)}</td>
                        <td style="text-align:right;">${fmtNum(r.ppn)}</td>
                        <td style="text-align:right;font-weight:600;">${fmtNum(r.total)}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-icon btn-icon-delete mon-delete-btn" data-id="${r.id}" title="Hapus"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

function bindMonitoringPage() {
    // Delete
    document.querySelectorAll('.mon-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Yakin hapus data kwitansi ini?')) return;
            try {
                await API.deleteKwitansi(btn.dataset.id);
                showToast('Data berhasil dihapus.');
                router();
            } catch (err) { showToast(err.message, 'danger'); }
        });
    });

    // Filter
    document.getElementById('monFilterBtn')?.addEventListener('click', async () => {
        const kdcab = document.getElementById('monFilterKdcab').value.trim();
        const tanggal = document.getElementById('monFilterTanggal').value;
        const limit = document.getElementById('monFilterLimit').value;

        try {
            const { records } = await API.getKwitansiList({ kdcab, tanggal, limit });
            const fmtNum = n => Number(n || 0).toLocaleString('id-ID');
            const tbody = document.getElementById('monTableBody');
            if (records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted);">Data tidak ditemukan</td></tr>';
            } else {
                tbody.innerHTML = records.map((r, i) => `<tr>
                    <td>${i + 1}</td>
                    <td><span class="status-badge status-active" style="font-size:11px;">${esc(r.kdcab)}</span></td>
                    <td class="text-muted">${r.tanggal}</td>
                    <td style="font-size:12px;">${esc(r.no_kwitansi)}</td>
                    <td style="font-size:12px;">${esc(r.no_faktur)}</td>
                    <td style="text-align:right;">${fmtNum(r.dpp)}</td>
                    <td style="text-align:right;">${fmtNum(r.ppn)}</td>
                    <td style="text-align:right;font-weight:600;">${fmtNum(r.total)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon btn-icon-delete mon-delete-btn" data-id="${r.id}" title="Hapus"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`).join('');
                // Re-bind delete
                document.querySelectorAll('.mon-delete-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (!confirm('Yakin hapus data kwitansi ini?')) return;
                        try { await API.deleteKwitansi(btn.dataset.id); showToast('Data berhasil dihapus.'); router(); }
                        catch (err) { showToast(err.message, 'danger'); }
                    });
                });
            }
            showToast(`${records.length} data ditemukan.`);
        } catch (err) { showToast(err.message, 'danger'); }
    });

    // Export CSV
    document.getElementById('monExportBtn')?.addEventListener('click', async () => {
        try {
            const { records } = await API.exportKwitansi();
            if (records.length === 0) { showToast('Tidak ada data untuk di-export.', 'warning'); return; }

            const cabangMap = {
                // Branch codes configured per deployment
                // Add your branch mappings here
            };

            let csv = 'KDCAB,Nama Cabang,Tanggal,No Kwitansi,No Faktur,DPP,PPN,Total,No TTF,Tgl Kirim Tagihan\n';
            records.forEach(r => {
                csv += [
                    r.kdcab, cabangMap[r.kdcab] || '-', r.tanggal,
                    '"' + (r.no_kwitansi || '').replace(/"/g, '""') + '"',
                    '"' + (r.no_faktur || '').replace(/"/g, '""') + '"',
                    r.dpp, r.ppn, r.total, r.no_ttf || '', r.tgl_kirim_tagihan || ''
                ].join(',') + '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'kwitansi_' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
            showToast(`Export ${records.length} data berhasil.`);
        } catch (err) { showToast(err.message, 'danger'); }
    });
}

// ═══════════════════════════════════════════
// Component: MONITORING — IMPORT (PDF)
// ═══════════════════════════════════════════
function renderMonitoringImport() {
    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-file-pdf"></i> Upload PDF Kwitansi</h1>
            <p>Upload file PDF kwitansi untuk import data secara otomatis</p>
        </div>
        <div class="page-header-actions">
            <a href="#/monitoring" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</a>
        </div>
    </div>

    <div class="form-card">
        <p style="color:var(--text-muted);margin-bottom:16px;font-size:13px;">
            <i class="fas fa-info-circle"></i> Upload file PDF register kwitansi. Data akan di-parse otomatis (KDCAB, Tanggal, No Kwitansi, No Faktur, DPP, PPN, Total). Duplikat berdasarkan No Kwitansi akan dilewati.
        </p>
        <div class="pc-dropzone" id="monImportDropzone">
            <div class="pc-dropzone-content">
                <div class="empty-illustration" style="margin-bottom:16px;"><i class="fas fa-file-pdf" style="color:#ef4444;"></i></div>
                <p style="font-weight:600;color:var(--text-heading);margin-bottom:4px;">Drag & drop file PDF di sini</p>
                <p style="font-size:13px;color:var(--text-muted);">atau klik untuk pilih file (.pdf)</p>
            </div>
            <input type="file" id="monImportFile" accept=".pdf" style="display:none;">
        </div>
        <div id="monImportResult" style="display:none;margin-top:20px;"></div>
    </div>`;
}

function bindMonitoringImport() {
    const dropzone = document.getElementById('monImportDropzone');
    const fileInput = document.getElementById('monImportFile');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault(); dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handlePdfImport(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files.length) handlePdfImport(fileInput.files[0]); });

    async function handlePdfImport(file) {
        if (!file.name.match(/\.pdf$/i)) { showToast('File harus PDF.', 'danger'); return; }

        const resultDiv = document.getElementById('monImportResult');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Membaca PDF...</p>';

        try {
            // Read PDF with pdf.js
            const arrayBuf = await file.arrayBuffer();
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map(it => it.str).join(' ');
                fullText += pageText + '\n';
            }

            resultDiv.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Parsing data kwitansi...</p>';

            // Parse lines using regex from original MonitoringController
            const lines = fullText.split('\n');
            const rows = [];
            const notMatched = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (/^(SUBTOTAL|TOTAL|KDCAB|Periode|REGISTER)/i.test(trimmed)) continue;

                // Match pattern: KDCAB DATE KWITANSI FAKTUR DPP PPN TOTAL
                const m = trimmed.match(/^(G\d{3}|[A-Z]{2,})\s+(\d{1,2}-[A-Za-z]{3}-\d{4})\s+(KW\.IIA\s*-\s*[^\s]+.*?\d{4}\/[A-Z]+_[A-Z]+)\s+(\d+\.\d+[.\-]\d+[.\-]\d+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*$/);
                if (m) {
                    const tanggalStr = m[2];
                    let tanggal = '';
                    try {
                        const dt = new Date(tanggalStr);
                        if (!isNaN(dt)) tanggal = dt.toISOString().split('T')[0];
                    } catch(e) {}

                    rows.push({
                        kdcab: m[1].trim(),
                        tanggal: tanggal,
                        no_kwitansi: m[3].replace(/\s+/g, ' ').trim(),
                        no_faktur: m[4].trim(),
                        dpp: m[5].replace(/,/g, ''),
                        ppn: m[6].replace(/,/g, ''),
                        total: m[7].replace(/,/g, ''),
                    });
                } else if (trimmed.length > 10) {
                    notMatched.push(trimmed);
                }
            }

            if (rows.length === 0) {
                resultDiv.innerHTML = `
                    <div style="padding:16px;border-radius:8px;background:var(--warning-bg);border:1px solid var(--warning);">
                        <p style="font-weight:600;color:var(--warning);margin-bottom:8px;"><i class="fas fa-exclamation-triangle"></i> Tidak ada data ter-parse</p>
                        <p style="color:var(--text-primary);font-size:13px;">PDF berhasil dibaca tapi tidak ada baris kwitansi yang cocok dengan format. Pastikan PDF yang diupload adalah register kwitansi.</p>
                        ${notMatched.length > 0 ? `<details style="margin-top:12px;"><summary style="cursor:pointer;color:var(--text-muted);font-size:12px;">Lihat ${notMatched.length} baris tidak cocok</summary><pre style="font-size:10px;max-height:200px;overflow:auto;margin-top:8px;background:var(--bg-input);padding:8px;border-radius:6px;">${esc(notMatched.slice(0, 30).join('\n'))}</pre></details>` : ''}`;
                return;
            }

            // Preview before import
            resultDiv.innerHTML = `
                <div style="padding:16px;border-radius:8px;background:var(--info-bg);border:1px solid var(--info);margin-bottom:16px;">
                    <p style="font-weight:600;color:var(--info);"><i class="fas fa-search"></i> Ditemukan ${rows.length} data kwitansi</p>
                    ${notMatched.length > 0 ? `<p style="font-size:12px;color:var(--text-muted);margin-top:4px;">${notMatched.length} baris tidak cocok (dilewati)</p>` : ''}
                </div>
                <div style="overflow-x:auto;max-height:300px;overflow-y:auto;margin-bottom:16px;">
                    <table class="data-table" style="font-size:11px;">
                        <thead><tr><th>No</th><th>KDCAB</th><th>Tanggal</th><th>No Kwitansi</th><th>No Faktur</th><th>DPP</th><th>PPN</th><th>Total</th></tr></thead>
                        <tbody>
                            ${rows.slice(0, 50).map((r, i) => `<tr>
                                <td>${i + 1}</td><td>${esc(r.kdcab)}</td><td>${r.tanggal}</td>
                                <td style="font-size:10px;">${esc(r.no_kwitansi)}</td><td>${esc(r.no_faktur)}</td>
                                <td style="text-align:right;">${Number(r.dpp).toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${Number(r.ppn).toLocaleString('id-ID')}</td>
                                <td style="text-align:right;font-weight:600;">${Number(r.total).toLocaleString('id-ID')}</td>
                            </tr>`).join('')}
                            ${rows.length > 50 ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">... dan ${rows.length - 50} data lagi</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
                <button class="btn btn-primary" id="monDoImportBtn"><i class="fas fa-cloud-upload-alt"></i> Import ${rows.length} Data</button>`;

            // Bind import button
            document.getElementById('monDoImportBtn')?.addEventListener('click', async function() {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengimport...';
                try {
                    const res = await API.bulkKwitansi(rows);
                    resultDiv.innerHTML = `
                        <div style="padding:16px;border-radius:8px;background:var(--success-bg);border:1px solid var(--success);">
                            <p style="font-weight:600;color:var(--success);margin-bottom:8px;"><i class="fas fa-check-circle"></i> Import Selesai</p>
                            <p style="color:var(--text-primary);">${esc(res.message)}</p>
                        </div>
                        <a href="#/monitoring" class="btn btn-primary" style="margin-top:16px;"><i class="fas fa-arrow-left"></i> Kembali ke Monitoring</a>`;
                } catch (err) {
                    showToast(err.message, 'danger');
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Import';
                }
            });

        } catch (err) {
            resultDiv.innerHTML = `<p style="color:var(--danger);">Error: ${esc(err.message || 'Gagal membaca PDF')}</p>`;
        }
    }
}

