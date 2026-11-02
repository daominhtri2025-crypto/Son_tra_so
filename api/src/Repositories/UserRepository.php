<?php

declare(strict_types=1);

namespace SonTra\Repositories;

use PDO;
use SonTra\Support\Database;

/** Truy cập bảng accounts. Mọi cập nhật đi qua danh sách cột được phép (chống mass assignment). */
final class UserRepository
{
    private const UPDATABLE = [
        'full_name', 'phone', 'organization', 'avatar_url', 'password_hash', 'google_sub',
        'active', 'must_change', 'failed_attempts', 'locked_until', 'auth_provider',
    ];

    private function pdo(): PDO
    {
        return Database::connection();
    }

    /** @return array<string, mixed>|null */
    public function findById(string $id): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM accounts WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @return array<string, mixed>|null */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM accounts WHERE email = ?');
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @return array<string, mixed>|null */
    public function findByGoogleSub(string $sub): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM accounts WHERE google_sub = ?');
        $stmt->execute([$sub]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $data */
    public function insert(array $data): void
    {
        $columns = array_keys($data);
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $sql = sprintf('INSERT INTO accounts (%s) VALUES (%s)', implode(', ', $columns), $placeholders);
        $this->pdo()->prepare($sql)->execute(array_values($data));
    }

    /** @param array<string, mixed> $fields */
    public function update(string $id, array $fields): void
    {
        $sets = [];
        $values = [];
        foreach ($fields as $column => $value) {
            if (!in_array($column, self::UPDATABLE, true)) {
                throw new \InvalidArgumentException('Cột không được phép cập nhật: ' . $column);
            }
            $sets[] = $column . ' = ?';
            $values[] = $value;
        }
        if ($sets === []) {
            return;
        }
        $sets[] = 'updated_at = ?';
        $values[] = \SonTra\Support\Clock::nowUtc();
        $values[] = $id;
        $this->pdo()->prepare('UPDATE accounts SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
    }

    /** Mã học viên tiếp theo dạng ST-HV-NNN (gọi trong giao dịch có khóa). */
    public function nextLearnerCode(): string
    {
        $row = $this->pdo()->query(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(learner_code, 7) AS UNSIGNED)), 0) + 1 AS next_no
             FROM accounts WHERE role = 'learner' FOR UPDATE"
        )->fetch();
        return sprintf('ST-HV-%03d', (int) $row['next_no']);
    }

    /**
     * @param list<string> $roles
     * @return list<array<string, mixed>>
     */
    public function listByRoles(array $roles): array
    {
        $placeholders = implode(', ', array_fill(0, count($roles), '?'));
        $stmt = $this->pdo()->prepare(
            "SELECT * FROM accounts WHERE role IN ($placeholders) ORDER BY created_at DESC"
        );
        $stmt->execute($roles);
        return $stmt->fetchAll();
    }
}
