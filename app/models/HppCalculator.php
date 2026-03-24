<?php
/**
 * HPP Calculator Model
 * Reads from lpp_system database for HPP analysis
 */
class HppCalculator
{
    private PDO $db;

    public function __construct()
    {
        $this->db = LppDatabase::getInstance();
    }

    // ─── HPP Summary Stats ───
    public function getHppSummary(int $periodeId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT COUNT(DISTINCT plu) AS total_sku,
                   AVG(acost) AS avg_acost, MIN(acost) AS min_acost,
                   MAX(acost) AS max_acost,
                   SUM(acost * pengeluaran_sales_qty) AS total_hpp_sales
            FROM inventory_data WHERE periode_id = ? AND acost > 0
        ");
        $stmt->execute([$periodeId]);
        return $stmt->fetch() ?: null;
    }

    // ─── HPP Items ───
    public function getHppItems(int $periodeId, string $search = '', int $kategoriId = 0): array
    {
        $where = "i.periode_id = ? AND i.acost > 0";
        $params = [$periodeId];

        if ($search) {
            $where .= " AND (i.plu LIKE ? OR i.nama_barang LIKE ?)";
            $like = "%$search%";
            $params[] = $like; $params[] = $like;
        }
        if ($kategoriId > 0) {
            $where .= " AND i.kategori_id = ?";
            $params[] = $kategoriId;
        }

        $stmt = $this->db->prepare("
            SELECT i.plu, i.nama_barang, i.satuan, i.acost,
                   i.pengeluaran_sales_qty, i.saldo_akhir_qty, i.saldo_akhir_value,
                   k.nama_kategori, k.kode_kategori
            FROM inventory_data i LEFT JOIN kategori_plu k ON i.kategori_id = k.id
            WHERE $where ORDER BY i.acost DESC
        ");
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // ─── Sim Items (all items with acost) ───
    public function getSimItems(int $periodeId): array
    {
        $stmt = $this->db->prepare("
            SELECT i.plu, i.nama_barang, i.satuan, i.acost,
                   k.kode_kategori, k.nama_kategori
            FROM inventory_data i LEFT JOIN kategori_plu k ON i.kategori_id = k.id
            WHERE i.periode_id = ? AND i.acost > 0
            ORDER BY k.kode_kategori, i.nama_barang
        ");
        $stmt->execute([$periodeId]);
        return $stmt->fetchAll();
    }

    // ─── Kategori list for current periode ───
    public function getKategoriForPeriode(int $periodeId): array
    {
        $stmt = $this->db->prepare("
            SELECT DISTINCT k.id, k.kode_kategori, k.nama_kategori
            FROM inventory_data i JOIN kategori_plu k ON i.kategori_id = k.id
            WHERE i.periode_id = ? ORDER BY k.nama_kategori
        ");
        $stmt->execute([$periodeId]);
        return $stmt->fetchAll();
    }
}
