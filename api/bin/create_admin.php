<?php

declare(strict_types=1);

/**
 * Tạo hoặc nâng cấp tài khoản Quản trị viên đầu tiên. Mật khẩu KHÔNG được ghi trong mã:
 * nhập tương tác (không hiển thị) hoặc qua biến môi trường SONTRA_ADMIN_PASSWORD.
 *
 *   php bin/create_admin.php anhdnt@sontra.edu.vn "Đặng Ngọc Triều Anh"
 */

require __DIR__ . '/../bootstrap.php';

use SonTra\Support\Clock;
use SonTra\Support\Database;
use SonTra\Support\Ids;
use SonTra\Support\Validator;

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

$email = Validator::email($argv[1] ?? null);
$fullName = Validator::text($argv[2] ?? null, 'Họ và tên', 2, 200);

$password = getenv('SONTRA_ADMIN_PASSWORD') ?: '';
if ($password === '') {
    fwrite(STDOUT, 'Mật khẩu quản trị (ít nhất 10 ký tự, không hiển thị): ');
    $isTty = function_exists('posix_isatty') && posix_isatty(STDIN);
    if ($isTty) {
        shell_exec('stty -echo');
    }
    $password = rtrim((string) fgets(STDIN), "\r\n");
    if ($isTty) {
        shell_exec('stty echo');
        fwrite(STDOUT, "\n");
    }
}
$password = Validator::password($password);

$pdo = Database::connection();
$stmt = $pdo->prepare('SELECT id, role FROM accounts WHERE email = ?');
$stmt->execute([$email]);
$existing = $stmt->fetch();
$hash = password_hash($password, PASSWORD_DEFAULT);
$now = Clock::nowUtc();

if ($existing) {
    $pdo->prepare(
        "UPDATE accounts SET role = 'admin', password_hash = ?, full_name = ?, active = 1, must_change = 0,
         failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?"
    )->execute([$hash, $fullName, $now, $existing['id']]);
    echo "Đã nâng cấp tài khoản {$email} thành Quản trị viên và đặt lại mật khẩu.\n";
} else {
    $pdo->prepare(
        "INSERT INTO accounts (id, email, full_name, role, auth_provider, password_hash, active, must_change,
         failed_attempts, created_at, updated_at) VALUES (?, ?, ?, 'admin', 'local', ?, 1, 0, 0, ?, ?)"
    )->execute([Ids::random('acc-adm-'), $email, $fullName, $hash, $now, $now]);
    echo "Đã tạo tài khoản Quản trị viên {$email}.\n";
}
