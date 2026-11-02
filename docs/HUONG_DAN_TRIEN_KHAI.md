# Hướng dẫn triển khai Sơn Trà Số trên Hostinger / iNET

Yêu cầu hosting: PHP **8.1 trở lên**, MySQL 8 hoặc MariaDB 10.6+, SSL (HTTPS). Các extension cần bật:
`pdo_mysql`, `curl`, `dom`, `mbstring`, `fileinfo`, `json`.

Gói chia sẻ thường không có SSH. Hướng dẫn có hai cách: **có SSH** (khuyến nghị) và **không có SSH** (dùng phpMyAdmin).

---

## Bước 1 — Tạo cơ sở dữ liệu MySQL

1. Vào **hPanel** (Hostinger) hoặc **cPanel** (iNET) → **Databases → MySQL Databases**.
2. Tạo cơ sở dữ liệu, người dùng và mật khẩu mạnh. Gán người dùng cho CSDL với **toàn quyền**.
3. Ghi lại: tên CSDL, tên người dùng, mật khẩu, máy chủ (thường là `localhost`).

## Bước 2 — Chọn phiên bản PHP

- Hostinger: **hPanel → Advanced → PHP Configuration**.
- iNET (cPanel): **Select PHP Version** hoặc **MultiPHP Manager**.

Chọn PHP 8.1 trở lên, bật các extension liệt kê ở trên.

## Bước 3 — Đóng gói từ máy phát triển

```bash
bun install            # hoặc: npm install
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com bun run build   # hoặc: npm run build
bash deploy/build-release.sh
```

Kết quả: thư mục `release/public_html/` và tệp `release/son-tra-so-release.tar.gz`.
Script có chạy kiểm thử API; nếu thất bại, không tạo gói.

> `VITE_GOOGLE_CLIENT_ID` phải đặt **trước khi build** (là biến build của Vite). Bỏ trống thì nút Google hiển thị thông báo chưa cấu hình.

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

## Bước 6 — Tạo bảng và nội dung ban đầu

### Cách A — Có SSH (khuyến nghị)

```bash
cd ~/public_html
php api/bin/migrate.php        # tạo 8 bảng
php api/bin/seed.php           # nạp 9 bài học mẫu (không có tài khoản mẫu)
SONTRA_ADMIN_PASSWORD='mật-khẩu-admin-mạnh' php api/bin/create_admin.php anhdnt@sontra.edu.vn "Đặng Ngọc Triều Anh"
```

Nếu không đặt `SONTRA_ADMIN_PASSWORD`, lệnh sẽ hỏi mật khẩu và không hiển thị khi gõ.

### Cách B — Không có SSH (phpMyAdmin)

1. Mở **phpMyAdmin** → chọn CSDL → **Import** → tải `api/database/schema.sql` → **Go**.
2. Import tiếp `api/database/seed.sql` (9 bài học mẫu).
3. Tạo hash mật khẩu quản trị **trên máy có PHP** (không đặt mật khẩu thật trong lịch sử lệnh lâu dài):

   ```bash
   php -r 'echo password_hash("mật-khẩu-admin-mạnh", PASSWORD_DEFAULT), PHP_EOL;'
   ```

4. Trong phpMyAdmin, chạy (thay các giá trị trong ngoặc):

   ```sql
   INSERT INTO accounts (id, email, full_name, role, auth_provider, password_hash, active, must_change,
     failed_attempts, created_at, updated_at)
   VALUES ('acc-adm-0001', 'anhdnt@sontra.edu.vn', 'Đặng Ngọc Triều Anh', 'admin', 'local',
     '<chuỗi hash ở bước 3>', 1, 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
   ```

## Bước 7 — Đăng nhập Google (tùy chọn)

1. Vào **Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Loại: **Web application**. **Authorized JavaScript origins**: `https://your-domain.example`.
3. Lấy Client ID, đặt vào `GOOGLE_CLIENT_ID` (máy chủ) và `VITE_GOOGLE_CLIENT_ID` (lúc build lại gói ở bước 3).

Nếu bỏ qua bước này, học viên vẫn đăng nhập được bằng email và mật khẩu.

## Bước 8 — Kiểm tra sau triển khai

- [ ] Mở `https://your-domain.example/` — trang chủ hiển thị, không lỗi trên console.
- [ ] Truy cập `https://your-domain.example/api/me` — trả `{"authenticated":false}`.
- [ ] Truy cập `https://your-domain.example/api/lessons` — trả danh sách bài học.
- [ ] Đăng nhập quản trị viên bằng form — vào được cổng quản trị.
- [ ] Đăng nhập sai 5 lần — nhận thông báo khóa tạm 15 phút.
- [ ] Thử truy cập `https://your-domain.example/api/src/Http/Router.php` — phải trả 403.
- [ ] Thử truy cập `https://your-domain.example/api/.env` — phải trả 403.
- [ ] Tải lên một tệp video giả (không phải MP4) — hệ thống từ chối.
- [ ] Tải lại trang sau khi đăng nhập — vẫn đăng nhập.

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
| Tải video báo lỗi | `upload_max_filesize` quá nhỏ | Sửa `.user.ini` hoặc MultiPHP INI Editor |
| Nút Google báo "chưa được cấu hình" | Chưa đặt `VITE_GOOGLE_CLIENT_ID` lúc build | Đặt biến và build lại gói |
