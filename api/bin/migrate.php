<?php

declare(strict_types=1);

/** Áp dụng database/schema.sql. An toàn chạy lại. Dùng: php api/bin/migrate.php */

require __DIR__ . '/../bootstrap.php';

use SonTra\Support\Database;
use SonTra\Support\Schema;

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

$count = Schema::apply(Database::connection());
echo "Đã áp dụng {$count} lệnh schema.\n";
