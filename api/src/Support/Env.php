<?php

declare(strict_types=1);

namespace SonTra\Support;

/**
 * Đọc cấu hình từ tệp .env (KEY=VALUE). Ưu tiên biến môi trường của máy chủ nếu có.
 * Vị trí tệp có thể đặt bằng biến SONTRA_ENV_FILE — nên đặt NGOÀI thư mục web công khai.
 */
final class Env
{
    /** @var array<string, string> */
    private static array $values = [];

    public static function load(string $defaultPath): void
    {
        $path = getenv('SONTRA_ENV_FILE') ?: $defaultPath;
        if (!is_file($path) || !is_readable($path)) {
            return;
        }
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = array_map('trim', explode('=', $line, 2));
            $value = trim($value, "\"'");
            self::$values[$key] = $value;
        }
    }

    public static function get(string $key, string $default = ''): string
    {
        $fromServer = getenv($key);
        if ($fromServer !== false && $fromServer !== '') {
            return $fromServer;
        }
        return self::$values[$key] ?? $default;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = strtolower(self::get($key, $default ? 'true' : 'false'));
        return in_array($value, ['1', 'true', 'yes', 'on'], true);
    }
}
