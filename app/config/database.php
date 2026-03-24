<?php
/**
 * Database Configuration
 * 
 * Reads from environment variables with sensible defaults.
 * Copy .env.example to .env and fill in your values.
 */

// Load .env file if it exists (for non-Docker environments)
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (str_starts_with(trim($line), '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!getenv($key)) {
                putenv("$key=$value");
            }
        }
    }
}

// Database connection
define('DB_HOST', getenv('DB_HOST') ?: 'db');
define('DB_NAME', getenv('DB_NAME') ?: 'admin_dashboard');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');

// External database (LPP/HPP system)
define('LPP_DB_NAME', getenv('LPP_DB_NAME') ?: 'lpp_system');

// Application
define('APP_NAME', getenv('APP_NAME') ?: 'AdminPanel');
define('APP_VERSION', getenv('APP_VERSION') ?: '1.0.0');

// Session configuration
define('SESSION_LIFETIME', (int)(getenv('SESSION_LIFETIME') ?: 3600));

// Application URL (for CORS)
define('APP_URL', getenv('APP_URL') ?: 'http://localhost:8081');

// Internal system URLs
define('DELIVERY_ORDER_URL', getenv('DELIVERY_ORDER_URL') ?: '');
define('LPP_SCRIPT_PATH', getenv('LPP_SCRIPT_PATH') ?: '');

// Timezone
date_default_timezone_set('Asia/Jakarta');
