<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Domain\Rules;
use SonTra\Repositories\AssessmentRepository;
use SonTra\Repositories\UserRepository;
use SonTra\Support\HttpException;

/**
 * Bảng tổng hợp trước–sau (Quy tắc 4.6, 4.8): chỉ Quản trị viên;
 * chỉ tính học viên có đủ 5 nhiệm vụ được đánh giá ở CẢ HAI lần đo.
 */
final class DashboardService
{
    public function __construct(
        private readonly AssessmentRepository $assessments,
        private readonly UserRepository $users,
    ) {
    }

    /** @return array<string, mixed> */
    public function summary(array $account): array
    {
        if ($account['role'] !== 'admin') {
            throw new HttpException(403, 'Tình nguyện viên và học viên không xem được bảng tổng hợp (Quy tắc 4.8).');
        }

        $rows = [];
        foreach ($this->assessments->all() as $row) {
            $rows[] = [
                'learner_id' => $row['learner_id'],
                'phase' => $row['phase'],
                'scores' => [1 => $row['task1'], 2 => $row['task2'], 3 => $row['task3'], 4 => $row['task4'], 5 => $row['task5']],
                'created_at' => $row['created_at'],
            ];
        }
        $pairs = Rules::eligiblePairs($rows);

        $sum = ['pre' => array_fill(1, 5, 0), 'post' => array_fill(1, 5, 0)];
        foreach ($pairs as $pair) {
            foreach (['pre', 'post'] as $phase) {
                for ($i = 1; $i <= 5; $i++) {
                    $sum[$phase][$i] += (int) $pair[$phase]['scores'][$i];
                }
            }
        }
        $n = count($pairs);
        $average = static fn(array $totals): array => $n === 0
            ? array_fill_keys(range(1, 5), null)
            : array_map(static fn(int $t): float => round($t / $n, 2), $totals);

        return [
            'learnerCount' => count($this->users->listByRoles(['learner'])),
            'assessmentCount' => count($rows),
            'eligibleLearners' => $n,
            'averagePre' => $average($sum['pre']),
            'averagePost' => $average($sum['post']),
        ];
    }
}
