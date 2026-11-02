<?php

declare(strict_types=1);

namespace SonTra\Http;

use SonTra\Services\AuthService;
use SonTra\Support\HttpException;

/** Lấy tài khoản hiện tại từ cookie phiên. Dùng chung cho mọi controller. */
final class Authenticator
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    /** @return array<string, mixed>|null */
    public function optional(Request $request): ?array
    {
        return $this->auth->resolve($request->cookie(SessionCookie::NAME));
    }

    /** @return array<string, mixed> */
    public function required(Request $request): array
    {
        $account = $this->optional($request);
        if ($account === null) {
            throw new HttpException(401, 'Yêu cầu đăng nhập hoặc phiên làm việc đã hết hạn.');
        }
        return $account;
    }

    public function service(): AuthService
    {
        return $this->auth;
    }
}
