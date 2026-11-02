<?php

declare(strict_types=1);

namespace SonTra\Support;

use PDO;

/** Áp dụng database/schema.sql. Dùng chung cho bin/migrate.php và bộ kiểm thử. An toàn khi chạy lại. */
final class Schema
{
    public static function apply(PDO $pdo): int
    {
        $sql = (string) file_get_contents(dirname(__DIR__, 2) . '/database/schema.sql');
        $count = 0;
        foreach (preg_split('/;\s*\n/', $sql) ?: [] as $statement) {
            $statement = trim(preg_replace('/^\s*--.*$/m', '', $statement) ?? '');
            if ($statement === '') {
                continue;
            }
            $pdo->exec($statement);
            $count++;
        }
        return $count;
    }
}
