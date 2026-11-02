<?php

declare(strict_types=1);

namespace SonTra\Repositories;

use SonTra\Support\Database;

final class NewsRepository
{
    /** @return list<array<string, mixed>> */
    public function list(bool $includeHidden): array
    {
        $sql = 'SELECT * FROM news' . ($includeHidden ? '' : ' WHERE hidden = 0') . ' ORDER BY published_at DESC, id DESC';
        return Database::connection()->query($sql)->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM news WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $row */
    public function insert(array $row): int
    {
        $columns = array_keys($row);
        $sql = sprintf(
            'INSERT INTO news (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', array_fill(0, count($columns), '?'))
        );
        $pdo = Database::connection();
        $pdo->prepare($sql)->execute(array_values($row));
        return (int) $pdo->lastInsertId();
    }

    public function setHidden(int $id, bool $hidden): void
    {
        Database::connection()->prepare('UPDATE news SET hidden = ?, updated_at = ? WHERE id = ?')
            ->execute([$hidden ? 1 : 0, \SonTra\Support\Clock::nowUtc(), $id]);
    }

    public function existsBySourceHash(string $hash): bool
    {
        $stmt = Database::connection()->prepare('SELECT 1 FROM news WHERE source_hash = ?');
        $stmt->execute([$hash]);
        return $stmt->fetchColumn() !== false;
    }
}
