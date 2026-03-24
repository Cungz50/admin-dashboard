<?php
/**
 * FakturTemplate Model
 * Handles faktur template records, CSV parsing, and generation
 */
class FakturTemplate
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(int $userId, int $limit = 20): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM faktur_templates
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM faktur_templates WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO faktur_templates (user_id, original_filename, filepath, total_records, invalid_records, status)
            VALUES (:user_id, :original_filename, :filepath, :total_records, :invalid_records, :status)
        ");
        $stmt->execute([
            'user_id'           => $data['user_id'],
            'original_filename' => $data['original_filename'],
            'filepath'          => $data['filepath'],
            'total_records'     => $data['total_records'],
            'invalid_records'   => $data['invalid_records'],
            'status'            => $data['status'] ?? 'uploaded',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [];
        $allowed = ['updated_filepath', 'updated_records', 'dpp_value', 'faktur_number', 'status'];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }
        if (empty($fields)) return false;

        $params['id'] = $id;
        $sql = "UPDATE faktur_templates SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM faktur_templates WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // ─── CSV helpers ───

    /**
     * Parse semicolon-delimited CSV file
     */
    public static function parseCsv(string $filepath): array
    {
        $data = [];
        $headers = [];

        if (($handle = fopen($filepath, 'r')) !== false) {
            $headers = fgetcsv($handle, 0, ';');
            if ($headers) {
                $headers = array_map(fn($h) => trim($h, " \t\n\r\0\x0B\""), $headers);
            }

            while (($row = fgetcsv($handle, 0, ';')) !== false) {
                if (count($row) !== count($headers)) continue;
                $row = array_map(fn($v) => trim($v, " \t\n\r\0\x0B\""), $row);
                $rowData = array_combine($headers, $row);

                foreach (['Nilai DPP', 'Nilai PPN', 'Item Non BKP'] as $field) {
                    if (isset($rowData[$field])) {
                        $rowData[$field] = floatval($rowData[$field] ?: 0);
                    }
                }
                $data[] = $rowData;
            }
            fclose($handle);
        }
        return $data;
    }

    /**
     * Generate semicolon-delimited CSV content
     */
    public static function generateCsv(array $data): string
    {
        $output = fopen('php://temp', 'r+');
        $headers = ['No BPB', 'Jenis Faktur Pajak', 'No Faktur Pajak', 'Tgl Faktur Pajak', 'Nilai DPP', 'Nilai PPN', 'Item Non BKP'];

        fputcsv($output, $headers, ';');
        foreach ($data as $row) {
            $rowData = [];
            foreach ($headers as $h) {
                $rowData[] = $row[$h] ?? '';
            }
            fputcsv($output, $rowData, ';');
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        return $csv;
    }
}
