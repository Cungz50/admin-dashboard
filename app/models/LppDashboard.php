<?php
/**
 * LPP Dashboard Model
 * Reads from existing lpp_system database for inventory analytics
 */
class LppDashboard
{
    private PDO $db;

    public function __construct()
    {
        $this->db = LppDatabase::getInstance();
    }

    // ─── Cabang ───
    public function getCabangList(): array
    {
        return $this->db->query("SELECT * FROM cabang ORDER BY nama_cabang")->fetchAll();
    }

    // ─── Periode ───
    public function getPeriodeList(int $cabangId, string $bopbtk = ''): array
    {
        $sql = "SELECT * FROM periode_laporan WHERE cabang_id = ?";
        $params = [$cabangId];
        if ($bopbtk) { $sql .= " AND bopbtk_periode = ?"; $params[] = $bopbtk; }
        $sql .= " ORDER BY periode_start DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getPeriode(int $periodeId): ?array
    {
        $stmt = $this->db->prepare("SELECT pl.*, c.nama_cabang, c.kode_cabang FROM periode_laporan pl JOIN cabang c ON pl.cabang_id = c.id WHERE pl.id = ?");
        $stmt->execute([$periodeId]);
        return $stmt->fetch() ?: null;
    }

    // ─── Summary Stats ───
    public function getSummary(int $periodeId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT COUNT(DISTINCT plu) AS total_sku,
                   SUM(saldo_awal_value) AS total_saldo_awal,
                   SUM(pengeluaran_sales_value) AS total_sales,
                   SUM(penerimaan_supplier_value) AS total_penerimaan,
                   SUM(intransit_value) AS total_intransit,
                   SUM(koreksi_value) AS total_koreksi,
                   SUM(saldo_akhir_value) AS total_saldo_akhir
            FROM inventory_data WHERE periode_id = ?
        ");
        $stmt->execute([$periodeId]);
        return $stmt->fetch() ?: null;
    }

    // ─── NKL Breakdown ───
    public function getNklBreakdown(int $periodeId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT SUM(retur_value) AS total_retur, SUM(rusak_value) AS total_rusak,
                   SUM(lainlain_value) AS total_lainlain, SUM(nkl_value) AS total_nkl
            FROM inventory_data WHERE periode_id = ?
        ");
        $stmt->execute([$periodeId]);
        return $stmt->fetch() ?: null;
    }

    // ─── Top Kategori ───
    public function getTopKategori(int $periodeId, int $limit = 10): array
    {
        $stmt = $this->db->prepare("
            SELECT k.nama_kategori, SUM(i.saldo_akhir_value) AS total_saldo_akhir,
                   SUM(i.saldo_awal_value) AS total_saldo_awal
            FROM inventory_data i JOIN kategori_plu k ON i.kategori_id = k.id
            WHERE i.periode_id = ? GROUP BY k.id, k.nama_kategori
            ORDER BY total_saldo_akhir DESC LIMIT $limit
        ");
        $stmt->execute([$periodeId]);
        return $stmt->fetchAll();
    }

    // ─── Detail Items ───
    public function getDetailItems(int $periodeId, string $search = '', int $page = 1, int $perPage = 20): array
    {
        $where = "i.periode_id = ?";
        $params = [$periodeId];

        if ($search) {
            $where .= " AND (i.plu LIKE ? OR i.nama_barang LIKE ?)";
            $like = "%$search%";
            $params[] = $like;
            $params[] = $like;
        }

        // Count
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM inventory_data i WHERE $where");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Items
        $offset = ($page - 1) * $perPage;
        $stmt = $this->db->prepare("
            SELECT i.*, k.nama_kategori, k.kode_kategori
            FROM inventory_data i LEFT JOIN kategori_plu k ON i.kategori_id = k.id
            WHERE $where ORDER BY i.nama_barang ASC LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute($params);

        return [
            'items' => $stmt->fetchAll(),
            'total' => $total,
            'page'  => $page,
            'pages' => ceil($total / $perPage),
        ];
    }

    // ─── Comparison (all cabang for latest periode) ───
    public function getComparison(): array
    {
        return $this->db->query("
            SELECT v.* FROM vw_summary_per_cabang v
            INNER JOIN (
                SELECT cabang_id, MAX(periode_start) AS latest
                FROM periode_laporan WHERE status = 'active'
                GROUP BY cabang_id
            ) latest ON v.cabang_id = latest.cabang_id AND v.periode_start = latest.latest
            ORDER BY v.total_saldo_akhir DESC
        ")->fetchAll();
    }

    // ─── Kategori List ───
    public function getKategoriList(): array
    {
        return $this->db->query("SELECT * FROM kategori_plu ORDER BY nama_kategori")->fetchAll();
    }

    // ─── Upload: Create Periode + Bulk Insert ───
    public function createPeriode(int $cabangId, string $start, string $end, string $bopbtk): int
    {
        $stmt = $this->db->prepare("INSERT INTO periode_laporan (cabang_id, periode_start, periode_end, bopbtk_periode) VALUES (?, ?, ?, ?)");
        $stmt->execute([$cabangId, $start, $end, $bopbtk]);
        return (int) $this->db->lastInsertId();
    }

    public function bulkInsertInventory(int $periodeId, array $rows): int
    {
        $inserted = 0;
        $stmt = $this->db->prepare("
            INSERT INTO inventory_data (
                periode_id, no, plu, kategori_id, nama_barang, satuan, acost,
                saldo_awal_qty, saldo_awal_value,
                penerimaan_supplier_qty, penerimaan_supplier_value,
                penerimaan_produksi_qty, penerimaan_produksi_value,
                penerimaan_lainlain_qty, penerimaan_lainlain_value,
                pengeluaran_ig_qty, pengeluaran_ig_value,
                pengeluaran_fg_qty, pengeluaran_fg_value,
                pengeluaran_sales_qty, pengeluaran_sales_value,
                retur_qty, retur_value, rusak_qty, rusak_value,
                lainlain_qty, lainlain_value, nkl_qty, nkl_value,
                koreksi_qty, koreksi_value, intransit_qty, intransit_value,
                saldo_akhir_qty, saldo_akhir_value
            ) VALUES (
                :periode_id, :no, :plu, :kategori_id, :nama_barang, :satuan, :acost,
                :saldo_awal_qty, :saldo_awal_value,
                :penerimaan_supplier_qty, :penerimaan_supplier_value,
                :penerimaan_produksi_qty, :penerimaan_produksi_value,
                :penerimaan_lainlain_qty, :penerimaan_lainlain_value,
                :pengeluaran_ig_qty, :pengeluaran_ig_value,
                :pengeluaran_fg_qty, :pengeluaran_fg_value,
                :pengeluaran_sales_qty, :pengeluaran_sales_value,
                :retur_qty, :retur_value, :rusak_qty, :rusak_value,
                :lainlain_qty, :lainlain_value, :nkl_qty, :nkl_value,
                :koreksi_qty, :koreksi_value, :intransit_qty, :intransit_value,
                :saldo_akhir_qty, :saldo_akhir_value
            )
        ");

        $fields = [
            'no','plu','nama_barang','satuan','acost',
            'saldo_awal_qty','saldo_awal_value',
            'penerimaan_supplier_qty','penerimaan_supplier_value',
            'penerimaan_produksi_qty','penerimaan_produksi_value',
            'penerimaan_lainlain_qty','penerimaan_lainlain_value',
            'pengeluaran_ig_qty','pengeluaran_ig_value',
            'pengeluaran_fg_qty','pengeluaran_fg_value',
            'pengeluaran_sales_qty','pengeluaran_sales_value',
            'retur_qty','retur_value','rusak_qty','rusak_value',
            'lainlain_qty','lainlain_value','nkl_qty','nkl_value',
            'koreksi_qty','koreksi_value','intransit_qty','intransit_value',
            'saldo_akhir_qty','saldo_akhir_value'
        ];

        foreach ($rows as $row) {
            $data = ['periode_id' => $periodeId, 'kategori_id' => null];
            foreach ($fields as $f) {
                $data[$f] = $row[$f] ?? null;
            }
            // Auto-detect kategori from PLU prefix
            if (!empty($row['plu'])) {
                $data['kategori_id'] = $this->findKategoriId($row['plu']);
            }
            $stmt->execute($data);
            $inserted++;
        }
        return $inserted;
    }

    private function findKategoriId(string $plu): ?int
    {
        // Map PLU prefix to kategori — extract first 2-3 chars
        $prefix = strtoupper(substr($plu, 0, 2));
        $stmt = $this->db->prepare("SELECT id FROM kategori_plu WHERE kode_kategori = ? LIMIT 1");
        $stmt->execute([$prefix]);
        $row = $stmt->fetch();
        return $row ? (int) $row['id'] : null;
    }

    // ─── Analisis Data (Smart Data Explorer) ───
    public function getAnalisisData(array $filters, array $columns, string $aggregation = 'detail'): array
    {
        $where = "1=1";
        $params = [];

        // Cabang filter
        if (!empty($filters['cabang_ids'])) {
            $ids = $filters['cabang_ids'];
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where .= " AND pl.cabang_id IN ($placeholders)";
            $params = array_merge($params, $ids);
        }

        // Periode filter
        if (!empty($filters['periode_id'])) {
            if (str_contains($filters['periode_id'], '||')) {
                $parts = explode('||', $filters['periode_id']);
                $where .= " AND pl.periode_start = ? AND pl.periode_end = ?";
                $params[] = $parts[0];
                $params[] = $parts[1];
                if (!empty($parts[2])) { $where .= " AND pl.bopbtk_periode = ?"; $params[] = $parts[2]; }
            } else {
                $where .= " AND inv.periode_id = ?";
                $params[] = (int)$filters['periode_id'];
            }
        }

        // BOPBTK filter
        if (!empty($filters['bopbtk_periode'])) {
            $where .= " AND pl.bopbtk_periode = ?";
            $params[] = $filters['bopbtk_periode'];
        }

        // Kategori filter
        if (!empty($filters['kategori_id'])) {
            $where .= " AND inv.kategori_id = ?";
            $params[] = (int)$filters['kategori_id'];
        }

        // PLU filter
        if (!empty($filters['plu'])) {
            $where .= " AND inv.plu LIKE ?";
            $params[] = '%' . $filters['plu'] . '%';
        }

        // Nama barang filter
        if (!empty($filters['nama_barang'])) {
            $where .= " AND inv.nama_barang LIKE ?";
            $params[] = '%' . $filters['nama_barang'] . '%';
        }

        if ($aggregation === 'kategori') {
            $sql = "SELECT k.id AS kategori_id, k.nama_kategori, COUNT(DISTINCT inv.plu) AS total_sku,
                    COALESCE(SUM(inv.saldo_awal_qty),0) AS saldo_awal_qty, COALESCE(SUM(inv.saldo_awal_value),0) AS saldo_awal_value,
                    COALESCE(SUM(inv.saldo_akhir_qty),0) AS saldo_akhir_qty, COALESCE(SUM(inv.saldo_akhir_value),0) AS saldo_akhir_value,
                    COALESCE(SUM(inv.nkl_value),0) AS nkl_value, COALESCE(SUM(inv.nkl_qty),0) AS nkl_qty,
                    COALESCE(SUM(inv.lainlain_value),0) AS lainlain_value, COALESCE(SUM(inv.rusak_value),0) AS rusak_value,
                    COALESCE(SUM(inv.retur_value),0) AS retur_value, COALESCE(SUM(inv.retur_qty),0) AS retur_qty,
                    COALESCE(SUM(inv.rusak_qty),0) AS rusak_qty, COALESCE(SUM(inv.lainlain_qty),0) AS lainlain_qty,
                    COALESCE(SUM(inv.penerimaan_supplier_qty),0) AS penerimaan_supplier_qty, COALESCE(SUM(inv.penerimaan_supplier_value),0) AS penerimaan_supplier_value,
                    COALESCE(SUM(inv.penerimaan_produksi_qty),0) AS penerimaan_produksi_qty, COALESCE(SUM(inv.penerimaan_produksi_value),0) AS penerimaan_produksi_value,
                    COALESCE(SUM(inv.penerimaan_lainlain_qty),0) AS penerimaan_lainlain_qty, COALESCE(SUM(inv.penerimaan_lainlain_value),0) AS penerimaan_lainlain_value,
                    COALESCE(SUM(inv.pengeluaran_ig_qty),0) AS pengeluaran_ig_qty, COALESCE(SUM(inv.pengeluaran_ig_value),0) AS pengeluaran_ig_value,
                    COALESCE(SUM(inv.pengeluaran_fg_qty),0) AS pengeluaran_fg_qty, COALESCE(SUM(inv.pengeluaran_fg_value),0) AS pengeluaran_fg_value,
                    COALESCE(SUM(inv.pengeluaran_sales_qty),0) AS pengeluaran_sales_qty, COALESCE(SUM(inv.pengeluaran_sales_value),0) AS pengeluaran_sales_value,
                    COALESCE(SUM(inv.koreksi_qty),0) AS koreksi_qty, COALESCE(SUM(inv.koreksi_value),0) AS koreksi_value,
                    COALESCE(SUM(inv.intransit_qty),0) AS intransit_qty, COALESCE(SUM(inv.intransit_value),0) AS intransit_value
                    FROM inventory_data inv
                    JOIN periode_laporan pl ON inv.periode_id = pl.id
                    JOIN cabang c ON pl.cabang_id = c.id
                    LEFT JOIN kategori_plu k ON inv.kategori_id = k.id
                    WHERE $where GROUP BY k.id, k.nama_kategori ORDER BY k.nama_kategori";
        } else {
            $sql = "SELECT c.kode_cabang, inv.plu, inv.nama_barang, k.nama_kategori, inv.satuan, inv.acost,
                    inv.saldo_awal_qty, inv.saldo_awal_value, inv.saldo_akhir_qty, inv.saldo_akhir_value,
                    inv.penerimaan_supplier_qty, inv.penerimaan_supplier_value, inv.penerimaan_produksi_qty, inv.penerimaan_produksi_value,
                    inv.penerimaan_lainlain_qty, inv.penerimaan_lainlain_value,
                    inv.pengeluaran_ig_qty, inv.pengeluaran_ig_value, inv.pengeluaran_fg_qty, inv.pengeluaran_fg_value,
                    inv.pengeluaran_sales_qty, inv.pengeluaran_sales_value,
                    inv.retur_qty, inv.retur_value, inv.rusak_qty, inv.rusak_value,
                    inv.lainlain_qty, inv.lainlain_value, inv.nkl_qty, inv.nkl_value,
                    inv.koreksi_qty, inv.koreksi_value, inv.intransit_qty, inv.intransit_value
                    FROM inventory_data inv
                    JOIN periode_laporan pl ON inv.periode_id = pl.id
                    JOIN cabang c ON pl.cabang_id = c.id
                    LEFT JOIN kategori_plu k ON inv.kategori_id = k.id
                    WHERE $where ORDER BY inv.plu LIMIT 1000";
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // ─── Comparison By Periode (for single cabang) ───
    public function getComparisonByPeriode(int $cabangId): array
    {
        $stmt = $this->db->prepare("SELECT id, periode_start, periode_end, bopbtk_periode FROM periode_laporan WHERE cabang_id = ? ORDER BY periode_start ASC, id ASC");
        $stmt->execute([$cabangId]);
        $periodes = $stmt->fetchAll();

        $last2 = array_slice($periodes, -2);
        $result = [];

        $cabStmt = $this->db->prepare("SELECT * FROM cabang WHERE id = ?");
        $cabStmt->execute([$cabangId]);
        $cabang = $cabStmt->fetch();

        foreach ($last2 as $p) {
            $sumStmt = $this->db->prepare("
                SELECT COUNT(DISTINCT plu) AS total_sku,
                    SUM(saldo_awal_value) AS total_saldo_awal,
                    SUM(penerimaan_supplier_value + penerimaan_produksi_value + penerimaan_lainlain_value) AS total_penerimaan,
                    SUM(pengeluaran_sales_value) AS total_penjualan,
                    SUM(pengeluaran_fg_value) AS total_pengeluaran_fg,
                    SUM(pengeluaran_ig_value) AS total_pengeluaran_ig,
                    SUM(retur_value) AS total_retur, SUM(rusak_value) AS total_rusak,
                    SUM(lainlain_value) AS total_lainlain, SUM(nkl_value) AS total_nkl,
                    SUM(koreksi_value) AS total_koreksi, SUM(intransit_value) AS total_intransit,
                    SUM(saldo_akhir_value) AS total_saldo_akhir
                FROM inventory_data WHERE periode_id = ?
            ");
            $sumStmt->execute([$p['id']]);
            $summary = $sumStmt->fetch();
            $result[] = [
                'nama_cabang' => $cabang['nama_cabang'] ?? '',
                'kode_cabang' => $cabang['kode_cabang'] ?? '',
                'periode_start' => $p['periode_start'],
                'periode_end' => $p['periode_end'],
                'bopbtk_periode' => $p['bopbtk_periode'] ?? '',
                'summary' => $summary
            ];
        }
        return $result;
    }

    // ─── Delete Periode (cascade deletes inventory_data) ───
    public function deletePeriode(int $periodeId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM periode_laporan WHERE id = ?");
        return $stmt->execute([$periodeId]);
    }

    // ─── Recent Uploads ───
    public function getRecentUploads(int $limit = 10): array
    {
        return $this->db->query("
            SELECT pl.*, c.nama_cabang, c.kode_cabang,
                   (SELECT COUNT(*) FROM inventory_data WHERE periode_id = pl.id) AS total_items
            FROM periode_laporan pl JOIN cabang c ON pl.cabang_id = c.id
            ORDER BY pl.upload_date DESC LIMIT $limit
        ")->fetchAll();
    }
}
