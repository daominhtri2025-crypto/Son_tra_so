<?php

declare(strict_types=1);

namespace SonTra\Repositories;

use SonTra\Support\Clock;
use SonTra\Support\Database;

/** Bộ đếm cửa sổ cố định, nguyên tử nhờ khóa hàng (SELECT ... FOR UPDATE). */
final class RateLimitRepository
{
    /** Ghi nhận một lần thử và trả về số lần đã dùng trong cửa sổ hiện tại. */
    public function hit(string $key, int $windowSeconds): int
    {
        return Database::transaction(function (\PDO $pdo) use ($key, $windowSeconds): int {
            $stmt = $pdo->prepare('SELECT window_start, hits FROM rate_limits WHERE limit_key = ? FOR UPDATE');
            $stmt->execute([$key]);
            $row = $stmt->fetch();
            $now = Clock::nowUtc();

            if ($row === false || strtotime($row['window_start'] . ' UTC') + $windowSeconds <= time()) {
                $pdo->prepare(
                    'INSERT INTO rate_limits (limit_key, window_start, hits) VALUES (?, ?, 1)
                     ON DUPLICATE KEY UPDATE window_start = VALUES(window_start), hits = 1'
                )->execute([$key, $now]);
                return 1;
            }
            $pdo->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE limit_key = ?')->execute([$key]);
            return (int) $row['hits'] + 1;
        });
    }

    public function reset(string $key): void
    {
        Database::connection()->prepare('DELETE FROM rate_limits WHERE limit_key = ?')->execute([$key]);
    }
}
