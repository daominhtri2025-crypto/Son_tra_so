/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Định nghĩa kiểu dữ liệu cho ứng dụng Sơn Trà Số theo DAC_TA và MASTER_SPEC
 */

export type Role = 'learner' | 'volunteer' | 'admin';

export interface Learner {
  id: string;
  code: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider?: 'local' | 'google';
  created: string;
}

export interface Lesson {
  lesson: number;
  title: string;
  group_no: number; // 1 to 5
  body: string;
  quiz: {
    question: string;
    options: string[];
    correctChoice: number; // 0-indexed
    explanation: string;
  };
  next_step?: string;
  video_url?: string;
  video_type?: 'url' | 'file';
  video_filename?: string;
  audio_url?: string;
  audio_filename?: string;
  audio_type?: 'url' | 'file';
  hidden: number; // 0: hiện, 1: ẩn
  deleted_at?: string | null; // Xóa mềm (Soft delete) bảo vệ tính toàn vẹn tham chiếu
  created: string;
  updated: string;
}

export interface LessonVersion {
  id: number;
  lesson: number;
  title: string;
  group_no: number;
  body: string;
  quiz: string;
  next_step?: string;
  video_url?: string;
  video_type?: 'url' | 'file';
  video_filename?: string;
  audio_url?: string;
  audio_filename?: string;
  audio_type?: 'url' | 'file';
  hidden: number;
  deleted_at?: string | null;
  saved_by: string;
  saved_at: string;
}

export interface LearnerProgress {
  learner: string;
  lesson: number;
  read: number; // 0 or 1
  done: number; // 0 or 1
  score: number; // 0 or 1
  updated: string;
  completed_at?: string;
}

export interface QuizAttempt {
  id: string;
  learner: string;
  lesson: number;
  choice: number;
  correct: number; // 0 or 1
  client_id: string;
  created: string;
}

/**
 * 5 nhiệm vụ năng lực số chuẩn:
 * 1. Sử dụng thiết bị cơ bản & kết nối wifi/4G
 * 2. Tra cứu thông tin & dịch vụ công trực tuyến Sơn Trà
 * 3. Giao tiếp qua tin nhắn / mạng xã hội an toàn
 * 4. Thanh toán không tiền mặt & ví điện tử dân sinh
 * 5. Tự bảo vệ dữ liệu & nhận diện lừa đảo trên mạng
 */
export interface AssessmentScores {
  task1: number | null; // null = "chưa đánh giá" (Quy tắc 4.2: không thành 0)
  task2: number | null;
  task3: number | null;
  task4: number | null;
  task5: number | null;
}

export interface Assessment {
  id: string;
  learner: string;
  phase: 'pre' | 'post'; // Trước khóa học / Sau khóa học
  scores: AssessmentScores;
  assessor: string; // Email tình nguyện viên
  location?: string; // Cơ sở / Tổ dân phố / Nhà văn hóa
  notes?: string;
  created: string;
  client_id: string; // Idempotency
}

export interface Account {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  auth_provider?: 'local' | 'google';
  avatar_url?: string;
  phone?: string;
  organization?: string; // Đơn vị công tác / Tổ TNV
  active: number; // 1 = hoạt động, 0 = bị vô hiệu hóa
  must_change: number; // 1 = bắt buộc đổi mật khẩu lần kế tiếp
  failed_attempts: number;
  locked_until: string | null;
  created: string;
  updated: string;
}

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  source_url?: string;
  image_url?: string;
  source?: 'sontra_gov' | 'manual';
  status?: 'published' | 'pending' | 'draft';
  crawled_at?: string;
  hidden: number;
  published_at: string;
  created_by?: string;
  created: string;
  updated: string;
}

/** Ngữ cảnh người dùng đăng nhập do máy chủ trả về (không chứa mật khẩu hay token). */
export interface UserContext {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  active: number;
  mustChange: number;
  code?: string | null;
  avatarUrl?: string | null;
  authProvider?: 'local' | 'google';
  phone?: string | null;
  organization?: string | null;
}
