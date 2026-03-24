<?php
/**
 * PriceCheck Model
 * Handles price check records and file analysis
 */
class PriceCheck
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(int $userId, int $limit = 20): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM price_checks
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM price_checks WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO price_checks (user_id, original_filename, filepath, total_records, mismatch_count, status)
            VALUES (:user_id, :original_filename, :filepath, :total_records, :mismatch_count, :status)
        ");
        $stmt->execute([
            'user_id'           => $data['user_id'],
            'original_filename' => $data['original_filename'],
            'filepath'          => $data['filepath'],
            'total_records'     => $data['total_records'],
            'mismatch_count'    => $data['mismatch_count'],
            'status'            => $data['status'] ?? 'processing',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        foreach (['fixed_filepath', 'updated_count', 'skipped_count', 'status'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fields)) return false;

        $params['id'] = $id;
        $sql = "UPDATE price_checks SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM price_checks WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
