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
| S9 | Chính sách mật khẩu chỉ kiểm độ dài | Độ dài 10–200 (Quy tắc 4.13) và kiểm tra rò rỉ qua API Pwned Passwords (k-anonymity) | Test: mật khẩu bị rò rỉ bị từ chối; dịch vụ lỗi theo `PWNED_CHECK_FAIL_OPEN` |
| S10 | Nút đăng nhập "nhanh" với email mẫu | Xóa; Google Identity Services thật | Mã `LoginModal`, `WelcomeLanding` |
| S11 | Đáp án quiz nằm trong bundle | API công khai bỏ `correctChoice` và `explanation`; `POST /lessons/{no}/answer` chấm trên máy chủ; `PUT /progress` không nhận `score` từ client | Test 82/82; trình duyệt: đáp án đúng ghi điểm 1, sai giữ 0 |
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
| — | `tsconfig` không strict | Bật `strict`; mã đạt 0 lỗi (đã kiểm chứng bằng tệp thử có lỗi cố ý) | `tsc --noEmit` |
| — | `lang="en"` cho nội dung tiếng Việt | Đổi thành `vi` | `index.html` |

## Thay đổi kiến trúc

- Backend PHP 8.1+ (PDO MySQL), phân lớp Controller → Service → Repository, container thủ công, không phụ thuộc Composer.
- Frontend giữ React/Vite; `apiRouter` chuyển thành HTTP client gọi `/api`.
- Lược đồ MySQL: `api/database/schema.sql` (InnoDB, utf8mb4).

## Đã làm thêm (v8): gửi thư qua SMTP

- **`mail()` không dùng được trên hosting:** thêm bộ gửi thư SMTP thuần PHP (`api/src/Support/SmtpMailer.php`): STARTTLS, SSL, xác thực AUTH PLAIN/LOGIN, tiêu đề UTF-8, escape dấu chấm đầu dòng. Chọn bằng `MAIL_DRIVER` (mặc định SMTP nếu có `SMTP_HOST`).
- **Lệnh thử thư:** `php api/bin/test_mail.php <email>` để kiểm tra cấu hình trên hosting.
- **Kiểm thử:** 5 kiểm thử SMTP mới dùng máy chủ SMTP giả (`api/tests/fake_smtp.php`); luồng Quên mật khẩu đã gửi thư đúng qua SMTP. Tổng 95/95.
- **Chưa kiểm chứng:** đường truyền TLS/SSL với nhà cung cấp SMTP thật. Cần chạy `test_mail.php` trên hosting.

## Đã làm thêm (v7): đọc bài viết tin tức

- **Không đọc được nội dung bài:** thẻ tin chỉ có tiêu đề và tóm tắt, và trang chào không có liên kết nào. Nay bấm **Đọc bài viết** mở hộp thoại hiển thị toàn bộ nội dung (từng đoạn), ảnh, ngày đăng và liên kết trang nguồn. Áp dụng cho trang chào và trang học viên.
- **Quản trị không nhập được nội dung đầy đủ:** form "Thêm tin thủ công" có thêm ô **Nội dung đầy đủ**. Nếu để trống thì dùng tóm tắt.
- **"Đọc chi tiết" đưa đến trang chủ cổng:** nút này nay mở bài trong hộp thoại; liên kết "Trang nguồn" chỉ là liên kết phụ.

## Đã làm thêm (v6): giao diện quản trị

- **Sửa bài và thêm bài/tin mở dạng hộp thoại (modal):** trước đây form nằm ở cuối trang nên phải cuộn. Nay hiện phủ lên màn hình, bấm nền hoặc nhấn Esc để đóng.
- **Phân trang 10 mục/trang** cho danh sách bài học và bản tin. Bộ lọc đổi thì quay về trang 1. Phân trang phía trình duyệt; khi dữ liệu lớn cần chuyển sang phân trang phía máy chủ.
- **Thông báo đồng bộ khi tắt** hiển thị nền tím (thông tin), không còn là lỗi đỏ. Máy chủ trả 403 để phân biệt.
- **Bộ lọc nguồn tin có thêm "Nguồn RSS"** (nguồn `feed`). Nút "Thủ công" chỉ lấy tin `manual`.

## Đã làm thêm (v5)

- **Xóa mềm không hoạt động (lỗi giao diện):** nút "Xóa mềm" gửi `DELETE` không có `Content-Type`. Máy chủ bắt buộc header này cho mọi yêu cầu ghi nên trả 415, và giao diện báo lỗi. Sửa `src/services/apiClient.ts`: luôn gửi `Content-Type: application/json` cho POST/PUT/DELETE, và gửi `{}` khi không có thân. Đã kiểm thử trên trình duyệt: xóa mềm trả 200, bài chuyển sang tab "Đã xóa mềm", CSDL ghi `deleted_at`, khôi phục hoạt động. Kiểm thử tích hợp không bắt được lỗi này vì chúng luôn gửi header.

## Đã làm thêm (v4)

- **Đơn vị hành chính:** Sơn Trà là **phường** (từ năm 2025, theo chủ dự án). Đã đổi toàn bộ giao diện, metadata, nội dung bài học và đặc tả. Số điện thoại và tên miền trong nội dung cũ **chưa được xác minh lại** và cần rà soát.
- **Nguồn tin:** giữ đăng tin thủ công. Chức năng RSS/Atom vẫn có nhưng tắt, chờ nguồn được cấp phép.
- **CSDL:** tạo CSDL thật `sontra_so` với người dùng `sontra_app` (quyền giới hạn). Kiểm thử chạy trên CSDL `sontra_test` riêng và không làm thay đổi CSDL thật.

## Đã làm thêm (v3)

- **Đăng nhập học viên:** chỉ email/mật khẩu hoặc Google. Kiểm thử: `type=learner` không kèm email → 400.
- **Nguồn tin:** bỏ phân tích HTML (selector đoán được), thay bằng bộ đọc RSS/Atom qua `NEWS_FEED_URL`, tắt mặc định. Nguồn tin mới có nhãn `feed`. Chưa có nguồn nào được cấp phép.
- **Media:** video không tải lên được nữa; dùng liên kết YouTube. Âm thanh tải lên tối đa 10 MB, kiểm tra chữ ký tệp. Giao diện quản trị đã bỏ ô chọn tệp video.
- **Triển khai:** hướng dẫn chính dùng phpMyAdmin. `api/bin/make_admin_sql.php` sinh câu lệnh tạo quản trị viên đã băm, không chứa mật khẩu dạng rõ.

## Đã làm thêm (v2)

- **Strict TypeScript:** bật trong `tsconfig.json`; không có lỗi. (Nhận định trước đó rằng bật strict sẽ phát sinh nhiều lỗi là không đúng.)
- **Kiểm tra mật khẩu bị rò rỉ:** `PasswordBreachChecker` gọi API Pwned Passwords theo mô hình k-anonymity. Cấu hình: `PWNED_CHECK_ENABLED`, `PWNED_CHECK_FAIL_OPEN`.
- **Khôi phục mật khẩu qua email:** `PasswordResetService`, bảng `password_resets`, endpoint `POST /auth/forgot-password` và `POST /auth/reset-password`, giao diện "Quên mật khẩu?" và hộp thoại đặt mật khẩu mới. Cấu hình: `MAIL_FROM`, `MAIL_FROM_NAME`, `APP_URL`.
- **Chấm quiz trên máy chủ:** mục S11 ở trên.
- **Đặc tả:** `docs/spec/MASTER_SPEC_...md` lên phiên bản 2.0, có mục 15 mô tả kiến trúc hiện hành và trạng thái các mục mở.

## Còn mở (cần kiểm chứng ngoài môi trường phát triển)

1. **Dịch vụ kiểm tra rò rỉ mật khẩu** chưa được kiểm chứng với API thật: sandbox không truy cập được `api.pwnedpasswords.com`. Cần thử trên hosting.
2. **Gửi thư khôi phục** dựa trên `mail()` của PHP; cần xác nhận hosting gửi được thư và cấu hình SPF/DKIM.
3. **Triển khai thật** trên Hostinger/iNET chưa được thực hiện.
