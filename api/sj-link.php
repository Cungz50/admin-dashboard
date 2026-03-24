<?php
/**
 * SJ Link API Endpoint
 * POST   ?action=generate  — bulk generate URLs from SJ numbers
 * GET    ?action=history   — list session batches
 * GET    ?action=batch     — get links by batch
 * POST   ?action=delete    — delete a batch
 */

$action = $_GET['action'] ?? '';
$currentUser = require_auth();
$sjModel = new SjLink();

switch ($action) {
    // ─── Generate URLs from SJ numbers ───
    case 'generate':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $sjNumbers = $data['sj_numbers'] ?? [];

        if (empty($sjNumbers) || !is_array($sjNumbers)) {
            json_error('Masukkan minimal 1 nomor SJ.');
        }

        // Clean & deduplicate
        $sjNumbers = array_unique(array_filter(array_map('trim', $sjNumbers)));
        if (empty($sjNumbers)) {
            json_error('Tidak ada nomor SJ yang valid.');
        }

        $sessionBatch = date('Ymd_His') . '_' . $currentUser['id'];
        $results = [];
        $successCount = 0;
        $failCount = 0;

        foreach ($sjNumbers as $sj) {
            $url = SjLink::generateUrl($sj);
            $date = SjLink::parseSjDate($sj);

            if ($url && $date) {
                $id = $sjModel->create([
                    'user_id'       => $currentUser['id'],
                    'sj_number'     => $sj,
                    'generated_url' => $url,
                    'delivery_date' => $date,
                    'session_batch' => $sessionBatch,
                ]);
                $results[] = [
                    'id'            => $id,
                    'sj_number'     => $sj,
                    'generated_url' => $url,
                    'delivery_date' => $date,
                    'valid'         => true,
                ];
                $successCount++;
            } else {
                $results[] = [
                    'sj_number' => $sj,
                    'valid'     => false,
                    'error'     => 'Format SJ tidak valid (harus minimal 6 karakter, 6 digit pertama = YYMMDD)',
                ];
                $failCount++;
            }
        }

        log_activity($currentUser['id'], 'sj_link_generate', "Generated {$successCount} SJ links (batch: {$sessionBatch})");

        json_response([
            'success'       => true,
            'message'       => "{$successCount} link berhasil digenerate" . ($failCount > 0 ? ", {$failCount} gagal" : ''),
            'session_batch' => $sessionBatch,
            'results'       => $results,
            'success_count' => $successCount,
            'fail_count'    => $failCount,
        ]);
        break;

    // ─── History (session batches) ───
    case 'history':
        $batches = $sjModel->getSessionBatches($currentUser['id']);
        json_response(['success' => true, 'batches' => $batches]);
        break;

    // ─── Get links by batch ───
    case 'batch':
        $batch = $_GET['batch'] ?? '';
        if (!$batch) json_error('Batch ID diperlukan.');
        $links = $sjModel->findBySessionBatch($batch, $currentUser['id']);
        json_response(['success' => true, 'links' => $links]);
        break;

    // ─── Delete batch ───
    case 'delete':
        if ($method !== 'POST') json_error('Method not allowed.', 405);
        $data = get_json_body();
        $batch = $data['batch'] ?? '';
        if (!$batch) json_error('Batch ID diperlukan.');

        $sjModel->deleteByBatch($batch, $currentUser['id']);
        log_activity($currentUser['id'], 'sj_link_delete', "Deleted SJ link batch: {$batch}");
        json_response(['success' => true, 'message' => 'Batch berhasil dihapus.']);
        break;

    default:
        json_error('SJ Link action not found.', 404);
}
