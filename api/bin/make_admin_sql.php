<?php

declare(strict_types=1);

/**
 * Sinh câu lệnh SQL tạo (hoặc đặt lại) tài khoản Quản trị viên để dán vào phpMyAdmin.
 * Mật khẩu chỉ đi qua biến môi trường SONTRA_ADMIN_PASSWORD trên máy của bạn (không ghi vào tệp).
 *
 *   SONTRA_ADMIN_PASSWORD='mật-khẩu-mạnh' php bin/make_admin_sql.php anhdnt@sontra.edu.vn "Đặng Ngọc Triều Anh" > admin.sql
 *
 * Câu lệnh idempotent: chạy lại sẽ cập nhật đúng tài khoản đó.
 */

require __DIR__ . '/../bootstrap.php';

use SonTra\Support\HttpException;
use SonTra\Support\Validator;

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

try {
    $email = Validator::email($argv[1] ?? null);
    $fullName = Validator::text($argv[2] ?? null, 'Họ và tên', 2, 200);
    $password = Validator::password(getenv('SONTRA_ADMIN_PASSWORD') ?: '');
} catch (HttpException $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    fwrite(STDERR, "Dùng: SONTRA_ADMIN_PASSWORD='...' php bin/make_admin_sql.php <email> \"<họ tên>\"\n");
    exit(1);
}

$q = static fn(string $v): string => "'" . str_replace("'", "''", $v) . "'";
$id = 'acc-adm-' . substr(hash('sha256', $email), 0, 20); // ổn định theo email, không đoán được từ bên ngoài
$hash = password_hash($password, PASSWORD_DEFAULT);
$now = gmdate('Y-m-d H:i:s');

echo "-- Tài khoản Quản trị viên Sơn Trà Số ({$email}). Không chứa mật khẩu dạng rõ.\n";
echo "INSERT INTO accounts (id, email, full_name, role, auth_provider, password_hash, active, must_change,\n";
echo "  failed_attempts, created_at, updated_at)\n";
echo "VALUES ({$q($id)}, {$q($email)}, {$q($fullName)}, 'admin', 'local', {$q($hash)}, 1, 0, 0, {$q($now)}, {$q($now)})\n";
echo "ON DUPLICATE KEY UPDATE role = 'admin', full_name = VALUES(full_name), password_hash = VALUES(password_hash),\n";
echo "  active = 1, must_change = 0, failed_attempts = 0, locked_until = NULL, updated_at = VALUES(updated_at);\n";
