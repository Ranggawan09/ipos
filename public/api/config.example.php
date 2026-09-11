<?php
/**
 * Salin file ini menjadi `config.php` lalu sesuaikan kredensial database.
 * File `config.php` tidak diikutsertakan ke git.
 */

define('DB_HOST', 'localhost');   // shared hosting biasanya 'localhost'
define('DB_PORT', '3306');
define('DB_NAME', 'ipos_demo');   // nama database
define('DB_USER', 'root');        // user database
define('DB_PASS', '');            // password database

// Opsional: isi untuk membatasi akses API (kirim header X-Api-Token dari klien).
define('API_TOKEN', '');
