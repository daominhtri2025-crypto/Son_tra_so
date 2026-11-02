<?php

declare(strict_types=1);

/**
 * Xuất database/seed/lessons.json thành SQL để nhập bằng phpMyAdmin khi hosting không có SSH.
 * Dùng: php bin/make_seed_sql.php > database/seed.sql
 */

if (PHP_SAPI !== 'cli') {
    exit("Chỉ chạy từ dòng lệnh.\n");
}

$data = json_decode((string) file_get_contents(__DIR__ . '/../database/seed/lessons.json'), true, 512, JSON_THROW_ON_ERROR);
$quote = static fn(mixed $v): string => $v === null || $v === '' ? 'NULL' : "'" . str_replace(["\\", "'"], ["\\\\", "\\'"], (string) $v) . "'";

echo "-- Nội dung bài học ban đầu Sơn Trà Số (không chứa tài khoản hay mật khẩu)\n";
foreach ($data['lessons'] as $l) {
    printf(
        "INSERT IGNORE INTO lessons (lesson_no, title, group_no, body, quiz_json, next_step, video_url, video_type, video_filename, audio_url, audio_type, audio_filename, hidden, created_at, updated_at) VALUES (%d, %s, %d, %s, %s, %s, %s, %s, %s, %s, %s, %s, %d, UTC_TIMESTAMP(), UTC_TIMESTAMP());\n",
        $l['lesson'], $quote($l['title']), $l['group_no'], $quote($l['body']),
        $quote(json_encode($l['quiz'], JSON_UNESCAPED_UNICODE)), $quote($l['next_step']),
        $quote($l['video_url']), $quote($l['video_type']), $quote($l['video_filename']),
        $quote($l['audio_url']), $quote($l['audio_type']), $quote($l['audio_filename']), (int) $l['hidden']
    );
}
