// page-hpp.js — HPP System (5 Tabs) — Full Feature Parity
// ═══════════════════════════════════════════
// Component: HPP — MAIN PAGE (5 TABS)
// ═══════════════════════════════════════════
function renderHppPage() {
    return `
    <div class="page-header"><div><h1><i class="fas fa-calculator"></i> HPP & Simulasi Biaya</h1><p>Harga Pokok Penjualan, Gramasi, dan Simulasi Biaya</p></div></div>
    <div class="filter-section" style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:end;">
        <div class="form-group" style="margin:0;min-width:180px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;">Cabang</label><select class="form-input" id="hppCabang"></select></div>
        <div class="form-group" style="margin:0;min-width:220px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;">Periode</label><select class="form-input" id="hppPeriode"></select></div>
        <div class="form-group" style="margin:0;min-width:140px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;">Satuan</label>
            <select class="form-input" id="hppUnit"><option value="kg" selected>Kilogram (kg)</option><option value="ons">Ons (100g)</option><option value="100g">Per 100g</option><option value="50g">Per 50g</option><option value="10g">Per 10g</option><option value="gram">Gram (g)</option></select>
        </div>
        <button class="btn btn-primary" id="hppLoadBtn" style="height:38px;"><i class="fas fa-sync"></i> Load</button>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:20px;flex-wrap:wrap;" id="hppTabs">
        <button class="btn btn-primary btn-sm hpp-tab active" data-tab="hpp">HPP & Gramasi</button>
        <button class="btn btn-outline btn-sm hpp-tab" data-tab="compare">Komparasi</button>
        <button class="btn btn-outline btn-sm hpp-tab" data-tab="sim">Sim. BB</button>
        <button class="btn btn-outline btn-sm hpp-tab" data-tab="biaya">Sim. Biaya</button>
        <button class="btn btn-outline btn-sm hpp-tab" data-tab="harga">Harga Jual</button>
    </div>
    <div id="hppContent"><div class="empty-state"><div class="empty-illustration"><i class="fas fa-calculator"></i></div><h3>Pilih cabang & periode</h3></div></div>`;
}

function bindHppPage() {
    const cabSel = document.getElementById('hppCabang'), perSel = document.getElementById('hppPeriode');
    const unitSel = document.getElementById('hppUnit');
    let hppData = null, simItemsDB = [], activeTab = 'hpp';
    let simFormula = {}, simActiveType = 'ALL', simNewItemUID = 0;

    const unitDefs = {
        kg:{label:'Kilogram',sym:'kg',factor:1}, ons:{label:'Ons (100g)',sym:'ons',factor:0.1},
        '100g':{label:'Per 100g',sym:'100g',factor:0.1}, '50g':{label:'Per 50g',sym:'50g',factor:0.05},
        '10g':{label:'Per 10g',sym:'10g',factor:0.01}, gram:{label:'Gram',sym:'g',factor:0.001}
    };
    const SIM_TYPE_COLORS = {
        'RM':'#10b981','PM':'#3b82f6','IG':'#f59e0b','FG':'#8b5cf6',
        'SP':'#ef4444','ST':'#06b6d4','EX':'#f97316','AS':'#6366f1',
        'CR':'#84cc16','CO':'#ec4899','GS':'#14b8a6','WP':'#a78bfa'
    };

    const fmtRp = v => { if (isNaN(v)||v==null) return '—'; return 'Rp '+Math.round(v).toLocaleString('id-ID'); };
    const fmtNum = (n,d=2) => { if (isNaN(n)||n==null) return '—'; return n.toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d}); };
    function exportTableCSV(tableId,filename='data') {
        const table=document.getElementById(tableId); if(!table) return;
        const rows=Array.from(table.rows).map(row=>Array.from(row.cells).map(cell=>{let t=cell.innerText.trim().replace(/\n+/g,' ');return(t.includes(',')||t.includes('"'))?'"'+t.replace(/"/g,'""')+'"':t;}).join(','));
        const blob=new Blob(['\uFEFF'+rows.join('\n')],{type:'text/csv;charset=utf-8;'});
        const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:filename+'_'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'.csv'});
        a.click();
    }

    async function loadCab() {
        const { data } = await API.lppCabangList();
        cabSel.innerHTML = data.map(c => `<option value="${c.id}">${esc(c.nama_cabang)}</option>`).join('');
        if (data.length) loadPer();
    }
    async function loadPer() {
        const { data } = await API.lppPeriodeList(cabSel.value);
        perSel.innerHTML = data.map(p => `<option value="${p.id}">${p.periode_start} s/d ${p.periode_end}</option>`).join('');
    }
    cabSel.addEventListener('change', loadPer);
    document.getElementById('hppLoadBtn').addEventListener('click', loadHpp);

    document.getElementById('hppTabs').addEventListener('click', e => {
        const btn = e.target.closest('.hpp-tab'); if (!btn) return;
        activeTab = btn.dataset.tab;
        document.querySelectorAll('.hpp-tab').forEach(b => { b.className = `btn btn-${b===btn?'primary':'outline'} btn-sm hpp-tab${b===btn?' active':''}`; });
        renderTab();
    });
    unitSel.addEventListener('change', () => { if (hppData) renderTab(); });

    async function loadHpp() {
        const periodeId = perSel.value;
        if (!periodeId) { showToast('Pilih periode','warning'); return; }
        const content = document.getElementById('hppContent');
        content.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i></p>';
        try {
            const [sumRes, itemRes, simRes, katRes] = await Promise.all([
                API.hppSummary(periodeId), API.hppItems(periodeId),
                API.hppSimItems(periodeId), API.hppKategoriList(periodeId)
            ]);
            hppData = { summary: sumRes.summary, items: itemRes.items, kategoriList: katRes.data || [] };
            simItemsDB = (simRes.items || []).map(i => ({...i, isNew: false}));
            simFormula = {}; simActiveType = 'ALL';
            renderTab();
        } catch(e) { content.innerHTML = `<p style="color:var(--danger);text-align:center;">${esc(e.message)}</p>`; }
    }

    function switchTab(tab) {
        activeTab = tab;
        document.querySelectorAll('.hpp-tab').forEach(b => { b.className = `btn btn-${b.dataset.tab===tab?'primary':'outline'} btn-sm hpp-tab${b.dataset.tab===tab?' active':''}`; });
        renderTab();
    }
    // ═══════════════════════════════════════════
    // renderTab — main dispatcher
    // ═══════════════════════════════════════════
    function renderTab() {
        if (!hppData) return;
        const content = document.getElementById('hppContent');
        const u = unitDefs[unitSel.value] || unitDefs.kg;
        const factor = u.factor, sym = u.sym;
        const s = hppData.summary;

        // ── TAB 1: HPP & Gramasi ─────────────────────────────────────────────
        if (activeTab === 'hpp') {
            if (!s || !(parseFloat(s.total_sku) > 0)) { content.innerHTML = '<div class="empty-state"><h3>Tidak ada data HPP</h3><p>Pastikan kolom acost sudah terisi.</p></div>'; return; }
            content.innerHTML = `
            <div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:20px;">
                ${[
                    {icon:'fa-boxes-stacked',color:'#667eea,#764ba2',label:'Item Ber-ACOST',val:Number(s.total_sku).toLocaleString()},
                    {icon:'fa-arrow-down-wide-short',color:'#10b981,#059669',label:'HPP Termurah / '+sym,val:fmtRp(parseFloat(s.min_acost)*factor)},
                    {icon:'fa-arrow-up-wide-short',color:'#f59e0b,#d97706',label:'HPP Termahal / '+sym,val:fmtRp(parseFloat(s.max_acost)*factor)},
                    {icon:'fa-chart-bar',color:'#3b82f6,#1d4ed8',label:'Rata-rata / '+sym,val:fmtRp(parseFloat(s.avg_acost)*factor)},
                    {icon:'fa-sack-dollar',color:'#8b5cf6,#6d28d9',label:'Total HPP Sales',val:fmtRp(s.total_hpp_sales)},
                ].map(c => `<div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,${c.color});"><i class="fas ${c.icon}"></i></div><div class="stat-info"><span class="stat-label">${c.label}</span><span class="stat-value" style="font-size:${c.val.length>15?'0.85rem':'1.1rem'};">${c.val}</span></div></div>`).join('')}
            </div>
            <div class="form-card" style="padding:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <h3 style="margin:0;font-size:14px;">Daftar HPP per Item — satuan <strong style="text-transform:uppercase;">${sym}</strong></h3>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <div style="position:relative;"><i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none;"></i>
                            <input type="text" id="hppSearch" placeholder="Cari PLU / nama..." style="padding:6px 8px 6px 28px;border:1px solid var(--border);border-radius:8px;font-size:12px;width:200px;font-family:Inter,sans-serif;">
                        </div>
                        <select id="hppKatFilter" class="form-input" style="padding:6px 8px;font-size:12px;max-width:180px;">
                            <option value="">-- Semua Kategori --</option>
                            ${(hppData.kategoriList||[]).map(k => `<option value="${k.id}">${esc(k.nama_kategori)}</option>`).join('')}
                        </select>
                        <button class="btn btn-outline btn-sm" id="hppExportBtn"><i class="fas fa-download"></i> CSV</button>
                    </div>
                </div>
                <div style="overflow-x:auto;"><table class="data-table" style="font-size:12px;" id="hppTable">
                    <thead><tr><th>#</th><th>PLU</th><th>Nama Barang</th><th>Kategori</th><th>Satuan DB</th><th style="text-align:right;">ACOST/kg</th><th style="text-align:right;color:var(--primary);">HPP/${sym}</th><th style="text-align:right;">Sales Qty</th><th style="text-align:right;">Stok Qty</th><th style="text-align:right;">Stok Value</th></tr></thead>
                    <tbody id="hppTableBody"></tbody>
                </table></div>
                <p id="hppItemCount" style="font-size:12px;color:var(--text-muted);margin-top:8px;"></p>
            </div>
            <div class="form-card" style="padding:20px;margin-top:16px;">
                <h3 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-ruler-combined"></i> Referensi Konversi Gramasi <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:8px;">Base: KG</span></h3>
                <div style="overflow-x:auto;"><table class="data-table" style="font-size:12px;" id="hppConvTable">
                    <thead><tr><th>Satuan</th><th style="text-align:center;">Faktor</th><th style="text-align:center;">Formula</th><th style="text-align:right;">HPP Rata-rata</th><th style="text-align:right;">HPP Min</th><th style="text-align:right;">HPP Max</th></tr></thead>
                    <tbody>${Object.entries(unitDefs).map(([k,u]) => {
                        const isCur = k === unitSel.value;
                        const bg = isCur ? 'background:var(--bg-hover);' : '';
                        const dot = isCur ? '<i class="fas fa-circle" style="color:var(--primary);font-size:6px;margin-right:4px;"></i>' : '';
                        const formula = u.factor===1?'acost (base)':u.factor<1?'acost ÷ '+(1/u.factor):'acost × '+u.factor;
                        return `<tr style="${bg}"><td style="font-weight:600;">${dot}${u.label} <span style="color:var(--text-muted);font-size:11px;">(${u.sym})</span></td><td style="text-align:center;font-family:monospace;color:var(--primary);">${u.factor}</td><td style="text-align:center;color:var(--text-muted);font-size:11px;">${formula}</td><td style="text-align:right;font-weight:600;">${fmtRp(parseFloat(s.avg_acost)*u.factor)}</td><td style="text-align:right;color:#10b981;">${fmtRp(parseFloat(s.min_acost)*u.factor)}</td><td style="text-align:right;color:#f59e0b;">${fmtRp(parseFloat(s.max_acost)*u.factor)}</td></tr>`;
                    }).join('')}</tbody>
                </table></div>
            </div>`;
            // Render & filter items
            let filteredItems = [...hppData.items];
            function renderHppItems() {
                const search = (document.getElementById('hppSearch')?.value||'').toLowerCase();
                const katId = document.getElementById('hppKatFilter')?.value || '';
                filteredItems = hppData.items.filter(r => {
                    if (search && !r.plu.toLowerCase().includes(search) && !r.nama_barang.toLowerCase().includes(search)) return false;
                    if (katId && r.kategori_id != katId) return false;
                    return true;
                });
                document.getElementById('hppTableBody').innerHTML = filteredItems.map((r,i) => `<tr>
                    <td style="color:var(--text-muted);">${i+1}</td><td style="font-family:monospace;">${esc(r.plu)}</td><td style="font-weight:600;">${esc(r.nama_barang)}</td>
                    <td><span class="badge">${esc(r.nama_kategori||'-')}</span></td><td style="color:var(--text-muted);font-size:11px;">${esc(r.satuan||'kg')}</td>
                    <td style="text-align:right;">${fmtRp(r.acost)}</td><td style="text-align:right;font-weight:700;color:var(--primary);">${fmtRp(parseFloat(r.acost)*factor)}</td>
                    <td style="text-align:right;">${fmtNum(parseFloat(r.pengeluaran_sales_qty||0))}</td>
                    <td style="text-align:right;">${fmtNum(parseFloat(r.saldo_akhir_qty||0))}</td>
                    <td style="text-align:right;">${fmtRp(r.saldo_akhir_value)}</td>
                </tr>`).join('');
                document.getElementById('hppItemCount').textContent = `${filteredItems.length} items — Formula: acost × ${factor} = HPP per ${sym}`;
            }
            renderHppItems();
            document.getElementById('hppSearch')?.addEventListener('input', renderHppItems);
            document.getElementById('hppKatFilter')?.addEventListener('change', renderHppItems);
            document.getElementById('hppExportBtn')?.addEventListener('click', () => exportTableCSV('hppTable','hpp_data'));
        // ── TAB 2: KOMPARASI ──────────────────────────────────────────────
        } else if (activeTab === 'compare') {
            const cmpUnits = [
                {id:'1',label:'per Kilogram (kg)',sym:'kg',factor:1},{id:'0.1',label:'per Ons / 100g',sym:'100g',factor:0.1},
                {id:'0.05',label:'per 50 gram',sym:'50g',factor:0.05},{id:'0.01',label:'per 10 gram',sym:'10g',factor:0.01},
                {id:'0.001',label:'per Gram',sym:'g',factor:0.001}
            ];
            content.innerHTML = `
            <div style="background:var(--bg-hover);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:var(--text-muted);font-weight:500;">
                <i class="fas fa-info-circle"></i> Pilih item dari DB, lalu masukkan <strong>Harga Pasaran</strong>. Sistem akan menghitung margin dan breakdown per satuan gramasi.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
                <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
                    <h4 style="color:var(--primary);margin:0 0 12px;font-size:12px;text-transform:uppercase;">HPP Sistem (DB)</h4>
                    <div class="form-group"><label>Pilih Item</label>
                        <select class="form-input" id="cmpItemSel"><option value="">-- Pilih item --</option>
                            ${hppData.items.map(r => `<option value="${r.acost}" data-plu="${r.plu}" data-nama="${r.nama_barang}" data-kat="${r.nama_kategori||'-'}">[${r.plu}] ${r.nama_barang}</option>`).join('')}
                        </select>
                    </div>
                    <div id="cmpDbCard" style="display:none;background:var(--card-bg);padding:12px;border-radius:8px;border:1px solid var(--primary);margin-top:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                            <div><div style="font-size:11px;color:var(--text-muted);font-family:monospace;" id="cmpDbPlu"></div><div style="font-weight:700;margin:4px 0;" id="cmpDbNama"></div><span class="badge" id="cmpDbKat"></span></div>
                            <div style="text-align:right;"><div style="font-size:11px;color:var(--text-muted);" id="cmpDbLabel">HPP / kg</div><div style="font-size:1.5rem;font-weight:800;color:var(--primary);" id="cmpDbAcost"></div></div>
                        </div>
                    </div>
                </div>
                <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
                    <h4 style="color:var(--warning);margin:0 0 12px;font-size:12px;text-transform:uppercase;">Harga Pasaran</h4>
                    <div class="form-group"><label>Satuan Harga Input</label><select class="form-input" id="cmpSatuan">${cmpUnits.map(u => `<option value="${u.id}">${u.label}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Harga Pasaran (Rp) *</label><input type="number" class="form-input" id="cmpHarga" placeholder="cth: 52000" style="font-size:1.1rem;font-weight:700;color:var(--warning);"></div>
                    <div class="form-group" style="margin:0;"><label>QTY Estimasi (kg) <span style="color:var(--text-muted);font-weight:400;">— opsional</span></label><input type="number" class="form-input" id="cmpQty" placeholder="cth: 100" min="0"></div>
                </div>
            </div>
            <div id="cmpResult" style="display:none;">
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
                    <div class="stat-card" style="border-top:3px solid var(--primary);text-align:center;display:flex;flex-direction:column;justify-content:center;"><div style="font-size:11px;color:var(--text-muted);">HPP Sistem / kg</div><div style="font-size:1.25rem;font-weight:800;color:var(--primary);" id="cmpSumHpp"></div></div>
                    <div class="stat-card" style="border-top:3px solid var(--warning);text-align:center;display:flex;flex-direction:column;justify-content:center;"><div style="font-size:11px;color:var(--text-muted);">Harga Pasaran / kg</div><div style="font-size:1.25rem;font-weight:800;color:var(--warning);" id="cmpSumPasar"></div></div>
                    <div class="stat-card" style="border-top:3px solid var(--success);text-align:center;display:flex;flex-direction:column;justify-content:center;"><div style="font-size:11px;color:var(--text-muted);">Margin / kg</div><div style="font-size:1.25rem;font-weight:800;" id="cmpSumMargin"></div><div style="font-size:12px;font-weight:600;" id="cmpSumPct"></div></div>
                </div>
                <h4 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-ruler-combined"></i> Breakdown per Satuan</h4>
                <table class="data-table" style="font-size:12px;"><thead><tr><th>Satuan</th><th style="text-align:right;">HPP Sistem</th><th style="text-align:right;">Harga Pasaran</th><th style="text-align:right;">Selisih</th><th style="text-align:right;">Margin %</th><th style="text-align:center;">Status</th></tr></thead><tbody id="cmpTableBody"></tbody></table>
                <div id="cmpTotalBox" style="display:none;margin-top:12px;"></div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn btn-primary btn-sm" id="cmpSendToSim" style="display:none;"><i class="fas fa-flask"></i> Tambah ke Sim. BB</button></div>
            <div id="cmpHint" style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-store" style="font-size:2rem;color:var(--border);display:block;margin-bottom:12px;"></i>Pilih item dan masukkan harga pasaran untuk melihat analisis margin.</div>`;
            const cmpRecalc = () => {
                const sel = document.getElementById('cmpItemSel');
                const acost = parseFloat(sel.value);
                if (!acost) { document.getElementById('cmpDbCard').style.display='none'; document.getElementById('cmpResult').style.display='none'; document.getElementById('cmpSendToSim').style.display='none'; document.getElementById('cmpHint').style.display='block'; return; }
                const opt = sel.options[sel.selectedIndex];
                document.getElementById('cmpDbPlu').textContent = opt.dataset.plu;
                document.getElementById('cmpDbNama').textContent = opt.dataset.nama;
                document.getElementById('cmpDbKat').textContent = opt.dataset.kat;
                document.getElementById('cmpDbAcost').textContent = fmtRp(acost);
                document.getElementById('cmpDbLabel').textContent = 'HPP / kg';
                document.getElementById('cmpDbCard').style.display='block';
                document.getElementById('cmpSendToSim').style.display='inline-flex';
                const satFactor = parseFloat(document.getElementById('cmpSatuan').value) || 1;
                const hargaInput = parseFloat(document.getElementById('cmpHarga').value) || 0;
                const qtyEst = parseFloat(document.getElementById('cmpQty')?.value) || 0;
                if (hargaInput > 0) {
                    document.getElementById('cmpResult').style.display='block'; document.getElementById('cmpHint').style.display='none';
                    const pasarKg = hargaInput / satFactor, hppKg = acost;
                    const marginKg = pasarKg - hppKg, pct = pasarKg>0?(marginKg/pasarKg)*100:0;
                    document.getElementById('cmpSumHpp').textContent = fmtRp(hppKg);
                    document.getElementById('cmpSumPasar').textContent = fmtRp(pasarKg);
                    const smE = document.getElementById('cmpSumMargin');
                    smE.textContent = fmtRp(marginKg); smE.style.color = marginKg<0?'var(--danger)':'var(--success)';
                    const spE = document.getElementById('cmpSumPct');
                    spE.textContent = pct.toFixed(2)+'%'; spE.style.color = marginKg<0?'var(--danger)':'var(--success)';
                    document.getElementById('cmpTableBody').innerHTML = cmpUnits.map(u => {
                        const hppU=hppKg*u.factor, pasarU=pasarKg*u.factor, selU=pasarU-hppU, pctU=pasarU>0?((selU/pasarU)*100):0;
                        const col=selU<0?'var(--danger)':'var(--success)';
                        const status=selU>0?'<span style="color:var(--success);"><i class="fas fa-check-circle"></i></span>':'<span style="color:var(--danger);"><i class="fas fa-times-circle"></i></span>';
                        return `<tr><td>${u.label}</td><td style="text-align:right;font-weight:600;">${fmtRp(hppU)}</td><td style="text-align:right;font-weight:600;">${fmtRp(pasarU)}</td><td style="text-align:right;color:${col};font-weight:700;">${fmtRp(selU)}</td><td style="text-align:right;color:${col};font-weight:700;">${pctU.toFixed(2)}%</td><td style="text-align:center;">${status}</td></tr>`;
                    }).join('');
                    const tBox = document.getElementById('cmpTotalBox');
                    if (qtyEst > 0) { tBox.style.display='block'; tBox.innerHTML=`<div class="form-card" style="padding:16px;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;border-radius:12px;"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;"><div><div style="font-size:11px;opacity:.6;">Total HPP</div><div style="font-size:1.1rem;font-weight:800;color:#93c5fd;">${fmtRp(hppKg*qtyEst)}</div></div><div><div style="font-size:11px;opacity:.6;">Total Pasaran</div><div style="font-size:1.1rem;font-weight:800;color:#fde68a;">${fmtRp(pasarKg*qtyEst)}</div></div><div><div style="font-size:11px;opacity:.6;">Total Margin</div><div style="font-size:1.1rem;font-weight:800;color:${marginKg<0?'#fca5a5':'#86efac'};">${fmtRp(marginKg*qtyEst)}</div></div></div></div>`; }
                    else { tBox.style.display='none'; }
                } else { document.getElementById('cmpResult').style.display='none'; document.getElementById('cmpHint').style.display='block'; }
            };
            document.getElementById('cmpItemSel').addEventListener('change', cmpRecalc);
            document.getElementById('cmpSatuan').addEventListener('change', cmpRecalc);
            document.getElementById('cmpHarga').addEventListener('input', cmpRecalc);
            document.getElementById('cmpQty')?.addEventListener('input', cmpRecalc);
            document.getElementById('cmpSendToSim').addEventListener('click', () => {
                const sel = document.getElementById('cmpItemSel'); const acost = parseFloat(sel.value);
                if (!acost) { showToast('Pilih item dulu.','warning'); return; }
                const opt = sel.options[sel.selectedIndex];
                const item = {plu:opt.dataset.plu, nama_barang:opt.dataset.nama, acost, kode_kategori:opt.dataset.kat, satuan:'kg', isNew:false};
                const pending = JSON.parse(sessionStorage.getItem('sim_pending_items')||'[]');
                if (pending.some(i => i.plu===item.plu)) { if (!confirm('"'+item.nama_barang+'" sudah ada di antrian Sim. BB. Tambah lagi?')) return; }
                pending.push(item); sessionStorage.setItem('sim_pending_items', JSON.stringify(pending));
                const btn = document.getElementById('cmpSendToSim'); const orig = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Ditambahkan!'; btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary');
                setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary'); }, 1500);
                showToast(`"${item.nama_barang}" ditambahkan ke antrian Sim. BB.`);
            });
        // ── TAB 3: SIM. BB ───────────────────────────────────────────────
        } else if (activeTab === 'sim') {
            if (!simItemsDB.length) { content.innerHTML = '<div class="empty-state"><h3>Tidak ada data item</h3><p>Pilih cabang dan periode untuk menampilkan item bahan baku.</p></div>'; return; }
            const availTypes = [...new Set(simItemsDB.map(i=>i.kode_kategori).filter(Boolean))].sort();
            content.innerHTML = `
            <div style="background:var(--bg-hover);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--text-muted);">
                <i class="fas fa-info-circle"></i> Bangun formula/resep produk. Hasil bisa diteruskan ke tab <strong>Simulasi Biaya</strong> → <strong>Harga Jual</strong>.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:20px;align-items:start;">
                <div class="form-card" style="padding:16px;">
                    <div style="font-size:12px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;"><i class="fas fa-database"></i> Pilih Item</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">
                        <button class="btn btn-sm sim-type-btn ${simActiveType==='ALL'?'btn-primary':'btn-outline'}" data-type="ALL">Semua</button>
                        ${availTypes.map(t => `<button class="btn btn-sm sim-type-btn ${simActiveType===t?'btn-primary':'btn-outline'}" data-type="${t}" title="${t}">${t}</button>`).join('')}
                    </div>
                    <div style="position:relative;margin-bottom:10px;"><i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none;"></i>
                        <input type="text" id="simSearch" placeholder="Cari PLU / nama..." style="width:100%;padding:6px 8px 6px 28px;border:1px solid var(--border);border-radius:8px;font-size:12px;box-sizing:border-box;font-family:Inter,sans-serif;">
                    </div>
                    <div id="simItemList" style="max-height:360px;overflow-y:auto;"></div>
                    <div style="border-top:1px dashed var(--border);margin-top:10px;padding-top:10px;">
                        <button class="btn btn-outline btn-sm" id="simNewItemBtn" style="width:100%;"><i class="fas fa-plus-circle"></i> Item Baru / Estimasi</button>
                        <div id="simNewItemForm" style="display:none;margin-top:10px;background:var(--bg-hover);border:1px solid var(--primary);border-radius:8px;padding:12px;">
                            <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;margin-bottom:8px;"><i class="fas fa-pen"></i> Input Item Baru</div>
                            <div class="form-group" style="margin-bottom:8px;"><label style="font-size:11px;">Nama Item *</label><input type="text" class="form-input" id="newItemNama" placeholder="cth: BERAS PREMIUM"></div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                                <div class="form-group" style="margin:0;"><label style="font-size:11px;">Tipe</label><select class="form-input" id="newItemTipe"><option value="RM">RM</option><option value="PM">PM</option><option value="IG">IG</option><option value="FG">FG</option><option value="ST">ST</option><option value="SP">SP</option><option value="EX">EX</option><option value="CO">CO</option><option value="WP">WP</option></select></div>
                                <div class="form-group" style="margin:0;"><label style="font-size:11px;">ACOST (Rp/kg) *</label><input type="number" class="form-input" id="newItemAcost" placeholder="18500" min="0"></div>
                            </div>
                            <div style="display:flex;gap:6px;justify-content:flex-end;">
                                <button class="btn btn-outline btn-sm" id="newItemCancel">Batal</button>
                                <button class="btn btn-primary btn-sm" id="newItemSave"><i class="fas fa-plus"></i> Tambah</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="form-card" style="padding:16px;margin-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                            <div style="font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;"><i class="fas fa-flask"></i> Formula / Resep</div>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <input type="text" id="simFormulaName" placeholder="Nama produk, cth: ONIGIRI TUNA" style="padding:4px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px;width:200px;font-family:Inter,sans-serif;">
                                <button class="btn btn-sm" id="simClearBtn" style="background:var(--danger);color:white;border:none;"><i class="fas fa-trash"></i> Clear</button>
                                <button class="btn btn-primary btn-sm" id="simSendToBiaya" style="display:none;"><i class="fas fa-arrow-right"></i> Kirim ke Biaya</button>
                            </div>
                        </div>
                        <div id="simFormulaEmpty" style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fas fa-flask" style="font-size:2rem;color:var(--border);display:block;margin-bottom:8px;"></i>Belum ada item. Klik item di panel kiri.</div>
                        <div id="simFormulaTable" style="display:none;overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;"><thead><tr><th>Item</th><th style="text-align:center;">Qty (kg)</th><th style="text-align:right;">HPP/kg</th><th style="text-align:right;color:var(--primary);">Subtotal</th><th style="width:32px;"></th></tr></thead>
                            <tbody id="simFormulaTbody"></tbody><tfoot id="simFormulaTfoot"></tfoot></table>
                        </div>
                    </div>
                    <div id="simSummary" style="display:none;">
                        <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;padding:16px 20px;color:white;">
                            <div style="font-size:11px;font-weight:700;text-transform:uppercase;opacity:.8;margin-bottom:12px;"><i class="fas fa-calculator"></i> Total HPP Bahan Baku <span id="simSumTitle" style="font-style:italic;opacity:.85;margin-left:4px;"></span></div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px;">
                                <div><div style="font-size:11px;opacity:.7;">Jumlah Item</div><div id="simSumItems" style="font-size:1.3rem;font-weight:800;"></div></div>
                                <div><div style="font-size:11px;opacity:.7;">Total Qty</div><div id="simSumQty" style="font-size:1.3rem;font-weight:800;"></div><div style="font-size:11px;opacity:.65;">kg</div></div>
                                <div><div style="font-size:11px;opacity:.7;">Total HPP BB</div><div id="simSumTotal" style="font-size:1.1rem;font-weight:800;"></div></div>
                            </div>
                            <div style="border-top:1px solid rgba(255,255,255,.25);padding-top:10px;"><div style="font-size:11px;opacity:.7;margin-bottom:6px;text-transform:uppercase;">Breakdown per Tipe</div><div id="simSumBreakdown" style="display:flex;flex-wrap:wrap;gap:4px;"></div></div>
                        </div>
                    </div>
                </div>
            </div>`;
            // Sim. BB logic
            function simRenderList() {
                const search = (document.getElementById('simSearch')?.value||'').toLowerCase();
                const filtered = simItemsDB.filter(item => {
                    if (simActiveType!=='ALL' && item.kode_kategori!==simActiveType) return false;
                    if (search && !(item.plu||'').toLowerCase().includes(search) && !(item.nama_barang||'').toLowerCase().includes(search)) return false;
                    return true;
                });
                const listEl = document.getElementById('simItemList');
                if (!filtered.length) { listEl.innerHTML='<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px;">Tidak ada item.</div>'; return; }
                listEl.innerHTML = filtered.map(item => {
                    const inF = !!simFormula[item.plu], col = SIM_TYPE_COLORS[item.kode_kategori]||'#6b7280', isNew = !!item.isNew;
                    return `<div class="sim-item-row" data-plu="${esc(item.plu)}" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:6px;cursor:pointer;margin-bottom:2px;border:1px solid ${inF?'var(--primary)':'transparent'};background:${inF?'var(--bg-hover)':isNew?'rgba(139,92,246,.05)':'transparent'};transition:all .15s;">
                        <div style="display:flex;align-items:center;gap:6px;min-width:0;"><span style="background:${col};color:white;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;">${item.kode_kategori||'?'}</span>
                            <div style="min-width:0;">${isNew?'<div style="font-size:10px;color:#7c3aed;font-weight:700;">✦ ESTIMASI</div>':'<div style="font-size:10px;color:var(--text-muted);font-family:monospace;">'+item.plu+'</div>'}
                            <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${item.nama_barang}</div></div>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;"><div style="text-align:right;"><div style="font-size:12px;font-weight:700;color:${isNew?'#7c3aed':'var(--primary)'};">${fmtRp(item.acost)}</div><div style="font-size:10px;color:var(--text-muted);">/kg</div></div>
                        ${inF?'<i class="fas fa-check-circle" style="color:var(--success);"></i>':'<i class="fas fa-plus-circle" style="color:var(--border);"></i>'}</div>
                    </div>`;
                }).join('');
                listEl.querySelectorAll('.sim-item-row').forEach(el => el.addEventListener('click', () => simToggleItem(el.dataset.plu)));
            }
            function simToggleItem(plu) {
                const item = simItemsDB.find(i => i.plu===plu); if (!item) return;
                if (simFormula[plu]) delete simFormula[plu]; else simFormula[plu] = {...item, qty:1};
                simRenderList(); simRenderFormula(); simRecalc();
            }
            function simRenderFormula() {
                const items = Object.values(simFormula);
                const emptyEl=document.getElementById('simFormulaEmpty'), tableEl=document.getElementById('simFormulaTable');
                const sendBtn=document.getElementById('simSendToBiaya');
                if (!items.length) { emptyEl.style.display='block'; tableEl.style.display='none'; document.getElementById('simSummary').style.display='none'; if(sendBtn)sendBtn.style.display='none'; return; }
                emptyEl.style.display='none'; tableEl.style.display='block'; document.getElementById('simSummary').style.display='block'; if(sendBtn)sendBtn.style.display='inline-flex';
                document.getElementById('simFormulaTbody').innerHTML = items.map(item => {
                    const col=SIM_TYPE_COLORS[item.kode_kategori]||'#6b7280', sub=item.acost*(item.qty||0), isNew=!!item.isNew;
                    return `<tr data-plu="${esc(item.plu)}" ${isNew?'style="background:rgba(139,92,246,.05);"':''}>
                        <td><span style="background:${col};color:white;padding:1px 4px;border-radius:3px;font-size:10px;font-weight:700;margin-right:4px;">${item.kode_kategori||'?'}</span>
                        ${isNew?'<span style="background:#ede9fe;color:#7c3aed;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:800;margin-right:3px;">EST</span>':'<span style="font-size:10px;color:var(--text-muted);font-family:monospace;margin-right:3px;">'+item.plu+'</span>'}
                        <span style="font-weight:600;font-size:12px;">${item.nama_barang}</span></td>
                        <td style="text-align:center;"><input type="number" class="form-input sim-qty-input" value="${item.qty}" min="0" step="0.001" style="width:80px;padding:3px 6px;text-align:center;font-size:12px;" data-plu="${esc(item.plu)}"></td>
                        <td style="text-align:right;font-weight:600;">${fmtRp(item.acost)}</td>
                        <td style="text-align:right;font-weight:700;color:var(--primary);">${fmtRp(sub)}</td>
                        <td><button class="btn-icon btn-icon-delete sim-remove-btn" data-plu="${esc(item.plu)}"><i class="fas fa-times"></i></button></td>
                    </tr>`;
                }).join('');
                simRenderTfoot();
                document.querySelectorAll('.sim-qty-input').forEach(el => el.addEventListener('input', () => { if(simFormula[el.dataset.plu]) { simFormula[el.dataset.plu].qty=parseFloat(el.value)||0; simRecalc(); simRenderTfoot(); } }));
                document.querySelectorAll('.sim-remove-btn').forEach(el => el.addEventListener('click', () => { delete simFormula[el.dataset.plu]; simRenderList(); simRenderFormula(); simRecalc(); }));
            }
            function simRenderTfoot() {
                const items=Object.values(simFormula);
                const totalHpp=items.reduce((s,i)=>s+i.acost*(i.qty||0),0), totalQty=items.reduce((s,i)=>s+(i.qty||0),0);
                document.getElementById('simFormulaTfoot').innerHTML = `<tr style="font-weight:700;background:var(--bg-hover);"><td><i class="fas fa-sigma" style="margin-right:4px;"></i>TOTAL</td><td style="text-align:center;">${fmtNum(totalQty,3)} kg</td><td></td><td style="text-align:right;font-size:13px;color:var(--primary);">${fmtRp(totalHpp)}</td><td></td></tr>`;
            }
            function simRecalc() {
                const items=Object.values(simFormula);
                const totalHpp=items.reduce((s,i)=>s+i.acost*(i.qty||0),0), totalQty=items.reduce((s,i)=>s+(i.qty||0),0);
                const name=document.getElementById('simFormulaName')?.value||'';
                if (!items.length) return;
                document.getElementById('simSumTitle').textContent = name ? `— ${name}` : '';
                document.getElementById('simSumItems').textContent = items.length+' item';
                document.getElementById('simSumQty').textContent = fmtNum(totalQty,3);
                document.getElementById('simSumTotal').textContent = fmtRp(totalHpp);
                const byType={}; items.forEach(i => { const t=i.kode_kategori||'?'; byType[t]=(byType[t]||0)+i.acost*(i.qty||0); });
                document.getElementById('simSumBreakdown').innerHTML = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([type,val]) => {
                    const pct=totalHpp>0?(val/totalHpp*100).toFixed(1):0, col=SIM_TYPE_COLORS[type]||'#6b7280';
                    return `<span style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;"><span style="background:${col};color:white;padding:0 4px;border-radius:3px;font-size:10px;margin-right:3px;">${type}</span>${fmtRp(val)} <span style="opacity:.75;">(${pct}%)</span></span>`;
                }).join('');
            }
            // Type filter
            document.querySelectorAll('.sim-type-btn').forEach(btn => btn.addEventListener('click', () => {
                simActiveType = btn.dataset.type;
                document.querySelectorAll('.sim-type-btn').forEach(b => { b.className = `btn btn-sm sim-type-btn ${b.dataset.type===simActiveType?'btn-primary':'btn-outline'}`; });
                simRenderList();
            }));
            document.getElementById('simSearch')?.addEventListener('input', simRenderList);
            document.getElementById('simFormulaName')?.addEventListener('input', simRecalc);
            document.getElementById('simClearBtn')?.addEventListener('click', () => { simFormula={}; const fn=document.getElementById('simFormulaName'); if(fn)fn.value=''; simRenderList(); simRenderFormula(); document.getElementById('simSummary').style.display='none'; });
            // New item form
            document.getElementById('simNewItemBtn')?.addEventListener('click', () => { const f=document.getElementById('simNewItemForm'); f.style.display=f.style.display==='none'?'block':'none'; });
            document.getElementById('newItemCancel')?.addEventListener('click', () => { document.getElementById('simNewItemForm').style.display='none'; });
            document.getElementById('newItemSave')?.addEventListener('click', () => {
                const nama=(document.getElementById('newItemNama')?.value||'').trim(), acost=parseFloat(document.getElementById('newItemAcost')?.value), tipe=document.getElementById('newItemTipe')?.value||'RM';
                if (!nama) { showToast('Nama item wajib diisi.','warning'); return; } if (!acost||acost<=0) { showToast('ACOST harus > 0.','warning'); return; }
                const plu = `__NEW_${++simNewItemUID}__`;
                const newItem = {plu, nama_barang:nama, satuan:'kg', acost, kode_kategori:tipe, nama_kategori:null, isNew:true};
                simItemsDB.push(newItem); simFormula[plu] = {...newItem, qty:1};
                document.getElementById('simNewItemForm').style.display='none'; document.getElementById('newItemNama').value=''; document.getElementById('newItemAcost').value='';
                simRenderList(); simRenderFormula(); simRecalc(); showToast(`"${nama}" ditambahkan ke formula.`);
            });
            // Load pending from Komparasi
            const pendingRaw = sessionStorage.getItem('sim_pending_items');
            if (pendingRaw) { try { const pending=JSON.parse(pendingRaw); sessionStorage.removeItem('sim_pending_items'); if(pending.length) { pending.forEach(item => { if(!item.plu||!item.acost)return; const exists=simItemsDB.some(i=>i.plu===item.plu); if(!exists)simItemsDB.push(item); if(!simFormula[item.plu])simFormula[item.plu]={...item,qty:1}; }); showToast(`${pending.length} item dari Komparasi ditambahkan ke formula.`); } } catch(e){sessionStorage.removeItem('sim_pending_items');} }
            // Send to Biaya
            document.getElementById('simSendToBiaya')?.addEventListener('click', () => {
                const items=Object.values(simFormula);
                const totalHpp=items.reduce((s,i)=>s+i.acost*(i.qty||0),0), totalQty=items.reduce((s,i)=>s+(i.qty||0),0);
                const name=document.getElementById('simFormulaName')?.value||'';
                if(totalHpp<=0){showToast('Tambahkan item ke formula dulu.','warning');return;}
                sessionStorage.setItem('sim_hpp_bb',totalHpp.toString()); sessionStorage.setItem('sim_qty',totalQty.toString()); sessionStorage.setItem('sim_nama',name);
                switchTab('biaya'); showToast('HPP Bahan Baku dikirim ke Sim. Biaya.');
            });
            simRenderList(); simRenderFormula(); if(Object.keys(simFormula).length) simRecalc();
        // ── TAB 4: SIM. BIAYA ──────────────────────────────────────────────
        } else if (activeTab === 'biaya') {
            function biayaSection(id,badge,color,title,fields) {
                return `<div class="form-card" style="padding:0;margin-bottom:12px;overflow:hidden;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;cursor:pointer;background:var(--bg-hover);" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.chev').classList.toggle('fa-chevron-up');">
                        <span><span style="background:${color};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:6px;">${badge}</span><span style="font-size:13px;font-weight:600;">${title}</span></span>
                        <i class="fas fa-chevron-down chev" style="font-size:11px;color:var(--text-muted);transition:transform .2s;"></i>
                    </div>
                    <div style="padding:12px 16px;">${fields}<div id="${id}Result" class="biaya-result-inline" style="display:none;margin-top:8px;padding:8px 12px;background:var(--bg-hover);border-radius:6px;font-size:12px;color:var(--text-muted);"></div></div>
                </div>`;
            }
            content.innerHTML = `
            <div style="background:var(--bg-hover);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--text-muted);">
                <i class="fas fa-info-circle"></i> Simulasi biaya pengiriman dan operasional. Isi <strong>HPP BB</strong> dari Tab 3 atau input manual.
            </div>
            <div class="form-card" style="padding:16px;margin-bottom:16px;">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:10px;"><i class="fas fa-box"></i> HPP Bahan Baku (Base)</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                    <div class="form-group" style="margin:0;"><label>Nama Produk</label><input type="text" class="form-input biaya-inp" id="biayaProdukNama" placeholder="cth: ONIGIRI TUNA"></div>
                    <div class="form-group" style="margin:0;"><label>HPP Bahan Baku (Rp/kg) *</label>
                        <div style="display:flex;gap:6px;"><input type="number" class="form-input biaya-inp" id="biayaHppBB" placeholder="0" min="0" style="flex:1;font-weight:700;"><button class="btn btn-outline btn-sm" id="biayaFromSim"><i class="fas fa-flask"></i> Dari Sim. BB</button></div>
                    </div>
                    <div class="form-group" style="margin:0;"><label>Total Qty Produksi (kg)</label><input type="number" class="form-input biaya-inp" id="biayaQtyProd" placeholder="cth: 500" min="0"></div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:20px;align-items:start;">
                <div>
                    ${biayaSection('bp','BP','#8b5cf6','Biaya Produksi',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group" style="margin:0;"><label style="font-size:11px;">% dari HPP BB</label><input type="number" class="form-input biaya-inp" id="bpPersen" placeholder="cth: 15" min="0"></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Atau Fixed (Rp/kg)</label><input type="number" class="form-input biaya-inp" id="bpFixed" placeholder="cth: 5000" min="0"></div></div>`)}
                    ${biayaSection('bkl','BKL','#3b82f6','Biaya Kirim → To Toko',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group" style="margin:0;"><label style="font-size:11px;">% dari HPP BB</label><input type="number" class="form-input biaya-inp" id="bklPersen" placeholder="cth: 8" min="0"></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Atau Fixed (Rp/kg)</label><input type="number" class="form-input biaya-inp" id="bklFixed" placeholder="cth: 2000" min="0"></div></div>`)}
                    ${biayaSection('dcf','DCF','#06b6d4','Biaya Kirim → To DCF',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group" style="margin:0;"><label style="font-size:11px;">Cross Docking (Rp/kg)</label><input type="number" class="form-input biaya-inp" id="dcfCross" placeholder="0" min="0"></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Cold Storage (Rp/kg)</label><input type="number" class="form-input biaya-inp" id="dcfCold" placeholder="0" min="0"></div></div>`)}
                    ${biayaSection('lp','LP','#f59e0b','Biaya Kirim → Luar Pulau',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;"><div class="form-group" style="margin:0;"><label style="font-size:11px;">Tipe Kontainer</label><select class="form-input biaya-inp" id="lpTipe"><option value="">-- Pilih --</option><option>CDE</option><option>CDO</option><option>JUMBO</option><option>TRONTON</option><option>BUILT UP</option></select></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Biaya/Kontainer (Rp)</label><input type="number" class="form-input biaya-inp" id="lpBiayaKtn" placeholder="cth: 15000000" min="0"></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Kapasitas (CTN)</label><input type="number" class="form-input biaya-inp" id="lpKapasitas" placeholder="cth: 200" min="1"></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Jumlah CTN</label><input type="number" class="form-input biaya-inp" id="lpJmlCtn" placeholder="cth: 150" min="1"></div></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Biaya Inap/Overnight (Rp)</label><input type="number" class="form-input biaya-inp" id="lpInap" placeholder="0" min="0"></div>`)}
                    ${biayaSection('md','MD','#10b981','Biaya Kirim → Multi Drop',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group" style="margin:0;"><label style="font-size:11px;">Tipe Ekspedisi</label><select class="form-input biaya-inp" id="mdTipe"><option value="loc">Mob Eks Ext → LOC/EH</option><option value="toko">Mob Eks Ext → To Toko</option></select></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Biaya Multi Drop (Rp/kg)</label><input type="number" class="form-input biaya-inp" id="mdBiaya" placeholder="0" min="0"></div></div>`)}
                    ${biayaSection('ho','HO','#6366f1','Cover Biaya Head Office',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group" style="margin:0;"><label style="font-size:11px;">% dari HPP BB</label><input type="number" class="form-input biaya-inp" id="hoPersen" placeholder="cth: 5" min="0"></div><div class="form-group" style="margin:0;"><label style="font-size:11px;">Atau Fixed (Rp/kg)</label><input type="number" class="form-input biaya-inp" id="hoFixed" placeholder="0" min="0"></div></div>`)}
                </div>
                <div>
                    <div style="position:sticky;top:80px;">
                        <div id="biayaRekapEmpty" style="background:var(--bg);border:2px dashed var(--border);border-radius:14px;padding:40px 24px;text-align:center;color:var(--text-muted);">
                            <i class="fas fa-truck-fast" style="font-size:2rem;color:var(--border);display:block;margin-bottom:12px;"></i>
                            <div style="font-size:13px;font-weight:600;margin-bottom:4px;">Rekap Biaya</div><div style="font-size:12px;">Isi HPP BB dan komponen biaya di sebelah kiri.</div>
                        </div>
                        <div id="biayaRekapCard" style="display:none;background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:14px;padding:20px;color:white;">
                            <div style="font-size:11px;font-weight:700;text-transform:uppercase;opacity:.7;margin-bottom:14px;"><i class="fas fa-receipt"></i> Rekap Biaya <span id="biayaRekapNama" style="opacity:.85;font-style:italic;margin-left:4px;"></span></div>
                            <div id="biayaRekapItems" style="margin-bottom:14px;"></div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                                <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px;"><div style="font-size:10px;opacity:.6;text-transform:uppercase;margin-bottom:3px;">HPP Bahan Baku</div><div id="biayaSumBB" style="font-size:1rem;font-weight:800;color:#93c5fd;"></div></div>
                                <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px;"><div style="font-size:10px;opacity:.6;text-transform:uppercase;margin-bottom:3px;">Total Biaya Ops</div><div id="biayaSumOps" style="font-size:1rem;font-weight:800;color:#fde68a;"></div></div>
                            </div>
                            <div style="background:rgba(59,130,246,.3);border:1px solid rgba(147,197,253,.4);border-radius:10px;padding:12px;text-align:center;margin-bottom:12px;">
                                <div style="font-size:10px;opacity:.7;text-transform:uppercase;margin-bottom:3px;">Grand Total HPP per kg</div>
                                <div id="biayaGrandTotal" style="font-size:1.6rem;font-weight:900;"></div>
                                <div id="biayaGrandTotalPct" style="font-size:11px;opacity:.6;margin-top:3px;"></div>
                            </div>
                            <div id="biayaTotalProd" style="display:none;background:rgba(255,255,255,.06);border-radius:8px;padding:10px;margin-bottom:12px;">
                                <div style="font-size:10px;opacity:.6;text-transform:uppercase;margin-bottom:3px;">Total Biaya untuk <span id="biayaQtyLabel"></span> kg</div>
                                <div id="biayaTotalNominal" style="font-size:1rem;font-weight:800;color:#86efac;"></div>
                            </div>
                            <button class="btn btn-sm" id="biayaSendToHarga" style="width:100%;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;padding:8px;font-weight:700;"><i class="fas fa-tags"></i> Hitung Harga Jual</button>
                        </div>
                    </div>
                </div>
            </div>`;
            const gv = id => parseFloat(document.getElementById(id)?.value)||0;
            function biayaRecalcAll() {
                const hppBB=gv('biayaHppBB'), qty=gv('biayaQtyProd');
                if (hppBB<=0) { document.getElementById('biayaRekapEmpty').style.display='block'; document.getElementById('biayaRekapCard').style.display='none'; return; }
                const sections=[];
                // BP
                const bpP=gv('bpPersen'),bpF=gv('bpFixed'),bpV=bpP>0?hppBB*bpP/100:bpF;
                const bpR=document.getElementById('bpResult'); if(bpV>0){bpR.style.display='block';bpR.innerHTML=`<i class="fas fa-equals"></i> BP = <strong>${fmtRp(bpV)}/kg</strong>${bpP>0?' ('+bpP+'% dari HPP BB)':''}`; sections.push({label:'Biaya Produksi',badge:'BP',color:'#8b5cf6',val:bpV});} else bpR.style.display='none';
                // BKL
                const bklP=gv('bklPersen'),bklF=gv('bklFixed'),bklV=bklP>0?hppBB*bklP/100:bklF;
                const bklR=document.getElementById('bklResult'); if(bklV>0){bklR.style.display='block';bklR.innerHTML=`<i class="fas fa-equals"></i> BKL = <strong>${fmtRp(bklV)}/kg</strong>${bklP>0?' ('+bklP+'%)':''}`; sections.push({label:'Kirim → To Toko',badge:'BKL',color:'#3b82f6',val:bklV});} else bklR.style.display='none';
                // DCF
                const dcfC=gv('dcfCross'),dcfCo=gv('dcfCold'),dcfV=dcfC+dcfCo;
                const dcfR=document.getElementById('dcfResult'); if(dcfV>0){dcfR.style.display='block';dcfR.innerHTML=`<i class="fas fa-equals"></i> DCF = <strong>${fmtRp(dcfV)}/kg</strong> <span style="font-size:11px;opacity:.8;">(Cross ${fmtRp(dcfC)} + Cold ${fmtRp(dcfCo)})</span>`; sections.push({label:'Kirim → DCF',badge:'DCF',color:'#06b6d4',val:dcfV});} else dcfR.style.display='none';
                // LP
                let lpV=0,lpDesc=''; const lpBK=gv('lpBiayaKtn'),lpK=gv('lpKapasitas'),lpJ=gv('lpJmlCtn'),lpI=gv('lpInap'),lpT=document.getElementById('lpTipe')?.value||'';
                if(lpBK>0&&lpK>0){const bpk=lpBK/lpK,ipk=(lpI>0&&qty>0)?lpI/qty:0;lpV=bpk+ipk;lpDesc=`${lpT?lpT+': ':''}${fmtRp(lpBK)}/ktn ÷ ${lpK} = ${fmtRp(bpk)}/kg`; if(ipk>0)lpDesc+=` + Inap ${fmtRp(ipk)}/kg`;}
                const lpR=document.getElementById('lpResult'); if(lpV>0){lpR.style.display='block';lpR.innerHTML=`<i class="fas fa-equals"></i> LP = <strong>${fmtRp(lpV)}/kg</strong><br><span style="font-size:11px;opacity:.8;">${lpDesc}</span>`; sections.push({label:'Kirim → Luar Pulau',badge:'LP',color:'#f59e0b',val:lpV});} else lpR.style.display='none';
                // MD
                const mdB=gv('mdBiaya'),mdT=document.getElementById('mdTipe')?.options[document.getElementById('mdTipe')?.selectedIndex]?.text||'';
                const mdR=document.getElementById('mdResult'); if(mdB>0){mdR.style.display='block';mdR.innerHTML=`<i class="fas fa-equals"></i> MD = <strong>${fmtRp(mdB)}/kg</strong> <span style="font-size:11px;opacity:.8;">(${mdT})</span>`; sections.push({label:'Multi Drop',badge:'MD',color:'#10b981',val:mdB});} else mdR.style.display='none';
                // HO
                const hoP=gv('hoPersen'),hoF=gv('hoFixed'),hoV=hoP>0?hppBB*hoP/100:hoF;
                const hoR=document.getElementById('hoResult'); if(hoV>0){hoR.style.display='block';hoR.innerHTML=`<i class="fas fa-equals"></i> HO = <strong>${fmtRp(hoV)}/kg</strong>${hoP>0?' ('+hoP+'%)':''}`; sections.push({label:'Cover HO',badge:'HO',color:'#6366f1',val:hoV});} else hoR.style.display='none';
                // Rekap
                const totalOps=sections.reduce((s,x)=>s+x.val,0), grand=hppBB+totalOps, nama=document.getElementById('biayaProdukNama')?.value||'';
                document.getElementById('biayaRekapEmpty').style.display='none'; document.getElementById('biayaRekapCard').style.display='block';
                document.getElementById('biayaRekapNama').textContent=nama?`— ${nama}`:'';
                document.getElementById('biayaSumBB').textContent=fmtRp(hppBB); document.getElementById('biayaSumOps').textContent=fmtRp(totalOps);
                document.getElementById('biayaGrandTotal').textContent=fmtRp(grand);
                document.getElementById('biayaGrandTotalPct').textContent=`+${fmtNum(totalOps/hppBB*100,1)}% overhead dari HPP BB`;
                document.getElementById('biayaRekapItems').innerHTML=`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:12px;"><span style="opacity:.6;">HPP Bahan Baku</span><span style="color:#93c5fd;font-weight:700;">${fmtRp(hppBB)}</span></div>`+sections.map(s=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:12px;"><span><span style="background:${s.color};color:white;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:700;margin-right:4px;">${s.badge}</span>${s.label}</span><span style="font-weight:700;color:#fde68a;">${fmtRp(s.val)}</span></div>`).join('');
                const totProd=document.getElementById('biayaTotalProd');
                if(qty>0){totProd.style.display='block';document.getElementById('biayaQtyLabel').textContent=fmtNum(qty,2);document.getElementById('biayaTotalNominal').textContent=fmtRp(grand*qty);}else totProd.style.display='none';
                sessionStorage.setItem('biaya_grand_total',grand.toString()); sessionStorage.setItem('biaya_nama',nama);
            }
            document.querySelectorAll('.biaya-inp').forEach(el => el.addEventListener('input', biayaRecalcAll));
            document.querySelectorAll('.biaya-inp').forEach(el => el.addEventListener('change', biayaRecalcAll));
            document.getElementById('biayaFromSim')?.addEventListener('click', () => {
                const hpp=sessionStorage.getItem('sim_hpp_bb'),qty=sessionStorage.getItem('sim_qty'),nama=sessionStorage.getItem('sim_nama');
                if(hpp){document.getElementById('biayaHppBB').value=parseFloat(hpp).toFixed(2); if(qty)document.getElementById('biayaQtyProd').value=parseFloat(qty).toFixed(3); if(nama)document.getElementById('biayaProdukNama').value=nama; biayaRecalcAll(); showToast('HPP BB diambil dari Sim. BB.');} else showToast('Belum ada data dari Sim. BB.','warning');
            });
            // Auto-load
            const autoHpp=sessionStorage.getItem('sim_hpp_bb');
            if(autoHpp&&!document.getElementById('biayaHppBB').value){document.getElementById('biayaHppBB').value=parseFloat(autoHpp).toFixed(2);const aq=sessionStorage.getItem('sim_qty'),an=sessionStorage.getItem('sim_nama');if(aq)document.getElementById('biayaQtyProd').value=parseFloat(aq).toFixed(3);if(an)document.getElementById('biayaProdukNama').value=an;biayaRecalcAll();}
            document.getElementById('biayaSendToHarga')?.addEventListener('click', () => { switchTab('harga'); showToast('Grand Total HPP dikirim ke Harga Jual.'); });
        // ── TAB 5: HARGA JUAL ──────────────────────────────────────────────
        } else if (activeTab === 'harga') {
            const HJ_CATS = [
                {name:'ONIGIRI',ck:20,idm:0},{name:'BENTO CHILLED',ck:20,idm:0},{name:'DAILY DESSERT',ck:20,idm:0},
                {name:'FILLED BREAD',ck:20,idm:0},{name:'FRESH CAKE',ck:20,idm:0},{name:'PASTA & NOODLE',ck:20,idm:0},
                {name:'FROZEN MEAL',ck:20,idm:0},{name:'FRIED FOOD',ck:20,idm:0},{name:'GRILLED FOOD',ck:20,idm:0},
                {name:'STEAMED FOOD',ck:25,idm:25},{name:'SOUP',ck:20,idm:0},{name:'SUPPORTING MATERIAL',ck:15,idm:0},
                {name:'OTHERS',ck:15,idm:0}
            ];
            const hjSafe = c => c.toLowerCase().replace(/ /g,'_').replace(/&/g,'');
            content.innerHTML = `
            <div style="background:var(--bg-hover);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--text-muted);">
                <i class="fas fa-info-circle"></i> Tentukan harga jual berdasarkan Grand Total HPP + target margin per kategori produk.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:20px;align-items:start;">
                <div>
                    <div class="form-card" style="padding:16px;margin-bottom:12px;">
                        <div style="font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:10px;"><i class="fas fa-calculator"></i> Base HPP</div>
                        <div class="form-group" style="margin-bottom:8px;"><label>Nama Produk</label><input type="text" class="form-input" id="hjNamaProduk" placeholder="cth: ONIGIRI TUNA"></div>
                        <div class="form-group" style="margin:0;"><label>Grand Total HPP (Rp/kg) *</label>
                            <div style="display:flex;gap:6px;"><input type="number" class="form-input" id="hjHpp" placeholder="0" min="0" style="flex:1;font-weight:700;"><button class="btn btn-outline btn-sm" id="hjFromBiaya"><i class="fas fa-truck-fast"></i> Dari Sim. Biaya</button></div>
                        </div>
                    </div>
                    <div class="form-card" style="padding:16px;">
                        <div style="font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:8px;"><i class="fas fa-percent"></i> Target Margin per Kategori</div>
                        <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">Set margin untuk <strong>CK → Toko</strong> dan <strong>IDM → Konsumen</strong>.</p>
                        <table class="data-table" style="font-size:11px;"><thead><tr><th>Kategori</th><th style="text-align:center;">% CK→Toko</th><th style="text-align:center;">% IDM→Kons</th></tr></thead>
                        <tbody>${HJ_CATS.map(c => {const sid=hjSafe(c.name);return `<tr><td style="font-weight:600;white-space:nowrap;">${c.name}</td><td style="text-align:center;padding:3px;"><input type="number" class="form-input hj-inp" id="hjCK_${sid}" value="${c.ck}" min="0" step="0.1" style="width:60px;padding:2px 4px;text-align:center;font-size:11px;"></td><td style="text-align:center;padding:3px;"><input type="number" class="form-input hj-inp" id="hjIDM_${sid}" value="${c.idm}" min="0" step="0.1" style="width:60px;padding:2px 4px;text-align:center;font-size:11px;"></td></tr>`;}).join('')}
                        </tbody></table>
                    </div>
                </div>
                <div>
                    <div id="hjResultEmpty" style="background:var(--bg);border:2px dashed var(--border);border-radius:14px;padding:40px 24px;text-align:center;color:var(--text-muted);">
                        <i class="fas fa-tags" style="font-size:2rem;color:var(--border);display:block;margin-bottom:12px;"></i>
                        <div style="font-size:13px;font-weight:600;margin-bottom:4px;">Tabel Harga Jual</div><div style="font-size:12px;">Isi Grand Total HPP untuk melihat rekomendasi harga.</div>
                    </div>
                    <div id="hjResultCard" style="display:none;">
                        <div style="background:linear-gradient(135deg,#6d28d9,#a855f7);border-radius:14px;padding:16px 20px;color:white;margin-bottom:12px;">
                            <div style="font-size:11px;opacity:.75;text-transform:uppercase;margin-bottom:10px;"><i class="fas fa-tags"></i> Rekomendasi Harga Jual <span id="hjResultNama" style="font-style:italic;opacity:.9;margin-left:4px;"></span></div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                                <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:10px;"><div style="font-size:10px;opacity:.65;">Grand Total HPP</div><div id="hjSumHpp" style="font-size:1.1rem;font-weight:800;color:#e9d5ff;"></div><div style="font-size:10px;opacity:.55;">/kg</div></div>
                                <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:10px;"><div style="font-size:10px;opacity:.65;">Harga CK → Toko</div><div id="hjSumCK" style="font-size:1.1rem;font-weight:800;color:#fde68a;"></div></div>
                                <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:10px;"><div style="font-size:10px;opacity:.65;">Harga IDM → Konsumen</div><div id="hjSumIDM" style="font-size:1.1rem;font-weight:800;color:#bbf7d0;"></div></div>
                            </div>
                        </div>
                        <div class="form-card" style="padding:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                                <h4 style="margin:0;font-size:13px;"><i class="fas fa-table-list"></i> Detail per Kategori</h4>
                                <button class="btn btn-outline btn-sm" id="hjExportBtn"><i class="fas fa-download"></i> CSV</button>
                            </div>
                            <div style="overflow-x:auto;"><table class="data-table" style="font-size:11px;" id="hjTable"><thead><tr>
                                <th>Kategori Produk</th><th style="text-align:right;">HPP Base</th>
                                <th style="text-align:center;color:var(--primary);">% CK→Toko</th><th style="text-align:right;color:var(--primary);">Harga CK</th>
                                <th style="text-align:center;color:#ec4899;">% IDM→Kons</th><th style="text-align:right;color:#ec4899;">Harga IDM</th>
                            </tr></thead><tbody id="hjTableBody"></tbody></table></div>
                        </div>
                    </div>
                </div>
            </div>`;
            function hjRecalc() {
                const hppTotal = parseFloat(document.getElementById('hjHpp')?.value)||0;
                const nama = document.getElementById('hjNamaProduk')?.value||'';
                if (hppTotal<=0) { document.getElementById('hjResultEmpty').style.display='block'; document.getElementById('hjResultCard').style.display='none'; return; }
                document.getElementById('hjResultEmpty').style.display='none'; document.getElementById('hjResultCard').style.display='block';
                document.getElementById('hjSumHpp').textContent = fmtRp(hppTotal);
                document.getElementById('hjResultNama').textContent = nama ? `— ${nama}` : '';
                const ck0 = parseFloat(document.getElementById('hjCK_'+hjSafe(HJ_CATS[0].name))?.value)||0;
                const idm0 = parseFloat(document.getElementById('hjIDM_'+hjSafe(HJ_CATS[0].name))?.value)||0;
                document.getElementById('hjSumCK').textContent = fmtRp(hppTotal*(1+ck0/100))+'/kg';
                document.getElementById('hjSumIDM').textContent = idm0>0 ? fmtRp(hppTotal*(1+idm0/100))+'/kg' : '—';
                document.getElementById('hjTableBody').innerHTML = HJ_CATS.map(cat => {
                    const sid=hjSafe(cat.name);
                    const ckPct=parseFloat(document.getElementById('hjCK_'+sid)?.value)||0;
                    const idmPct=parseFloat(document.getElementById('hjIDM_'+sid)?.value)||0;
                    const hjCK=hppTotal*(1+ckPct/100), hjIDM=hppTotal*(1+idmPct/100);
                    return `<tr><td style="font-weight:600;">${cat.name}</td><td style="text-align:right;">${fmtRp(hppTotal)}</td>
                        <td style="text-align:center;color:var(--primary);font-weight:700;">${ckPct>0?'+'+fmtNum(ckPct,1)+'%':'—'}</td>
                        <td style="text-align:right;font-weight:800;color:var(--primary);">${ckPct>0?fmtRp(hjCK):'—'}</td>
                        <td style="text-align:center;color:#ec4899;font-weight:700;">${idmPct>0?'+'+fmtNum(idmPct,1)+'%':'—'}</td>
                        <td style="text-align:right;font-weight:800;color:#ec4899;">${idmPct>0?fmtRp(hjIDM):'—'}</td></tr>`;
                }).join('');
            }
            document.getElementById('hjHpp')?.addEventListener('input', hjRecalc);
            document.getElementById('hjNamaProduk')?.addEventListener('input', hjRecalc);
            document.querySelectorAll('.hj-inp').forEach(el => el.addEventListener('input', hjRecalc));
            document.getElementById('hjExportBtn')?.addEventListener('click', () => exportTableCSV('hjTable','harga_jual'));
            document.getElementById('hjFromBiaya')?.addEventListener('click', () => {
                const grand=sessionStorage.getItem('biaya_grand_total'), nama=sessionStorage.getItem('biaya_nama');
                if(grand){document.getElementById('hjHpp').value=parseFloat(grand).toFixed(2); if(nama)document.getElementById('hjNamaProduk').value=nama; hjRecalc(); showToast('Grand Total HPP diambil dari Sim. Biaya.');}
                else showToast('Belum ada data dari Sim. Biaya.','warning');
            });
            // Auto-load
            const autoGrand=sessionStorage.getItem('biaya_grand_total');
            if(autoGrand&&!document.getElementById('hjHpp').value){document.getElementById('hjHpp').value=parseFloat(autoGrand).toFixed(2);const an=sessionStorage.getItem('biaya_nama');if(an)document.getElementById('hjNamaProduk').value=an;hjRecalc();}
        }
    }
    loadCab();
}
