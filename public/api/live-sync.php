<?php
/**
 * iPOS Demo — Live Sync Relay (Flat-File / Zero Database).
 *
 * Digunakan saat aplikasi dijalankan di Shared Hosting tanpa perlu setup database MySQL di cPanel.
 * Menyimpan event mutasi stok realtime ke file JSON sementara.
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

$storageDir = __DIR__ . '/storage';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0777, true);
}

$eventsFile = $storageDir . '/sync_events.json';

function getEvents(string $file): array
{
    if (!file_exists($file)) return [];
    $raw = @file_get_contents($file);
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function saveEvents(string $file, array $events): void
{
    // Batasi 50 event terakhir
    if (count($events) > 50) {
        $events = array_slice($events, -50);
    }
    @file_put_contents($file, json_encode($events, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

$action = $_GET['action'] ?? 'ping';

if ($action === 'ping') {
    echo json_encode([
        'ok' => true,
        'mode' => 'flat-file-zero-db',
        'serverTime' => round(microtime(true) * 1000),
    ]);
    exit;
}

if ($action === 'broadcast' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input') ?: '';
    $payload = json_decode($raw, true);

    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
        exit;
    }

    $payload['serverReceivedAt'] = round(microtime(true) * 1000);
    if (!isset($payload['timestamp'])) {
        $payload['timestamp'] = $payload['serverReceivedAt'];
    }

    $events = getEvents($eventsFile);
    $events[] = $payload;
    saveEvents($eventsFile, $events);

    echo json_encode(['ok' => true, 'timestamp' => $payload['serverReceivedAt']]);
    exit;
}

if ($action === 'poll') {
    $since = isset($_GET['since']) ? (float) $_GET['since'] : 0;
    $excludeDevice = $_GET['exclude'] ?? '';

    $events = getEvents($eventsFile);
    $fresh = [];

    foreach ($events as $ev) {
        $ts = (float) ($ev['timestamp'] ?? 0);
        $device = $ev['senderDevice'] ?? '';
        if ($ts > $since) {
            if ($excludeDevice !== '' && $device === $excludeDevice) {
                continue;
            }
            $fresh[] = $ev;
        }
    }

    echo json_encode([
        'ok' => true,
        'events' => $fresh,
        'now' => round(microtime(true) * 1000),
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Action not found']);
