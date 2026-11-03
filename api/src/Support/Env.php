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

    /**
     * Thứ tự tìm tệp cấu hình (dùng tệp đầu tiên đọc được):
     *  1. biến SONTRA_ENV_FILE nếu có;
     *  2. api/.env (máy phát triển);
     *  3. <thư mục gốc tài khoản>/sontra-config/son-tra.env — trên hosting, nằm NGOÀI public_html,
     *     tên không bắt đầu bằng dấu chấm nên tải lên được trên mọi trình quản lý tệp.
     */
    public static function load(string $defaultPath): void
    {
        $candidates = array_filter([
            getenv('SONTRA_ENV_FILE') ?: null,
            $defaultPath,
            dirname($defaultPath, 3) . '/sontra-config/son-tra.env',
        ]);
        $path = null;
        foreach ($candidates as $candidate) {
            if (is_file($candidate) && is_readable($candidate)) {
                $path = $candidate;
                break;
            }
        }
        if ($path === null) {
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
