-- =====================================================================
-- Sơn Trà Số — Lược đồ MySQL 8.0 / MariaDB 10.6+ (InnoDB, utf8mb4)
-- Chạy một lần trên CSDL trống (hoặc chạy lại an toàn nhờ IF NOT EXISTS).
-- =====================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id              VARCHAR(40)  NOT NULL,
  email           VARCHAR(190) NOT NULL,
  full_name       VARCHAR(200) NOT NULL,
  role            ENUM('admin','volunteer','learner') NOT NULL,
  auth_provider   ENUM('local','google')              NOT NULL DEFAULT 'local',
  password_hash   VARCHAR(255) NULL,            -- NULL với tài khoản chỉ đăng nhập Google
  google_sub      VARCHAR(64)  NULL,            -- định danh 'sub' của Google (đã xác minh)
  learner_code    VARCHAR(20)  NULL,            -- mã hiển thị học viên ST-HV-NNN
  avatar_url      VARCHAR(500) NULL,
  phone           VARCHAR(30)  NULL,
  organization    VARCHAR(200) NULL,
  active          TINYINT(1)   NOT NULL DEFAULT 1,
  must_change     TINYINT(1)   NOT NULL DEFAULT 0,
  failed_attempts INT          NOT NULL DEFAULT 0,
  locked_until    DATETIME     NULL,
  created_at      DATETIME     NOT NULL,
  updated_at      DATETIME     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accounts_email (email),
  UNIQUE KEY uq_accounts_google_sub (google_sub),
  UNIQUE KEY uq_accounts_learner_code (learner_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  CHAR(64)    NOT NULL,              -- SHA-256 của token gửi trong cookie
  account_id  VARCHAR(40) NOT NULL,
  expires_at  DATETIME    NOT NULL,
  created_at  DATETIME    NOT NULL,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_account (account_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Giới hạn tần suất theo khóa (ví dụ: "login-ip:1.2.3.4"), cửa sổ cố định.
CREATE TABLE IF NOT EXISTS rate_limits (
  limit_key    VARCHAR(190) NOT NULL,
  window_start DATETIME     NOT NULL,
  hits         INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (limit_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
  lesson_no     INT          NOT NULL,           -- mã bài học, không đổi
  title         VARCHAR(255) NOT NULL,
  group_no      TINYINT      NOT NULL,           -- nhóm nhiệm vụ 1..5
  body          MEDIUMTEXT   NOT NULL,
  quiz_json     TEXT         NOT NULL,           -- {question, options[], correctChoice, explanation}
  next_step     TEXT         NULL,
  video_url     VARCHAR(500) NULL,
  video_type    ENUM('url','file') NULL,
  video_filename VARCHAR(255) NULL,
  audio_url     VARCHAR(500) NULL,
  audio_type    ENUM('url','file') NULL,
  audio_filename VARCHAR(255) NULL,
  hidden        TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_at    DATETIME     NULL,              -- xóa mềm (Quy tắc 4.15)
  created_at    DATETIME     NOT NULL,
  updated_at    DATETIME     NOT NULL,
  PRIMARY KEY (lesson_no),
  KEY idx_lessons_visible (deleted_at, hidden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_versions (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  lesson_no      INT          NOT NULL,
  title          VARCHAR(255) NOT NULL,
  group_no       TINYINT      NOT NULL,
  body           MEDIUMTEXT   NOT NULL,
  quiz_json      TEXT         NOT NULL,
  next_step      TEXT         NULL,
  video_url      VARCHAR(500) NULL,
  video_type     VARCHAR(10)  NULL,
  video_filename VARCHAR(255) NULL,
  audio_url      VARCHAR(500) NULL,
  audio_type     VARCHAR(10)  NULL,
  audio_filename VARCHAR(255) NULL,
  hidden         TINYINT(1)   NOT NULL DEFAULT 0,
  deleted_at     DATETIME     NULL,
  saved_by       VARCHAR(190) NOT NULL,
  saved_at       DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_versions_lesson (lesson_no, saved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tiến độ học viên (Quy tắc 4.1: hợp nhất theo max từng trường)
CREATE TABLE IF NOT EXISTS learner_progress (
  learner_id   VARCHAR(40) NOT NULL,
  lesson_no    INT         NOT NULL,
  is_read      TINYINT(1)  NOT NULL DEFAULT 0,
  is_done      TINYINT(1)  NOT NULL DEFAULT 0,
  score        TINYINT(1)  NOT NULL DEFAULT 0,
  completed_at DATETIME    NULL,
  updated_at   DATETIME    NOT NULL,
  PRIMARY KEY (learner_id, lesson_no),
  CONSTRAINT fk_progress_account FOREIGN KEY (learner_id) REFERENCES accounts (id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_lesson  FOREIGN KEY (lesson_no) REFERENCES lessons (lesson_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phiếu quan sát năng lực số (Quy tắc 4.2: NULL = chưa đánh giá; 4.3: idempotent theo client_id)
CREATE TABLE IF NOT EXISTS assessments (
  id          VARCHAR(40)  NOT NULL,
  learner_id  VARCHAR(40)  NOT NULL,
  assessor_id VARCHAR(40)  NOT NULL,
  phase       ENUM('pre','post') NOT NULL,
  task1       TINYINT NULL,
  task2       TINYINT NULL,
  task3       TINYINT NULL,
  task4       TINYINT NULL,
  task5       TINYINT NULL,
  location    VARCHAR(200) NULL,
  notes       TEXT         NULL,
  client_id   VARCHAR(64)  NOT NULL,
  created_at  DATETIME     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assessment_idempotent (learner_id, client_id),
  KEY idx_assessment_learner (learner_id, phase),
  CONSTRAINT fk_assessment_learner  FOREIGN KEY (learner_id)  REFERENCES accounts (id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_assessor FOREIGN KEY (assessor_id) REFERENCES accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id           INT          NOT NULL AUTO_INCREMENT,
  title        VARCHAR(500) NOT NULL,
  summary      TEXT         NOT NULL,
  content      MEDIUMTEXT   NULL,
  source_url   VARCHAR(500) NULL,
  source_hash  CHAR(64)     NULL,               -- SHA-256 của source_url, dùng cho UNIQUE
  image_url    VARCHAR(500) NULL,
  source       ENUM('sontra_gov','manual') NOT NULL DEFAULT 'manual',
  hidden       TINYINT(1)   NOT NULL DEFAULT 0,
  published_at DATETIME     NOT NULL,
  created_by   VARCHAR(200) NULL,
  crawled_at   DATETIME     NULL,
  created_at   DATETIME     NOT NULL,
  updated_at   DATETIME     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_news_source (source_hash),
  KEY idx_news_visible (hidden, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Token khôi phục mật khẩu: chỉ lưu băm SHA-256; hiệu lực 15 phút; dùng một lần (đặc tả mục 8.1).
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash  CHAR(64)    NOT NULL,
  account_id  VARCHAR(40) NOT NULL,
  expires_at  DATETIME    NOT NULL,
  used_at     DATETIME    NULL,
  created_at  DATETIME    NOT NULL,
  PRIMARY KEY (token_hash),
  KEY idx_resets_account (account_id),
  CONSTRAINT fk_resets_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
