# Hướng dẫn triển khai Sơn Trà Số trên Hostinger / iNET

Yêu cầu hosting: PHP **8.1 trở lên**, MySQL 8 hoặc MariaDB 10.6+, SSL (HTTPS). Các extension cần bật:
`pdo_mysql`, `curl`, `dom`, `mbstring`, `fileinfo`, `json`.

Gói chia sẻ thường không có SSH. Hướng dẫn có hai cách: **có SSH** (khuyến nghị) và **không có SSH** (dùng phpMyAdmin).

---

## Bước 1 — Tạo cơ sở dữ liệu MySQL

1. Vào **hPanel** (Hostinger) hoặc **cPanel** (iNET) → **Databases → MySQL Databases**.
2. Tạo cơ sở dữ liệu, người dùng và mật khẩu mạnh. Gán người dùng cho CSDL với **toàn quyền**.
3. Ghi lại: tên CSDL, tên người dùng, mật khẩu, máy chủ (thường là `localhost`).

### Quy ước CSDL

- **CSDL thật** (ví dụ `u123456_sontra`): chỉ dùng cho dữ liệu vận hành. Không chạy kiểm thử trên đây.
- **CSDL kiểm thử**: tên phải kết thúc bằng `_test`. Bộ kiểm thử xóa sạch dữ liệu trong CSDL này.
- Khi chạy kiểm thử trên máy có CSDL thật, đặt biến `DB_NAME=<tên>_test` để ghi đè cấu hình, ví dụ `DB_NAME=sontra_test php api/tests/run.php`.

## Bước 2 — Chọn phiên bản PHP

- Hostinger: **hPanel → Advanced → PHP Configuration**.
- iNET (cPanel): **Select PHP Version** hoặc **MultiPHP Manager**.

Chọn PHP 8.1 trở lên, bật các extension liệt kê ở trên.

## Bước 3 — Đóng gói từ máy phát triển

```bash
bun install            # hoặc: npm install
bash deploy/build-release.sh
```

Nếu dùng đăng nhập Google, đặt Client ID **trước khi** chạy script (xem bước 7): tạo tệp `.env.production` ở thư mục gốc dự án chứa một dòng:

```dotenv
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

Vite tự đọc tệp này khi build cho production, nên không cần gõ biến trong dòng lệnh. Tệp `.env.production` nằm trong `.gitignore`, không đưa lên git.

Kết quả: thư mục `release/public_html/` và tệp `release/son-tra-so-release.tar.gz`.
Script có chạy kiểm thử API; nếu thất bại, không tạo gói.

> `VITE_GOOGLE_CLIENT_ID` là biến **lúc build**: giá trị được ghi thẳng vào file giao diện trong `public_html/assets/`. Đổi Client ID nghĩa là phải chạy lại script và tải lại `public_html`. Để trống thì tab Google bị ẩn, học viên dùng email và mật khẩu.

## Bước 4 — Tạo tệp cấu hình ngoài thư mục web (khuyến nghị)

Tạo tệp, ví dụ `/home/<tài-khoản>/sontra-config/son-tra.env`, nội dung theo `api/.env.example`:

```dotenv
APP_URL=https://your-domain.example
APP_DEBUG=false
DB_HOST=localhost
DB_NAME=u123456_sontra
DB_USER=u123456_sontra
DB_PASS=mật-khẩu-csdl
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
NEWS_SYNC_ENABLED=false
```

Sau đó thêm vào đầu `public_html/.htaccess` (trước các quy tắc khác):

```apache
SetEnv SONTRA_ENV_FILE /home/<tài-khoản>/sontra-config/son-tra.env
```

Nếu không tạo tệp ngoài, đặt `api/.env` trong `public_html/api/` (đã được `.htaccess` chặn truy cập trực tiếp).

## Bước 5 — Tải gói lên hosting

1. Giải nén `son-tra-so-release.tar.gz` và tải **nội dung** của `public_html/` lên thư mục `public_html` (File Manager hoặc FTP/SFTP).
2. Kiểm tra có các mục: `index.html`, `assets/`, `api/`, `uploads/`, `.htaccess`, `.user.ini`.
3. **Không** tải `api/.env` từ máy phát triển lên.

## Bước 6 — Tạo bảng, nội dung và tài khoản quản trị (phpMyAdmin)

> Thực hiện theo thứ tự 6.1 → 6.3. Các tệp SQL đều chạy lại an toàn (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`, `ON DUPLICATE KEY UPDATE`).

Đây là cách chính. Không cần SSH. Thực hiện trên **phpMyAdmin** (hPanel → Databases → phpMyAdmin, hoặc cPanel → phpMyAdmin), chọn đúng cơ sở dữ liệu ở bước 1.

### 6.1. Tạo bảng

1. Chọn cơ sở dữ liệu → tab **Import** → chọn tệp `api/database/schema.sql` (trong gói phát hành) → **Go**.
2. Kết quả mong đợi: 9 bảng (`accounts`, `sessions`, `rate_limits`, `lessons`, `lesson_versions`, `learner_progress`, `assessments`, `news`, `password_resets`).

### 6.2. Nạp 9 bài học mẫu

1. Tab **Import** → chọn `api/database/seed.sql` → **Go**.
2. Kiểm tra: bảng `lessons` có 9 dòng. Chạy lại tệp này không tạo bản ghi trùng.

### 6.3. Tạo tài khoản Quản trị viên

Thực hiện trên **máy tính của bạn** (cần PHP 8.1 trở lên; có thể cài XAMPP hoặc dùng PHP có sẵn). Chạy từ thư mục gốc dự án đã giải nén:

```bash
SONTRA_ADMIN_PASSWORD='mật-khẩu-admin-mạnh-tối-thiểu-10-ký-tự' \
  php api/bin/make_admin_sql.php anhdnt@sontra.edu.vn "Đặng Ngọc Triều Anh" > admin.sql
```

Trên Windows (PowerShell):

```powershell
$env:SONTRA_ADMIN_PASSWORD = 'mật-khẩu-admin-mạnh-tối-thiểu-10-ký-tự'
php api\bin\make_admin_sql.php anhdnt@sontra.edu.vn "Đặng Ngọc Triều Anh" > admin.sql
```

Tệp `admin.sql` chỉ chứa **hash** của mật khẩu, không chứa mật khẩu dạng rõ. Sau đó:

1. Mở tệp `admin.sql` bằng trình soạn thảo văn bản, sao chép toàn bộ nội dung.
2. phpMyAdmin → chọn cơ sở dữ liệu → tab **SQL** → dán nội dung → **Go**.
3. Xóa tệp `admin.sql` khỏi máy sau khi dùng xong.

Câu lệnh có thể chạy lại an toàn: nếu cần đặt lại mật khẩu quản trị, tạo lại `admin.sql` với mật khẩu mới và chạy lại.

### Phụ lục — Nếu có SSH (tùy chọn)

Nếu gói hosting có SSH, có thể thay bước 6.1–6.3 bằng:

```bash
cd ~/public_html
php api/bin/migrate.php
php api/bin/seed.php
SONTRA_ADMIN_PASSWORD='...' php api/bin/create_admin.php anhdnt@sontra.edu.vn "Đặng Ngọc Triều Anh"
```

Các lệnh này chạy cùng một schema và dữ liệu như phương án phpMyAdmin.

### 6.4. Quản trị nội dung

- **Nên** sửa bài học, bản tin, tài khoản qua giao diện quản trị. Hệ thống tự lưu lịch sử phiên bản bài học và ghi người sửa (Quy tắc 4.4).
- **Sửa trực tiếp trên MySQL (phpMyAdmin)** chỉ khi cần thiết. Lưu ý:
  - Thao tác này **không** tạo bản lịch sử trong `lesson_versions`. Nếu cần khôi phục sau đó, phải tự ghi bản cũ trước khi sửa.
  - Cột `quiz_json` phải là JSON hợp lệ có dạng `{"question": "...", "options": [...], "correctChoice": 0, "explanation": "..."}`. Chỉ số `correctChoice` bắt đầu từ 0.
  - Không sửa `password_hash` bằng tay; dùng `api/bin/make_admin_sql.php` để đặt lại mật khẩu quản trị.
  - Xóa mềm bài học: đặt `deleted_at` thành thời điểm UTC (không xóa dòng), để giữ lịch sử tiến độ của học viên.

## Bước 6b — Cấu hình gửi thư khôi phục mật khẩu

Thêm vào `api/.env` (hoặc tệp cấu hình ngoài):

```dotenv
MAIL_FROM=no-reply@your-domain.example
MAIL_FROM_NAME=Sơn Trà Số
```

Dùng địa chỉ thuộc tên miền của hosting. Trên Hostinger và iNET, tạo hộp thư tương ứng (hoặc dùng bộ chuyển tiếp) và cấu hình bản ghi SPF cho tên miền để thư không vào thư rác.
Kiểm tra: bấm "Quên mật khẩu?" bằng một tài khoản thử, rồi xem thư đến. Nếu không nhận được, xem nhật ký lỗi (cPanel → Errors).

## Bước 7 — Đăng nhập Google (tùy chọn)

Đăng nhập Google cần **Client ID** (thông tin công khai). **Không cần client secret** và không cần đưa tệp `client_secret_*.json` lên hosting. Nếu secret đã từng bị lộ, vào Google Cloud Console → Credentials → chọn client → **Reset secret**.

### 7.1. Tạo hoặc kiểm tra OAuth client

1. Google Cloud Console → **APIs & Services → Credentials**.
2. Nếu chưa có: **Create credentials → OAuth client ID**, loại **Web application**.
3. Mục **Authorized JavaScript origins** phải có **đúng** địa chỉ trang, khớp với `APP_URL`:
   - `https://your-domain.example` (hosting thật; không có dấu `/` ở cuối, không có đường dẫn)
   - `http://localhost:8080` nếu vẫn chạy thử trên máy (giữ lại, không xóa)
   - Thêm `www` nếu trang dùng cả hai tên miền.

Nếu thay đổi origin, Google có thể mất vài phút để áp dụng.

### 7.2. Đặt Client ID vào hai nơi

| Nơi đặt | Biến | Dùng để | Khi nào cần làm lại |
|---|---|---|---|
| Tệp cấu hình trên hosting (bước 4) | `GOOGLE_CLIENT_ID=...` | Máy chủ kiểm tra token | Khi đổi Client ID (không cần build lại) |
| `.env.production` trên máy build (bước 3) | `VITE_GOOGLE_CLIENT_ID=...` | Hiện nút Google trên giao diện | Khi đổi Client ID: build lại, tải lại `public_html` |

Hai giá trị phải **giống nhau**. Nếu khác nhau, Google đăng nhập được nhưng máy chủ từ chối.

### 7.3. Kiểm tra cấu hình máy chủ

Chạy lệnh sau từ máy của bạn (thay tên miền):

```bash
curl -s -X POST https://your-domain.example/api/auth/google -H "Content-Type: application/json" -d '{"credential":"thu"}'
```

- `{"error":"Đăng nhập Google chưa được cấu hình trên máy chủ."}` (HTTP 503): thiếu `GOOGLE_CLIENT_ID` trong tệp cấu hình trên hosting. Sửa rồi thử lại.
- `{"error":"Không xác minh được tài khoản Google..."}` (HTTP 401): máy chủ đã nhận Client ID. Đây là kết quả đúng vì token `thu` là giả.

### 7.4. Kiểm tra trên trình duyệt

1. Mở `https://your-domain.example`, chọn tab **Google OAuth2** (chỉ hiện khi build có Client ID).
2. Đăng nhập bằng một tài khoản Google.
3. Thành công thì vào được cổng học viên.

Nếu Google báo **`origin_mismatch`** hoặc "Access blocked": địa chỉ trên trình duyệt chưa có trong **Authorized JavaScript origins** (mục 7.1).

Nếu bỏ qua bước này, học viên vẫn đăng nhập được bằng email và mật khẩu.

## Bước 8 — Kiểm tra sau triển khai

- [ ] Mở `https://your-domain.example/` — trang chủ hiển thị, không lỗi trên console.
- [ ] Truy cập `https://your-domain.example/api/me` — trả `{"authenticated":false}`.
- [ ] Truy cập `https://your-domain.example/api/lessons` — trả danh sách bài học.
- [ ] Đăng nhập quản trị viên bằng form (email và mật khẩu đã đặt ở bước 6.3) — vào được cổng quản trị.
- [ ] Dán liên kết YouTube vào một bài học — video hiển thị. Không có chức năng tải video lên.
- [ ] Đăng nhập sai 5 lần — nhận thông báo khóa tạm 15 phút.
- [ ] Thử truy cập `https://your-domain.example/api/src/Http/Router.php` — phải trả 403.
- [ ] Thử truy cập `https://your-domain.example/api/.env` — phải trả 403.
- [ ] Tải lên một tệp video giả (không phải MP4) — hệ thống từ chối.
- [ ] Tải lại trang sau khi đăng nhập — vẫn đăng nhập.
- [ ] Bấm "Quên mật khẩu?" với email thử — nhận thư có liên kết đặt lại.

## Bước 9 — Vận hành

- **Sao lưu:** cPanel → **Backup** hoặc hPanel → **Backups**; định kỳ xuất CSDL từ phpMyAdmin hoặc `mysqldump`.
- **Tệp media:** nằm trong `public_html/uploads/media/`. Sao lưu cùng CSDL.
- **Phiên hết hạn:** máy chủ tự dọn ngẫu nhiên (không cần cron).
- **Cập nhật:** build gói mới, tải lại `public_html/` **trừ** `api/.env`, `uploads/` và cấu hình ngoài. Nếu có thay đổi schema, chạy lại `migrate.php` (an toàn khi chạy lặp).
- **Nhật ký lỗi:** xem trong cPanel → **Errors** hoặc hPanel → **Logs**. Lỗi chi tiết ghi vào nhật ký, không hiển thị cho người dùng.

## Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách khắc phục |
|---|---|---|
| Trang trắng hoặc `/api/*` trả 404 | `.htaccess` chưa được tải lên, hoặc `mod_rewrite` tắt | Kiểm tra `.htaccess` ở `public_html/`; liên hệ hỗ trợ bật mod_rewrite |
| `Hệ thống đang tạm thời không khả dụng` (503) | Sai thông tin CSDL trong `.env` | Kiểm tra `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` |
| Đăng nhập được nhưng bị đăng xuất ngay | Trang không dùng HTTPS nên trình duyệt từ chối cookie Secure | Bật SSL và bật chuyển hướng HTTPS |
| Tải âm thanh báo lỗi | `upload_max_filesize` quá nhỏ hoặc tệp lớn hơn 10 MB | Sửa `.user.ini` hoặc MultiPHP INI Editor; nén âm thanh |
| Nút Google báo "chưa được cấu hình" | Chưa đặt `VITE_GOOGLE_CLIENT_ID` lúc build | Đặt biến và build lại gói |
