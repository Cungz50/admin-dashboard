<?php
/**
 * Users API Endpoint
 * GET    ?action=list        — list users (branch-filtered)
 * GET    ?action=get&id=X    — get single user
 * POST   ?action=create      — create user (admin)
 * POST   ?action=update      — update user (admin)
 * POST   ?action=delete      — delete user (admin)
 */

$action = $_GET['action'] ?? '';
$currentUser = require_auth();
$userModel = new User();
$branchModel = new Branch();

// Determine branch filter
$branchFilter = ($currentUser['role'] !== 'admin' && $currentUser['branch_id'])
    ? (int) $currentUser['branch_id']
    : null;

switch ($action) {
    // ─── List Users ───
    case 'list':
        $search = $_GET['search'] ?? '';
        $users = $userModel->findAll($search, $branchFilter);

        // Remove passwords
        $users = array_map(function ($u) {
            unset($u['password']);
            return $u;
        }, $users);

        json_response(['success' => true, 'users' => $users]);
        break;

    // ─── Get User ───
    case 'get':
        $id = (int) ($_GET['id'] ?? 0);
        $user = $userModel->findById($id);

        if (!$user) {
            json_error('User tidak ditemukan.', 404);
        }

        // Non-admin can only view users in same branch
        if ($branchFilter !== null && $user['branch_id'] != $branchFilter) {
            json_error('Anda tidak memiliki akses ke user ini.', 403);
        }

        unset($user['password']);
        json_response(['success' => true, 'user' => $user]);
        break;

    // ─── Create User ───
    case 'create':
        require_admin();
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $errors = validate_user($data);

        if (!empty($errors)) {
            json_error(implode(' ', $errors));
        }

        // Check unique username
        if ($userModel->findByUsername($data['username'])) {
            json_error('Username sudah digunakan.');
        }

        try {
            $id = $userModel->create($data);
            log_activity($currentUser['id'], 'create_user', 'Created user: ' . $data['username']);
            $newUser = $userModel->findById($id);
            unset($newUser['password']);
            json_response(['success' => true, 'message' => 'User berhasil ditambahkan.', 'user' => $newUser], 201);
        } catch (Exception $e) {
            json_error('Gagal menambahkan user: ' . $e->getMessage(), 500);
        }
        break;

    // ─── Update User ───
    case 'update':
        require_admin();
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $user = $userModel->findById($id);

        if (!$user) {
            json_error('User tidak ditemukan.', 404);
        }

        $errors = validate_user($data, false);
        if (!empty($errors)) {
            json_error(implode(' ', $errors));
        }

        // Check unique username (exclude current)
        $existing = $userModel->findByUsername($data['username'] ?? '');
        if ($existing && $existing['id'] !== $id) {
            json_error('Username sudah digunakan oleh user lain.');
        }

        try {
            $userModel->update($id, $data);
            log_activity($currentUser['id'], 'update_user', 'Updated user: ' . ($data['username'] ?? $user['username']));
            $updatedUser = $userModel->findById($id);
            unset($updatedUser['password']);
            json_response(['success' => true, 'message' => 'User berhasil diupdate.', 'user' => $updatedUser]);
        } catch (Exception $e) {
            json_error('Gagal mengupdate user: ' . $e->getMessage(), 500);
        }
        break;

    // ─── Delete User ───
    case 'delete':
        require_admin();
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $user = $userModel->findById($id);

        if (!$user) {
            json_error('User tidak ditemukan.', 404);
        }

        if ($id === $currentUser['id']) {
            json_error('Anda tidak bisa menghapus akun sendiri.');
        }

        try {
            $userModel->delete($id);
            log_activity($currentUser['id'], 'delete_user', 'Deleted user: ' . $user['username']);
            json_response(['success' => true, 'message' => 'User berhasil dihapus.']);
        } catch (Exception $e) {
            json_error('Gagal menghapus user: ' . $e->getMessage(), 500);
        }
        break;

    default:
        json_error('Users action not found.', 404);
}

/**
 * Validate user data
 */
function validate_user(array $data, bool $requirePassword = true): array
{
    $errors = [];

    if (empty(trim($data['username'] ?? ''))) {
        $errors[] = 'Username harus diisi.';
    } elseif (strlen($data['username']) < 3) {
        $errors[] = 'Username minimal 3 karakter.';
    }

    if (empty(trim($data['email'] ?? ''))) {
        $errors[] = 'Email harus diisi.';
    } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Format email tidak valid.';
    }

    if (empty(trim($data['full_name'] ?? ''))) {
        $errors[] = 'Nama lengkap harus diisi.';
    }

    if ($requirePassword && empty($data['password'])) {
        $errors[] = 'Password harus diisi.';
    } elseif (!empty($data['password']) && strlen($data['password']) < 6) {
        $errors[] = 'Password minimal 6 karakter.';
    }

    return $errors;
}
