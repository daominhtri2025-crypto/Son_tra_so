<?php

declare(strict_types=1);

namespace SonTra\Repositories;

use SonTra\Support\Clock;
use SonTra\Support\Database;

/** Phiên đăng nhập lưu dưới dạng băm SHA-256 của token; token gốc chỉ nằm trong cookie. */
final class SessionRepository
{
    public function create(string $tokenHash, string $accountId, string $expiresAt): void
    {
        Database::connection()->prepare(
            'INSERT INTO sessions (token_hash, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
        )->execute([$tokenHash, $accountId, $expiresAt, Clock::nowUtc()]);
    }

    /** @return array<string, mixed>|null  bản ghi tài khoản nếu phiên còn hạn */
    public function findActiveAccount(string $tokenHash): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account_id
             WHERE s.token_hash = ? AND s.expires_at > ?'
        );
        $stmt->execute([$tokenHash, Clock::nowUtc()]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function delete(string $tokenHash): void
    {
        Database::connection()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([$tokenHash]);
    }

    /** Thu hồi mọi phiên của một tài khoản (đổi mật khẩu, vô hiệu hóa). */
    public function deleteForAccount(string $accountId): void
    {
        Database::connection()->prepare('DELETE FROM sessions WHERE account_id = ?')->execute([$accountId]);
    }

    public function purgeExpired(): void
    {
        Database::connection()->prepare('DELETE FROM sessions WHERE expires_at <= ?')->execute([Clock::nowUtc()]);
    }
}
