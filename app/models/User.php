<?php
/**
 * User Model
 * Handles all user-related database operations
 * Supports branch-based data isolation
 */
class User
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(string $search = '', ?int $branchId = null): array
    {
        $sql = "SELECT u.*, b.name as branch_name, b.code as branch_code
                FROM users u
                LEFT JOIN branches b ON u.branch_id = b.id";
        $conditions = [];
        $params = [];

        if ($branchId !== null) {
            $conditions[] = "u.branch_id = ?";
            $params[] = $branchId;
        }

        if ($search) {
            $conditions[] = "(u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)";
            $like = "%{$search}%";
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }

        $sql .= " ORDER BY u.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT u.*, b.name as branch_name, b.code as branch_code
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function findByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare("
            SELECT u.*, b.name as branch_name, b.code as branch_code
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.username = ?
        ");
        $stmt->execute([$username]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO users (username, email, password, full_name, role, status, branch_id)
            VALUES (:username, :email, :password, :full_name, :role, :status, :branch_id)
        ");
        $stmt->execute([
            'username'  => $data['username'],
            'email'     => $data['email'],
            'password'  => password_hash($data['password'], PASSWORD_DEFAULT),
            'full_name' => $data['full_name'],
            'role'      => $data['role'] ?? 'user',
            'status'    => $data['status'] ?? 'active',
            'branch_id' => $data['branch_id'] ?? null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        foreach (['username', 'email', 'full_name', 'role', 'status'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (array_key_exists('branch_id', $data)) {
            $fields[] = "branch_id = :branch_id";
            $params['branch_id'] = $data['branch_id'];
        }

        if (!empty($data['password'])) {
            $fields[] = "password = :password";
            $params['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if (empty($fields)) return false;

        $params['id'] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function updateLastLogin(int $id): void
    {
        $stmt = $this->db->prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$id]);
    }

    public function count(?int $branchId = null): int
    {
        if ($branchId !== null) {
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE branch_id = ?");
            $stmt->execute([$branchId]);
            return (int) $stmt->fetchColumn();
        }
        return (int) $this->db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    }

    public function countByStatus(string $status, ?int $branchId = null): int
    {
        if ($branchId !== null) {
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE status = ? AND branch_id = ?");
            $stmt->execute([$status, $branchId]);
        } else {
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE status = ?");
            $stmt->execute([$status]);
        }
        return (int) $stmt->fetchColumn();
    }

    public function countNewThisMonth(?int $branchId = null): int
    {
        $sql = "SELECT COUNT(*) FROM users WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')";
        $params = [];
        if ($branchId !== null) {
            $sql .= " AND branch_id = ?";
            $params[] = $branchId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    public function countByRole(?int $branchId = null): array
    {
        $sql = "SELECT role, COUNT(*) as count FROM users";
        $params = [];
        if ($branchId !== null) {
            $sql .= " WHERE branch_id = ?";
            $params[] = $branchId;
        }
        $sql .= " GROUP BY role";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
