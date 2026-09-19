<?php
/**
 * iPOS Demo — Live Sync Relay (Flat-File / Zero Database).
 *
 * Menggunakan sistem nomor revisi (revision sequence) agar bebas dari
 * perbedaan jam (clock-skew) antara perangkat HP dan server shared hosting.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Device-Id');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Tentukan direktori penyimpanan yang benar-benar bisa ditulis
function getEventsFilePath(): string
{
    $candidates = [
        __DIR__ . '/storage',
        __DIR__,
        sys_get_temp_dir(),
    ];

    foreach ($candidates as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        if (is_dir($dir) && is_writable($dir)) {
            return $dir . '/ipos_sync_store.json';
        }
    }

    return sys_get_temp_dir() . '/ipos_sync_store.json';
}

$eventsFile = getEventsFilePath();

function loadStore(string $file): array
{
    if (!file_exists($file)) {
        return ['revision' => 0, 'events' => []];
    }
    $raw = @file_get_contents($file);
    if (!$raw) {
        return ['revision' => 0, 'events' => []];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return ['revision' => 0, 'events' => []];
    }
    return [
        'revision' => (int) ($data['revision'] ?? 0),
        'events' => is_array($data['events'] ?? null) ? $data['events'] : [],
    ];
}

function saveStore(string $file, array $store): void
{
    if (count($store['events']) > 60) {
        $store['events'] = array_slice($store['events'], -50);
    }
    @file_put_contents($file, json_encode($store, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

$action = $_GET['action'] ?? 'ping';

if ($action === 'ping') {
    $store = loadStore($eventsFile);
    echo json_encode([
        'ok' => true,
        'mode' => 'flat-file-zero-db',
        'current_rev' => $store['revision'],
        'storage_path' => basename($eventsFile),
        'timestamp' => round(microtime(true) * 1000),
    ]);
    exit;
}

if ($action === 'broadcast' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input') ?: '';
    $payload = json_decode($raw, true);

    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload']);
        exit;
    }

    $store = loadStore($eventsFile);
    $store['revision'] = $store['revision'] + 1;
    $payload['rev'] = $store['revision'];
    $payload['serverReceivedAt'] = round(microtime(true) * 1000);

    $store['events'][] = $payload;
    saveStore($eventsFile, $store);

    echo json_encode([
        'ok' => true,
        'rev' => $store['revision'],
        'serverTime' => $payload['serverReceivedAt'],
    ]);
    exit;
}

if ($action === 'poll') {
    $sinceRev = isset($_GET['since_rev']) ? (int) $_GET['since_rev'] : 0;
    $excludeDevice = $_GET['exclude'] ?? '';

    $store = loadStore($eventsFile);
    $fresh = [];

    foreach ($store['events'] as $ev) {
        $rev = (int) ($ev['rev'] ?? 0);
        $device = $ev['senderDevice'] ?? '';
        if ($rev > $sinceRev) {
            if ($excludeDevice !== '' && $device === $excludeDevice) {
                continue;
            }
            $fresh[] = $ev;
        }
    }

    echo json_encode([
        'ok' => true,
        'current_rev' => $store['revision'],
        'events' => $fresh,
        'now' => round(microtime(true) * 1000),
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Action not found']);
