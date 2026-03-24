-- =============================================
-- Admin Dashboard Database Schema
-- MySQL — with Multi-Branch Support
-- =============================================

CREATE DATABASE IF NOT EXISTS admin_dashboard
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE admin_dashboard;

-- =============================================
-- Table: branches (kantor cabang)
-- =============================================
CREATE TABLE IF NOT EXISTS branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: users
-- =============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: activity_log
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: price_checks
-- =============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: sj_links
-- =============================================
CREATE TABLE IF NOT EXISTS sj_links (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    sj_number VARCHAR(100) NOT NULL,
    generated_url TEXT NOT NULL,
    delivery_date DATE DEFAULT NULL,
    session_batch VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: faktur_templates
-- =============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: packing_history
-- =============================================
CREATE TABLE IF NOT EXISTS packing_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_number VARCHAR(100) NOT NULL,
    stuffing_date DATE DEFAULT NULL,
    data_json JSON,
    user_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: tanda_terima
-- =============================================
CREATE TABLE IF NOT EXISTS tanda_terima (
    id INT PRIMARY KEY AUTO_INCREMENT,
    penerima VARCHAR(255) NOT NULL,
    tanggal DATE NOT NULL,
    items_json JSON,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: kwitansi
-- =============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Seed: Branches
-- =============================================
INSERT INTO branches (name, code, address, phone, status) VALUES
('Kantor Pusat', 'HQ', 'Jl. Sudirman No. 1, Jakarta Pusat', '021-5551000', 'active'),
('Cabang Bandung', 'BDG', 'Jl. Asia Afrika No. 50, Bandung', '022-4201000', 'active'),
('Cabang Surabaya', 'SBY', 'Jl. Basuki Rahmat No. 100, Surabaya', '031-5321000', 'active');

-- =============================================
-- Seed: Admin user — no branch (access all)
-- =============================================
INSERT INTO users (username, email, password, full_name, role, status, branch_id) VALUES
('admin', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin', 'active', NULL);

-- =============================================
-- Seed: Sample users — assigned to branches
-- =============================================
INSERT INTO users (username, email, password, full_name, role, status, branch_id) VALUES
('johndoe', 'john@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Doe', 'user', 'active', 1),
('janedoe', 'jane@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane Doe', 'editor', 'active', 1),
('bobsmith', 'bob@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob Smith', 'user', 'inactive', 2),
('alicew', 'alice@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alice Williams', 'user', 'active', 2),
('charlie', 'charlie@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Charlie Brown', 'editor', 'active', 3),
('diana', 'diana@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Diana Prince', 'user', 'active', 3),
('edward', 'edward@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Edward Norton', 'user', 'inactive', 1),
('fiona', 'fiona@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Fiona Apple', 'user', 'active', 2);

-- =============================================
-- Seed: Activity log
-- =============================================
INSERT INTO activity_log (user_id, action, description, ip_address) VALUES
(1, 'login', 'Administrator logged in', '127.0.0.1'),
(2, 'login', 'John Doe logged in', '127.0.0.1'),
(1, 'create_user', 'Created user: janedoe', '127.0.0.1'),
(3, 'update_profile', 'Jane Doe updated profile', '127.0.0.1'),
(1, 'login', 'Administrator logged in', '127.0.0.1'),
(4, 'login', 'Bob Smith logged in', '127.0.0.1'),
(1, 'create_user', 'Created user: alicew', '127.0.0.1'),
(5, 'login', 'Alice Williams logged in', '127.0.0.1');
