<?php
/**
 * iPOS Demo — API sinkronisasi state ke MySQL.
 *
 * Endpoint (semua relatif terhadap file ini):
 *   GET  ?action=ping        -> status server + revisi terakhir
 *   GET  ?action=bootstrap   -> seluruh koleksi (untuk perangkat baru)
 *   GET  ?action=poll&since=N-> koleksi yang berubah setelah revisi N
 *   POST ?action=push        -> body { device, collections: { nama: data } }
 *   POST ?action=reset       -> kosongkan seluruh state
 *
 * Tanpa framework, hanya PDO. Cocok untuk shared hosting (PHP >= 7.4).
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---- Konfigurasi ---------------------------------------------------------
// config.php (bila ada) boleh mendefinisikan konstanta berikut.
$configFile = __DIR__ . '/config.php';
if (is_file($configFile)) {
    require $configFile;
}

if (!defined('DB_HOST')) define('DB_HOST', getenv('IPOS_DB_HOST') ?: '127.0.0.1');
if (!defined('DB_PORT')) define('DB_PORT', getenv('IPOS_DB_PORT') ?: '3306');
if (!defined('DB_NAME')) define('DB_NAME', getenv('IPOS_DB_NAME') ?: 'ipos_demo');
if (!defined('DB_USER')) define('DB_USER', getenv('IPOS_DB_USER') ?: 'root');
if (!defined('DB_PASS')) define('DB_PASS', getenv('IPOS_DB_PASS') !== false ? getenv('IPOS_DB_PASS') : '');
if (!defined('API_TOKEN')) define('API_TOKEN', getenv('IPOS_API_TOKEN') ?: '');

// Koleksi yang diizinkan disinkronkan.
const ALLOWED_COLLECTIONS = [
    'users', 'kategori', 'supplier', 'produk', 'pergerakan', 'transaksi',
    'shifts', 'pengeluaran', 'hutang', 'penerimaan', 'logSinkron',
    'resepKonversi', 'pengemasan',
];

function respond(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $code = 500): void
{
    respond(['ok' => false, 'error' => $message], $code);
}

function connect(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (Throwable $e) {
        fail('Koneksi database gagal: ' . $e->getMessage(), 500);
    }

    ensureSchema($pdo);
    return $pdo;
}

function ensureSchema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_meta (
            id TINYINT NOT NULL PRIMARY KEY,
            rev BIGINT NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_state (
            collection VARCHAR(64) NOT NULL PRIMARY KEY,
            data LONGTEXT NOT NULL,
            revision BIGINT NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_revision (revision)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_device (
            device VARCHAR(64) NOT NULL PRIMARY KEY,
            last_seen DATETIME NOT NULL,
            last_rev BIGINT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $pdo->exec(
        'INSERT INTO app_meta (id, rev, updated_at) VALUES (1, 0, NOW())
         ON DUPLICATE KEY UPDATE id = id'
    );
}

function latestRev(PDO $pdo): int
{
    return (int) $pdo->query('SELECT rev FROM app_meta WHERE id = 1')->fetchColumn();
}

function isInitialized(PDO $pdo): bool
{
    return (int) $pdo->query('SELECT COUNT(*) FROM app_state')->fetchColumn() > 0;
}

function touchDevice(PDO $pdo, string $device, int $rev): void
{
    if ($device === '') return;
    $stmt = $pdo->prepare(
        'INSERT INTO app_device (device, last_seen, last_rev) VALUES (?, NOW(), ?)
         ON DUPLICATE KEY UPDATE last_seen = NOW(), last_rev = ?'
    );
    $stmt->execute([$device, $rev, $rev]);
}

// ---- Token opsional ------------------------------------------------------
if (API_TOKEN !== '') {
    $sent = $_SERVER['HTTP_X_API_TOKEN'] ?? '';
    if (!hash_equals(API_TOKEN, (string) $sent)) {
        fail('Token API tidak valid.', 401);
    }
}

$action = $_GET['action'] ?? 'ping';

try {
    $pdo = connect();

    switch ($action) {
        case 'ping':
            respond([
                'ok'          => true,
                'latest'      => latestRev($pdo),
                'initialized' => isInitialized($pdo),
                'serverTime'  => date('c'),
                'database'    => DB_NAME,
                'version'     => '1.0',
            ]);
            break;

        case 'bootstrap':
            $collections = [];
            $revisions   = [];
            $rows = $pdo->query('SELECT collection, data, revision FROM app_state ORDER BY collection');
            foreach ($rows as $row) {
                $collections[$row['collection']] = json_decode((string) $row['data'], true);
                $revisions[$row['collection']]   = (int) $row['revision'];
            }
            respond([
                'ok'          => true,
                'latest'      => latestRev($pdo),
                'initialized' => isInitialized($pdo),
                'collections' => $collections,
                'revisions'   => $revisions,
                'serverTime'  => date('c'),
            ]);
            break;

        case 'poll':
            $since = isset($_GET['since']) ? max(0, (int) $_GET['since']) : 0;
            $stmt = $pdo->prepare(
                'SELECT collection, data, revision FROM app_state WHERE revision > ? ORDER BY revision ASC'
            );
            $stmt->execute([$since]);
            $changed = [];
            foreach ($stmt as $row) {
                $changed[] = [
                    'collection' => $row['collection'],
                    'data'       => json_decode((string) $row['data'], true),
                    'revision'   => (int) $row['revision'],
                ];
            }
            respond([
                'ok'         => true,
                'latest'     => latestRev($pdo),
                'changed'    => $changed,
                'serverTime' => date('c'),
            ]);
            break;

        case 'push':
            $raw  = file_get_contents('php://input') ?: '';
            $body = json_decode($raw, true);
            if (!is_array($body)) {
                fail('Body JSON tidak valid.', 400);
            }
            $collections = $body['collections'] ?? [];
            $device      = substr((string) ($body['device'] ?? ''), 0, 64);
            if (!is_array($collections) || count($collections) === 0) {
                fail('Tidak ada koleksi yang dikirim.', 400);
            }

            $pdo->beginTransaction();
            try {
                $rev = latestRev($pdo);
                // Kunci baris meta agar revisi tetap unik saat banyak perangkat menulis.
                $pdo->query('SELECT rev FROM app_meta WHERE id = 1 FOR UPDATE')->fetchColumn();

                $revisions = [];
                $upsert = $pdo->prepare(
                    'INSERT INTO app_state (collection, data, revision, updated_at)
                     VALUES (?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE data = VALUES(data), revision = VALUES(revision), updated_at = NOW()'
                );

                foreach ($collections as $name => $value) {
                    if (!in_array($name, ALLOWED_COLLECTIONS, true)) continue;
                    if (!is_array($value)) continue;
                    $rev++;
                    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    if ($encoded === false) {
                        throw new RuntimeException('Gagal encode koleksi: ' . $name);
                    }
                    $upsert->execute([$name, $encoded, $rev]);
                    $revisions[$name] = $rev;
                }

                $pdo->prepare('UPDATE app_meta SET rev = ?, updated_at = NOW() WHERE id = 1')->execute([$rev]);
                touchDevice($pdo, $device, $rev);
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }

            respond([
                'ok'        => true,
                'latest'    => $rev,
                'revisions' => $revisions,
                'written'   => array_keys($revisions),
            ]);
            break;

        case 'reset':
            $pdo->beginTransaction();
            try {
                $pdo->exec('DELETE FROM app_state');
                $pdo->exec('DELETE FROM app_device');
                $pdo->exec('UPDATE app_meta SET rev = 0, updated_at = NOW() WHERE id = 1');
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
            respond(['ok' => true, 'latest' => 0]);
            break;

        default:
            fail('Action tidak dikenal: ' . $action, 400);
    }
} catch (Throwable $e) {
    fail('Kesalahan server: ' . $e->getMessage(), 500);
}
