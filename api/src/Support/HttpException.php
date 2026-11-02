<?php

declare(strict_types=1);

namespace SonTra\Support;

use RuntimeException;

/** Ngoại lệ nghiệp vụ mang mã HTTP và thông điệp an toàn để hiển thị cho người dùng. */
final class HttpException extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}
