<?php

declare(strict_types=1);

namespace SonTra\Repositories;

use SonTra\Support\Database;

/** Truy cập bảng hero_slides và site_settings. Mọi truy vấn dùng tham số hóa. */
final class HeroRepository
{
    /** @return list<array<string, mixed>> */
    public function listVisible(): array
    {
        $sql = 'SELECT * FROM hero_slides WHERE deleted_at IS NULL AND hidden = 0 ORDER BY sort_order ASC, id ASC';
        return Database::connection()->query($sql)->fetchAll();
    }

    /** @return list<array<string, mixed>> */
    public function listAll(): array
    {
        $sql = 'SELECT * FROM hero_slides WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC';
        return Database::connection()->query($sql)->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM hero_slides WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function maxSortOrder(): int
    {
        $row = Database::connection()->query('SELECT COALESCE(MAX(sort_order), 0) AS m FROM hero_slides WHERE deleted_at IS NULL')->fetch();
        return (int) ($row['m'] ?? 0);
    }

    /** @param array<string, mixed> $row */
    public function insert(array $row): int
    {
        $columns = array_keys($row);
        $sql = sprintf(
            'INSERT INTO hero_slides (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', array_fill(0, count($columns), '?'))
        );
        $pdo = Database::connection();
        $pdo->prepare($sql)->execute(array_values($row));
        return (int) $pdo->lastInsertId();
    }

    /** @param array<string, mixed> $fields */
    public function update(int $id, array $fields): void
    {
        $assignments = implode(', ', array_map(static fn(string $c): string => "{$c} = ?", array_keys($fields)));
        $sql = "UPDATE hero_slides SET {$assignments} WHERE id = ? AND deleted_at IS NULL";
        Database::connection()->prepare($sql)->execute([...array_values($fields), $id]);
    }

    public function softDelete(int $id, string $now): void
    {
        Database::connection()->prepare('UPDATE hero_slides SET deleted_at = ?, updated_at = ? WHERE id = ?')
            ->execute([$now, $now, $id]);
    }

    public function getSetting(string $key): ?string
    {
        $stmt = Database::connection()->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?');
        $stmt->execute([$key]);
        $value = $stmt->fetchColumn();
        return $value === false ? null : (string) $value;
    }

    public function setSetting(string $key, string $value, string $now): void
    {
        $sql = 'INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)';
        Database::connection()->prepare($sql)->execute([$key, $value, $now]);
    }
}
