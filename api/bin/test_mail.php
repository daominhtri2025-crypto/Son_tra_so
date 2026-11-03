<?php

declare(strict_types=1);

/**
 * Gửi một thư thử bằng đúng cấu hình gửi thư đang dùng (SMTP hoặc mail()).
 * Dùng để kiểm tra trên hosting sau khi cấu hình SMTP: php api/bin/test_mail.php ten@gmail.com
 */

require __DIR__ . '/../bootstrap.php';

use SonTra\Http\Container;
use SonTra\Support\Env;
use SonTra\Support\Mailer;
use SonTra\Support\Validator;

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

try {
    $to = Validator::email($argv[1] ?? null);
} catch (\SonTra\Support\HttpException $e) {
    fwrite(STDERR, "Dùng: php api/bin/test_mail.php <email nhận thử>\n");
    exit(1);
}

$driver = Env::get('MAIL_DRIVER') ?: (Env::get('SMTP_HOST') !== '' ? 'smtp' : 'mail');
echo "Phương thức gửi thư: {$driver}\n";

$mailer = (new Container())->get(Mailer::class);
$sent = $mailer->send(
    $to,
    'Thư thử từ Sơn Trà Số',
    "Đây là thư thử để kiểm tra cấu hình gửi thư.\nNếu bạn đọc được thư này, cấu hình đã đúng.\n"
);

if ($sent) {
    echo "Đã gửi thư tới {$to}. Kiểm tra hộp thư đến (và thư rác).\n";
    exit(0);
}
echo "Gửi thư thất bại. Xem thông báo lỗi ở trên hoặc trong nhật ký lỗi của máy chủ.\n";
exit(1);
