# Nhật ký sửa lỗi — Sơn Trà Số

Ánh xạ từng phát hiện trong `BAO_CAO_PHAN_TICH_SON_TRA_SO.md` với cách sửa và bằng chứng kiểm thử.
Mã kiểm thử: `api/tests/run.php` (57 kiểm tra, chạy trên MariaDB 10.11), kiểm thử giao diện bằng Chromium.

| Mã | Phát hiện | Cách sửa | Bằng chứng |
|---|---|---|---|
| S1 | Mật khẩu viết cứng trong mã phía client | Xóa `initAuth.ts`; admin tạo bằng `bin/create_admin.php` (nhập ẩn hoặc biến môi trường); xóa mật khẩu mặc định trong AdminPortal | Không còn chuỗi mật khẩu nào trong `release/` (kiểm tra bằng grep) |
| S2 | Đăng nhập Google không xác thực token | `GoogleTokenVerifier` gọi tokeninfo, kiểm tra aud/iss/exp/email_verified; tài khoản quản trị/TNV không đăng nhập bằng Google | Test: không có GOOGLE_CLIENT_ID → 503 |
| S3 | Đăng nhập học viên chỉ bằng mã | Bỏ đăng nhập bằng mã; mọi vai trò dùng email + mật khẩu hoặc Google | Test: `type=learner` không kèm email → 400 |
| S4 | Lộ trạng thái tài khoản khi dò tìm | Xác minh mật khẩu trước khi trả trạng thái vô hiệu hóa; hash giả cân bằng thời gian | Test khóa tạm + thông báo chung |
| S5 | `Origin` kiểm tra bằng `includes('run.app')` | Danh sách Origin chính xác từ APP_URL và Host | Test: Origin lạ → 403 |
| S6 | Cookie phiên đặt bằng JavaScript | Cookie do máy chủ cấp: HttpOnly; Secure; SameSite=Lax; 12 giờ | Test: header Set-Cookie; trình duyệt báo httpOnly=true, secure=true |
| S7 | Quiz không kiểm tra đáp án | `Rules::normalizeQuiz`: 2–6 phương án, đáp án trong phạm vi | Test: correctChoice=99 → 400 |
| S8 | So sánh mật khẩu `===` | `password_verify` (hash có muối, tự nâng cấp khi cần) | Mã `AuthService` |
| S9 | Chính sách mật khẩu chỉ kiểm độ dài | Giữ 10–200 ký tự (Quy tắc 4.13); chưa kiểm mật khẩu bị rò rỉ | Còn mở — xem mục "Chưa làm" |
| S10 | Nút đăng nhập "nhanh" với email mẫu | Xóa; Google Identity Services thật | Mã `LoginModal`, `WelcomeLanding` |
| S11 | Đáp án quiz nằm trong bundle | Chưa xử lý (dữ liệu học tập) | Còn mở |
| F1 | ST-HV-002/003 bị đăng xuất ngay | Phiên gắn trực tiếp với tài khoản học viên | Test: `/me` sau đăng nhập → authenticated |
| F2 | Email quản trị cố định khi lưu lịch sử | Máy chủ lấy người lưu từ phiên | Mã `LessonService::snapshot` |
| F3 | Phiếu quan sát không được lưu | Bảng `assessments`, idempotent theo `client_id` | Test: gửi lặp không trùng |
| F4 | Dashboard là placeholder | `DashboardService` tính cặp trước–sau theo Quy tắc 4.6 | Test: TNV → 403; admin → tổng hợp |
| F5 | `includeDeleted = … \|\| true` | Đã bỏ; quyền quản trị kiểm tra rõ ràng | Test: học viên không thấy bài đã xóa |
| F6 | Tin "chính thức" bịa khi cào lỗi | Xóa dữ liệu dự phòng; đồng bộ tắt mặc định; lỗi trả về rõ ràng | Test: sync tắt → 403 có thông báo |
| F7 | Mất phiên khi tải lại trang | Phiên lưu trong CSDL | Trình duyệt: tải lại vẫn đăng nhập |
| F8 | Hồ sơ không chuẩn hóa | Validator độ dài/định dạng; chỉ cho phép 3 trường | Mã `AccountService::updateProfile` |
| — | Lỗi cài đặt npm (esbuild ERESOLVE) | Bỏ devDependency esbuild; cập nhật lockfile Bun | `bun install` thành công |
| — | Bundle 766 KB, có cheerio | Bỏ cheerio và mã chết; bundle còn 416 KB (gzip 110 KB) | `vite build` |
| — | `tsconfig` không strict | Chưa bật (xem "Chưa làm") | — |
| — | `lang="en"` cho nội dung tiếng Việt | Đổi thành `vi` | `index.html` |

## Thay đổi kiến trúc

- Backend PHP 8.1+ (PDO MySQL), phân lớp Controller → Service → Repository, container thủ công, không phụ thuộc Composer.
- Frontend giữ React/Vite; `apiRouter` chuyển thành HTTP client gọi `/api`.
- Lược đồ MySQL: `api/database/schema.sql` (InnoDB, utf8mb4).

## Chưa làm (cần quyết định hoặc công sức riêng)

1. **Bật `strict` trong TypeScript**: sẽ phát sinh nhiều lỗi kiểu trong các component giao diện; nên làm thành một đợt riêng.
2. **Kiểm tra mật khẩu bị rò rỉ** (S9): cần nguồn dữ liệu được phê duyệt; hiện chỉ kiểm tra độ dài.
3. **Bảo vệ đáp án quiz** (S11): cần quyết định kiến trúc (chấm điểm phía máy chủ).
4. **Đồng bộ tin tự động**: đặc tả ghi nguồn chưa cho phép truy cập tự động; tính năng đang tắt, bật bằng `NEWS_SYNC_ENABLED=true` khi có văn bản cho phép.
5. **Tải tệp media trên hosting chia sẻ**: lưu trên ổ đĩa hosting, giới hạn video 25 MB, âm thanh 10 MB. Nếu cần băng thông hoặc dung lượng lớn hơn, cân nhắc lưu trữ đối tượng (ví dụ Cloudflare R2) theo đặc tả mục 4.5.
6. **Khôi phục mật khẩu qua email**: chưa có trong phạm vi sửa lỗi này.
