<?php
/**
 * Monitoring Kwitansi API Endpoint
 * GET    ?action=list       — list with filters (kdcab, tanggal, limit)
 * GET    ?action=stats      — get stats (total, today, month)
 * GET    ?action=get&id=    — get single record
 * POST   ?action=store      — create new record
 * POST   ?action=update     — update record
 * POST   ?action=delete     — delete record
 * POST   ?action=bulk       — bulk insert from parsed data
 * GET    ?action=export     — export all data as JSON (for CSV generation client-side)
 */

$action = $_GET['action'] ?? '';
$currentUser = require_auth();
$model = new Kwitansi();

switch ($action) {
    // ─── List ───
    case 'list':
        $filters = [
            'kdcab'   => $_GET['kdcab'] ?? '',
            'tanggal' => $_GET['tanggal'] ?? '',
            'limit'   => $_GET['limit'] ?? 50,
        ];
        $records = $model->findAll($currentUser['id'], $filters);
        $stats = $model->getStats($currentUser['id']);
        json_response(['success' => true, 'records' => $records, 'stats' => $stats]);
        break;

    // ─── Stats ───
    case 'stats':
        $stats = $model->getStats($currentUser['id']);
        json_response(['success' => true, 'stats' => $stats]);
        break;

    // ─── Get ───
    case 'get':
        $id = (int) ($_GET['id'] ?? 0);
        $record = $model->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);
        json_response(['success' => true, 'record' => $record]);
        break;

    // ─── Store ───
    case 'store':
        if ($method !== 'POST') json_error('Method not allowed.', 405);
        $data = get_json_body();
        if (empty($data['kdcab'])) json_error('KDCAB harus diisi.');
        if (empty($data['no_kwitansi'])) json_error('No Kwitansi harus diisi.');
        if (empty($data['no_faktur'])) json_error('No Faktur harus diisi.');

        $data['user_id'] = $currentUser['id'];
        $id = $model->create($data);
        log_activity($currentUser['id'], 'kwitansi_create', "Added kwitansi: {$data['no_kwitansi']}");
        json_response(['success' => true, 'id' => $id, 'message' => 'Data kwitansi berhasil disimpan.']);
        break;

    // ─── Update ───
    case 'update':
        if ($method !== 'POST') json_error('Method not allowed.', 405);
        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $record = $model->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);

        $model->update($id, $data);
        log_activity($currentUser['id'], 'kwitansi_update', "Updated kwitansi ID: {$id}");
        json_response(['success' => true, 'message' => 'Data kwitansi berhasil diperbarui.']);
        break;

    // ─── Delete ───
    case 'delete':
        if ($method !== 'POST') json_error('Method not allowed.', 405);
        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $record = $model->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);

        $model->delete($id);
        log_activity($currentUser['id'], 'kwitansi_delete', "Deleted kwitansi: {$record['no_kwitansi']}");
        json_response(['success' => true, 'message' => 'Data kwitansi berhasil dihapus.']);
        break;

    // ─── Bulk Insert ───
    case 'bulk':
        if ($method !== 'POST') json_error('Method not allowed.', 405);
        $data = get_json_body();
        $rows = $data['rows'] ?? [];
        if (empty($rows)) json_error('Data kosong.');

        $result = $model->bulkInsert($rows, $currentUser['id']);
        log_activity($currentUser['id'], 'kwitansi_bulk', "Bulk inserted {$result['inserted']} kwitansi");
        json_response([
            'success'  => true,
            'inserted' => $result['inserted'],
            'duplikat' => count($result['duplikat']),
            'message'  => "{$result['inserted']} data berhasil diimport. " . (count($result['duplikat']) > 0 ? count($result['duplikat']) . " duplikat dilewati." : ''),
        ]);
        break;

    // ─── Export ───
    case 'export':
        $records = $model->exportAll($currentUser['id']);
        json_response(['success' => true, 'records' => $records]);
        break;

    default:
        json_error('Monitoring action not found.', 404);
}
