-- ---------------------------------------------------------------------------
-- iPOS Demo — Skema sinkronisasi antar-perangkat (MySQL)
--
-- Cara pakai (shared hosting / phpMyAdmin):
--   1. Buat database, mis. `ipos_demo` (utf8mb4).
--   2. Import file ini ke database tersebut.
--   3. Sesuaikan kredensial di public/api/config.php saat deploy.
--
-- Endpoint API akan otomatis membuat tabel ini bila belum ada, jadi
-- import manual bersifat opsional.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_meta (
  id         TINYINT      NOT NULL PRIMARY KEY,
  rev        BIGINT       NOT NULL DEFAULT 0,
  updated_at DATETIME     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO app_meta (id, rev, updated_at)
VALUES (1, 0, NOW())
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS app_state (
  collection VARCHAR(64) NOT NULL PRIMARY KEY,
  data       LONGTEXT    NOT NULL,
  revision   BIGINT      NOT NULL,
  updated_at DATETIME    NOT NULL,
  INDEX idx_revision (revision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Log perangkat yang pernah menyinkronkan data (opsional, untuk pemantauan).
CREATE TABLE IF NOT EXISTS app_device (
  device     VARCHAR(64) NOT NULL PRIMARY KEY,
  last_seen  DATETIME    NOT NULL,
  last_rev   BIGINT      NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
