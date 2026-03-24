<?php
/**
 * Faktur Template API Endpoint
 * POST   ?action=upload    — upload CSV file and parse
 * GET    ?action=list      — list history
 * GET    ?action=edit&id=X — get parsed CSV data for editing
 * POST   ?action=update    — apply faktur number to matching DPP rows
 * GET    ?action=download&id=X — download updated CSV
 * POST   ?action=delete    — delete record
 */

$action = $_GET['action'] ?? '';
$currentUser = require_auth();
$ftModel = new FakturTemplate();

$storagePath = __DIR__ . '/../storage/faktur-templates/';
if (!is_dir($storagePath)) mkdir($storagePath, 0755, true);
if (!is_dir($storagePath . 'updated/')) mkdir($storagePath . 'updated/', 0755, true);

switch ($action) {
    // ─── List History ───
    case 'list':
        $records = $ftModel->findAll($currentUser['id']);
        json_response(['success' => true, 'records' => $records]);
        break;

    // ─── Upload & Parse CSV ───
    case 'upload':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        if (!isset($_FILES['csvfile']) || $_FILES['csvfile']['error'] !== UPLOAD_ERR_OK) {
            json_error('File tidak valid atau tidak terupload.');
        }

        $file = $_FILES['csvfile'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['csv', 'txt'])) json_error('Hanya file .csv atau .txt yang diperbolehkan.');
        if ($file['size'] > 10 * 1024 * 1024) json_error('File terlalu besar. Max 10MB.');

        $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
        $filepath = $storagePath . $filename;
        if (!move_uploaded_file($file['tmp_name'], $filepath)) json_error('Gagal menyimpan file.', 500);

        // Parse CSV
        $csvData = FakturTemplate::parseCsv($filepath);

        // Validate rows
        $validData = [];
        $invalidCount = 0;
        $bpbPattern = '/^\d{4}-[A-Z0-9]{4}-\d+$/';

        foreach ($csvData as $row) {
            if (
                !empty($row['No BPB']) &&
                !empty($row['Tgl Faktur Pajak']) &&
                preg_match($bpbPattern, $row['No BPB'])
            ) {
                $validData[] = $row;
            } else {
                $invalidCount++;
            }
        }

        $relPath = 'faktur-templates/' . $filename;
        $recordId = $ftModel->create([
            'user_id'           => $currentUser['id'],
            'original_filename' => $file['name'],
            'filepath'          => $relPath,
            'total_records'     => count($csvData),
            'invalid_records'   => $invalidCount,
            'status'            => 'uploaded',
        ]);

        // Store valid data in session for editing
        $_SESSION['faktur_template_data'] = [
            'id'       => $recordId,
            'csv_data' => $validData,
        ];

        log_activity($currentUser['id'], 'faktur_upload', 'Uploaded faktur template: ' . $file['name']);

        json_response([
            'success'         => true,
            'message'         => 'File berhasil diupload!' . ($invalidCount > 0 ? " {$invalidCount} baris invalid dihapus." : ''),
            'id'              => $recordId,
            'total_records'   => count($csvData),
            'valid_records'   => count($validData),
            'invalid_records' => $invalidCount,
        ]);
        break;

    // ─── Edit (get parsed CSV data) ───
    case 'edit':
        $id = (int) ($_GET['id'] ?? 0);
        $record = $ftModel->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);

        $sessionData = $_SESSION['faktur_template_data'] ?? null;

        if ($sessionData && $sessionData['id'] == $id) {
            $csvData = $sessionData['csv_data'];
        } else {
            // Reload from file
            $filePath = __DIR__ . '/../storage/' . $record['filepath'];
            if (!file_exists($filePath)) json_error('File tidak ditemukan.', 404);
            $csvData = FakturTemplate::parseCsv($filePath);
            $_SESSION['faktur_template_data'] = ['id' => $id, 'csv_data' => $csvData];
        }

        // Get unique DPP values for quick selection
        $dppValues = [];
        foreach ($csvData as $row) {
            $dpp = floatval($row['Nilai DPP'] ?? 0);
            if ($dpp > 0) {
                $key = number_format($dpp, 2, '.', '');
                if (!isset($dppValues[$key])) {
                    $dppValues[$key] = ['value' => $dpp, 'count' => 0, 'existing_faktur' => $row['No Faktur Pajak'] ?? ''];
                }
                $dppValues[$key]['count']++;
            }
        }

        json_response([
            'success'    => true,
            'record'     => $record,
            'csv_data'   => $csvData,
            'dpp_values' => array_values($dppValues),
        ]);
        break;

    // ─── Update (apply faktur number) ───
    case 'update':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $dppValue = floatval($data['dpp_value'] ?? 0);
        $fakturNumber = trim($data['faktur_number'] ?? '');

        if ($dppValue <= 0) json_error('Nilai DPP harus lebih dari 0.');
        if (!preg_match('/^\d{16}$/', $fakturNumber)) json_error('No Faktur Pajak harus 16 digit angka.');

        $sessionData = $_SESSION['faktur_template_data'] ?? null;
        if (!$sessionData) json_error('Session expired. Silakan upload ulang.');

        $recordId = $sessionData['id'];
        $record = $ftModel->findById($recordId);
        if (!$record) json_error('Record tidak ditemukan.', 404);

        $csvData = $sessionData['csv_data'];
        $updatedCount = 0;

        foreach ($csvData as $key => $row) {
            if (floatval($row['Nilai DPP']) == $dppValue) {
                $csvData[$key]['No Faktur Pajak'] = $fakturNumber;
                $updatedCount++;
            }
        }

        // Save updated CSV
        $updatedFilename = 'updated_' . basename($record['filepath']);
        $updatedFullPath = $storagePath . 'updated/' . $updatedFilename;
        file_put_contents($updatedFullPath, FakturTemplate::generateCsv($csvData));

        $ftModel->update($recordId, [
            'updated_filepath' => 'faktur-templates/updated/' . $updatedFilename,
            'updated_records'  => $updatedCount,
            'dpp_value'        => $dppValue,
            'faktur_number'    => $fakturNumber,
            'status'           => 'updated',
        ]);

        $_SESSION['faktur_template_data']['csv_data'] = $csvData;

        log_activity($currentUser['id'], 'faktur_update', "Updated {$updatedCount} rows in faktur template");

        json_response([
            'success'       => true,
            'message'       => "{$updatedCount} baris berhasil diupdate dengan No Faktur {$fakturNumber}!",
            'updated_count' => $updatedCount,
            'csv_data'      => $csvData,
        ]);
        break;

    // ─── Download Updated ───
    case 'download':
        $id = (int) ($_GET['id'] ?? 0);
        $record = $ftModel->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);
        if (!$record['updated_filepath']) json_error('File belum diupdate.');

        $filePath = __DIR__ . '/../storage/' . $record['updated_filepath'];
        if (!file_exists($filePath)) json_error('File tidak ditemukan.', 404);

        $ftModel->update($id, ['status' => 'downloaded']);

        header_remove('Content-Type');
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="Updated_Faktur_Pajak.csv"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;

    // ─── Delete ───
    case 'delete':
        if ($method !== 'POST') json_error('Method not allowed.', 405);
        $data = get_json_body();
        $id = (int) ($data['id'] ?? 0);
        $record = $ftModel->findById($id);
        if (!$record || $record['user_id'] != $currentUser['id']) json_error('Record tidak ditemukan.', 404);

        $orig = __DIR__ . '/../storage/' . $record['filepath'];
        if (file_exists($orig)) unlink($orig);
        if ($record['updated_filepath']) {
            $upd = __DIR__ . '/../storage/' . $record['updated_filepath'];
            if (file_exists($upd)) unlink($upd);
        }

        $ftModel->delete($id);
        log_activity($currentUser['id'], 'faktur_delete', 'Deleted faktur template: ' . $record['original_filename']);
        json_response(['success' => true, 'message' => 'Template berhasil dihapus.']);
        break;

    default:
        json_error('Faktur template action not found.', 404);
}
