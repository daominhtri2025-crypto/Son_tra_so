<?php

declare(strict_types=1);

namespace SonTra\Domain;

use SonTra\Support\Clock;

/** Chuyển bản ghi tài khoản (có password_hash) thành dạng an toàn để trả về client. */
final class UserView
{
    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function context(array $row): array
    {
        return [
            'id' => $row['id'],
            'email' => $row['email'],
            'role' => $row['role'],
            'fullName' => $row['full_name'],
            'active' => (int) $row['active'],
            'mustChange' => (int) $row['must_change'],
            'code' => $row['learner_code'] ?? null,
            'avatarUrl' => $row['avatar_url'] ?? null,
            'authProvider' => $row['auth_provider'],
            'phone' => $row['phone'] ?? null,
            'organization' => $row['organization'] ?? null,
        ];
    }

    /**
     * Dạng đầy đủ cho quản trị (không chứa hash mật khẩu).
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function admin(array $row): array
    {
        return self::context($row) + [
            'createdAt' => Clock::toIso($row['created_at'] ?? null),
            'lockedUntil' => Clock::toIso($row['locked_until'] ?? null),
        ];
    }
}
