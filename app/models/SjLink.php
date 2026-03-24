<?php
/**
 * SjLink Model
 * Handles SJ number parsing, URL generation, and link storage
 */
class SjLink
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(int $userId, int $limit = 50): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM sj_links
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    public function findBySessionBatch(string $batch, int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM sj_links
            WHERE session_batch = ? AND user_id = ?
            ORDER BY id ASC
        ");
        $stmt->execute([$batch, $userId]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM sj_links WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO sj_links (user_id, sj_number, generated_url, delivery_date, session_batch)
            VALUES (:user_id, :sj_number, :generated_url, :delivery_date, :session_batch)
        ");
        $stmt->execute([
            'user_id'        => $data['user_id'],
            'sj_number'      => $data['sj_number'],
            'generated_url'  => $data['generated_url'],
            'delivery_date'  => $data['delivery_date'],
            'session_batch'  => $data['session_batch'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function deleteByBatch(string $batch, int $userId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM sj_links WHERE session_batch = ? AND user_id = ?");
        return $stmt->execute([$batch, $userId]);
    }

    public function deleteById(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM sj_links WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getSessionBatches(int $userId, int $limit = 20): array
    {
        $stmt = $this->db->prepare("
            SELECT session_batch, COUNT(*) as link_count, MIN(delivery_date) as min_date, MAX(delivery_date) as max_date, MIN(created_at) as created_at
            FROM sj_links
            WHERE user_id = ?
            GROUP BY session_batch
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    // ─── Static helpers ───

    /**
     * Parse SJ number (first 6 chars = YYMMDD) to date
     */
    public static function parseSjDate(string $sjNumber): ?string
    {
        if (strlen($sjNumber) < 6) return null;

        $year  = '20' . substr($sjNumber, 0, 2);
        $month = substr($sjNumber, 2, 2);
        $day   = substr($sjNumber, 4, 2);

        if (!checkdate((int)$month, (int)$day, (int)$year)) return null;

        return "$year-$month-$day";
    }

    /**
     * Generate delivery order URL from SJ number
     */
    public static function generateUrl(string $sjNumber): ?string
    {
        $date = self::parseSjDate($sjNumber);
        if (!$date) return null;

        $baseUrl = defined('DELIVERY_ORDER_URL') ? DELIVERY_ORDER_URL : '';
        if (!$baseUrl) return null;

        $dt = new DateTime($date);
        $day   = $dt->format('d');
        $month = $dt->format('F');
        $year  = $dt->format('Y');

        return "{$baseUrl}?_date={$day}-{$month}-{$year}&_type=QR&_noNota={$sjNumber}";
    }
}
