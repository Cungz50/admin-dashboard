<?php
/**
 * PackingHistory Model
 * Stores packing list records with parsed data as JSON
 */
class PackingHistory
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(int $userId, int $limit = 20): array
    {
        $stmt = $this->db->prepare("
            SELECT id, batch_number, stuffing_date, user_id, 
                   JSON_LENGTH(data_json) as stores_count,
                   created_at, updated_at
            FROM packing_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM packing_history WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        if ($result && isset($result['data_json'])) {
            $result['parsed_data'] = json_decode($result['data_json'], true) ?? [];
        }
        return $result ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO packing_history (batch_number, stuffing_date, data_json, user_id)
            VALUES (:batch_number, :stuffing_date, :data_json, :user_id)
        ");
        $stmt->execute([
            'batch_number'  => $data['batch_number'],
            'stuffing_date' => $data['stuffing_date'] ?? null,
            'data_json'     => $data['data_json'],
            'user_id'       => $data['user_id'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM packing_history WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Get total items count from parsed data
     */
    public static function getTotalItems(array $parsedData): int
    {
        $total = 0;
        foreach ($parsedData as $store) {
            if (isset($store['items'])) {
                foreach ($store['items'] as $item) {
                    $total += $item['order'] ?? 0;
                }
            }
        }
        return $total;
    }
}
