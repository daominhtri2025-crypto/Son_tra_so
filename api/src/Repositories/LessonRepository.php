<?php

declare(strict_types=1);

namespace SonTra\Repositories;

use PDO;
use SonTra\Support\Database;

final class LessonRepository
{
    private const COLUMNS = [
        'lesson_no', 'title', 'group_no', 'body', 'quiz_json', 'next_step',
        'video_url', 'video_type', 'video_filename', 'audio_url', 'audio_type', 'audio_filename',
        'hidden', 'deleted_at', 'created_at', 'updated_at',
    ];

    private const UPDATABLE = [
        'title', 'group_no', 'body', 'quiz_json', 'next_step', 'video_url', 'video_type',
        'video_filename', 'audio_url', 'audio_type', 'audio_filename', 'hidden', 'deleted_at', 'updated_at',
    ];

    private function pdo(): PDO
    {
        return Database::connection();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(bool $includeDeleted, bool $includeHidden): array
    {
        $where = [];
        if (!$includeDeleted) {
            $where[] = 'deleted_at IS NULL';
        }
        if (!$includeHidden) {
            $where[] = 'hidden = 0';
        }
        $sql = 'SELECT * FROM lessons' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY lesson_no';
        return $this->pdo()->query($sql)->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function find(int $lessonNo): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM lessons WHERE lesson_no = ?');
        $stmt->execute([$lessonNo]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function nextNumber(): int
    {
        $row = $this->pdo()->query('SELECT COALESCE(MAX(lesson_no), -1) + 1 AS next_no FROM lessons FOR UPDATE')->fetch();
        return (int) $row['next_no'];
    }

    /** @param array<string, mixed> $row */
    public function insert(array $row): void
    {
        $columns = array_intersect(array_keys($row), self::COLUMNS);
        $sql = sprintf(
            'INSERT INTO lessons (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', array_fill(0, count($columns), '?'))
        );
        $this->pdo()->prepare($sql)->execute(array_map(static fn($c) => $row[$c], $columns));
    }

    /** @param array<string, mixed> $fields */
    public function update(int $lessonNo, array $fields): void
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
        $values[] = $lessonNo;
        $this->pdo()->prepare('UPDATE lessons SET ' . implode(', ', $sets) . ' WHERE lesson_no = ?')->execute($values);
    }

    /** @param array<string, mixed> $snapshot */
    public function insertVersion(array $snapshot): void
    {
        $columns = array_keys($snapshot);
        $sql = sprintf(
            'INSERT INTO lesson_versions (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', array_fill(0, count($columns), '?'))
        );
        $this->pdo()->prepare($sql)->execute(array_values($snapshot));
    }

    /** @return list<array<string, mixed>> */
    public function allVersions(): array
    {
        return $this->pdo()->query('SELECT * FROM lesson_versions ORDER BY saved_at DESC, id DESC')->fetchAll();
    }
}
