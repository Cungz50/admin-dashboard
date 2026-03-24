// page-dashboard.js — Dashboard component
// ═══════════════════════════════════════════
// Component: DASHBOARD
// ═══════════════════════════════════════════
async function renderDashboard() {
    const { stats } = await API.dashboardStats();
    const isAdmin = App.user?.role === 'admin';

    const roleColors = { admin: '#a855f7', editor: '#3b82f6', user: '#06b6d4' };
    const totalForChart = Math.max(stats.roleStats.reduce((a, r) => a + parseInt(r.count), 0), 1);

    let branchCards = '';
    if (isAdmin && stats.branches) {
        branchCards = `
        <div class="stat-card stat-card-info">
            <div class="stat-card-icon"><i class="fas fa-building"></i></div>
            <div class="stat-card-info-content">
                <h3 class="stat-number" data-count="${stats.totalBranches}">${stats.totalBranches}</h3>
                <p>Total Cabang</p>
            </div>
            <div class="stat-card-trend trend-up"><i class="fas fa-map-marker-alt"></i> Aktif</div>
        </div>`;
    }

    return `
    <div class="stats-grid">
        <div class="stat-card stat-card-primary">
            <div class="stat-card-icon"><i class="fas fa-users"></i></div>
            <div class="stat-card-info-content">
                <h3 class="stat-number" data-count="${stats.totalUsers}">${stats.totalUsers}</h3>
                <p>Total Users</p>
            </div>
            <div class="stat-card-trend trend-up"><i class="fas fa-arrow-up"></i> ${stats.newThisMonth} bulan ini</div>
        </div>
        <div class="stat-card stat-card-success">
            <div class="stat-card-icon"><i class="fas fa-user-check"></i></div>
            <div class="stat-card-info-content">
                <h3 class="stat-number" data-count="${stats.activeUsers}">${stats.activeUsers}</h3>
                <p>Active Users</p>
            </div>
            <div class="stat-card-trend trend-up"><i class="fas fa-circle"></i> Online</div>
        </div>
        <div class="stat-card stat-card-warning">
            <div class="stat-card-icon"><i class="fas fa-user-clock"></i></div>
            <div class="stat-card-info-content">
                <h3 class="stat-number" data-count="${stats.inactiveUsers}">${stats.inactiveUsers}</h3>
                <p>Inactive Users</p>
            </div>
            <div class="stat-card-trend trend-down"><i class="fas fa-arrow-down"></i> Perlu review</div>
        </div>
        ${branchCards}
    </div>

    <div class="content-grid">
        <div class="card card-activity">
            <div class="card-header"><h2><i class="fas fa-history"></i> Aktivitas Terbaru</h2></div>
            <div class="card-body">
                ${stats.activities.length === 0 ? `
                    <div class="empty-state"><i class="fas fa-inbox"></i><p>Belum ada aktivitas.</p></div>
                ` : `
                    <div class="activity-list">
                        ${stats.activities.map(a => `
                        <div class="activity-item">
                            <div class="activity-icon activity-icon-${a.action === 'login' ? 'login' : a.action === 'logout' ? 'logout' : 'action'}">
                                <i class="fas fa-${a.action === 'login' ? 'sign-in-alt' : a.action === 'logout' ? 'sign-out-alt' : a.action.includes('create') ? 'plus' : 'edit'}"></i>
                            </div>
                            <div class="activity-content">
                                <p class="activity-text">${esc(a.description)}</p>
                                <span class="activity-time"><i class="fas fa-clock"></i> ${formatDate(a.created_at)}</span>
                            </div>
                        </div>`).join('')}
                    </div>
                `}
            </div>
        </div>

        <div class="card card-quick-info">
            <div class="card-header"><h2><i class="fas fa-chart-pie"></i> User by Role</h2></div>
            <div class="card-body">
                <div class="role-chart">
                    ${stats.roleStats.map(r => `
                    <div class="role-item">
                        <div class="role-bar-wrapper">
                            <div class="role-label">
                                <span class="role-dot" style="background:${roleColors[r.role] || '#64748b'}"></span>
                                ${esc(r.role.charAt(0).toUpperCase() + r.role.slice(1))}
                            </div>
                            <span class="role-count">${r.count}</span>
                        </div>
                        <div class="role-bar">
                            <div class="role-bar-fill" style="width:${Math.round((r.count/totalForChart)*100)}%;background:${roleColors[r.role]||'#64748b'}"></div>
                        </div>
                    </div>`).join('')}
                </div>

                <div class="quick-actions">
                    <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                    ${isAdmin ? `<a href="#/users/create" class="quick-action-btn"><i class="fas fa-user-plus"></i> Tambah User</a>` : ''}
                    <a href="#/users" class="quick-action-btn"><i class="fas fa-users-cog"></i> Kelola Users</a>
                </div>
            </div>
        </div>
    </div>`;
}

function animateCounters() {
    document.querySelectorAll('.stat-number[data-count]').forEach(counter => {
        const target = parseInt(counter.dataset.count, 10);
        if (isNaN(target) || target === 0) return;
        const duration = 1500, start = performance.now();
        counter.textContent = '0';
        function animate(now) {
            const progress = Math.min((now - start) / duration, 1);
            counter.textContent = Math.round((1 - Math.pow(1 - progress, 3)) * target);
            if (progress < 1) requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    });
}

