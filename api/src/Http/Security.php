<?php

declare(strict_types=1);

namespace SonTra\Http;

use SonTra\Support\Env;
use SonTra\Support\HttpException;

/**
 * Lớp bảo vệ CSRF cho các phương thức ghi:
 *  1. Nếu có header Origin, phải thuộc danh sách nguồn được phép (APP_URL hoặc chính host hiện tại).
 *  2. Thân yêu cầu ghi phải là application/json — trình duyệt không gửi JSON đa nguồn mà không qua preflight.
 * Cookie phiên dùng SameSite=Lax và HttpOnly làm lớp bảo vệ thứ ba.
 */
final class Security
{
    private const WRITE_METHODS = ['POST', 'PUT', 'DELETE'];

    public static function guard(Request $request): void
    {
        if (!in_array($request->method, self::WRITE_METHODS, true)) {
            return;
        }

        $origin = $request->header('origin');
        if ($origin !== null && !in_array(rtrim($origin, '/'), self::allowedOrigins($request), true)) {
            throw new HttpException(403, 'Nguồn yêu cầu không được phép (Origin).');
        }

        $contentType = strtolower((string) $request->header('content-type'));
        $isUpload = $request->path === '/admin/media' && str_starts_with($contentType, 'multipart/form-data');
        if (!$isUpload && !str_starts_with($contentType, 'application/json')) {
            throw new HttpException(415, 'Yêu cầu ghi phải dùng Content-Type: application/json.');
        }
    }

    /** @return list<string> */
    public static function allowedOrigins(Request $request): array
    {
        $origins = [];
        $appUrl = rtrim(Env::get('APP_URL'), '/');
        if ($appUrl !== '') {
            $origins[] = $appUrl;
        }
        $host = $request->header('host');
        if ($host !== null && $host !== '') {
            $scheme = (($_SERVER['HTTPS'] ?? '') === 'on' || ($request->header('x-forwarded-proto') === 'https')) ? 'https' : 'http';
            $origins[] = $scheme . '://' . $host;
        }
        return array_values(array_unique($origins));
    }
}
