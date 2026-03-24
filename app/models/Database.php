<?php
/**
 * Database Connection Singleton
 * Provides a single PDO instance throughout the application
 */
class Database
{
    private static ?PDO $instance = null;

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;

            self::$instance = new PDO($dsn, DB_USER, DB_PASS);
            self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            self::$instance->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
        }

        return self::$instance;
    }

    /**
     * Initialize database schema and seed data
     */
    public static function initialize(): void
    {
        $db = self::getInstance();

        // Create branches table
        $db->exec("
            CREATE TABLE IF NOT EXISTS branches (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                code VARCHAR(20) UNIQUE NOT NULL,
                address TEXT DEFAULT NULL,
                phone VARCHAR(20) DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create users table
        $db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                status VARCHAR(20) DEFAULT 'active',
                branch_id INT DEFAULT NULL,
                avatar VARCHAR(255) DEFAULT NULL,
                last_login DATETIME DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create activity_log table
        $db->exec("
            CREATE TABLE IF NOT EXISTS activity_log (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                action VARCHAR(100) NOT NULL,
                description TEXT,
                ip_address VARCHAR(45),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create price_checks table
        $db->exec("
            CREATE TABLE IF NOT EXISTS price_checks (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                original_filename VARCHAR(255) NOT NULL,
                filepath VARCHAR(500) NOT NULL,
                fixed_filepath VARCHAR(500) DEFAULT NULL,
                total_records INT DEFAULT 0,
                mismatch_count INT DEFAULT 0,
                updated_count INT DEFAULT 0,
                skipped_count INT DEFAULT 0,
                status VARCHAR(20) DEFAULT 'processing',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create sj_links table
        $db->exec("
            CREATE TABLE IF NOT EXISTS sj_links (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                sj_number VARCHAR(100) NOT NULL,
                generated_url TEXT NOT NULL,
                delivery_date DATE DEFAULT NULL,
                session_batch VARCHAR(100) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create faktur_templates table
        $db->exec("
            CREATE TABLE IF NOT EXISTS faktur_templates (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                original_filename VARCHAR(255) NOT NULL,
                filepath VARCHAR(500) NOT NULL,
                updated_filepath VARCHAR(500) DEFAULT NULL,
                total_records INT DEFAULT 0,
                invalid_records INT DEFAULT 0,
                updated_records INT DEFAULT 0,
                dpp_value DECIMAL(15,2) DEFAULT NULL,
                faktur_number VARCHAR(20) DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'uploaded',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create packing_history table
        $db->exec("
            CREATE TABLE IF NOT EXISTS packing_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                batch_number VARCHAR(100) NOT NULL,
                stuffing_date DATE DEFAULT NULL,
                data_json JSON,
                user_id INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create tanda_terima table
        $db->exec("
            CREATE TABLE IF NOT EXISTS tanda_terima (
                id INT PRIMARY KEY AUTO_INCREMENT,
                penerima VARCHAR(255) NOT NULL,
                tanggal DATE NOT NULL,
                items_json JSON,
                created_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create kwitansi table
        $db->exec("
            CREATE TABLE IF NOT EXISTS kwitansi (
                id INT PRIMARY KEY AUTO_INCREMENT,
                kdcab VARCHAR(20) NOT NULL,
                tanggal DATE NOT NULL,
                no_kwitansi VARCHAR(255) NOT NULL,
                no_faktur VARCHAR(255) NOT NULL,
                dpp BIGINT DEFAULT 0,
                ppn BIGINT DEFAULT 0,
                total BIGINT DEFAULT 0,
                no_ttf VARCHAR(255) DEFAULT NULL,
                tgl_kirim_tagihan DATE DEFAULT NULL,
                user_id INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Seed branches if empty
        $count = (int) $db->query("SELECT COUNT(*) FROM branches")->fetchColumn();
        if ($count === 0) {
            $db->exec("
                INSERT INTO branches (name, code, address, phone, status) VALUES
                ('Kantor Pusat', 'HQ', 'Jl. Sudirman No. 1, Jakarta Pusat', '021-5551000', 'active'),
                ('Cabang Bandung', 'BDG', 'Jl. Asia Afrika No. 50, Bandung', '022-4201000', 'active'),
                ('Cabang Surabaya', 'SBY', 'Jl. Basuki Rahmat No. 100, Surabaya', '031-5321000', 'active')
            ");
        }

        // Seed admin user if not exists
        $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
        $stmt->execute(['admin']);
        if ($stmt->fetchColumn() == 0) {
            $hash = password_hash('CHANGE_THIS_PASSWORD', PASSWORD_DEFAULT);
            $db->prepare("
                INSERT INTO users (username, email, password, full_name, role, status, branch_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ")->execute(['admin', 'admin@yourdomain.com', $hash, 'Administrator', 'admin', 'active', null]);
        }

        // Sample users — hanya untuk development
        if (getenv('APP_ENV') === 'development') {
            $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $stmt->execute(['user1']);
            if ($stmt->fetchColumn() == 0) {
                $sampleUsers = [
                    ['user1', 'user1@example.com', 'User One',   'user',   'active',   1],
                    ['user2', 'user2@example.com', 'User Two',   'editor', 'active',   1],
                    ['user3', 'user3@example.com', 'User Three', 'user',   'inactive', 2],
                ];
                $insert = $db->prepare("
                    INSERT INTO users (username, email, password, full_name, role, status, branch_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                foreach ($sampleUsers as $u) {
                    $insert->execute([
                        $u[0], $u[1],
                        password_hash('dev_password_only', PASSWORD_DEFAULT),
                        $u[2], $u[3], $u[4], $u[5]
                    ]);
                }
            }
        }
    }

    private function __construct() {}
    private function __clone() {}
}
