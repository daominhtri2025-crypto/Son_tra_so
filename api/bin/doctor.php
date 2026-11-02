<?php

declare(strict_types=1);

/**
 * Kiểm tra môi trường trước khi chạy: phiên bản PHP, extension, tệp cấu hình, kết nối CSDL, bảng.
 * Dùng: php api/bin/doctor.php   (in ra OK / LỖI cho từng mục, kèm cách sửa)
 */

require __DIR__ . '/../bootstrap.php';

use SonTra\Support\Database;
use SonTra\Support\Env;

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

$failures = 0;
$line = static function (bool $ok, string $label, string $fix = '') use (&$failures): void {
    echo ($ok ? '[OK]   ' : '[LỖI]  ') . $label . "\n";
    if (!$ok) {
        $failures++;
        if ($fix !== '') {
            echo '         → ' . $fix . "\n";
        }
    }
};

echo "PHP " . PHP_VERSION . " — đường dẫn php.ini: " . (php_ini_loaded_file() ?: 'không có') . "\n\n";

$line(version_compare(PHP_VERSION, '8.1.0', '>='), 'Phiên bản PHP ≥ 8.1', 'Cài PHP 8.1 trở lên.');
foreach (['pdo', 'pdo_mysql', 'curl', 'mbstring', 'fileinfo', 'dom', 'json'] as $ext) {
    $line(extension_loaded($ext), "Extension {$ext}", "Mở php.ini, bỏ dấu ; trước dòng extension={$ext}, rồi khởi động lại terminal.");
}

$envFile = __DIR__ . '/../.env';
$line(is_file($envFile), 'Tệp api/.env tồn tại', 'Chạy: cp api/.env.example api/.env (Windows: copy api\\.env.example api\\.env)');
if (is_file($envFile)) {
    $line(Env::get('DB_NAME') !== '', 'DB_NAME đã đặt', 'Mở api/.env và đặt DB_NAME=sontra_so');
}

if (extension_loaded('pdo_mysql') && Env::get('DB_NAME') !== '') {
    try {
        $pdo = Database::connection();
        $line(true, 'Kết nối MySQL: ' . Env::get('DB_USER') . '@' . Env::get('DB_HOST') . '/' . Env::get('DB_NAME'));
        $tables = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);
        $required = ['accounts', 'sessions', 'rate_limits', 'lessons', 'lesson_versions', 'learner_progress', 'assessments', 'news', 'password_resets'];
        $missing = array_diff($required, $tables);
        $line($missing === [], 'Đủ 9 bảng' . ($missing ? ' (thiếu: ' . implode(', ', $missing) . ')' : ''), 'Chạy: php api/bin/migrate.php');
        if ($missing === []) {
            $count = (int) $pdo->query('SELECT COUNT(*) FROM lessons')->fetchColumn();
            $line($count > 0, "Có nội dung bài học ({$count} bài)", 'Chạy: php api/bin/seed.php');
        }
    } catch (\Throwable $e) {
        $line(false, 'Kết nối MySQL: ' . $e->getMessage(), 'Kiểm tra MySQL đang chạy, DB_USER, DB_PASS, DB_NAME trong api/.env.');
    }
}

echo "\n" . ($failures === 0 ? 'Môi trường sẵn sàng.' : "Còn {$failures} mục cần sửa.") . "\n";
exit($failures === 0 ? 0 : 1);
