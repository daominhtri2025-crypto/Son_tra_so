<?php

declare(strict_types=1);

namespace SonTra\Support;

use DateTimeImmutable;
use DateTimeZone;

/** Mọi thời điểm lưu trong CSDL ở UTC, định dạng DATETIME 'Y-m-d H:i:s'. */
final class Clock
{
    public static function nowUtc(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
    }

    public static function inUtc(string $modifier): string
    {
        return (new DateTimeImmutable($modifier, new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
    }

    public static function toIso(?string $utc): ?string
    {
        if ($utc === null || $utc === '') {
            return null;
        }
        return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');
    }
}
