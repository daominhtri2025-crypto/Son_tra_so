<?php

declare(strict_types=1);

/**
 * Tạo CSDL (DB_NAME trong api/.env) với bảng mã utf8mb4 nếu chưa có.
 * Dùng khi không có phpMyAdmin hay lệnh mysql. Chạy: php api/bin/create_database.php
 */

require __DIR__ . '/../bootstrap.php';

use SonTra\Support\Env;

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

$name = Env::get('DB_NAME');
if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
    fwrite(STDERR, "DB_NAME trong api/.env phải là chữ, số hoặc dấu gạch dưới (hiện: '{$name}').\n");
    exit(1);
}

try {
    // Kết nối không chọn CSDL, để có thể tạo mới.
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%s;charset=utf8mb4', Env::get('DB_HOST', 'localhost'), Env::get('DB_PORT', '3306')),
        Env::get('DB_USER'),
        Env::get('DB_PASS'),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    fwrite(STDERR, "Không kết nối được MySQL: " . $e->getMessage() . "\nKiểm tra DB_HOST, DB_USER, DB_PASS trong api/.env và MySQL đang chạy.\n");
    exit(1);
}

try {
    $info = $pdo->query('SELECT VERSION() AS v, @@port AS p')->fetch();
echo "Máy chủ: MySQL/MariaDB {$info['v']}, cổng {$info['p']}\n";
$pdo->exec("CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (PDOException $e) {
    fwrite(STDERR, "Không tạo được CSDL '{$name}': " . $e->getMessage() . "\nDùng tài khoản MySQL có quyền CREATE (thường là root) trong DB_USER/DB_PASS.\n");
    exit(1);
}
echo "Đã có CSDL '{$name}' (utf8mb4). Tiếp theo: php api/bin/migrate.php\n";
