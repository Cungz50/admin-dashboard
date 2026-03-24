<?php
/**
 * Tanda Terima API Endpoint
 * POST   ?action=store   — create new tanda terima with items
 * GET    ?action=list    — list history
 * GET    ?action=get&id= — get single record
 * POST   ?action=delete  — delete record
 * GET    ?action=print&id= — get print-ready data
 */

$action = $_GET['action'] ?? '';
$currentUser = require_auth();
$model = new TandaTerima();

switch ($action) {
    // ─── List ───
    case 'list':
        $records = $model->findAll($currentUser['id']);
        json_response(['success' => true, 'records' => $records]);
        break;

    // ─── Get single ───
    case 'get':
    case 'print':
        $id = (int) ($_GET['id'] ?? 0);
        $record = $model->findById($id);
        if (!$record || $record['created_by'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);
        json_response(['success' => true, 'record' => $record]);
        break;

    // ─── Store ───
    case 'store':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $penerima = trim($data['penerima'] ?? '');
        $tanggal = $data['tanggal'] ?? date('Y-m-d');
        $items = $data['items'] ?? [];

        if (!$penerima) json_error('Penerima harus diisi.');
        if (empty($items) || !is_array($items)) json_error('Minimal 1 item tagihan diperlukan.');

        // Validate items
        foreach ($items as $i => $item) {
            if (empty($item['no_kwitansi'])) json_error("No Kwitansi baris " . ($i + 1) . " harus diisi.");
            if (empty($item['no_faktur'])) json_error("No Faktur baris " . ($i + 1) . " harus diisi.");
        }

        // Clean currency values
        $cleanItems = [];
        foreach ($items as $item) {
            $cleanItems[] = [
                'no_kwitansi'     => $item['no_kwitansi'],
                'no_faktur'       => $item['no_faktur'],
                'jumlah_tagihan'  => (int) preg_replace('/[^0-9]/', '', $item['jumlah_tagihan'] ?? '0'),
                'periode_dari'    => $item['periode_dari'] ?? null,
                'periode_sampai'  => $item['periode_sampai'] ?? null,
                'no_ttfa'         => $item['no_ttfa'] ?? '',
            ];
        }

        $recordId = $model->create([
            'penerima'   => $penerima,
            'tanggal'    => $tanggal,
            'items'      => $cleanItems,
            'created_by' => $currentUser['id'],
        ]);

        log_activity($currentUser['id'], 'tanda_terima_create', "Created tanda terima untuk {$penerima}");

        json_response([
            'success' => true,
            'id'      => $recordId,
            'message' => 'Tanda Terima berhasil dibuat!',
        ]);
        break;

    // ─── Delete ───
    case 'delete':
        if ($method !== 'POST') json_error('Method not allowed.', 405);
        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $record = $model->findById($id);
        if (!$record || $record['created_by'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);

        $model->delete($id);
        log_activity($currentUser['id'], 'tanda_terima_delete', "Deleted tanda terima: {$record['penerima']}");
        json_response(['success' => true, 'message' => 'Tanda Terima berhasil dihapus.']);
        break;

    default:
        json_error('Tanda terima action not found.', 404);
}
