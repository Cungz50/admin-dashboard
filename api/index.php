<?php
/**
 * API Router
 * All API requests go through this file
 * Returns JSON responses only
 */

// Error handling
set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// Headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// CORS
$allowedOrigin = defined('APP_URL') ? APP_URL : (getenv('APP_URL') ?: 'http://localhost:8081');
header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Start session
session_start();

// Load configuration
require_once __DIR__ . '/../app/config/database.php';

// Load models
require_once __DIR__ . '/../app/models/Database.php';
require_once __DIR__ . '/../app/models/User.php';
require_once __DIR__ . '/../app/models/Branch.php';
require_once __DIR__ . '/../app/models/PriceCheck.php';
require_once __DIR__ . '/../app/models/SjLink.php';
require_once __DIR__ . '/../app/models/FakturTemplate.php';
require_once __DIR__ . '/../app/models/PackingHistory.php';
require_once __DIR__ . '/../app/models/TandaTerima.php';
require_once __DIR__ . '/../app/models/Kwitansi.php';
require_once __DIR__ . '/../app/models/LppDatabase.php';
require_once __DIR__ . '/../app/models/LppDashboard.php';
require_once __DIR__ . '/../app/models/HppCalculator.php';

// Initialize database
Database::initialize();

// Helper: JSON response
function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Helper: JSON error
function json_error(string $message, int $status = 400): void
{
    json_response(['success' => false, 'message' => $message], $status);
}

// Helper: Require auth
function require_auth(): array
{
    if (!isset($_SESSION['user'])) {
        json_error('Unauthorized. Silakan login terlebih dahulu.', 401);
    }
    return $_SESSION['user'];
}

// Helper: Require admin
function require_admin(): array
{
    $user = require_auth();
    if ($user['role'] !== 'admin') {
        json_error('Forbidden. Hanya admin yang bisa mengakses fitur ini.', 403);
    }
    return $user;
}

// Helper: Get JSON body
function get_json_body(): array
{
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

// Helper: Log activity
function log_activity(int $userId, string $action, string $description): void
{
    $db = Database::getInstance();
    $stmt = $db->prepare("
        INSERT INTO activity_log (user_id, action, description, ip_address)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $action, $description, $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);
}

// Helper: Get recent activities
function get_recent_activities(int $limit = 10, ?int $branchId = null): array
{
    $db = Database::getInstance();
    $sql = "SELECT al.*, u.full_name, u.username, u.branch_id
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id";
    $params = [];

    if ($branchId !== null) {
        $sql .= " WHERE u.branch_id = ?";
        $params[] = $branchId;
    }

    $sql .= " ORDER BY al.created_at DESC LIMIT ?";
    $params[] = $limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

// ─── Route the request ───
$endpoint = $_GET['endpoint'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($endpoint) {
        case 'auth':
            require __DIR__ . '/auth.php';
            break;
        case 'users':
            require __DIR__ . '/users.php';
            break;
        case 'branches':
            require __DIR__ . '/branches.php';
            break;
        case 'dashboard':
            require __DIR__ . '/dashboard.php';
            break;
        case 'text-tool':
            require __DIR__ . '/text-tool.php';
            break;
        case 'price-check':
            require __DIR__ . '/price-check.php';
            break;
        case 'sj-link':
            require __DIR__ . '/sj-link.php';
            break;
        case 'faktur-template':
            require __DIR__ . '/faktur-template.php';
            break;
        case 'packing-list':
            require __DIR__ . '/packing-list.php';
            break;
        case 'tanda-terima':
            require __DIR__ . '/tanda-terima.php';
            break;
        case 'monitoring':
            require __DIR__ . '/monitoring.php';
            break;
        case 'lpp':
            require __DIR__ . '/lpp.php';
            break;
        case 'hpp':
            require __DIR__ . '/hpp.php';
            break;
        default:
            json_error('Endpoint not found.', 404);
    }
} catch (PDOException $e) {
    json_error('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    json_error('Server error: ' . $e->getMessage(), 500);
}
