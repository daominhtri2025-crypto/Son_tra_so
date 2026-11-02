<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Support\Env;
use SonTra\Support\HttpException;
use SonTra\Support\Ids;

/**
 * Lưu tệp đa phương tiện bài học trên ổ đĩa hosting (không lưu vào CSDL).
 * Quyết định dựa trên CHỮ KÝ tệp (magic bytes), không dựa trên đuôi hay Content-Type (đặc tả mục 8.3).
 * Giới hạn: video 25 MB, âm thanh 10 MB (đặc tả mục 3.2 và 8.2).
 */
final class MediaService
{
    private const VIDEO_MAX = 25 * 1024 * 1024;
    private const AUDIO_MAX = 10 * 1024 * 1024;

    /** @return array{url: string, kind: string, filename: string} */
    public function store(string $kind, string $tmpPath, string $originalName): array
    {
        if (!in_array($kind, ['video', 'audio'], true)) {
            throw new HttpException(400, 'Loại đa phương tiện không hợp lệ.');
        }
        $size = is_file($tmpPath) ? (int) filesize($tmpPath) : 0;
        if ($size <= 0) {
            throw new HttpException(400, 'Tệp tải lên rỗng hoặc không đọc được.');
        }
        $limit = $kind === 'video' ? self::VIDEO_MAX : self::AUDIO_MAX;
        if ($size > $limit) {
            throw new HttpException(413, sprintf(
                'Tệp %s vượt quá %d MB.',
                $kind === 'video' ? 'video' : 'âm thanh',
                intdiv($limit, 1024 * 1024)
            ));
        }

        $head = (string) file_get_contents($tmpPath, false, null, 0, 16);
        $ext = self::detectExtension($kind, $head);
        if ($ext === null) {
            throw new HttpException(400, $kind === 'video'
                ? 'Định dạng video không được hỗ trợ. Chỉ chấp nhận MP4 hoặc WebM.'
                : 'Định dạng âm thanh không được hỗ trợ. Chỉ chấp nhận MP3, M4A, WAV hoặc OGG.');
        }

        $dir = self::directory();
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new HttpException(500, 'Không tạo được thư mục lưu tệp trên máy chủ.');
        }
        $name = Ids::random($kind . '-', 10) . '.' . $ext;
        if (!move_uploaded_file($tmpPath, $dir . '/' . $name) && !rename($tmpPath, $dir . '/' . $name)) {
            throw new HttpException(500, 'Không lưu được tệp trên máy chủ.');
        }

        return [
            'url' => self::publicPrefix() . '/' . $name,
            'kind' => $kind,
            'filename' => self::safeFilename($originalName),
        ];
    }

    /** Trả về đuôi tệp nếu chữ ký khớp với loại media, ngược lại null. */
    public static function detectExtension(string $kind, string $head): ?string
    {
        if ($kind === 'video') {
            if (substr($head, 4, 4) === 'ftyp') {
                return 'mp4';
            }
            if (substr($head, 0, 4) === "\x1A\x45\xDF\xA3") {
                return 'webm';
            }
            return null;
        }
        if (substr($head, 0, 3) === 'ID3') {
            return 'mp3';
        }
        if (strlen($head) >= 2 && $head[0] === "\xFF" && (ord($head[1]) & 0xE0) === 0xE0) {
            return 'mp3';
        }
        if (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WAVE') {
            return 'wav';
        }
        if (substr($head, 0, 4) === 'OggS') {
            return 'ogg';
        }
        if (substr($head, 4, 4) === 'ftyp' && in_array(substr($head, 8, 4), ['M4A ', 'mp42', 'isom'], true)) {
            return 'm4a';
        }
        return null;
    }

    public static function directory(): string
    {
        $configured = Env::get('MEDIA_DIR');
        // Mặc định: <thư mục web>/uploads/media (api/src/Services → ba cấp lên). Chỉ đọc tệp, PHP bị tắt trong thư mục này.
        return $configured !== '' ? rtrim($configured, '/') : dirname(__DIR__, 3) . '/uploads/media';
    }

    /** Đường dẫn URL công khai tương đối với tên miền (ví dụ /uploads/media). */
    public static function publicPrefix(): string
    {
        $configured = Env::get('MEDIA_PUBLIC_PREFIX');
        return $configured !== '' ? rtrim($configured, '/') : '/uploads/media';
    }

    private static function safeFilename(string $name): string
    {
        $base = basename($name);
        $base = preg_replace('/[^\p{L}\p{N}._ -]/u', '_', $base) ?? 'tep';
        return mb_substr($base, 0, 200);
    }
}
