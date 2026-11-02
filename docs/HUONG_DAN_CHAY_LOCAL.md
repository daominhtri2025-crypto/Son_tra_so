# Chạy Sơn Trà Số trên máy của bạn

Thời gian: khoảng 15 phút. Làm theo đúng thứ tự.

## 1. Cài đặt trước

| Phần mềm | Phiên bản | Ghi chú |
|---|---|---|
| Bun **hoặc** Node.js | Bun 1.x hoặc Node 20+ | Cài thư viện giao diện |
| PHP | 8.1 trở lên | Bật các extension: `pdo_mysql`, `curl`, `mbstring`, `fileinfo`, `dom` |
| MySQL hoặc MariaDB | MySQL 8 / MariaDB 10.6+ | Hoặc dùng sẵn XAMPP, Laragon, MAMP (đã có MySQL + PHP) |

Kiểm tra nhanh: mở terminal và chạy `php -v`, `php -m | findstr pdo_mysql` (Windows) hoặc `php -m | grep pdo_mysql` (Mac/Linux). Nếu có dòng `pdo_mysql` là đạt.

## 2. Tải mã nguồn

```bash
git clone https://github.com/daominhtri2025-crypto/Son_tra_so
cd Son_tra_so
git checkout claude/son-tra-so-code-analysis-xzgo0g
```

## 3. Cài thư viện giao diện

```bash
bun install
```

(Không có Bun thì dùng `npm install`.)

## 4. Tạo cơ sở dữ liệu

Đăng nhập MySQL (mật khẩu root bạn đã đặt khi cài) và tạo CSDL:

```bash
mysql -u root -p -e "CREATE DATABASE sontra_so CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Với XAMPP/Laragon: mở phpMyAdmin, tạo CSDL `sontra_so` với bảng mã `utf8mb4_unicode_ci`.

## 5. Tạo tệp cấu hình

Sao chép tệp mẫu:

```bash
cp api/.env.example api/.env        # Windows PowerShell: copy api\.env.example api\.env
```

Mở `api/.env` bằng trình soạn thảo và sửa **4 dòng** sau (các dòng khác để nguyên):

```dotenv
APP_URL=http://localhost:8080
APP_DEBUG=true
DB_NAME=sontra_so
DB_USER=root
DB_PASS=mật-khẩu-mysql-của-bạn
```

Gợi ý: dùng tài khoản `root` cho máy cá nhân là đủ. Trên hosting thật mới cần tài khoản riêng có quyền hạn chế.

## 6. Tạo bảng và nạp nội dung bài học

```bash
php api/bin/migrate.php
php api/bin/seed.php
```

Kết quả mong đợi: `Đã áp dụng 10 lệnh schema.` và `Đã thêm 9 bài học mới`.

## 7. Tạo tài khoản quản trị viên

Chọn mật khẩu của bạn (ít nhất 10 ký tự, không dùng mật khẩu đơn giản).

**Mac / Linux:**

```bash
SONTRA_ADMIN_PASSWORD='mật-khẩu-admin-của-bạn' php api/bin/make_admin_sql.php admin@sontra.local "Quản trị viên" > admin.sql
mysql -u root -p sontra_so < admin.sql
rm admin.sql
```

**Windows (PowerShell):**

```powershell
$env:SONTRA_ADMIN_PASSWORD = 'mật-khẩu-admin-của-bạn'
php api\bin\make_admin_sql.php admin@sontra.local "Quản trị viên" > admin.sql
Get-Content admin.sql | mysql -u root -p sontra_so
Remove-Item admin.sql
```

Hoặc mở phpMyAdmin, chọn `sontra_so`, tab **SQL**, dán nội dung `admin.sql` rồi bấm **Go**.

Đăng nhập sau này bằng `admin@sontra.local` và mật khẩu bạn vừa đặt.

## 8. Chạy ứng dụng

```bash
bun run build
php -S 127.0.0.1:8080 -t dist scripts/php-dev-router.php
```

Mở trình duyệt tại **http://localhost:8080**.

Giữ cửa sổ terminal đang chạy lệnh `php -S`. Muốn dừng: nhấn `Ctrl + C`.

> **Lưu ý khi sửa mã giao diện:** sau mỗi lần sửa file trong `src/`, chạy lại `bun run build` rồi tải lại trang. Phần máy chủ PHP không cần build lại, chỉ cần lưu file.

## 9. Kiểm tra nhanh (checklist)

- [ ] Trang chủ hiển thị, có nút **Đăng nhập**.
- [ ] Đăng nhập bằng `admin@sontra.local` vào được **Cổng quản trị**.
- [ ] Trong cổng quản trị, mục bài học có 9 bài.
- [ ] Đăng ký một học viên mới (email + mật khẩu), vào được bài học.
- [ ] Mở một bài học, chọn đáp án quiz, bấm **Nộp câu trả lời**: có thông báo đúng/sai và giải thích.
- [ ] Bấm **Quên mật khẩu?**: form báo "Nếu email này thuộc tài khoản…" (thư không được gửi trên máy local, xem mục lỗi bên dưới).

## 10. Chạy kiểm thử tự động

Kiểm thử xóa sạch dữ liệu, nên **luôn dùng CSDL riêng có tên kết thúc bằng `_test`**:

```bash
mysql -u root -p -e "CREATE DATABASE sontra_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
DB_NAME=sontra_test php api/tests/run.php
```

Windows PowerShell: `$env:DB_NAME='sontra_test'; php api\tests\run.php`

Kết quả mong đợi: dòng cuối là **`TẤT CẢ ĐẠT`** và không có dòng `✗`.

Kiểm tra kiểu TypeScript: `bun run typecheck` (không báo lỗi là đạt).

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Trang trắng, không có nội dung | Chưa chạy `bun run build` | Chạy build rồi tải lại trang |
| `/api/...` trả 404 hoặc trang trả về HTML | Chạy `php -S` thiếu `scripts/php-dev-router.php` | Dùng đúng lệnh ở mục 8 |
| Trang báo "Hệ thống đang tạm thời không khả dụng" (503) | Sai thông tin CSDL trong `api/.env` | Kiểm tra `DB_NAME`, `DB_USER`, `DB_PASS`; thử đăng nhập MySQL bằng lệnh đó |
| Đăng nhập báo sai mật khẩu dù đúng | Chưa tạo admin (mục 7) hoặc tạo nhầm CSDL | Chạy lại mục 7 |
| Nút Google báo "chưa được cấu hình" | Bình thường khi chưa có Google Client ID | Bỏ qua; dùng email và mật khẩu |
| Quên mật khẩu không nhận được thư | `MAIL_FROM` chưa đặt, máy local không gửi được thư | Bình thường trên local. Xem lỗi trong cửa sổ terminal đang chạy `php -S` |
| Tải âm thanh bị từ chối | Tệp lớn hơn 10 MB hoặc không phải MP3/WAV/M4A/OGG | Nén hoặc đổi định dạng |
| Video | Không tải tệp video lên được | Dán liên kết YouTube vào ô video |

Khi gặp lỗi khác: chụp màn hình cửa sổ terminal đang chạy `php -S` và gửi cho người phát triển.
