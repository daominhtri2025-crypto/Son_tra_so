<?php

declare(strict_types=1);

namespace SonTra\Repositories;

use SonTra\Support\Database;

final class AssessmentRepository
{
    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return Database::connection()->query('SELECT * FROM assessments ORDER BY created_at DESC')->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function findByClientId(string $learnerId, string $clientId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM assessments WHERE learner_id = ? AND client_id = ?'
        );
        $stmt->execute([$learnerId, $clientId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $row */
    public function insert(array $row): void
    {
        $columns = array_keys($row);
        $sql = sprintf(
            'INSERT INTO assessments (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', array_fill(0, count($columns), '?'))
        );
        Database::connection()->prepare($sql)->execute(array_values($row));
    }
}
