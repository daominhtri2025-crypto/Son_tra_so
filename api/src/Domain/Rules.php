<?php

declare(strict_types=1);

namespace SonTra\Domain;

use SonTra\Support\HttpException;

/**
 * Quy tắc nghiệp vụ thuần (không truy cập CSDL), tương ứng mục 7 của đặc tả MASTER_SPEC.
 * Tách riêng để kiểm thử đơn vị được (xem api/tests/run.php).
 */
final class Rules
{
    public const TASK_COUNT = 5;

    /**
     * Quy tắc 4.1: hợp nhất tiến độ bằng giá trị lớn nhất của từng cờ; 'done' không bao giờ bị hạ.
     *
     * @param array{is_read:int,is_done:int,score:int,completed_at:?string}|null $current
     * @param array{read:int,done:int,score:int} $incoming
     * @return array{is_read:int,is_done:int,score:int,completed_at:?string}
     */
    public static function mergeProgress(?array $current, array $incoming, string $nowUtc): array
    {
        $base = $current ?? ['is_read' => 0, 'is_done' => 0, 'score' => 0, 'completed_at' => null];
        $merged = [
            'is_read' => max($base['is_read'], self::flag($incoming['read'] ?? 0)),
            'is_done' => max($base['is_done'], self::flag($incoming['done'] ?? 0)),
            'score' => max($base['score'], self::flag($incoming['score'] ?? 0)),
            'completed_at' => $base['completed_at'],
        ];
        if ($merged['is_done'] === 1 && $merged['completed_at'] === null) {
            $merged['completed_at'] = $nowUtc;
        }
        return $merged;
    }

    /**
     * Quy tắc 4.6: chỉ đối chiếu trước–sau với học viên có đủ 5 nhiệm vụ được đánh giá ở CẢ HAI lần đo.
     * Quy tắc 4.2: null nghĩa là "chưa đánh giá", không được coi là 0.
     *
     * @param list<array{learner_id:string, phase:string, scores:array<int, ?int>, created_at:string}> $assessments
     * @return array<string, array{pre: array, post: array}>  learner_id => cặp phiếu eligible
     */
    public static function eligiblePairs(array $assessments): array
    {
        $latest = [];
        foreach ($assessments as $a) {
            if (!self::fullyAssessed($a['scores'])) {
                continue;
            }
            $key = $a['learner_id'] . '|' . $a['phase'];
            if (!isset($latest[$key]) || $a['created_at'] > $latest[$key]['created_at']) {
                $latest[$key] = $a;
            }
        }
        $pairs = [];
        foreach ($latest as $key => $a) {
            [$learner, $phase] = explode('|', $key, 2);
            $pairs[$learner][$phase] = $a;
        }
        return array_filter(
            $pairs,
            static fn(array $p): bool => isset($p['pre'], $p['post']),
        );
    }

    /** @param array<int, ?int> $scores */
    public static function fullyAssessed(array $scores): bool
    {
        for ($i = 1; $i <= self::TASK_COUNT; $i++) {
            if (!isset($scores[$i]) || $scores[$i] === null) {
                return false;
            }
        }
        return true;
    }

    /**
     * Kiểm tra và chuẩn hóa đề kiểm tra (quiz) của bài học.
     *
     * @param mixed $raw
     * @return array{question:string, options:list<string>, correctChoice:int, explanation:string}
     */
    public static function normalizeQuiz(mixed $raw): array
    {
        if (!is_array($raw)) {
            throw new HttpException(400, 'Thiếu thông tin câu hỏi kiểm tra.');
        }
        $question = trim((string) ($raw['question'] ?? ''));
        if (mb_strlen($question) < 5 || mb_strlen($question) > 500) {
            throw new HttpException(400, 'Câu hỏi kiểm tra phải có từ 5 đến 500 ký tự.');
        }
        $options = array_values(array_filter(
            array_map(static fn($o): string => trim((string) $o), (array) ($raw['options'] ?? [])),
            static fn(string $o): bool => $o !== '',
        ));
        if (count($options) < 2 || count($options) > 6) {
            throw new HttpException(400, 'Mỗi câu hỏi cần từ 2 đến 6 phương án trả lời không rỗng.');
        }
        $correct = $raw['correctChoice'] ?? null;
        if (!is_int($correct) && !(is_string($correct) && ctype_digit($correct))) {
            throw new HttpException(400, 'Đáp án đúng không hợp lệ.');
        }
        $correct = (int) $correct;
        if ($correct < 0 || $correct >= count($options)) {
            throw new HttpException(400, 'Đáp án đúng phải là chỉ số của một phương án hiện có.');
        }
        $explanation = trim((string) ($raw['explanation'] ?? ''));
        return [
            'question' => $question,
            'options' => $options,
            'correctChoice' => $correct,
            'explanation' => $explanation !== '' ? $explanation : 'Vui lòng đọc lại bài học.',
        ];
    }

    /** Nguồn tệp đa phương tiện: chỉ chấp nhận URL http(s); tệp tải lên không được lưu trong CSDL. */
    public static function mediaType(?string $url, ?string $type): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }
        return $type === 'file' ? 'file' : 'url';
    }

    private static function flag(mixed $value): int
    {
        return ((int) $value) === 1 ? 1 : 0;
    }
}
