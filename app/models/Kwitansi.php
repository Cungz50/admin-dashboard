<?php
/**
 * Kwitansi Model
 * Monitoring kwitansi records with CRUD, filtering, and stats
 */
class Kwitansi
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(int $userId, array $filters = []): array
    {
        $sql = "SELECT * FROM kwitansi WHERE user_id = ?";
        $params = [$userId];

        if (!empty($filters['kdcab'])) {
            $sql .= " AND kdcab = ?";
            $params[] = $filters['kdcab'];
        }
        if (!empty($filters['tanggal'])) {
            $sql .= " AND tanggal = ?";
            $params[] = $filters['tanggal'];
        }

        $sql .= " ORDER BY tanggal DESC, id DESC";

        $limit = $filters['limit'] ?? 50;
        if ($limit !== 'all') {
            $sql .= " LIMIT " . (int) $limit;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM kwitansi WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO kwitansi (kdcab, tanggal, no_kwitansi, no_faktur, dpp, ppn, total, no_ttf, tgl_kirim_tagihan, user_id)
            VALUES (:kdcab, :tanggal, :no_kwitansi, :no_faktur, :dpp, :ppn, :total, :no_ttf, :tgl_kirim_tagihan, :user_id)
        ");
        $stmt->execute([
            'kdcab'             => $data['kdcab'],
            'tanggal'           => $data['tanggal'],
            'no_kwitansi'       => $data['no_kwitansi'],
            'no_faktur'         => $data['no_faktur'],
            'dpp'               => (int) preg_replace('/[^0-9]/', '', $data['dpp'] ?? '0'),
            'ppn'               => (int) preg_replace('/[^0-9]/', '', $data['ppn'] ?? '0'),
            'total'             => (int) preg_replace('/[^0-9]/', '', $data['total'] ?? '0'),
            'no_ttf'            => $data['no_ttf'] ?? null,
            'tgl_kirim_tagihan' => $data['tgl_kirim_tagihan'] ?: null,
            'user_id'           => $data['user_id'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $stmt = $this->db->prepare("
            UPDATE kwitansi SET
                kdcab = :kdcab, tanggal = :tanggal, no_kwitansi = :no_kwitansi,
                no_faktur = :no_faktur, dpp = :dpp, ppn = :ppn, total = :total,
                no_ttf = :no_ttf, tgl_kirim_tagihan = :tgl_kirim_tagihan
            WHERE id = :id
        ");
        return $stmt->execute([
            'kdcab'             => $data['kdcab'],
            'tanggal'           => $data['tanggal'],
            'no_kwitansi'       => $data['no_kwitansi'],
            'no_faktur'         => $data['no_faktur'],
            'dpp'               => (int) preg_replace('/[^0-9]/', '', $data['dpp'] ?? '0'),
            'ppn'               => (int) preg_replace('/[^0-9]/', '', $data['ppn'] ?? '0'),
            'total'             => (int) preg_replace('/[^0-9]/', '', $data['total'] ?? '0'),
            'no_ttf'            => $data['no_ttf'] ?? null,
            'tgl_kirim_tagihan' => $data['tgl_kirim_tagihan'] ?: null,
            'id'                => $id,
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM kwitansi WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function bulkInsert(array $rows, int $userId): array
    {
        $inserted = 0;
        $duplikat = [];

        foreach ($rows as $row) {
            $noKw = trim($row['no_kwitansi'] ?? '');
            if (!$noKw) continue;

            // Check duplicate
            $check = $this->db->prepare("SELECT id FROM kwitansi WHERE TRIM(no_kwitansi) = TRIM(?) AND user_id = ?");
            $check->execute([$noKw, $userId]);
            if ($check->fetch()) {
                $duplikat[] = $noKw;
                continue;
            }

            $row['user_id'] = $userId;
            $this->create($row);
            $inserted++;
        }

        return ['inserted' => $inserted, 'duplikat' => $duplikat];
    }

    public function getStats(int $userId): array
    {
        $today = date('Y-m-d');
        $month = date('m');
        $year = date('Y');

        $total = $this->db->prepare("SELECT COUNT(*) FROM kwitansi WHERE user_id = ?");
        $total->execute([$userId]);

        $todayCount = $this->db->prepare("SELECT COUNT(*) FROM kwitansi WHERE user_id = ? AND tanggal = ?");
        $todayCount->execute([$userId, $today]);

        $monthCount = $this->db->prepare("SELECT COUNT(*) FROM kwitansi WHERE user_id = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?");
        $monthCount->execute([$userId, $month, $year]);

        return [
            'total'      => (int) $total->fetchColumn(),
            'today'      => (int) $todayCount->fetchColumn(),
            'this_month' => (int) $monthCount->fetchColumn(),
        ];
    }

    public function exportAll(int $userId): array
    {
        $stmt = $this->db->prepare("SELECT * FROM kwitansi WHERE user_id = ? ORDER BY tanggal DESC, id DESC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }
}
