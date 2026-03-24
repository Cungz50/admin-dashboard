<?php
/**
 * API: LPP (Laporan Posisi Persediaan)
 * Connects to existing lpp_system database
 */

header('Content-Type: application/json');

try {
    $lpp = new LppDashboard();
    $action = $_GET['action'] ?? $_POST['action'] ?? 'dashboard';

    switch ($action) {

        // ─── List cabang ───
        case 'cabang-list':
            echo json_encode(['success' => true, 'data' => $lpp->getCabangList()]);
            break;

        // ─── List periode ───
        case 'periode-list':
            $cabangId = (int)($_GET['cabang_id'] ?? 0);
            $bopbtk = $_GET['bopbtk'] ?? '';
            echo json_encode(['success' => true, 'data' => $lpp->getPeriodeList($cabangId, $bopbtk)]);
            break;

        // ─── Kategori list ───
        case 'kategori-list':
            echo json_encode(['success' => true, 'data' => $lpp->getKategoriList()]);
            break;

        // ─── Dashboard summary ───
        case 'dashboard':
            $periodeId = (int)($_GET['periode_id'] ?? 0);
            if ($periodeId <= 0) {
                echo json_encode(['success' => false, 'message' => 'periode_id required']);
                break;
            }
            $periode = $lpp->getPeriode($periodeId);
            $summary = $lpp->getSummary($periodeId);
            $nkl = $lpp->getNklBreakdown($periodeId);
            $topKat = $lpp->getTopKategori($periodeId);
            echo json_encode([
                'success' => true,
                'periode' => $periode,
                'summary' => $summary,
                'nkl'     => $nkl,
                'top_kategori' => $topKat,
            ]);
            break;

        // ─── Detail items ───
        case 'detail':
            $periodeId = (int)($_GET['periode_id'] ?? 0);
            $search = $_GET['search'] ?? '';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $result = $lpp->getDetailItems($periodeId, $search, $page);
            echo json_encode(array_merge(['success' => true], $result));
            break;

        // ─── Comparison ───
        case 'comparison':
            echo json_encode(['success' => true, 'data' => $lpp->getComparison()]);
            break;

        // ─── Upload (Python Script Exec) ───
        case 'upload':
            $cabangId = (int)($_POST['cabang_id'] ?? 0);
            $start = $_POST['periode_start'] ?? '';
            $end = $_POST['periode_end'] ?? '';
            $bopbtk = $_POST['bopbtk_periode'] ?? 'Sebelum BOPBTK';

            if (!$cabangId || !$start || !$end || empty($_FILES['file'])) {
                echo json_encode(['success' => false, 'message' => 'Lengkapi form dan pilih file Excel']);
                break;
            }

            // Save uploaded file safely
            $tempDir = __DIR__ . '/../uploads';
            if (!is_dir($tempDir)) mkdir($tempDir, 0777, true);
            $tempFile = $tempDir . '/' . uniqid('lpp_') . '.xlsx';
            
            if (!move_uploaded_file($_FILES['file']['tmp_name'], $tempFile)) {
                echo json_encode(['success' => false, 'message' => 'Gagal menyimpan file Excel sementara']);
                break;
            }

            // Path to Python script
            $scriptPath = realpath(__DIR__ . '/../contoh code/lpp-system/scripts/process_upload.py');
            if (!$scriptPath) {
                echo json_encode(['success' => false, 'message' => 'Script Python tidak ditemukan']);
                @unlink($tempFile);
                break;
            }

            // Execute Python command
            $cmd = escapeshellcmd("python") . " " . escapeshellarg($scriptPath) . " " . escapeshellarg($tempFile) . " " . escapeshellarg((string)$cabangId) . " " . escapeshellarg($start) . " " . escapeshellarg($end) . " " . escapeshellarg($bopbtk);
            $output = shell_exec($cmd . ' 2>&1');
            
            // Cleanup
            @unlink($tempFile);

            if (strpos($output, 'SUCCESS:') !== false) {
                echo json_encode([
                    'success' => true,
                    'message' => trim($output),
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => "Python Error:\n" . trim($output),
                ]);
            }
            break;

        // ─── Delete periode ───
        case 'delete-periode':
            $input = json_decode(file_get_contents('php://input'), true);
            $periodeId = (int)($input['id'] ?? 0);
            if ($periodeId <= 0) {
                echo json_encode(['success' => false, 'message' => 'ID required']);
                break;
            }
            $lpp->deletePeriode($periodeId);
            echo json_encode(['success' => true, 'message' => 'Data berhasil dihapus.']);
            break;

        // ─── Recent uploads ───
        case 'recent-uploads':
            echo json_encode(['success' => true, 'data' => $lpp->getRecentUploads()]);
            break;

        // ─── Analisis Data (Smart Data Explorer) ───
        case 'analisis-data':
            $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $filters = [
                'cabang_ids' => isset($input['cabang_ids']) ? (is_string($input['cabang_ids']) ? json_decode($input['cabang_ids'], true) : $input['cabang_ids']) : [],
                'periode_id' => $input['periode_id'] ?? '',
                'kategori_id' => $input['kategori_id'] ?? '',
                'plu' => $input['plu'] ?? '',
                'nama_barang' => $input['nama_barang'] ?? '',
                'bopbtk_periode' => $input['bopbtk_periode'] ?? '',
            ];
            $columns = isset($input['columns']) ? (is_string($input['columns']) ? json_decode($input['columns'], true) : $input['columns']) : [];
            $aggregation = $input['aggregation'] ?? 'detail';
            if (is_string($aggregation)) {
                // OK
            } elseif (is_array($aggregation)) {
                $aggregation = $aggregation['type'] ?? 'detail';
            }
            $data = $lpp->getAnalisisData($filters, $columns, $aggregation);
            echo json_encode(['success' => true, 'data' => $data, 'count' => count($data), 'aggregationType' => $aggregation]);
            break;

        // ─── Comparison By Periode ───
        case 'comparison-periode':
            $cabangId = (int)($_GET['cabang_id'] ?? 0);
            if ($cabangId <= 0) {
                echo json_encode(['success' => false, 'message' => 'cabang_id required']);
                break;
            }
            echo json_encode(['success' => true, 'data' => $lpp->getComparisonByPeriode($cabangId)]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Unknown action: ' . $action]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
