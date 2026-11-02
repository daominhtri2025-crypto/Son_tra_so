<?php

declare(strict_types=1);

/**
 * Khởi tạo ứng dụng: autoload PSR-4 tối giản cho namespace SonTra\ và nạp cấu hình.
 * Không phụ thuộc Composer để tương thích với gói hosting chia sẻ (Hostinger, iNET).
 */

spl_autoload_register(static function (string $class): void {
    $prefix = 'SonTra\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = __DIR__ . '/src/' . $relative . '.php';
    if (is_file($file)) {
        require $file;
    }
});

use SonTra\Support\Env;

Env::load(__DIR__ . '/.env');
