<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Support\Env;
use SonTra\Support\HttpException;
use SonTra\Support\Validator;

/**
 * Chính sách mật khẩu: độ dài (Quy tắc 4.13) và không nằm trong dữ liệu bị rò rỉ.
 * Khi không kiểm tra được (mất mạng, dịch vụ lỗi): PWNED_CHECK_FAIL_OPEN=true (mặc định) cho qua và ghi nhật ký;
 * đặt false để từ chối an toàn.
 */
final class PasswordPolicy
{
    public function __construct(private readonly PasswordBreachChecker $breach)
    {
    }

    public function assertAcceptable(mixed $password): string
    {
        $password = Validator::password($password);
        $count = $this->breach->breachCount($password);

        if ($count === null) {
            if (!Env::bool('PWNED_CHECK_FAIL_OPEN', true)) {
                throw new HttpException(503, 'Chưa kiểm tra được độ an toàn của mật khẩu. Vui lòng thử lại sau.');
            }
            error_log('[SonTra] Không kiểm tra được mật khẩu với dịch vụ rò rỉ; đã chấp nhận tạm thời.');
            return $password;
        }
        if ($count > 0) {
            throw new HttpException(400, 'Mật khẩu này đã xuất hiện trong dữ liệu bị rò rỉ trên Internet. Vui lòng chọn mật khẩu khác.');
        }
        return $password;
    }
}
