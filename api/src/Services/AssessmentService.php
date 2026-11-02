<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Repositories\AssessmentRepository;
use SonTra\Repositories\UserRepository;
use SonTra\Support\Clock;
use SonTra\Support\HttpException;
use SonTra\Support\Ids;
use SonTra\Support\Validator;

/**
 * Phiếu quan sát năng lực số.
 *  - Quy tắc 4.12: chỉ TNV đang hoạt động, đã đổi mật khẩu lần đầu, hoặc Quản trị viên được ghi phiếu.
 *  - Quy tắc 4.2: điểm null = chưa đánh giá (không chuyển thành 0); điểm hợp lệ 0–5.
 *  - Quy tắc 4.3: idempotent theo (học viên, client_id) — gửi lại không tạo bản ghi trùng.
 */
final class AssessmentService
{
    public function __construct(
        private readonly AssessmentRepository $assessments,
        private readonly UserRepository $users,
    ) {
    }

    /** @return list<array<string, mixed>> */
    public function list(array $account): array
    {
        if (!in_array($account['role'], ['admin', 'volunteer'], true)) {
            throw new HttpException(403, 'Chỉ Tình nguyện viên hoặc Quản trị viên được xem phiếu quan sát.');
        }
        return array_map([$this, 'view'], $this->assessments->all());
    }

    /**
     * @param array<string, mixed> $actor
     * @param array<string, mixed> $input
     * @return array{assessment: array<string, mixed>, created: bool}
     */
    public function create(array $actor, array $input): array
    {
        $this->assertCanAssess($actor);

        $learnerId = Validator::text($input['learner'] ?? null, 'Mã học viên', 1, 64);
        $learner = $this->users->findById($learnerId);
        if ($learner === null || $learner['role'] !== 'learner') {
            throw new HttpException(404, 'Không tìm thấy học viên.');
        }

        $phase = $input['phase'] ?? null;
        if (!in_array($phase, ['pre', 'post'], true)) {
            throw new HttpException(400, 'Giai đoạn đánh giá phải là "pre" hoặc "post".');
        }
        $clientId = Validator::text($input['clientId'] ?? null, 'Mã phiếu (clientId)', 8, 64);

        $existing = $this->assessments->findByClientId($learnerId, $clientId);
        if ($existing !== null) {
            return ['assessment' => $this->view($existing), 'created' => false];
        }

        $scores = $this->normalizeScores($input['scores'] ?? null);
        $row = [
            'id' => Ids::random('asm-', 10),
            'learner_id' => $learnerId,
            'assessor_id' => $actor['id'],
            'phase' => $phase,
            'task1' => $scores[1], 'task2' => $scores[2], 'task3' => $scores[3],
            'task4' => $scores[4], 'task5' => $scores[5],
            'location' => Validator::optionalText($input['location'] ?? null, 200),
            'notes' => Validator::optionalText($input['notes'] ?? null, 2000),
            'client_id' => $clientId,
            'created_at' => Clock::nowUtc(),
        ];
        $this->assessments->insert($row);

        $stored = $this->assessments->findByClientId($learnerId, $clientId);
        return ['assessment' => $this->view($stored), 'created' => true];
    }

    /**
     * @param mixed $raw
     * @return array<int, ?int>  chỉ số 1..5 => điểm 0..5 hoặc null
     */
    private function normalizeScores(mixed $raw): array
    {
        if (!is_array($raw)) {
            throw new HttpException(400, 'Thiếu điểm số nhiệm vụ.');
        }
        $out = [];
        for ($i = 1; $i <= 5; $i++) {
            $value = $raw['task' . $i] ?? null;
            if ($value === null || $value === '') {
                $out[$i] = null;
                continue;
            }
            $out[$i] = Validator::int($value, 'Điểm nhiệm vụ ' . $i, 0, 5);
        }
        return $out;
    }

    /** Quy tắc 4.12. */
    private function assertCanAssess(array $actor): void
    {
        if ($actor['role'] === 'admin') {
            return;
        }
        if ($actor['role'] !== 'volunteer') {
            throw new HttpException(403, 'Chỉ Tình nguyện viên hoặc Quản trị viên mới được ghi phiếu quan sát.');
        }
        if ((int) $actor['active'] !== 1) {
            throw new HttpException(403, 'Tài khoản tình nguyện viên đang bị vô hiệu hóa (Quy tắc 4.12).');
        }
        if ((int) $actor['must_change'] === 1) {
            throw new HttpException(403, 'Cần đổi mật khẩu lần đầu trước khi ghi phiếu (Quy tắc 4.12, FR-AUTH-07).');
        }
    }

    /** @param array<string, mixed> $row */
    public function view(array $row): array
    {
        return [
            'id' => $row['id'],
            'learner' => $row['learner_id'],
            'phase' => $row['phase'],
            'scores' => [
                'task1' => $row['task1'] === null ? null : (int) $row['task1'],
                'task2' => $row['task2'] === null ? null : (int) $row['task2'],
                'task3' => $row['task3'] === null ? null : (int) $row['task3'],
                'task4' => $row['task4'] === null ? null : (int) $row['task4'],
                'task5' => $row['task5'] === null ? null : (int) $row['task5'],
            ],
            'assessor' => $row['assessor_id'],
            'location' => $row['location'],
            'notes' => $row['notes'],
            'created' => Clock::toIso($row['created_at']),
            'client_id' => $row['client_id'],
        ];
    }
}
