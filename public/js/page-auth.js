// page-auth.js — Login component
// ═══════════════════════════════════════════
// Component: LOGIN
// ═══════════════════════════════════════════
function renderLogin() {
    return `
    <div class="login-page">
        <div class="login-bg">
            <div class="login-bg-shape shape-1"></div>
            <div class="login-bg-shape shape-2"></div>
            <div class="login-bg-shape shape-3"></div>
        </div>
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo">
                        <div class="logo-icon logo-icon-lg"><i class="fas fa-bolt"></i></div>
                    </div>
                    <h1>AdminPanel</h1>
                    <p>Silakan login untuk melanjutkan</p>
                </div>
                <form id="loginForm" class="login-form">
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> Username</label>
                        <input type="text" id="loginUsername" class="form-input" placeholder="Masukkan username" required autofocus>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-lock"></i> Password</label>
                        <div class="password-wrapper">
                            <input type="password" id="loginPassword" class="form-input" placeholder="Masukkan password" required>
                            <button type="button" class="password-toggle" id="togglePassword"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" id="loginBtn">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </button>
                </form>
                <div class="login-footer">
                    <p>Default: <strong>admin</strong> / <strong>admin123</strong></p>
                </div>
            </div>
        </div>
    </div>`;
}

function bindLogin() {
    const form = document.getElementById('loginForm');
    const toggleBtn = document.getElementById('togglePassword');

    toggleBtn?.addEventListener('click', () => {
        const input = document.getElementById('loginPassword');
        const icon = toggleBtn.querySelector('i');
        if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; }
        else { input.type = 'password'; icon.className = 'fas fa-eye'; }
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        try {
            const res = await API.login(
                document.getElementById('loginUsername').value,
                document.getElementById('loginPassword').value
            );
            App.user = res.user;
            showToast('Selamat datang, ' + esc(res.user.full_name) + '!');
            location.hash = '#/dashboard';
        } catch (err) {
            showToast(err.message, 'danger');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    });
}

