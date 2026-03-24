<?php
/**
 * TandaTerima Model
 * Stores tanda terima tagihan with items as JSON
 */
class TandaTerima
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(int $userId, int $limit = 20): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM tanda_terima
            WHERE created_by = ?
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        $results = $stmt->fetchAll();
        foreach ($results as &$r) {
            $r['items'] = json_decode($r['items_json'] ?? '[]', true);
            $r['items_count'] = count($r['items']);
            $r['total_tagihan'] = array_sum(array_column($r['items'], 'jumlah_tagihan'));
        }
        return $results;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM tanda_terima WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        if ($result) {
            $result['items'] = json_decode($result['items_json'] ?? '[]', true);
        }
        return $result ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO tanda_terima (penerima, tanggal, items_json, created_by)
            VALUES (:penerima, :tanggal, :items_json, :created_by)
        ");
        $stmt->execute([
            'penerima'   => $data['penerima'],
            'tanggal'    => $data['tanggal'],
            'items_json' => json_encode($data['items']),
            'created_by' => $data['created_by'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM tanda_terima WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
