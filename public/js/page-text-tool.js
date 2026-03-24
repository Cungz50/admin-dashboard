// page-text-tool.js — Text Tool component
// ═══════════════════════════════════════════
// Component: TEXT TOOL
// ═══════════════════════════════════════════
function renderTextTool() {
    return `
    <div class="page-header">
        <div>
            <h1><i class="fas fa-wrench"></i> Text Tool</h1>
            <p>Manipulasi teks: replace kata, filter baris berdasarkan keyword</p>
        </div>
    </div>
    <div class="text-tool-grid">
        <div class="tt-panel">
            <div class="tt-panel-header"><h3><i class="fas fa-edit"></i> Input & Aksi</h3></div>
            <div class="form-group">
                <label>Pilih Aksi</label>
                <div class="action-tabs">
                    <label class="action-tab active"><input type="radio" name="ttAction" value="replace" checked><span><i class="fas fa-pen"></i> Replace</span></label>
                    <label class="action-tab"><input type="radio" name="ttAction" value="removeLines"><span><i class="fas fa-check"></i> Ambil Mengandung</span></label>
                    <label class="action-tab"><input type="radio" name="ttAction" value="removeLinesNotContaining"><span><i class="fas fa-times"></i> Buang Mengandung</span></label>
                </div>
            </div>
            <div class="form-group" id="ttFieldKeyword" style="display:none">
                <label>Keyword</label>
                <input type="text" id="ttKeyword" class="form-input" placeholder="Masukkan kata kunci...">
                <small id="ttKeywordHint" class="form-hint">Baris yang mengandung kata ini akan diambil</small>
            </div>
            <div class="form-group" id="ttFieldReplace">
                <label>Teks Pengganti</label>
                <input type="text" id="ttReplaceText" class="form-input" placeholder='Ganti kata "salah" dengan...'>
                <small class="form-hint">Semua kemunculan kata "salah" (case-insensitive) akan diganti</small>
            </div>
            <div class="form-group">
                <label>Input Teks <span class="line-badge" id="ttInputCount"></span></label>
                <textarea id="ttInputText" class="form-textarea" rows="12" placeholder="Paste teks di sini..."></textarea>
            </div>
            <div class="tt-form-actions">
                <button class="btn btn-primary" id="ttProcessBtn"><i class="fas fa-play"></i> Proses</button>
                <button class="btn btn-secondary" id="ttClearBtn"><i class="fas fa-trash-alt"></i> Clear</button>
            </div>
        </div>

        <div class="tt-panel">
            <div class="tt-panel-header">
                <h3><i class="fas fa-file-alt"></i> Output</h3>
                <div class="output-meta" id="ttOutputMeta" style="display:none">
                    <span class="status-badge status-active" id="ttActionLabel"></span>
                    <span class="line-badge" id="ttOutputCount"></span>
                </div>
            </div>
            <div id="ttOutputArea">
                <div class="tt-output-empty">
                    <div class="empty-illustration"><i class="fas fa-file-alt"></i></div>
                    <p>Hasil akan tampil di sini setelah diproses</p>
                </div>
            </div>
        </div>
    </div>`;
}

function bindTextTool() {
    const actionLabels = { replace: 'Replace "salah"', removeLines: 'Ambil mengandung keyword', removeLinesNotContaining: 'Buang mengandung keyword' };
    const tabs = document.querySelectorAll('.action-tab');
    const radios = document.querySelectorAll('input[name="ttAction"]');

    function updateFields() {
        const sel = document.querySelector('input[name="ttAction"]:checked')?.value;
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`input[value="${sel}"]`)?.closest('.action-tab')?.classList.add('active');
        document.getElementById('ttFieldKeyword').style.display = sel !== 'replace' ? 'block' : 'none';
        document.getElementById('ttFieldReplace').style.display = sel === 'replace' ? 'block' : 'none';
        if (sel === 'removeLines') document.getElementById('ttKeywordHint').textContent = 'Baris yang mengandung kata ini akan DIAMBIL';
        if (sel === 'removeLinesNotContaining') document.getElementById('ttKeywordHint').textContent = 'Baris yang mengandung kata ini akan DIBUANG';
    }

    radios.forEach(r => r.addEventListener('change', updateFields));
    tabs.forEach(t => t.addEventListener('click', () => { t.querySelector('input').checked = true; updateFields(); }));

    // Input line counter
    document.getElementById('ttInputText')?.addEventListener('input', (e) => {
        const lines = e.target.value.split('\n').length;
        document.getElementById('ttInputCount').textContent = lines + ' baris';
    });

    // Clear
    document.getElementById('ttClearBtn')?.addEventListener('click', () => {
        document.getElementById('ttInputText').value = '';
        document.getElementById('ttKeyword').value = '';
        document.getElementById('ttReplaceText').value = '';
        document.getElementById('ttInputCount').textContent = '';
        document.getElementById('ttOutputArea').innerHTML = '<div class="tt-output-empty"><div class="empty-illustration"><i class="fas fa-file-alt"></i></div><p>Hasil akan tampil di sini setelah diproses</p></div>';
        document.getElementById('ttOutputMeta').style.display = 'none';
    });

    // Process
    document.getElementById('ttProcessBtn')?.addEventListener('click', async () => {
        const action = document.querySelector('input[name="ttAction"]:checked')?.value;
        const inputText = document.getElementById('ttInputText').value;
        const keyword = document.getElementById('ttKeyword').value;
        const replaceText = document.getElementById('ttReplaceText').value;

        const btn = document.getElementById('ttProcessBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Proses...';

        try {
            const res = await API.processText({ action, inputText, keyword, replaceText });
            document.getElementById('ttOutputMeta').style.display = 'flex';
            document.getElementById('ttActionLabel').textContent = actionLabels[action] || action;
            document.getElementById('ttOutputCount').textContent = res.lineCount + ' baris';
            document.getElementById('ttOutputArea').innerHTML = `
                <div class="tt-output-actions">
                    <button class="btn btn-sm btn-outline" id="ttCopyBtn"><i class="fas fa-copy"></i> Copy</button>
                    <button class="btn btn-sm btn-outline" id="ttDownloadBtn"><i class="fas fa-download"></i> Download</button>
                </div>
                <textarea class="form-textarea output-textarea" rows="16" readonly>${esc(res.result)}</textarea>
                <div id="ttCopyToast" class="tt-copy-toast" style="display:none"><i class="fas fa-check-circle"></i> Tersalin ke clipboard!</div>
            `;
            // Bind copy/download
            document.getElementById('ttCopyBtn')?.addEventListener('click', () => {
                navigator.clipboard.writeText(res.result).then(() => {
                    const t = document.getElementById('ttCopyToast');
                    t.style.display = 'flex';
                    setTimeout(() => t.style.display = 'none', 2500);
                });
            });
            document.getElementById('ttDownloadBtn')?.addEventListener('click', () => {
                const blob = new Blob([res.result], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'text_tool_output_' + Date.now() + '.txt';
                a.click();
            });
        } catch (err) {
            showToast(err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> Proses';
        }
    });
}

