<?php
/**
 * Branches API Endpoint
 * GET    ?action=list        — list branches
 * GET    ?action=get&id=X    — get single branch
 * GET    ?action=active      — list active (for dropdown)
 * POST   ?action=create      — create branch (admin)
 * POST   ?action=update      — update branch (admin)
 * POST   ?action=delete      — delete branch (admin)
 */

$action = $_GET['action'] ?? '';
$currentUser = require_auth();
$branchModel = new Branch();

switch ($action) {
    // ─── List Branches ───
    case 'list':
        $search = $_GET['search'] ?? '';
        $branches = $branchModel->findAll($search);
        json_response(['success' => true, 'branches' => $branches]);
        break;

    // ─── Active Branches (dropdown) ───
    case 'active':
        $branches = $branchModel->getActiveList();
        json_response(['success' => true, 'branches' => $branches]);
        break;

    // ─── Get Branch ───
    case 'get':
        $id = (int) ($_GET['id'] ?? 0);
        $branch = $branchModel->findById($id);
        if (!$branch) json_error('Cabang tidak ditemukan.', 404);
        json_response(['success' => true, 'branch' => $branch]);
        break;

    // ─── Create Branch ───
    case 'create':
        require_admin();
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $errors = validate_branch($data);
        if (!empty($errors)) json_error(implode(' ', $errors));

        if ($branchModel->findByCode($data['code'])) {
            json_error('Kode cabang sudah digunakan.');
        }

        try {
            $id = $branchModel->create($data);
            log_activity($currentUser['id'], 'create_branch', 'Created branch: ' . $data['name']);
            $branch = $branchModel->findById($id);
            json_response(['success' => true, 'message' => 'Cabang berhasil ditambahkan.', 'branch' => $branch], 201);
        } catch (Exception $e) {
            json_error('Gagal menambahkan cabang: ' . $e->getMessage(), 500);
        }
        break;

    // ─── Update Branch ───
    case 'update':
        require_admin();
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $branch = $branchModel->findById($id);
        if (!$branch) json_error('Cabang tidak ditemukan.', 404);

        $errors = validate_branch($data);
        if (!empty($errors)) json_error(implode(' ', $errors));

        $existing = $branchModel->findByCode($data['code'] ?? '');
        if ($existing && $existing['id'] !== $id) {
            json_error('Kode cabang sudah digunakan oleh cabang lain.');
        }

        try {
            $branchModel->update($id, $data);
            log_activity($currentUser['id'], 'update_branch', 'Updated branch: ' . ($data['name'] ?? $branch['name']));
            $updated = $branchModel->findById($id);
            json_response(['success' => true, 'message' => 'Cabang berhasil diupdate.', 'branch' => $updated]);
        } catch (Exception $e) {
            json_error('Gagal mengupdate cabang: ' . $e->getMessage(), 500);
        }
        break;

    // ─── Delete Branch ───
    case 'delete':
        require_admin();
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $branch = $branchModel->findById($id);
        if (!$branch) json_error('Cabang tidak ditemukan.', 404);

        try {
            $branchModel->delete($id);
            log_activity($currentUser['id'], 'delete_branch', 'Deleted branch: ' . $branch['name']);
            json_response(['success' => true, 'message' => 'Cabang berhasil dihapus.']);
        } catch (Exception $e) {
            json_error('Gagal menghapus cabang: ' . $e->getMessage(), 500);
        }
        break;

    default:
        json_error('Branches action not found.', 404);
}

function validate_branch(array $data): array
{
    $errors = [];
    if (empty(trim($data['name'] ?? ''))) $errors[] = 'Nama cabang harus diisi.';
    if (empty(trim($data['code'] ?? ''))) $errors[] = 'Kode cabang harus diisi.';
    elseif (strlen($data['code']) > 20) $errors[] = 'Kode cabang maksimal 20 karakter.';
    return $errors;
}
