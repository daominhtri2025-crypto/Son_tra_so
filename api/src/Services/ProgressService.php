<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Domain\Rules;
use SonTra\Repositories\LessonRepository;
use SonTra\Repositories\ProgressRepository;
use SonTra\Support\Clock;
use SonTra\Support\HttpException;
use SonTra\Support\Validator;

/** Tiến độ học viên: chỉ học viên ghi được tiến độ của chính mình; hợp nhất theo Quy tắc 4.1. */
final class ProgressService
{
    public function __construct(
        private readonly ProgressRepository $progress,
        private readonly LessonRepository $lessons,
    ) {
    }

    /** @return list<array<string, mixed>> */
    public function forLearner(array $account): array
    {
        $this->assertLearner($account);
        return array_map([$this, 'view'], $this->progress->forLearner($account['id']));
    }

    /** @return list<array<string, mixed>> */
    public function all(array $admin): array
    {
        if ($admin['role'] !== 'admin') {
            throw new HttpException(403, 'Chỉ Quản trị viên được xem tiến độ toàn hệ thống.');
        }
        return array_map([$this, 'view'], $this->progress->all());
    }

    /** @param array<string, mixed> $input */
    public function update(array $account, array $input): array
    {
        $this->assertLearner($account);
        $lessonNo = Validator::int($input['lesson'] ?? null, 'Mã bài học', 0, PHP_INT_MAX);
        if ($this->lessons->find($lessonNo) === null) {
            throw new HttpException(404, 'Bài học không tồn tại.');
        }
        // Điểm (score) KHÔNG nhận từ client: chỉ được ghi khi máy chủ chấm đúng (answerQuiz).
        $incoming = [
            'read' => (int) ($input['read'] ?? 0),
            'done' => (int) ($input['done'] ?? 0),
            'score' => 0,
        ];
        $current = $this->progress->find($account['id'], $lessonNo);
        $merged = Rules::mergeProgress($current, $incoming, Clock::nowUtc());
        $this->progress->save($account['id'], $lessonNo, $merged);

        return $this->view([
            'learner_id' => $account['id'],
            'lesson_no' => $lessonNo,
            'is_read' => $merged['is_read'],
            'is_done' => $merged['is_done'],
            'score' => $merged['score'],
            'completed_at' => $merged['completed_at'],
            'updated_at' => Clock::nowUtc(),
        ]);
    }

    /**
     * Chấm câu trắc nghiệm trên máy chủ (Quy tắc 4.17). Chỉ bài đang hiện mới được chấm.
     *
     * @return array{correct: bool, correctChoice: int, explanation: string, progress: array<string, mixed>}
     */
    public function answerQuiz(array $account, int $lessonNo, mixed $choice): array
    {
        $this->assertLearner($account);
        $lesson = $this->lessons->find($lessonNo);
        if ($lesson === null || $lesson['deleted_at'] !== null || (int) $lesson['hidden'] === 1) {
            throw new HttpException(404, 'Bài học không tồn tại hoặc đang ẩn.');
        }
        $quiz = json_decode((string) $lesson['quiz_json'], true, 512, JSON_THROW_ON_ERROR);
        $selected = Validator::int($choice, 'Lựa chọn', 0, count($quiz['options']) - 1);

        $correct = $selected === (int) $quiz['correctChoice'];
        $merged = Rules::mergeProgress(
            $this->progress->find($account['id'], $lessonNo),
            ['read' => 1, 'done' => 0, 'score' => $correct ? 1 : 0],
            Clock::nowUtc(),
        );
        $this->progress->save($account['id'], $lessonNo, $merged);

        return [
            'correct' => $correct,
            'correctChoice' => (int) $quiz['correctChoice'],
            'explanation' => (string) $quiz['explanation'],
            'progress' => $this->view([
                'learner_id' => $account['id'],
                'lesson_no' => $lessonNo,
                'is_read' => $merged['is_read'],
                'is_done' => $merged['is_done'],
                'score' => $merged['score'],
                'completed_at' => $merged['completed_at'],
                'updated_at' => Clock::nowUtc(),
            ]),
        ];
    }

    private function assertLearner(array $account): void
    {
        if ($account['role'] !== 'learner') {
            throw new HttpException(403, 'Chỉ học viên mới có tiến độ học tập.');
        }
    }

    /** @param array<string, mixed> $row */
    public function view(array $row): array
    {
        return [
            'learner' => $row['learner_id'],
            'lesson' => (int) $row['lesson_no'],
            'read' => (int) $row['is_read'],
            'done' => (int) $row['is_done'],
            'score' => (int) $row['score'],
            'updated' => Clock::toIso($row['updated_at']),
            'completed_at' => Clock::toIso($row['completed_at'] ?? null),
        ];
    }
}
