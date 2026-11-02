<?php

declare(strict_types=1);

namespace SonTra\Support;

final class Ids
{
    /** Chuỗi ngẫu nhiên an toàn mật mã, prefix dạng "acc-", độ dài 2*bytes hex. */
    public static function random(string $prefix, int $bytes = 12): string
    {
        return $prefix . bin2hex(random_bytes($bytes));
    }
}
