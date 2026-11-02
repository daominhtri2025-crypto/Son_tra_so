<?php

declare(strict_types=1);

/**
 * Bộ định tuyến cho máy chủ PHP tích hợp (phát triển và kiểm thử cục bộ):
 *   php -S 127.0.0.1:8080 -t dist scripts/php-dev-router.php
 * Mô phỏng .htaccess trên hosting: /api/* → api/index.php; /uploads/media/* → thư mục media;
 * tệp tĩnh giữ nguyên; mọi đường dẫn khác → index.html (ứng dụng một trang).
 */

$root = dirname(__DIR__);
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($path === '/api' || str_starts_with($path, '/api/')) {
    require $root . '/api/index.php';
    return true;
}

if (str_starts_with($path, '/uploads/media/')) {
    $dir = getenv('MEDIA_DIR') ?: $root . '/uploads/media';
    $file = $dir . '/' . basename($path);
    if (is_file($file)) {
        header('Content-Type: ' . (mime_content_type($file) ?: 'application/octet-stream'));
        readfile($file);
        return true;
    }
    http_response_code(404);
    return true;
}

$static = $root . '/dist' . $path;
if ($path !== '/' && is_file($static)) {
    return false;
}
header('Content-Type: text/html; charset=utf-8');
readfile($root . '/dist/index.html');
return true;
