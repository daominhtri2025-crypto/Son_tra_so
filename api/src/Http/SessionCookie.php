<?php

declare(strict_types=1);

namespace SonTra\Http;

/** Tạo header Set-Cookie cho phiên đăng nhập: HttpOnly, Secure, SameSite=Lax, 12 giờ. */
final class SessionCookie
{
    public const NAME = 'st_session';
    public const LIFETIME_SECONDS = 43200;

    public static function issue(string $token): string
    {
        return self::NAME . '=' . $token . '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' . self::LIFETIME_SECONDS;
    }

    public static function clear(): string
    {
        return self::NAME . '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
    }
}
