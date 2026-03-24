// page-lpp.js — LPP System (Dashboard, Detail, Comparison, Analisis, Upload)
// ═══════════════════════════════════════════
// Component: LPP — DASHBOARD
// ═══════════════════════════════════════════
function renderLppDashboard() {
    return `
    <div class="page-header"><div><h1><i class="fas fa-warehouse"></i> LPP Dashboard</h1><p>Laporan Posisi Persediaan Multi-Cabang</p></div>
        <div class="page-header-actions" style="display:flex;gap:8px;">
            <a href="#/lpp/analisis" class="btn btn-outline"><i class="fas fa-chart-line"></i> Analisis</a>
            <a href="#/lpp/detail" class="btn btn-outline"><i class="fas fa-list"></i> Detail</a>
            <a href="#/lpp/comparison" class="btn btn-outline"><i class="fas fa-balance-scale"></i> Compare</a>
            <a href="#/lpp/upload" class="btn btn-primary"><i class="fas fa-upload"></i> Upload</a>
        </div>
    </div>
    <div class="filter-section" style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:end;">
        <div class="form-group" style="margin:0;min-width:180px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;"><i class="fas fa-building"></i> Cabang</label><select class="form-input" id="lppCabang" style="padding:8px 12px;"></select></div>
        <div class="form-group" style="margin:0;min-width:180px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;"><i class="fas fa-filter"></i> BOPBTK</label><select class="form-input" id="lppBopbtk" style="padding:8px 12px;"><option value="">Semua</option><option value="Sebelum BOPBTK">Sebelum BOPBTK</option><option value="Sesudah BOPBTK">Sesudah BOPBTK</option></select></div>
        <div class="form-group" style="margin:0;min-width:220px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;"><i class="fas fa-calendar"></i> Periode</label><select class="form-input" id="lppPeriode" style="padding:8px 12px;"></select></div>
        <button class="btn btn-primary" id="lppLoadBtn" style="height:38px;"><i class="fas fa-sync"></i> Load</button>
    </div>
    <div id="lppContent"><div class="empty-state"><div class="empty-illustration"><i class="fas fa-warehouse"></i></div><h3>Pilih cabang & periode</h3><p>Data dashboard akan muncul setelah memilih filter</p></div></div>`;
}

function bindLppDashboard() {
    const cabSel = document.getElementById('lppCabang'), bopSel = document.getElementById('lppBopbtk'), perSel = document.getElementById('lppPeriode');
    async function loadCab() { try { const {data}=await API.lppCabangList(); cabSel.innerHTML=data.map(c=>`<option value="${c.id}">${esc(c.nama_cabang)} (${esc(c.kode_cabang)})</option>`).join(''); if(data.length)loadPer(); } catch(e){showToast(e.message,'danger');} }
    async function loadPer() { try { const {data}=await API.lppPeriodeList(cabSel.value,bopSel.value); perSel.innerHTML=data.length?data.map(p=>`<option value="${p.id}">${p.periode_start} s/d ${p.periode_end} (${esc(p.bopbtk_periode||'')})</option>`).join(''):'<option value="">Tidak ada periode</option>'; } catch(e){showToast(e.message,'danger');} }
    cabSel.addEventListener('change',loadPer); bopSel.addEventListener('change',loadPer);
    document.getElementById('lppLoadBtn').addEventListener('click', loadDash);
    async function loadDash() {
        const pId=perSel.value; if(!pId){showToast('Pilih periode','warning');return;}
        const content=document.getElementById('lppContent');
        content.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i> Memuat data...</p>';
        try {
            const res=await API.lppDashboard(pId); const s=res.summary,n=res.nkl,tk=res.top_kategori;
            if(!s){content.innerHTML='<div class="empty-state"><h3>Tidak ada data</h3></div>';return;}
            const fmtRp=v=>'Rp '+Number(v||0).toLocaleString('id-ID');
            content.innerHTML=`
            <div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
                ${[{icon:'fa-box',color:'#667eea,#764ba2',label:'Total Item',val:Number(s.total_sku||0).toLocaleString()},{icon:'fa-sack-dollar',color:'#10b981,#059669',label:'Saldo Awal',val:fmtRp(s.total_saldo_awal)},{icon:'fa-cart-shopping',color:'#3b82f6,#1d4ed8',label:'Total Sales',val:fmtRp(s.total_sales)},{icon:'fa-inbox',color:'#f59e0b,#d97706',label:'Penerimaan',val:fmtRp(s.total_penerimaan)},{icon:'fa-arrow-trend-down',color:'#ef4444,#dc2626',label:'Total NKL',val:fmtRp(n?.total_nkl)},{icon:'fa-building-columns',color:'#8b5cf6,#6d28d9',label:'Saldo Akhir',val:fmtRp(s.total_saldo_akhir)}].map(c=>`<div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,${c.color});"><i class="fas ${c.icon}"></i></div><div class="stat-info"><span class="stat-label">${c.label}</span><span class="stat-value" style="font-size:${c.val.length>15?'0.85rem':'1.1rem'};">${c.val}</span></div></div>`).join('')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
                <div class="form-card" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-chart-pie"></i> NKL Breakdown</h3><div style="height:220px;"><canvas id="lppNklChart"></canvas></div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
                        ${[{c:'#f87171',l:'Retur',v:n?.total_retur},{c:'#fbbf24',l:'Rusak',v:n?.total_rusak},{c:'#60a5fa',l:'Lain-lain',v:n?.total_lainlain},{c:'#a78bfa',l:'NKL',v:n?.total_nkl}].map(x=>`<div style="display:flex;align-items:center;gap:4px;font-size:11px;"><span style="width:10px;height:10px;border-radius:50%;background:${x.c};display:inline-block;"></span>${x.l}: <strong>${fmtRp(x.v)}</strong></div>`).join('')}
                    </div>
                </div>
                <div class="form-card" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-trophy"></i> Top Kategori</h3><div style="height:220px;"><canvas id="lppTopKatChart"></canvas></div></div>
            </div>
            <div class="form-card" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-arrow-trend-up"></i> Saldo Awal vs Akhir</h3><div style="height:250px;"><canvas id="lppSaldoChart"></canvas></div></div>`;
            const fmtTip=ctx=>{const v=ctx.parsed?.y??ctx.parsed?.x??ctx.parsed;return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(v);};
            new Chart(document.getElementById('lppNklChart'),{type:'doughnut',data:{labels:['Retur','Rusak','Lain-lain','NKL'],datasets:[{data:[Math.abs(n?.total_retur||0),Math.abs(n?.total_rusak||0),Math.abs(n?.total_lainlain||0),Math.abs(n?.total_nkl||0)],backgroundColor:['#f87171','#fbbf24','#60a5fa','#a78bfa'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.label+': '+fmtTip(ctx)}}}}});
            if(tk.length) new Chart(document.getElementById('lppTopKatChart'),{type:'bar',data:{labels:tk.map(k=>k.nama_kategori),datasets:[{data:tk.map(k=>parseFloat(k.total_saldo_akhir)),backgroundColor:['#667eea','#764ba2','#f093fb','#f5576c','#4facfe','#00f2fe','#43e97b','#fa709a','#fee140','#30cfd0'],borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>fmtTip(ctx)}}},scales:{x:{ticks:{callback:v=>{if(v>=1e9)return(v/1e9).toFixed(1)+'B';if(v>=1e6)return(v/1e6).toFixed(1)+'M';if(v>=1e3)return(v/1e3).toFixed(0)+'K';return v;},font:{family:'Inter'}},grid:{color:'rgba(0,0,0,0.05)'}},y:{ticks:{font:{family:'Inter',size:11}},grid:{display:false}}}}});
            if(tk.length) new Chart(document.getElementById('lppSaldoChart'),{type:'bar',data:{labels:tk.map(k=>k.nama_kategori),datasets:[{label:'Saldo Awal',data:tk.map(k=>parseFloat(k.total_saldo_awal)),backgroundColor:'rgba(102,126,234,0.7)',borderRadius:4},{label:'Saldo Akhir',data:tk.map(k=>parseFloat(k.total_saldo_akhir)),backgroundColor:'rgba(139,92,246,0.7)',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{family:'Inter',weight:'600'},usePointStyle:true}},tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+fmtTip(ctx)}}},scales:{y:{ticks:{callback:v=>{if(v>=1e9)return(v/1e9).toFixed(1)+'B';if(v>=1e6)return(v/1e6).toFixed(1)+'M';if(v>=1e3)return(v/1e3).toFixed(0)+'K';return v;},font:{family:'Inter'}},grid:{color:'rgba(0,0,0,0.05)'}},x:{ticks:{font:{family:'Inter',size:10}},grid:{display:false}}}}});
        } catch(e){content.innerHTML=`<p style="color:var(--danger);text-align:center;padding:40px;">${esc(e.message)}</p>`;}
    }
    loadCab();
}

// ═══════════════════════════════════════════
// Component: LPP — DETAIL
// ═══════════════════════════════════════════
function renderLppDetail() {
    return `
    <div class="page-header"><div><h1><i class="fas fa-list"></i> Detail Inventory</h1><p>Item inventory per periode</p></div>
        <div class="page-header-actions"><a href="#/lpp" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Dashboard</a></div></div>
    <div class="filter-section" style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:end;">
        <div class="form-group" style="margin:0;min-width:160px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;">Cabang</label><select class="form-input" id="lppDtCabang"></select></div>
        <div class="form-group" style="margin:0;min-width:140px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;">BOPBTK</label><select class="form-input" id="lppDtBopbtk"><option value="">Semua</option><option value="Sebelum BOPBTK">Sebelum</option><option value="Sesudah BOPBTK">Sesudah</option></select></div>
        <div class="form-group" style="margin:0;min-width:200px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;">Periode</label><select class="form-input" id="lppDtPeriode"></select></div>
        <div class="form-group" style="margin:0;min-width:200px;"><label style="font-size:12px;color:var(--text-muted);margin-bottom:4px;display:block;">Search</label><input type="text" class="form-input" id="lppDtSearch" placeholder="PLU / Nama barang..."></div>
        <button class="btn btn-primary" id="lppDtLoadBtn" style="height:38px;"><i class="fas fa-search"></i></button>
    </div>
    <div id="lppDtContent"></div>`;
}

function bindLppDetail() {
    const cab=document.getElementById('lppDtCabang'),bop=document.getElementById('lppDtBopbtk'),per=document.getElementById('lppDtPeriode'),search=document.getElementById('lppDtSearch');
    let currentPage=1;
    async function loadCab(){const{data}=await API.lppCabangList();cab.innerHTML=data.map(c=>`<option value="${c.id}">${esc(c.nama_cabang)}</option>`).join('');if(data.length)loadPer();}
    async function loadPer(){const{data}=await API.lppPeriodeList(cab.value,bop.value);per.innerHTML=data.map(p=>`<option value="${p.id}">${p.periode_start} s/d ${p.periode_end}</option>`).join('');}
    cab.addEventListener('change',loadPer); bop.addEventListener('change',loadPer);
    document.getElementById('lppDtLoadBtn').addEventListener('click',()=>{currentPage=1;loadData();});
    search.addEventListener('keydown',e=>{if(e.key==='Enter'){currentPage=1;loadData();}});
    async function loadData(){
        const content=document.getElementById('lppDtContent');
        content.innerHTML='<p style="text-align:center;padding:20px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i></p>';
        try {
            const res=await API.lppDetail(per.value,search.value,currentPage);
            if(!res.items.length){content.innerHTML='<div class="empty-state"><h3>Tidak ada data</h3></div>';return;}
            const fmtN=v=>Number(v||0).toLocaleString('id-ID',{minimumFractionDigits:2});
            content.innerHTML=`<div style="overflow-x:auto;"><table class="data-table" style="font-size:12px;"><thead><tr><th>No</th><th>PLU</th><th>Nama Barang</th><th>Kategori</th><th>Satuan</th><th style="text-align:right;">ACOST</th><th style="text-align:right;">Saldo Awal</th><th style="text-align:right;">Sales Qty</th><th style="text-align:right;">Sales Value</th><th style="text-align:right;">Saldo Akhir</th></tr></thead>
            <tbody>${res.items.map((r,i)=>`<tr><td>${(currentPage-1)*20+i+1}</td><td style="font-family:monospace;">${esc(r.plu)}</td><td>${esc(r.nama_barang)}</td><td><span class="badge">${esc(r.nama_kategori||'-')}</span></td><td>${esc(r.satuan||'-')}</td><td style="text-align:right;">${fmtN(r.acost)}</td><td style="text-align:right;">${fmtN(r.saldo_awal_value)}</td><td style="text-align:right;">${fmtN(r.pengeluaran_sales_qty)}</td><td style="text-align:right;">${fmtN(r.pengeluaran_sales_value)}</td><td style="text-align:right;font-weight:600;">${fmtN(r.saldo_akhir_value)}</td></tr>`).join('')}</tbody></table></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:13px;color:var(--text-muted);">
                <span>${res.total} items — Page ${res.page}/${res.pages}</span>
                <div style="display:flex;gap:8px;">${res.page>1?`<button class="btn btn-outline btn-sm" id="lppDtPrev"><i class="fas fa-chevron-left"></i></button>`:''}${res.page<res.pages?`<button class="btn btn-outline btn-sm" id="lppDtNext"><i class="fas fa-chevron-right"></i></button>`:''}</div>
            </div>`;
            document.getElementById('lppDtPrev')?.addEventListener('click',()=>{currentPage--;loadData();});
            document.getElementById('lppDtNext')?.addEventListener('click',()=>{currentPage++;loadData();});
        } catch(e){content.innerHTML=`<p style="color:var(--danger);">${esc(e.message)}</p>`;}
    }
    loadCab();
}

// ═══════════════════════════════════════════
// Component: LPP — COMPARISON (Dual Mode)
// ═══════════════════════════════════════════
function renderLppComparison() {
    return `
    <div class="page-header"><div><h1><i class="fas fa-balance-scale"></i> Comparison</h1><p>Perbandingan performa cabang / periode</p></div>
        <div class="page-header-actions"><a href="#/lpp" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Dashboard</a></div></div>
    <div style="display:flex;gap:8px;margin-bottom:20px;align-items:center;flex-wrap:wrap;">
        <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
            <button class="btn btn-sm cmp-mode active" data-mode="cabang" style="border-radius:0;"><i class="fas fa-industry"></i> Antar Cabang</button>
            <button class="btn btn-sm cmp-mode" data-mode="periode" style="border-radius:0;"><i class="fas fa-calendar-days"></i> Per Periode</button>
        </div>
        <div id="cmpCabangFilter" style="display:none;"><select class="form-input" id="cmpCabangSel" style="padding:6px 10px;font-size:12px;"></select></div>
    </div>
    <div id="cmpContent"><p style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Memuat...</p></div>`;
}

function bindLppComparison() {
    let mode='cabang';
    const fmtRp=v=>'Rp '+Number(v||0).toLocaleString('id-ID');
    const metrics=[
        {k:'total_sku',l:'Total Item',type:'num'},{k:'total_saldo_awal',l:'Saldo Awal',type:'rp',cls:'positive'},
        {k:'total_penerimaan',l:'Penerimaan',type:'rp',cls:'positive'},{k:'total_penjualan',l:'Penjualan',type:'rp',cls:'positive'},
        {k:'total_pengeluaran_fg',l:'Pengeluaran FG',type:'rp',cls:'negative'},{k:'total_pengeluaran_ig',l:'Pengeluaran IG',type:'rp',cls:'negative'},
        {k:'total_retur',l:'Retur',type:'rp',cls:'negative'},{k:'total_rusak',l:'Rusak',type:'rp',cls:'negative'},
        {k:'total_lainlain',l:'Lain-lain',type:'rp',cls:'negative'},{k:'total_nkl',l:'NKL',type:'rp',cls:'negative'},
        {k:'total_koreksi',l:'Koreksi',type:'rp',cls:'negative'},{k:'total_intransit',l:'Intransit',type:'rp',cls:'negative'},
        {k:'total_saldo_akhir',l:'Saldo Akhir',type:'rp',cls:'positive'}
    ];
    function renderCard(d,idx,label) {
        const s=d.summary||d; const isNeg=k=>(parseFloat(s[k]||0)<0);
        return `<div class="form-card" style="padding:16px;">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:8px;padding:10px 14px;color:white;margin-bottom:12px;">
                <div style="font-weight:800;font-size:14px;">${esc(d.nama_cabang||label||'')}</div>
                <div style="font-size:11px;opacity:.8;">${esc(d.kode_cabang||'')}</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${label?'<strong>'+label+'</strong><br>':''}${d.periode_start||''} − ${d.periode_end||''}<br>
                <span style="display:inline-block;margin-top:4px;background:${(d.bopbtk_periode||'').includes('Sebelum')?'#3b82f6':'#8b5cf6'};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">${esc(d.bopbtk_periode||'')}</span>
            </div>
            ${metrics.map(m=>{const v=s[m.k]; const disp=m.type==='rp'?fmtRp(v):Number(v||0).toLocaleString(); const col=m.cls==='negative'?'color:var(--danger);':'color:var(--success);';
                return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bg-hover);font-size:12px;"><span style="color:var(--text-muted);">${m.l}</span><span style="font-weight:600;${m.cls?col:''}">${disp}</span></div>`;
            }).join('')}
        </div>`;
    }

    async function loadCabangMode() {
        const content=document.getElementById('cmpContent');
        content.innerHTML='<p style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Memuat...</p>';
        try {
            const {data}=await API.lppComparison();
            if(!data.length){content.innerHTML='<div class="empty-state"><h3>Tidak ada data</h3></div>';return;}
            const maxSales=Math.max(...data.map(d=>parseFloat(d.total_penjualan||0)));
            content.innerHTML=`
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px;">
                ${data.map((d,i)=>renderCard({nama_cabang:d.nama_cabang,kode_cabang:d.kode_cabang,periode_start:d.periode_start,periode_end:d.periode_end,bopbtk_periode:d.bopbtk_periode||'',summary:d},i)).join('')}
            </div>
            <div class="form-card" style="padding:20px;">
                <h3 style="margin:0 0 12px;font-size:14px;">Ranking Cabang</h3>
                <div style="overflow-x:auto;"><table class="data-table" style="font-size:12px;"><thead><tr><th>Rank</th><th>Cabang</th><th>BOPBTK</th><th style="text-align:right;">Penjualan</th><th style="text-align:right;">Pengeluaran FG</th><th style="text-align:right;">Pengeluaran IG</th><th>Share</th><th style="text-align:right;">Saldo Akhir</th></tr></thead>
                <tbody>${data.sort((a,b)=>(parseFloat(b.total_penjualan||0))-(parseFloat(a.total_penjualan||0))).map((d,i)=>{
                    const pct=maxSales>0?(parseFloat(d.total_penjualan||0)/maxSales*100):0;
                    const rank=i<3?`<span style="background:${['#f59e0b','#94a3b8','#cd7f32'][i]};color:white;padding:2px 8px;border-radius:4px;font-weight:800;font-size:11px;">#${i+1}</span>`:'#'+(i+1);
                    return `<tr><td>${rank}</td><td><strong>${esc(d.nama_cabang)}</strong><br><small style="color:var(--text-muted);">${esc(d.kode_cabang)}</small></td>
                    <td><span style="background:${(d.bopbtk_periode||'').includes('Sebelum')?'#3b82f6':'#8b5cf6'};color:white;padding:2px 6px;border-radius:4px;font-size:10px;">${esc(d.bopbtk_periode||'')}</span></td>
                    <td style="text-align:right;font-weight:600;">${fmtRp(d.total_penjualan)}</td><td style="text-align:right;">${fmtRp(d.total_pengeluaran_fg)}</td><td style="text-align:right;">${fmtRp(d.total_pengeluaran_ig)}</td>
                    <td><div style="display:flex;align-items:center;gap:6px;"><div style="background:var(--bg-input);border-radius:4px;height:8px;width:80px;"><div style="background:var(--primary);height:8px;border-radius:4px;width:${pct}%;"></div></div><span style="font-size:11px;">${pct.toFixed(1)}%</span></div></td>
                    <td style="text-align:right;font-weight:600;">${fmtRp(d.total_saldo_akhir)}</td></tr>`;
                }).join('')}</tbody></table></div>
            </div>`;
        } catch(e){content.innerHTML=`<p style="color:var(--danger);text-align:center;">${esc(e.message)}</p>`;}
    }

    async function loadPeriodeMode() {
        const cabId=document.getElementById('cmpCabangSel')?.value;
        if(!cabId){showToast('Pilih cabang','warning');return;}
        const content=document.getElementById('cmpContent');
        content.innerHTML='<p style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i></p>';
        try {
            const {data}=await API.lppComparisonByPeriode(cabId);
            if(!data.length){content.innerHTML='<div class="empty-state"><h3>Tidak ada data periode</h3></div>';return;}
            const labels=data.length===2?['Periode Lama','Periode Baru']:data.map((_,i)=>'Periode '+(i+1));
            content.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;">${data.map((d,i)=>renderCard(d,i,labels[i])).join('')}</div>`;
        } catch(e){content.innerHTML=`<p style="color:var(--danger);text-align:center;">${esc(e.message)}</p>`;}
    }

    // Mode switching
    document.querySelectorAll('.cmp-mode').forEach(btn=>btn.addEventListener('click',()=>{
        mode=btn.dataset.mode;
        document.querySelectorAll('.cmp-mode').forEach(b=>{b.className=`btn btn-sm cmp-mode${b===btn?' active':''}`;b.style.background=b===btn?'var(--primary)':'';b.style.color=b===btn?'white':'';});
        document.getElementById('cmpCabangFilter').style.display=mode==='periode'?'inline-block':'none';
        if(mode==='cabang') loadCabangMode(); else loadPeriodeMode();
    }));

    // Load cabang list for periode mode
    API.lppCabangList().then(({data})=>{
        document.getElementById('cmpCabangSel').innerHTML=data.map(c=>`<option value="${c.id}">${esc(c.nama_cabang)}</option>`).join('');
    });
    document.getElementById('cmpCabangSel')?.addEventListener('change',()=>{if(mode==='periode')loadPeriodeMode();});

    loadCabangMode();
}

// ═══════════════════════════════════════════
// Component: LPP — ANALISIS (Smart Data Explorer)
// ═══════════════════════════════════════════
function renderLppAnalisis() {
    const colGroups = [
        { title: 'Saldo', cols: [
            {id:'saldo_awal_qty',l:'Saldo Awal Qty',chk:true},{id:'saldo_awal_value',l:'Saldo Awal Value',chk:true},
            {id:'saldo_akhir_qty',l:'Saldo Akhir Qty',chk:true},{id:'saldo_akhir_value',l:'Saldo Akhir Value',chk:true}]},
        { title: 'Penerimaan', cols: [
            {id:'penerimaan_supplier_qty',l:'Supplier Qty'},{id:'penerimaan_supplier_value',l:'Supplier Value'},
            {id:'penerimaan_produksi_qty',l:'Produksi Qty'},{id:'penerimaan_produksi_value',l:'Produksi Value'},
            {id:'penerimaan_lainlain_qty',l:'Lain-lain Qty'},{id:'penerimaan_lainlain_value',l:'Lain-lain Value'}]},
        { title: 'Pengeluaran', cols: [
            {id:'pengeluaran_ig_qty',l:'IG Qty'},{id:'pengeluaran_ig_value',l:'IG Value'},
            {id:'pengeluaran_fg_qty',l:'FG Qty'},{id:'pengeluaran_fg_value',l:'FG Value'},
            {id:'pengeluaran_sales_qty',l:'Sales Qty'},{id:'pengeluaran_sales_value',l:'Sales Value'}]},
        { title: 'Adjustment', cols: [
            {id:'retur_qty',l:'Retur Qty'},{id:'retur_value',l:'Retur Value'},
            {id:'rusak_qty',l:'Rusak Qty'},{id:'rusak_value',l:'Rusak Value',chk:true},
            {id:'lainlain_qty',l:'Lain-lain Qty'},{id:'lainlain_value',l:'Lain-lain Value',chk:true},
            {id:'nkl_qty',l:'NKL Qty',chk:true},{id:'nkl_value',l:'NKL Value',chk:true}]},
        { title: 'Additional', cols: [
            {id:'koreksi_qty',l:'Koreksi Qty'},{id:'koreksi_value',l:'Koreksi Value'},
            {id:'intransit_qty',l:'Intransit Qty'},{id:'intransit_value',l:'Intransit Value'}]}
    ];
    return `
    <div class="page-header"><div><h1><i class="fas fa-chart-line"></i> Analisis Inventory</h1><p>Smart Data Explorer — Filter, analisis, export</p></div>
        <div class="page-header-actions"><a href="#/lpp" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Dashboard</a></div></div>
    <div class="form-card" style="padding:16px;margin-bottom:16px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:10px;"><i class="fas fa-filter"></i> Smart Filtering</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
            <div class="form-group" style="margin:0;min-width:150px;flex:1;"><label style="font-size:11px;">Cabang <span style="color:var(--danger);">*</span></label><select class="form-input" id="anCabang" style="padding:6px 8px;font-size:12px;"><option value="">Pilih Cabang...</option><option value="all">Semua Cabang</option></select></div>
            <div class="form-group" style="margin:0;min-width:150px;flex:1;"><label style="font-size:11px;">Periode <span style="color:var(--danger);">*</span></label><select class="form-input" id="anPeriode" style="padding:6px 8px;font-size:12px;"><option value="">Pilih...</option></select></div>
            <div class="form-group" style="margin:0;min-width:130px;flex:1;"><label style="font-size:11px;">Kategori</label><select class="form-input" id="anKategori" style="padding:6px 8px;font-size:12px;"><option value="">Semua</option></select></div>
            <div class="form-group" style="margin:0;min-width:120px;"><label style="font-size:11px;">Display Mode</label><select class="form-input" id="anAggregation" style="padding:6px 8px;font-size:12px;"><option value="detail">Detail (per item)</option><option value="kategori">Per Kategori</option></select></div>
            <div class="form-group" style="margin:0;min-width:120px;"><label style="font-size:11px;">BOPBTK</label><select class="form-input" id="anBopbtk" style="padding:6px 8px;font-size:12px;"><option value="">Semua</option><option value="Sebelum BOPBTK">Sebelum</option><option value="Sesudah BOPBTK">Sesudah</option></select></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
            <div class="form-group" style="margin:0;flex:1;min-width:160px;"><label style="font-size:11px;">Search PLU</label><input class="form-input" id="anPlu" placeholder="PLU code..." style="padding:6px 8px;font-size:12px;"></div>
            <div class="form-group" style="margin:0;flex:1;min-width:160px;"><label style="font-size:11px;">Search Nama</label><input class="form-input" id="anNama" placeholder="Nama barang..." style="padding:6px 8px;font-size:12px;"></div>
        </div>
        <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" id="anLoadBtn"><i class="fas fa-play"></i> Load Data</button>
            <button class="btn btn-outline btn-sm" id="anExportBtn"><i class="fas fa-file-csv"></i> Export CSV</button>
        </div>
    </div>
    <div class="form-card" style="padding:12px;margin-bottom:16px;">
        <div style="font-weight:700;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;" id="anColToggle">
            <span id="anColIcon">▶</span> <i class="fas fa-table-columns"></i> Column Selection
        </div>
        <div id="anColContent" style="display:none;margin-top:10px;">
            <div style="display:flex;flex-wrap:wrap;gap:16px;">
                ${colGroups.map(g => `<div style="min-width:140px;"><div style="font-size:11px;font-weight:700;margin-bottom:6px;color:var(--primary);">${g.title}</div>
                    ${g.cols.map(c => `<label style="display:flex;align-items:center;gap:4px;font-size:11px;margin-bottom:3px;cursor:pointer;"><input type="checkbox" class="an-col-check" value="${c.id}" ${c.chk?'checked':''}> ${c.l}</label>`).join('')}
                </div>`).join('')}
            </div>
        </div>
    </div>
    <div id="anContent"><div style="padding:30px;text-align:center;color:var(--text-muted);">Pilih filter dan klik "Load Data"</div></div>`;
}

function bindLppAnalisis() {
    let anData=[],anCols=[],anAgg='detail',sortCol=null,sortDir='asc';
    const cabSel=document.getElementById('anCabang'),perSel=document.getElementById('anPeriode'),katSel=document.getElementById('anKategori');
    const bopSel=document.getElementById('anBopbtk'),aggSel=document.getElementById('anAggregation');

    // Toggle column section
    document.getElementById('anColToggle').addEventListener('click',()=>{
        const el=document.getElementById('anColContent'),icon=document.getElementById('anColIcon');
        const vis=el.style.display==='none';
        el.style.display=vis?'block':'none'; icon.textContent=vis?'▼':'▶';
    });

    // Load master data
    async function loadMaster(){
        try {
            const [{data:cabs},{data:kats}]=await Promise.all([API.lppCabangList(),API.lppKategoriList()]);
            cabs.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.nama_cabang;cabSel.appendChild(o);});
            kats.forEach(k=>{const o=document.createElement('option');o.value=k.id;o.textContent=k.nama_kategori;katSel.appendChild(o);});
        } catch(e){showToast('Gagal load master: '+e.message,'danger');}
    }

    async function loadPeriode() {
        const cabId=cabSel.value; const bop=bopSel.value;
        perSel.innerHTML='<option value="">Memuat...</option>';
        if(!cabId){perSel.innerHTML='<option value="">Pilih Cabang dulu</option>';return;}
        try {
            if(cabId==='all'){
                const {data}=await API.lppPeriodeList(0,bop);
                perSel.innerHTML='<option value="">Pilih Periode...</option>'+data.map(p=>`<option value="${p.id}">${p.periode_start} s/d ${p.periode_end}${p.bopbtk_periode?' ('+p.bopbtk_periode+')':''}</option>`).join('');
            } else {
                const {data}=await API.lppPeriodeList(cabId,bop);
                perSel.innerHTML='<option value="">Pilih Periode...</option>'+data.map(p=>`<option value="${p.id}">${p.periode_start} s/d ${p.periode_end}${p.bopbtk_periode?' ('+p.bopbtk_periode+')':''}</option>`).join('');
            }
        } catch(e){perSel.innerHTML='<option value="">Gagal memuat</option>';}
    }
    cabSel.addEventListener('change',loadPeriode);
    bopSel.addEventListener('change',loadPeriode);

    function getSelectedCols(){return Array.from(document.querySelectorAll('.an-col-check:checked')).map(c=>c.value);}

    function fmtColName(col){return col.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());}
    function fmtCurrency(v){if(isNaN(parseFloat(v)))return'Rp 0';return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0,maximumFractionDigits:0}).format(v);}
    function fmtNumber(v){if(isNaN(parseFloat(v)))return'0';return new Intl.NumberFormat('id-ID').format(parseFloat(v));}

    // Load data
    document.getElementById('anLoadBtn').addEventListener('click', async()=>{
        const cabVal=cabSel.value,perVal=perSel.value;
        if(!cabVal||!perVal){showToast('Pilih Cabang & Periode','warning');return;}
        const cols=getSelectedCols();
        if(!cols.length){showToast('Pilih minimal 1 kolom','warning');return;}
        anCols=cols; anAgg=aggSel.value; sortCol=null; sortDir='asc';
        const content=document.getElementById('anContent');
        content.innerHTML='<p style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

        let cabangIds=[];
        if(cabVal==='all'){
            cabSel.querySelectorAll('option').forEach(o=>{if(o.value&&o.value!==''&&o.value!=='all')cabangIds.push(o.value);});
        } else { cabangIds.push(cabVal); }

        try {
            const res=await API.lppAnalisisData({
                cabang_ids:cabangIds, periode_id:perVal, kategori_id:katSel.value,
                plu:document.getElementById('anPlu').value, nama_barang:document.getElementById('anNama').value,
                bopbtk_periode:bopSel.value, columns:cols, aggregation:anAgg
            });
            if(res.data&&res.data.length){anData=res.data;renderAnTable();}
            else {content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text-muted);">Tidak ada data yang cocok</div>';}
        } catch(e){content.innerHTML=`<p style="color:var(--danger);text-align:center;padding:30px;">${esc(e.message)}</p>`;}
    });

    function renderAnTable(){
        const content=document.getElementById('anContent');
        let dispCols=[];
        if(anAgg==='kategori'){ dispCols=['no','nama_kategori',...anCols]; }
        else{ dispCols=['kode_cabang','plu','nama_barang','nama_kategori','satuan','acost',...anCols]; }
        dispCols=[...new Set(dispCols)];

        content.innerHTML=`<div style="overflow-x:auto;"><table class="data-table" style="font-size:11px;">
        <thead><tr>${dispCols.map(c=>{
            let arrow='⇅',op='.5';
            if(sortCol===c){arrow=sortDir==='asc'?'▲':'▼';op='1';}
            return `<th style="cursor:pointer;white-space:nowrap;user-select:none;" data-col="${c}">${fmtColName(c)} <span style="margin-left:4px;font-size:9px;opacity:${op};">${arrow}</span></th>`;
        }).join('')}</tr></thead>
        <tbody>${anData.map((row,idx)=>`<tr>${dispCols.map(c=>{
            let v=row[c]; if(c==='no'&&v===undefined)v=idx+1;
            if(v===null||v===undefined)return`<td style="color:var(--text-muted);">-</td>`;
            if(c.includes('_value')||c==='acost')return`<td style="text-align:right;white-space:nowrap;">${fmtCurrency(v)}</td>`;
            if(c.includes('_qty')||c==='total_sku')return`<td style="text-align:right;">${fmtNumber(v)}</td>`;
            return`<td>${esc(String(v))}</td>`;
        }).join('')}</tr>`).join('')}</tbody></table></div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">${anData.length} rows</div>`;

        // Add sort listeners
        content.querySelectorAll('th[data-col]').forEach(th=>th.addEventListener('click',()=>{
            const col=th.dataset.col;
            if(sortCol===col)sortDir=sortDir==='asc'?'desc':'asc';
            else{sortCol=col;sortDir='asc';}
            const isNum=col.includes('_value')||col.includes('_qty')||col==='acost'||col==='total_sku'||col==='no';
            anData.sort((a,b)=>{
                let va=a[col],vb=b[col];
                if(va==null)va=isNum?0:'';if(vb==null)vb=isNum?0:'';
                let r=isNum?parseFloat(va)-parseFloat(vb):String(va).localeCompare(String(vb),'id');
                return sortDir==='asc'?r:-r;
            });
            renderAnTable();
        }));
    }

    // Export CSV
    document.getElementById('anExportBtn').addEventListener('click',()=>{
        if(!anData.length){showToast('Load data dulu','warning');return;}
        let dispCols=[];
        if(anAgg==='kategori')dispCols=['no','nama_kategori',...anCols];
        else dispCols=['kode_cabang','plu','nama_barang','nama_kategori','satuan','acost',...anCols];
        dispCols=[...new Set(dispCols)];
        const header=dispCols.map(fmtColName).join(',');
        const rows=anData.map((r,i)=>dispCols.map(c=>{let v=r[c];if(c==='no'&&v===undefined)v=i+1; return`"${String(v??'').replace(/"/g,'""')}"`;}).join(','));
        const csv=header+'\n'+rows.join('\n');
        const blob=new Blob([csv],{type:'text/csv'});
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lpp_analisis.csv';a.click();
    });

    loadMaster();
}

// ═══════════════════════════════════════════
// Component: LPP — UPLOAD
// ═══════════════════════════════════════════
function renderLppUpload() {
    return `
    <div class="page-header"><div><h1><i class="fas fa-upload"></i> Upload Data LPP</h1><p>Upload file Excel LPP</p></div>
        <div class="page-header-actions"><a href="#/lpp" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Dashboard</a></div></div>
    <div class="form-card" style="padding:16px;margin-bottom:16px;background:linear-gradient(135deg,#dbeafe,#ede9fe);border-left:4px solid var(--primary);">
        <h4 style="margin:0 0 8px;font-size:13px;">📋 Petunjuk Upload</h4>
        <ul style="margin:0;padding-left:18px;font-size:12px;color:var(--text-muted);line-height:1.6;">
            <li>File harus berformat <strong>.xlsx</strong> (Excel 2007+)</li>
            <li>Format file harus sesuai template LPP standar</li>
            <li>Pilih cabang, periode, dan status BOPBTK sebelum upload</li>
            <li>File akan otomatis diproses masuk database</li>
        </ul>
    </div>
    <div class="form-card" style="padding:20px;margin-bottom:20px;">
        <h3 style="margin:0 0 16px;font-size:14px;"><i class="fas fa-folder-open"></i> Upload File Excel</h3>
        <form id="lppUploadForm">
            <div class="form-group"><label>Cabang *</label><select class="form-input" id="lppUpCabang" required><option value="">-- Pilih Cabang --</option></select></div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                <div class="form-group"><label>Periode Mulai *</label><input type="date" class="form-input" id="lppUpStart" required></div>
                <div class="form-group"><label>Periode Akhir *</label><input type="date" class="form-input" id="lppUpEnd" required></div>
                <div class="form-group"><label>Status BOPBTK *</label><select class="form-input" id="lppUpBopbtk" required><option value="">-- Pilih --</option><option value="Sebelum BOPBTK">Sebelum BOPBTK</option><option value="Sesudah BOPBTK">Sesudah BOPBTK</option></select></div>
            </div>
            <div class="form-group">
                <label>File Excel *</label>
                <div id="lppDropZone" style="border:2px dashed var(--border);border-radius:8px;padding:30px;text-align:center;cursor:pointer;transition:border-color .2s;">
                    <div style="font-size:28px;">📁</div>
                    <p><strong>Klik untuk pilih file</strong> atau drag & drop</p>
                    <p style="color:var(--text-muted);font-size:12px;">Format: .xlsx, Max: 50MB</p>
                    <input type="file" id="lppUpFile" accept=".xlsx" required style="display:none;">
                    <p id="lppFileName" style="color:var(--primary);font-weight:600;margin-top:8px;"></p>
                </div>
            </div>
            <button type="submit" class="btn btn-primary" id="lppUpSubmit"><i class="fas fa-rocket"></i> Upload & Process</button>
        </form>
    </div>
    <div class="form-card" style="padding:20px;">
        <h3 style="margin:0 0 12px;font-size:14px;">📜 Upload Terakhir</h3>
        <div id="lppRecentUploads"></div>
    </div>`;
}

function bindLppUpload() {
    const dropZone=document.getElementById('lppDropZone'), fileInput=document.getElementById('lppUpFile'), fileNameEl=document.getElementById('lppFileName');
    dropZone.addEventListener('click',()=>fileInput.click());
    fileInput.addEventListener('change',e=>{if(e.target.files.length)fileNameEl.textContent='✅ '+e.target.files[0].name;});
    dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.style.borderColor='var(--primary)';dropZone.style.background='var(--bg-hover)';});
    dropZone.addEventListener('dragleave',()=>{dropZone.style.borderColor='var(--border)';dropZone.style.background='';});
    dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.style.borderColor='var(--border)';dropZone.style.background='';if(e.dataTransfer.files.length){fileInput.files=e.dataTransfer.files;fileNameEl.textContent='✅ '+e.dataTransfer.files[0].name;}});

    // Load cabang
    API.lppCabangList().then(({data})=>{
        const sel=document.getElementById('lppUpCabang');
        data.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=`${c.nama_cabang} (${c.kode_cabang})`;sel.appendChild(o);});
    });

    // Upload form
    document.getElementById('lppUploadForm').addEventListener('submit', async(e)=>{
        e.preventDefault();
        const btn=document.getElementById('lppUpSubmit');
        btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Processing...';
        try {
            const form=new FormData();
            form.append('cabang_id',document.getElementById('lppUpCabang').value);
            form.append('periode_start',document.getElementById('lppUpStart').value);
            form.append('periode_end',document.getElementById('lppUpEnd').value);
            form.append('bopbtk_periode',document.getElementById('lppUpBopbtk').value);
            form.append('file',fileInput.files[0]);
            await API.lppUpload(form);
            showToast('Upload berhasil!','success');
            loadRecent();
        } catch(err){showToast(err.message,'danger');} finally {btn.disabled=false;btn.innerHTML='<i class="fas fa-rocket"></i> Upload & Process';}
    });

    // Recent uploads
    async function loadRecent(){
        const cont=document.getElementById('lppRecentUploads');
        try {
            const {data}=await API.lppRecentUploads();
            if(!data.length){cont.innerHTML='<p style="text-align:center;color:var(--text-muted);padding:20px;">Belum ada data</p>';return;}
            cont.innerHTML=`<div style="overflow-x:auto;"><table class="data-table" style="font-size:12px;"><thead><tr><th>Cabang</th><th>Periode</th><th>BOPBTK</th><th>Items</th><th>Upload</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>${data.map(u=>`<tr><td><strong>${esc(u.nama_cabang)}</strong><br><small style="color:var(--text-muted);">${esc(u.kode_cabang)}</small></td>
            <td>${u.periode_start} − ${u.periode_end}</td>
            <td><span style="background:${(u.bopbtk_periode||'').includes('Sebelum')?'#3b82f6':'#8b5cf6'};color:white;padding:2px 6px;border-radius:4px;font-size:10px;">${esc(u.bopbtk_periode||'')}</span></td>
            <td>${Number(u.total_items||0).toLocaleString()}</td><td>${u.upload_date||'-'}</td>
            <td><span class="badge" style="background:var(--success);color:white;padding:2px 8px;border-radius:4px;font-size:10px;">${esc(u.status||'active')}</span></td>
            <td><button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);font-size:11px;" onclick="deleteLppUpload(${u.id},'${esc(u.nama_cabang).replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div>`;
        } catch(e){cont.innerHTML=`<p style="color:var(--danger);">${esc(e.message)}</p>`;}
    }
    loadRecent();
}

// Global delete function
async function deleteLppUpload(id,name) {
    if(!confirm(`Hapus data upload "${name}"?\n\nData yang dihapus tidak bisa dipulihkan!`))return;
    if(!confirm('Konfirmasi sekali lagi: Hapus data ini?'))return;
    try { await API.lppDeletePeriode(id); showToast('Data berhasil dihapus','success'); location.reload(); } catch(e){ showToast(e.message,'danger'); }
}
