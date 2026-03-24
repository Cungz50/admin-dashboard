<?php
/**
 * Packing List API Endpoint
 * POST   ?action=generate  — save parsed packing data to DB
 * GET    ?action=list       — list history
 * GET    ?action=get&id=X   — get single record with full data
 * POST   ?action=delete     — delete record
 */

$action = $_GET['action'] ?? '';
$currentUser = require_auth();
$model = new PackingHistory();

switch ($action) {
    // ─── List History ───
    case 'list':
        $records = $model->findAll($currentUser['id']);
        json_response(['success' => true, 'records' => $records]);
        break;

    // ─── Get Single Record (full data) ───
    case 'get':
        $id = (int) ($_GET['id'] ?? 0);
        $record = $model->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);

        json_response([
            'success' => true,
            'record'  => [
                'id'            => $record['id'],
                'batch_number'  => $record['batch_number'],
                'stuffing_date' => $record['stuffing_date'],
                'stores_count'  => count($record['parsed_data']),
                'total_items'   => PackingHistory::getTotalItems($record['parsed_data']),
                'created_at'    => $record['created_at'],
            ],
            'stores' => $record['parsed_data'],
        ]);
        break;

    // ─── Generate (save parsed data) ───
    case 'generate':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $batchNumber = trim($data['batch_number'] ?? '');
        $stuffingDate = $data['stuffing_date'] ?? null;
        $stores = $data['stores'] ?? [];

        if (!$batchNumber) json_error('Batch number diperlukan.');
        if (empty($stores) || !is_array($stores)) json_error('Data toko kosong. Upload Excel terlebih dahulu.');

        $recordId = $model->create([
            'batch_number'  => $batchNumber,
            'stuffing_date' => $stuffingDate ?: date('Y-m-d'),
            'data_json'     => json_encode($stores),
            'user_id'       => $currentUser['id'],
        ]);

        log_activity($currentUser['id'], 'packing_generate', "Generated packing list batch: {$batchNumber} ({$recordId})");

        json_response([
            'success' => true,
            'id'      => $recordId,
            'message' => 'Packing list berhasil disimpan!',
        ]);
        break;

    // ─── Delete ───
    case 'delete':
        if ($method !== 'POST') json_error('Method not allowed.', 405);
        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $record = $model->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);

        $model->delete($id);
        log_activity($currentUser['id'], 'packing_delete', "Deleted packing list: {$record['batch_number']}");
        json_response(['success' => true, 'message' => 'Packing list berhasil dihapus.']);
        break;

    default:
        json_error('Packing list action not found.', 404);
}
