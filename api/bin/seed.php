<?php

declare(strict_types=1);

/**
 * Nạp nội dung bài học ban đầu (database/seed/lessons.json). Chỉ thêm bài chưa có (INSERT IGNORE).
 * Không tạo tài khoản mẫu và không có mật khẩu mặc định. Dùng: php bin/seed.php
 */

require __DIR__ . '/../bootstrap.php';

use SonTra\Support\Database;

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

$data = json_decode((string) file_get_contents(__DIR__ . '/../database/seed/lessons.json'), true, 512, JSON_THROW_ON_ERROR);
$pdo = Database::connection();
$stmt = $pdo->prepare(
    'INSERT IGNORE INTO lessons (lesson_no, title, group_no, body, quiz_json, next_step, video_url, video_type,
       video_filename, audio_url, audio_type, audio_filename, hidden, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())'
);
$inserted = 0;
foreach ($data['lessons'] as $l) {
    $stmt->execute([
        $l['lesson'], $l['title'], $l['group_no'], $l['body'], json_encode($l['quiz'], JSON_UNESCAPED_UNICODE),
        $l['next_step'], $l['video_url'], $l['video_type'], $l['video_filename'], $l['audio_url'],
        $l['audio_type'], $l['audio_filename'], (int) $l['hidden'],
    ]);
    $inserted += $stmt->rowCount();
}
echo "Đã thêm {$inserted} bài học mới (tổng " . count($data['lessons']) . " trong tệp seed).\n";
