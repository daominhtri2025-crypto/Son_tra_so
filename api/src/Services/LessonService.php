<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Domain\Rules;
use SonTra\Repositories\LessonRepository;
use SonTra\Support\Clock;
use SonTra\Support\Database;
use SonTra\Support\HttpException;
use SonTra\Support\Validator;

/** Vòng đời bài học: tạo, sửa (lưu phiên bản cũ), ẩn/hiện, xóa mềm, khôi phục (Quy tắc 4.4, 4.15, 4.16). */
final class LessonService
{
    public function __construct(private readonly LessonRepository $lessons)
    {
    }

    /** @return list<array<string, mixed>> */
    public function listFor(?array $account): array
    {
        $isAdmin = $account !== null && $account['role'] === 'admin';
        $rows = $this->lessons->list($isAdmin, $isAdmin);
        // Đáp án và giải thích chỉ trả về quản trị viên; học viên nhận đáp án qua POST /lessons/{no}/answer.
        return array_map(fn(array $row): array => $this->view($row, $isAdmin), $rows);
    }

    /** @return list<array<string, mixed>> */
    public function versions(array $admin): array
    {
        $this->assertAdmin($admin);
        return array_map(static fn(array $v): array => [
            'id' => (int) $v['id'],
            'lesson' => (int) $v['lesson_no'],
            'title' => $v['title'],
            'group_no' => (int) $v['group_no'],
            'body' => $v['body'],
            'quiz' => $v['quiz_json'],
            'next_step' => $v['next_step'],
            'video_url' => $v['video_url'],
            'video_type' => $v['video_type'],
            'video_filename' => $v['video_filename'],
            'audio_url' => $v['audio_url'],
            'audio_type' => $v['audio_type'],
            'audio_filename' => $v['audio_filename'],
            'hidden' => (int) $v['hidden'],
            'deleted_at' => Clock::toIso($v['deleted_at']),
            'saved_by' => $v['saved_by'],
            'saved_at' => Clock::toIso($v['saved_at']),
        ], $this->lessons->allVersions());
    }

    /** @param array<string, mixed> $input */
    public function create(array $admin, array $input): array
    {
        $this->assertAdmin($admin);
        $now = Clock::nowUtc();
        $fields = $this->validateFields($input, true);

        return Database::transaction(function () use ($fields, $now): array {
            $number = $this->lessons->nextNumber();
            $this->lessons->insert($fields + [
                'lesson_no' => $number,
                'hidden' => 0,
                'deleted_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            return $this->view($this->lessons->find($number));
        });
    }

    /** @param array<string, mixed> $input */
    public function update(array $admin, int $lessonNo, array $input): array
    {
        $this->assertAdmin($admin);
        return Database::transaction(function () use ($admin, $lessonNo, $input): array {
            $existing = $this->requireLesson($lessonNo);
            $this->snapshot($existing, $admin['email']);
            $fields = $this->validateFields($input, false) + ['updated_at' => Clock::nowUtc()];
            $this->lessons->update($lessonNo, $fields);
            return $this->view($this->lessons->find($lessonNo));
        });
    }

    public function toggleVisibility(array $admin, int $lessonNo): array
    {
        $this->assertAdmin($admin);
        return Database::transaction(function () use ($lessonNo): array {
            $existing = $this->requireLesson($lessonNo);
            $this->lessons->update($lessonNo, [
                'hidden' => (int) $existing['hidden'] === 1 ? 0 : 1,
                'updated_at' => Clock::nowUtc(),
            ]);
            return $this->view($this->lessons->find($lessonNo));
        });
    }

    public function softDelete(array $admin, int $lessonNo): array
    {
        $this->assertAdmin($admin);
        return Database::transaction(function () use ($admin, $lessonNo): array {
            $existing = $this->requireLesson($lessonNo);
            $now = Clock::nowUtc();
            $this->snapshot($existing, $admin['email'], $now);
            $this->lessons->update($lessonNo, ['deleted_at' => $now, 'updated_at' => $now]);
            return $this->view($this->lessons->find($lessonNo));
        });
    }

    public function restore(array $admin, int $lessonNo): array
    {
        $this->assertAdmin($admin);
        return Database::transaction(function () use ($admin, $lessonNo): array {
            $existing = $this->requireLesson($lessonNo);
            $this->snapshot($existing, $admin['email']);
            $this->lessons->update($lessonNo, ['deleted_at' => null, 'updated_at' => Clock::nowUtc()]);
            return $this->view($this->lessons->find($lessonNo));
        });
    }

    /** @return array<string, mixed> */
    private function requireLesson(int $lessonNo): array
    {
        $row = $this->lessons->find($lessonNo);
        if ($row === null) {
            throw new HttpException(404, sprintf('Không tìm thấy bài học #%d.', $lessonNo));
        }
        return $row;
    }

    /** Quy tắc 4.4: lưu bản cũ vào lesson_versions trước khi ghi đè hoặc xóa. */
    private function snapshot(array $row, string $savedBy, ?string $at = null): void
    {
        $this->lessons->insertVersion([
            'lesson_no' => $row['lesson_no'],
            'title' => $row['title'],
            'group_no' => $row['group_no'],
            'body' => $row['body'],
            'quiz_json' => $row['quiz_json'],
            'next_step' => $row['next_step'],
            'video_url' => $row['video_url'],
            'video_type' => $row['video_type'],
            'video_filename' => $row['video_filename'],
            'audio_url' => $row['audio_url'],
            'audio_type' => $row['audio_type'],
            'audio_filename' => $row['audio_filename'],
            'hidden' => $row['hidden'],
            'deleted_at' => $row['deleted_at'],
            'saved_by' => $savedBy,
            'saved_at' => $at ?? Clock::nowUtc(),
        ]);
    }

    /**
     * Kiểm tra và chuẩn hóa dữ liệu bài học. Khi $create = true, mọi trường bắt buộc phải có.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function validateFields(array $input, bool $create): array
    {
        $fields = [];
        if ($create || array_key_exists('title', $input)) {
            $fields['title'] = Validator::text($input['title'] ?? null, 'Tiêu đề bài học', 3, 255);
        }
        if ($create || array_key_exists('group_no', $input)) {
            $fields['group_no'] = Validator::int($input['group_no'] ?? null, 'Nhóm nhiệm vụ', 1, 5);
        }
        if ($create || array_key_exists('body', $input)) {
            $fields['body'] = Validator::text($input['body'] ?? null, 'Nội dung bài học', 10, 100000);
        }
        if ($create || array_key_exists('quiz', $input)) {
            $quiz = Rules::normalizeQuiz($input['quiz'] ?? null);
            $fields['quiz_json'] = json_encode($quiz, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }
        if (array_key_exists('next_step', $input)) {
            $fields['next_step'] = Validator::optionalText($input['next_step'], 2000);
        }
        foreach (['video', 'audio'] as $kind) {
            if (array_key_exists($kind . '_url', $input) || $create) {
                $url = $this->mediaUrl($input[$kind . '_url'] ?? null, $kind === 'video' ? 'Đường dẫn video' : 'Đường dẫn âm thanh');
                $fields[$kind . '_url'] = $url;
                $fields[$kind . '_type'] = $url === null ? null : 'url';
                $fields[$kind . '_filename'] = $url === null ? null : Validator::optionalText($input[$kind . '_filename'] ?? null, 255);
            }
        }
        if (array_key_exists('hidden', $input)) {
            $fields['hidden'] = (int) ((bool) $input['hidden']);
        }
        return $fields;
    }

    /** Chấp nhận URL http(s) hoặc tệp đã tải lên qua /admin/media (đường dẫn nội bộ do máy chủ sinh). */
    private function mediaUrl(mixed $value, string $field): ?string
    {
        if (is_string($value) && preg_match('#^' . preg_quote(MediaService::publicPrefix(), '#') . '/[A-Za-z0-9._-]+$#', $value) === 1) {
            return $value;
        }
        return Validator::httpUrl($value, $field);
    }

    private function assertAdmin(?array $account): void
    {
        if ($account === null) {
            throw new HttpException(401, 'Yêu cầu đăng nhập.');
        }
        if ($account['role'] !== 'admin') {
            throw new HttpException(403, 'Từ chối truy cập: chỉ Quản trị viên được quản lý bài học.');
        }
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function view(array $row, bool $withAnswer = true): array
    {
        $quiz = json_decode((string) $row['quiz_json'], true, 512, JSON_THROW_ON_ERROR);
        if (!$withAnswer) {
            $quiz = ['question' => $quiz['question'], 'options' => $quiz['options']];
        }
        return [
            'lesson' => (int) $row['lesson_no'],
            'title' => $row['title'],
            'group_no' => (int) $row['group_no'],
            'body' => $row['body'],
            'quiz' => $quiz,
            'next_step' => $row['next_step'],
            'video_url' => $row['video_url'],
            'video_type' => $row['video_type'],
            'video_filename' => $row['video_filename'],
            'audio_url' => $row['audio_url'],
            'audio_type' => $row['audio_type'],
            'audio_filename' => $row['audio_filename'],
            'hidden' => (int) $row['hidden'],
            'deleted_at' => Clock::toIso($row['deleted_at']),
            'created' => Clock::toIso($row['created_at']),
            'updated' => Clock::toIso($row['updated_at']),
        ];
    }
}
