<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Support\Env;
use SonTra\Support\HttpException;

/**
 * Xác minh Google ID token phía máy chủ qua endpoint tokeninfo của Google.
 * Chỉ tin cậy thông tin sau khi aud (client ID), iss, exp và email_verified đều hợp lệ.
 */
final class GoogleTokenVerifier
{
    private const ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo';

    /** @return array{sub:string, email:string, name:string, picture:?string} */
    public function verify(string $credential): array
    {
        $clientId = Env::get('GOOGLE_CLIENT_ID');
        if ($clientId === '') {
            throw new HttpException(503, 'Đăng nhập Google chưa được cấu hình trên máy chủ.');
        }
        if (strlen($credential) > 4096) {
            throw new HttpException(400, 'Thông tin đăng nhập Google không hợp lệ.');
        }

        $ch = curl_init(self::ENDPOINT . '?id_token=' . rawurlencode($credential));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($raw === false || $status !== 200) {
            throw new HttpException(401, 'Không xác minh được tài khoản Google. Vui lòng thử lại.');
        }
        $claims = json_decode((string) $raw, true);
        if (!is_array($claims)) {
            throw new HttpException(401, 'Không xác minh được tài khoản Google. Vui lòng thử lại.');
        }

        $issuer = (string) ($claims['iss'] ?? '');
        $valid = ($claims['aud'] ?? null) === $clientId
            && in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)
            && (int) ($claims['exp'] ?? 0) > time()
            && in_array($claims['email_verified'] ?? null, [true, 'true'], true)
            && !empty($claims['sub'])
            && !empty($claims['email']);

        if (!$valid) {
            throw new HttpException(401, 'Thông tin tài khoản Google không hợp lệ hoặc chưa được xác minh.');
        }

        return [
            'sub' => (string) $claims['sub'],
            'email' => strtolower((string) $claims['email']),
            'name' => trim((string) ($claims['name'] ?? '')) ?: strtolower((string) $claims['email']),
            'picture' => isset($claims['picture']) ? (string) $claims['picture'] : null,
        ];
    }
}
