<?php
/**
 * Branch Model
 * Handles all branch-related database operations
 */
class Branch
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(string $search = ''): array
    {
        if ($search) {
            $stmt = $this->db->prepare("
                SELECT b.*, (SELECT COUNT(*) FROM users WHERE branch_id = b.id) as user_count
                FROM branches b
                WHERE b.name LIKE ? OR b.code LIKE ? OR b.address LIKE ?
                ORDER BY b.created_at DESC
            ");
            $like = "%{$search}%";
            $stmt->execute([$like, $like, $like]);
        } else {
            $stmt = $this->db->query("
                SELECT b.*, (SELECT COUNT(*) FROM users WHERE branch_id = b.id) as user_count
                FROM branches b
                ORDER BY b.created_at DESC
            ");
        }
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT b.*, (SELECT COUNT(*) FROM users WHERE branch_id = b.id) as user_count
            FROM branches b WHERE b.id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function findByCode(string $code): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM branches WHERE code = ?");
        $stmt->execute([$code]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO branches (name, code, address, phone, status)
            VALUES (:name, :code, :address, :phone, :status)
        ");
        $stmt->execute([
            'name'    => $data['name'],
            'code'    => strtoupper($data['code']),
            'address' => $data['address'] ?? null,
            'phone'   => $data['phone'] ?? null,
            'status'  => $data['status'] ?? 'active',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        foreach (['name', 'code', 'address', 'phone', 'status'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "{$field} = :{$field}";
                $params[$field] = $field === 'code' ? strtoupper($data[$field]) : $data[$field];
            }
        }

        if (empty($fields)) return false;

        $params['id'] = $id;
        $sql = "UPDATE branches SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        // Set users' branch_id to NULL before deleting
        $stmt = $this->db->prepare("UPDATE users SET branch_id = NULL WHERE branch_id = ?");
        $stmt->execute([$id]);

        $stmt = $this->db->prepare("DELETE FROM branches WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function count(): int
    {
        return (int) $this->db->query("SELECT COUNT(*) FROM branches")->fetchColumn();
    }

    public function countByStatus(string $status): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM branches WHERE status = ?");
        $stmt->execute([$status]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Get all active branches for dropdown
     */
    public function getActiveList(): array
    {
        return $this->db->query("
            SELECT id, name, code FROM branches WHERE status = 'active' ORDER BY name ASC
        ")->fetchAll();
    }
}
