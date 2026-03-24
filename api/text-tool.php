<?php
/**
 * Text Tool API Endpoint
 * POST ?action=process — process text manipulation
 */

$action = $_GET['action'] ?? '';
require_auth();

switch ($action) {
    case 'process':
        if ($method !== 'POST') json_error('Method not allowed.', 405);

        $data = get_json_body();
        $textAction  = $data['action'] ?? '';
        $inputText   = $data['inputText'] ?? '';
        $keyword     = $data['keyword'] ?? '';
        $replaceText = $data['replaceText'] ?? '';

        if (trim($inputText) === '') {
            json_error('Input teks tidak boleh kosong.');
        }

        $result = '';

        switch ($textAction) {
            case 'replace':
                $result = str_ireplace('salah', $replaceText, $inputText);
                break;

            case 'removeLines':
                if (trim($keyword) === '') json_error('Keyword tidak boleh kosong.');
                $lines = explode("\n", $inputText);
                $filtered = array_filter($lines, fn($line) => stripos($line, $keyword) !== false);
                $result = implode("\n", $filtered);
                break;

            case 'removeLinesNotContaining':
                if (trim($keyword) === '') json_error('Keyword tidak boleh kosong.');
                $lines = explode("\n", $inputText);
                $filtered = array_filter($lines, fn($line) => stripos($line, $keyword) === false);
                $result = implode("\n", $filtered);
                break;

            default:
                json_error('Aksi tidak valid.');
        }

        $lineCount = count(array_filter(explode("\n", $result), fn($l) => trim($l) !== ''));

        json_response([
            'success'   => true,
            'result'    => $result,
            'lineCount' => $lineCount,
            'action'    => $textAction,
        ]);
        break;

    default:
        json_error('Text tool action not found.', 404);
}
