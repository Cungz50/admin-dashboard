<?php
/**
 * Price Check API Endpoint
 * POST   ?action=upload    — upload .txt file and analyze
 * GET    ?action=list      — list price check history
 * GET    ?action=review    — get mismatch data from session
 * POST   ?action=update    — apply fixes and generate fixed file
 * GET    ?action=get&id=X  — get single price check
 * GET    ?action=download&id=X — download fixed file
 * POST   ?action=delete    — delete price check
 */

$action = $_GET['action'] ?? '';
$currentUser = require_auth();
$priceCheckModel = new PriceCheck();

// Storage path
$storagePath = __DIR__ . '/../storage/price-checks/';
if (!is_dir($storagePath)) mkdir($storagePath, 0755, true);
if (!is_dir($storagePath . 'fixed/')) mkdir($storagePath . 'fixed/', 0755, true);

switch ($action) {
    // ─── List History ───
    case 'list':
        $records = $priceCheckModel->findAll($currentUser['id']);
        json_response(['success' => true, 'records' => $records]);
        break;

    // ─── Get Single Record ───
    case 'get':
        $id = (int) ($_GET['id'] ?? 0);
        $record = $priceCheckModel->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) {
            json_error('Record tidak ditemukan.', 404);
        }
        json_response(['success' => true, 'record' => $record]);
        break;

    // ─── Upload & Analyze ───
    case 'upload':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        if (!isset($_FILES['datafile']) || $_FILES['datafile']['error'] !== UPLOAD_ERR_OK) {
            json_error('File tidak valid atau tidak terupload.');
        }

        $file = $_FILES['datafile'];

        // Validate extension
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($ext !== 'txt') {
            json_error('Hanya file .txt yang diperbolehkan.');
        }

        // Validate size (max 10MB)
        if ($file['size'] > 10 * 1024 * 1024) {
            json_error('File terlalu besar. Maksimal 10MB.');
        }

        // Store file
        $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
        $filepath = $storagePath . $filename;

        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            json_error('Gagal menyimpan file.', 500);
        }

        // Read and analyze
        $data = file($filepath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $mismatch = [];
        $allLines = [];

        foreach ($data as $index => $line) {
            $allLines[$index] = $line;
            $parts = explode('|', $line);

            if (count($parts) < 15) continue;

            $docno    = $parts[1] ?? '';
            $prdcd    = $parts[6] ?? '';
            $price    = floatval($parts[8] ?? 0);
            $priceIdm = floatval($parts[14] ?? 0);

            if ($price != $priceIdm) {
                $mismatch[] = [
                    'index'     => $index,
                    'line'      => $line,
                    'docno'     => $docno,
                    'prdcd'     => $prdcd,
                    'price'     => $price,
                    'price_idm' => $priceIdm,
                    'selisih'   => $price - $priceIdm,
                ];
            }
        }

        // Save to database
        $relPath = 'price-checks/' . $filename;
        $recordId = $priceCheckModel->create([
            'user_id'           => $currentUser['id'],
            'original_filename' => $file['name'],
            'filepath'          => $relPath,
            'total_records'     => count($data),
            'mismatch_count'    => count($mismatch),
            'status'            => count($mismatch) === 0 ? 'completed' : 'processing',
        ]);

        log_activity($currentUser['id'], 'price_check_upload', 'Uploaded price check: ' . $file['name']);

        if (count($mismatch) === 0) {
            json_response([
                'success'       => true,
                'message'       => '✅ Semua harga cocok! Tidak ada mismatch.',
                'id'            => $recordId,
                'mismatch'      => [],
                'total_records' => count($data),
                'has_mismatch'  => false,
            ]);
            break;
        }

        // Store in session for review step
        $_SESSION['price_check_data'] = [
            'id'        => $recordId,
            'all_lines' => $allLines,
            'mismatch'  => $mismatch,
        ];

        json_response([
            'success'        => true,
            'message'        => 'File berhasil dianalisa. Ditemukan ' . count($mismatch) . ' mismatch.',
            'id'             => $recordId,
            'mismatch'       => $mismatch,
            'total_records'  => count($data),
            'mismatch_count' => count($mismatch),
            'has_mismatch'   => true,
        ]);
        break;

    // ─── Review (get session data) ───
    case 'review':
        $sessionData = $_SESSION['price_check_data'] ?? null;
        if (!$sessionData) {
            json_error('Data review tidak ditemukan. Silakan upload ulang.');
        }
        json_response([
            'success'  => true,
            'id'       => $sessionData['id'],
            'mismatch' => $sessionData['mismatch'],
        ]);
        break;

    // ─── Update (apply fixes) ───
    case 'update':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $sessionData = $_SESSION['price_check_data'] ?? null;
        if (!$sessionData) {
            json_error('Session expired. Silakan upload ulang.');
        }

        $data = get_json_body();
        $priceIdmList = $data['price_idm'] ?? [];
        $skipList = $data['skip'] ?? [];
        $skipMap = array_flip($skipList);

        $allLines = $sessionData['all_lines'];
        $recordId = $sessionData['id'];

        $record = $priceCheckModel->findById($recordId);
        if (!$record) json_error('Record tidak ditemukan.', 404);

        $output = [];
        $updatedCount = 0;
        $skippedCount = count($skipList);

        foreach ($allLines as $index => $line) {
            if (isset($skipMap[$index])) {
                $output[] = $line;
                continue;
            }

            $parts = explode('|', $line);

            if (count($parts) > 14 && isset($priceIdmList[$index])) {
                $parts[14] = number_format(floatval($priceIdmList[$index]), 3, '.', '');
                $output[] = implode('|', $parts);
                $updatedCount++;
            } else {
                $output[] = $line;
            }
        }

        // Save fixed file
        $fixedFilename = 'fix_' . basename($record['filepath']);
        $fixedPath = $storagePath . 'fixed/' . $fixedFilename;
        file_put_contents($fixedPath, implode("\n", $output));

        // Update database
        $priceCheckModel->update($recordId, [
            'fixed_filepath' => 'price-checks/fixed/' . $fixedFilename,
            'updated_count'  => $updatedCount,
            'skipped_count'  => $skippedCount,
            'status'         => 'completed',
        ]);

        // Clear session
        unset($_SESSION['price_check_data']);

        log_activity($currentUser['id'], 'price_check_fix', 'Fixed price check file: ' . $record['original_filename']);

        $updatedRecord = $priceCheckModel->findById($recordId);
        json_response([
            'success'       => true,
            'message'       => 'File berhasil diupdate! ' . $updatedCount . ' baris diperbaiki, ' . $skippedCount . ' baris diskip.',
            'record'        => $updatedRecord,
            'updated_count' => $updatedCount,
            'skipped_count' => $skippedCount,
        ]);
        break;

    // ─── Download Fixed File ───
    case 'download':
        $id = (int) ($_GET['id'] ?? 0);
        $record = $priceCheckModel->findById($id);

        if (!$record || $record['user_id'] != $currentUser['id']) {
            json_error('Record tidak ditemukan.', 404);
        }

        if (!$record['fixed_filepath']) {
            json_error('File belum diperbaiki.');
        }

        $filePath = __DIR__ . '/../storage/' . $record['fixed_filepath'];
        if (!file_exists($filePath)) {
            json_error('File tidak ditemukan di server.', 404);
        }

        // Send file for download
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($record['fixed_filepath']) . '"');
        header('Content-Length: ' . filesize($filePath));
        header_remove('Content-Type'); // Remove JSON content-type
        header('Content-Type: application/octet-stream');
        readfile($filePath);
        exit;

    // ─── Delete ───
    case 'delete':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $record = $priceCheckModel->findById($id);

        if (!$record || $record['user_id'] != $currentUser['id']) {
            json_error('Record tidak ditemukan.', 404);
        }

        // Delete files
        $origPath = __DIR__ . '/../storage/' . $record['filepath'];
        if (file_exists($origPath)) unlink($origPath);

        if ($record['fixed_filepath']) {
            $fixPath = __DIR__ . '/../storage/' . $record['fixed_filepath'];
            if (file_exists($fixPath)) unlink($fixPath);
        }

        $priceCheckModel->delete($id);
        log_activity($currentUser['id'], 'price_check_delete', 'Deleted price check: ' . $record['original_filename']);

        json_response(['success' => true, 'message' => 'Record berhasil dihapus.']);
        break;

    default:
        json_error('Price check action not found.', 404);
}
