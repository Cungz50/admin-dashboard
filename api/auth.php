<?php
/**
 * Auth API Endpoint
 * POST ?action=login   — login
 * POST ?action=logout  — logout
 * GET  ?action=me      — current user info
 */

$action = $_GET['action'] ?? '';
$userModel = new User();

switch ($action) {
    // ─── Login ───
    case 'login':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            json_error('Username dan password harus diisi.');
        }

        $user = $userModel->findByUsername($username);

        if (!$user || !password_verify($password, $user['password'])) {
            json_error('Username atau password salah.', 401);
        }

        if ($user['status'] !== 'active') {
            json_error('Akun Anda tidak aktif. Hubungi administrator.', 403);
        }

        // Login success
        unset($user['password']);
        $_SESSION['user'] = $user;

        $userModel->updateLastLogin($user['id']);
        log_activity($user['id'], 'login', $user['full_name'] . ' logged in');

        json_response([
            'success' => true,
            'message' => 'Login berhasil!',
            'user'    => $user,
        ]);
        break;

    // ─── Logout ───
    case 'logout':
        if (isset($_SESSION['user'])) {
            log_activity($_SESSION['user']['id'], 'logout', $_SESSION['user']['full_name'] . ' logged out');
        }
        session_destroy();
        json_response(['success' => true, 'message' => 'Logout berhasil.']);
        break;

    // ─── Current User ───
    case 'me':
        $user = require_auth();
        // Refresh user data from DB
        $fresh = $userModel->findById($user['id']);
        if (!$fresh) {
            session_destroy();
            json_error('User not found.', 401);
        }
        unset($fresh['password']);
        $_SESSION['user'] = $fresh;
        json_response(['success' => true, 'user' => $fresh]);
        break;

    default:
        json_error('Auth action not found.', 404);
}
