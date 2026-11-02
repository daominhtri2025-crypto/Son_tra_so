<?php

declare(strict_types=1);

/** Áp dụng database/schema.sql. An toàn chạy lại (CREATE TABLE IF NOT EXISTS). Dùng: php bin/migrate.php */

require __DIR__ . '/../bootstrap.php';

use SonTra\Support\Database;

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

$sql = file_get_contents(__DIR__ . '/../database/schema.sql');
if ($sql === false) {
    exit("Không đọc được schema.sql\n");
}
$pdo = Database::connection();
$count = 0;
foreach (preg_split('/;\s*\n/', $sql) ?: [] as $statement) {
    $statement = trim(preg_replace('/^\s*--.*$/m', '', $statement) ?? '');
    if ($statement === '') {
        continue;
    }
    $pdo->exec($statement);
    $count++;
}
echo "Đã áp dụng {$count} lệnh schema.\n";
