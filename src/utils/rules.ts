/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Quy tắc nghiệp vụ bất biến cho Sơn Trà Số theo Master Spec (mục 7)
 */

import { LearnerProgress, AssessmentScores, Assessment, Lesson } from '../types';

export const REPORT_UTC_OFFSET_MINUTES = 420; // UTC+7

/**
 * Quy tắc 4.1: Tiến độ hợp nhất bằng giá trị lớn nhất của từng trường.
 * 'done' không bao giờ bị hạ khi đồng bộ sau chỉ có 'read'.
 */
export function mergeProgress(
  current: LearnerProgress | undefined,
  incoming: Partial<LearnerProgress> & { learner: string; lesson: number }
): LearnerProgress {
  const now = new Date().toISOString();
  if (!current) {
    const isDone = (incoming.done ?? 0) === 1;
    return {
      learner: incoming.learner,
      lesson: incoming.lesson,
      read: incoming.read ?? 0,
      done: incoming.done ?? 0,
      score: incoming.score ?? 0,
      updated: now,
      completed_at: isDone ? now : undefined,
    };
  }

  const mergedRead = Math.max(current.read, incoming.read ?? 0);
  const mergedDone = Math.max(current.done, incoming.done ?? 0);
  const mergedScore = Math.max(current.score, incoming.score ?? 0);

  let completedAt = current.completed_at;
  if (mergedDone === 1 && !completedAt) {
    completedAt = now;
  }

  return {
    learner: current.learner,
    lesson: current.lesson,
    read: mergedRead,
    done: mergedDone,
    score: mergedScore,
    updated: now,
    completed_at: completedAt,
  };
}

/**
 * Quy tắc 4.2: null trong phiếu quan sát nghĩa là "chưa đánh giá", KHÔNG được chuyển thành 0.
 */
export function isTaskAssessed(val: number | null): boolean {
  return val !== null && val !== undefined;
}

/**
 * Kiểm tra xem một học viên có đủ 5 nhiệm vụ được đánh giá (khác null) hay không
 */
export function hasAllFiveTasksAssessed(scores: AssessmentScores): boolean {
  return (
    scores.task1 !== null &&
    scores.task2 !== null &&
    scores.task3 !== null &&
    scores.task4 !== null &&
    scores.task5 !== null
  );
}

/**
 * Quy tắc 4.6: Dashboard đối chiếu trước–sau CHỈ tính học viên đủ 5 nhiệm vụ ở CẢ HAI lần đo (pre và post).
 */
export function filterEligibleLearnersForComparison(assessments: Assessment[]): {
  eligibleLearners: string[];
  pairedData: Array<{
    learnerId: string;
    pre: Assessment;
    post: Assessment;
  }>;
} {
  const preMap = new Map<string, Assessment>();
  const postMap = new Map<string, Assessment>();

  for (const a of assessments) {
    if (a.phase === 'pre' && hasAllFiveTasksAssessed(a.scores)) {
      if (!preMap.has(a.learner)) preMap.set(a.learner, a);
    } else if (a.phase === 'post' && hasAllFiveTasksAssessed(a.scores)) {
      if (!postMap.has(a.learner)) postMap.set(a.learner, a);
    }
  }

  const eligibleLearners: string[] = [];
  const pairedData: Array<{ learnerId: string; pre: Assessment; post: Assessment }> = [];

  for (const [learnerId, pre] of preMap.entries()) {
    const post = postMap.get(learnerId);
    if (post) {
      eligibleLearners.push(learnerId);
      pairedData.push({ learnerId, pre, post });
    }
  }

  return { eligibleLearners, pairedData };
}

/**
 * Quy tắc 4.17: Ngưỡng đạt kiểm tra hiểu bài: 70% số bài đang hiện, so sánh bằng số nguyên.
 * Tử số: số bài đang hiện có ít nhất một lượt đúng (progress.score = 1).
 * Mẫu số: tổng số bài đang hiện (hidden === 0). Bài ẩn KHÔNG vào mẫu số lẫn tử số.
 * Khi chưa có lượt làm nào, trạng thái là "Chưa có dữ liệu".
 */
export function calculateQuizPassStatus(
  lessons: Lesson[],
  progressList: LearnerProgress[]
): {
  visibleLessonCount: number;
  passedLessonCount: number;
  percentage: number;
  isPassed: boolean;
  hasAttempts: boolean;
} {
  const visibleLessons = lessons.filter((l) => l.hidden === 0);
  const visibleLessonIds = new Set(visibleLessons.map((l) => l.lesson));

  let passedCount = 0;
  let totalAttempts = 0;

  for (const p of progressList) {
    if (visibleLessonIds.has(p.lesson)) {
      if (p.score === 1) {
        passedCount++;
      }
      if (p.read === 1 || p.done === 1 || p.score === 1) {
        totalAttempts++;
      }
    }
  }

  const totalVisible = visibleLessons.length;
  if (totalVisible === 0) {
    return {
      visibleLessonCount: 0,
      passedLessonCount: 0,
      percentage: 0,
      isPassed: false,
      hasAttempts: false,
    };
  }

  const percentage = Math.round((passedCount / totalVisible) * 100);
  const requiredCount = Math.ceil(totalVisible * 0.7);
  const isPassed = passedCount >= requiredCount;

  return {
    visibleLessonCount: totalVisible,
    passedLessonCount: passedCount,
    percentage,
    isPassed,
    hasAttempts: totalAttempts > 0,
  };
}

/**
 * Định dạng thời gian theo múi giờ UTC+7
 */
export function formatUtcPlus7(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Xuất dữ liệu CSV có BOM UTF-8 (\uFEFF) theo NFR-DSH-04
 */
export function exportCsvWithBom(headers: string[], rows: (string | number)[][], filename: string): void {
  const csvContent =
    '\uFEFF' +
    [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = cell === null || cell === undefined ? '' : String(cell);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
