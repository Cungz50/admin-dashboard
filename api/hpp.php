<?php
/**
 * API: HPP (Harga Pokok Penjualan)
 * Connects to existing lpp_system database
 */

header('Content-Type: application/json');

try {
    $hpp = new HppCalculator();
    $action = $_GET['action'] ?? 'summary';

    switch ($action) {

        case 'summary':
            $periodeId = (int)($_GET['periode_id'] ?? 0);
            if ($periodeId <= 0) {
                echo json_encode(['success' => false, 'message' => 'periode_id required']);
                break;
            }
            $summary = $hpp->getHppSummary($periodeId);
            echo json_encode(['success' => true, 'summary' => $summary]);
            break;

        case 'items':
            $periodeId = (int)($_GET['periode_id'] ?? 0);
            $search = $_GET['search'] ?? '';
            $kategoriId = (int)($_GET['kategori_id'] ?? 0);
            $items = $hpp->getHppItems($periodeId, $search, $kategoriId);
            echo json_encode(['success' => true, 'items' => $items]);
            break;

        case 'sim-items':
            $periodeId = (int)($_GET['periode_id'] ?? 0);
            $items = $hpp->getSimItems($periodeId);
            echo json_encode(['success' => true, 'items' => $items]);
            break;

        case 'kategori-list':
            $periodeId = (int)($_GET['periode_id'] ?? 0);
            $data = $hpp->getKategoriForPeriode($periodeId);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Unknown action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
