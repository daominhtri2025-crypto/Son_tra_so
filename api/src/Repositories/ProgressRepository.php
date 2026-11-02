<?php

declare(strict_types=1);

namespace SonTra\Repositories;

use SonTra\Support\Clock;
use SonTra\Support\Database;

final class ProgressRepository
{
    /** @return list<array<string, mixed>> */
    public function forLearner(string $learnerId): array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM learner_progress WHERE learner_id = ? ORDER BY lesson_no');
        $stmt->execute([$learnerId]);
        return $stmt->fetchAll();
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return Database::connection()->query('SELECT * FROM learner_progress ORDER BY learner_id, lesson_no')->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function find(string $learnerId, int $lessonNo): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM learner_progress WHERE learner_id = ? AND lesson_no = ?'
        );
        $stmt->execute([$learnerId, $lessonNo]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @param array{is_read:int,is_done:int,score:int,completed_at:?string} $merged */
    public function save(string $learnerId, int $lessonNo, array $merged): void
    {
        Database::connection()->prepare(
            'INSERT INTO learner_progress (learner_id, lesson_no, is_read, is_done, score, completed_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE is_read = VALUES(is_read), is_done = VALUES(is_done),
               score = VALUES(score), completed_at = VALUES(completed_at), updated_at = VALUES(updated_at)'
        )->execute([
            $learnerId, $lessonNo, $merged['is_read'], $merged['is_done'], $merged['score'],
            $merged['completed_at'], Clock::nowUtc(),
        ]);
    }
}
