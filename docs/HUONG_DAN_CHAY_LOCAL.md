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

Mục này gồm hai việc: **(a)** tạo 9 bảng trống trong CSDL `sontra_so`, và **(b)** nạp 9 bài học mẫu vào bảng `lessons`. Có thể làm bằng **cách A (khuyến nghị, dùng PHP)** hoặc **cách B (dùng công cụ `mysql`)**. Hai cách cho cùng kết quả.

### 6.0. Ứng dụng nào được gọi, và làm gì

| Chương trình được gọi | Lệnh bạn chạy | Tệp nó đọc | Việc nó làm |
|---|---|---|---|
| **PHP** (chạy `api/bin/migrate.php`) | `php api/bin/migrate.php` | `api/.env` (cấu hình CSDL), `api/database/schema.sql` | Kết nối MySQL, chạy lần lượt từng lệnh `CREATE TABLE` trong `schema.sql`, tạo 9 bảng |
| **PHP** (chạy `api/bin/seed.php`) | `php api/bin/seed.php` | `api/.env`, `api/database/seed/lessons.json` | Đọc 9 bài học từ JSON, chèn vào bảng `lessons` (bỏ qua bài đã có) |
| **Công cụ `mysql`** (cách B, không cần PHP) | `mysql -u root -p sontra_so < api/database/schema.sql` | `api/database/schema.sql` | Chạy trực tiếp các lệnh SQL, tạo 9 bảng |
| **Công cụ `mysql`** (cách B) | `mysql -u root -p sontra_so < api/database/seed.sql` | `api/database/seed.sql` | Chạy trực tiếp các lệnh `INSERT` tạo 9 bài học |
| **phpMyAdmin** (giao diện web, dùng trên hosting) | Tab **Import** hoặc **SQL** | Cùng hai tệp `.sql` | Giống cách B nhưng chạy qua trình duyệt |

Chuỗi gọi bên trong `migrate.php` (để bạn hiểu lỗi nếu có):

```
php api/bin/migrate.php
  └─ api/bootstrap.php          nạp tự động lớp của ứng dụng
       └─ SonTra\Support\Env     đọc api/.env
  └─ SonTra\Support\Database    mở kết nối MySQL (PDO) tới DB_NAME
  └─ SonTra\Support\Schema      đọc schema.sql, tách từng lệnh, thực thi
```

`seed.php` đi theo cùng chuỗi, nhưng đọc `lessons.json` và chèn bằng `INSERT IGNORE`.

### 6.1. Cách A — dùng PHP (khuyến nghị)

Đứng tại thư mục gốc dự án `Son_tra_so`:

```bash
php api/bin/migrate.php
```

**Kết quả đúng:**

```
Đã áp dụng 10 lệnh schema.
```

Sau đó nạp bài học:

```bash
php api/bin/seed.php
```

**Kết quả đúng:**

```
Đã thêm 9 bài học mới (tổng 9 trong tệp seed).
```

Chạy lại cả hai lệnh lần nữa là an toàn. Lần chạy lại sẽ báo `Đã thêm 0 bài học mới`, không tạo bản trùng.

### 6.2. Cách B — dùng công cụ `mysql` (không cần PHP)

Tạo bảng:

```bash
mysql -u root -p sontra_so < api/database/schema.sql
```

Nạp bài học:

```bash
mysql -u root -p sontra_so < api/database/seed.sql
```

Windows PowerShell không hỗ trợ dấu `<`. Dùng lệnh sau thay thế:

```powershell
Get-Content api\database\schema.sql | mysql -u root -p sontra_so
Get-Content api\database\seed.sql | mysql -u root -p sontra_so
```

Mật khẩu `root` sẽ được hỏi sau mỗi lệnh. Lệnh `mysql` không in gì khi thành công, nên kiểm tra ở mục 6.3.

### 6.3. Kiểm tra kết quả

Chạy lệnh sau (dùng bất kỳ cách nào ở trên):

```bash
mysql -u root -p sontra_so -e "SHOW TABLES; SELECT COUNT(*) AS so_bai FROM lessons;"
```

**Kết quả đúng:** 9 bảng và `so_bai = 9`:

| Bảng | Dùng để lưu |
|---|---|
| `accounts` | Tài khoản quản trị, tình nguyện viên, học viên (có băm mật khẩu) |
| `sessions` | Phiên đăng nhập (chỉ lưu băm của token) |
| `rate_limits` | Bộ đếm giới hạn số lần thử đăng nhập theo IP |
| `lessons` | 9 bài học: nội dung, quiz, video, âm thanh |
| `lesson_versions` | Lịch sử các bản cũ mỗi khi bài học bị sửa hoặc xóa |
| `learner_progress` | Tiến độ đọc, hoàn thành, điểm quiz của từng học viên |
| `assessments` | Phiếu quan sát năng lực số của tình nguyện viên |
| `news` | Bản tin (đăng tay) |
| `password_resets` | Liên kết khôi phục mật khẩu (băm, dùng một lần) |

Xem nội dung bài học:

```bash
mysql -u root -p sontra_so -e "SELECT lesson_no, group_no, title, hidden FROM lessons ORDER BY lesson_no;"
```

**Lưu ý:** mã bài học bắt đầu từ **0** (`lesson_no` từ 0 đến 8), không phải từ 1.

### 6.4. Các nhóm nội dung đã nạp

| Nhóm | Số bài | Chủ đề |
|---|---|---|
| 1 | 2 (mã 0–1) | Thiết bị & Kết nối cơ bản |
| 2 | 2 (mã 2–3) | Dịch vụ công & Thông tin Sơn Trà |
| 3 | 1 (mã 4) | Giao tiếp & Mạng xã hội an toàn |
| 4 | 2 (mã 5–6) | Thanh toán không dùng tiền mặt |
| 5 | 2 (mã 7–8) | An toàn số & Phòng chống lừa đảo |

Mỗi bài có nội dung, một câu hỏi trắc nghiệm, và phần giải thích.

### 6.5. Lỗi thường gặp ở bước này

| Thông báo | Nguyên nhân | Cách sửa |
|---|---|---|
| `Database connection failed` / `Hệ thống đang tạm thời không khả dụng` | MySQL chưa chạy, hoặc sai `DB_HOST`/`DB_USER`/`DB_PASS`/`DB_NAME` trong `api/.env` | Khởi động MySQL; kiểm tra lại 4 dòng ở mục 5 |
| `Unknown database 'sontra_so'` | Chưa tạo CSDL (mục 4) | Chạy lại lệnh `CREATE DATABASE` ở mục 4 |
| `Access denied for user` | Sai mật khẩu, hoặc người dùng không có quyền trên `sontra_so` | Kiểm tra `DB_PASS`; với máy cá nhân dùng `root` |
| Tiếng Việt hiển thị thành `?` hoặc ký tự lạ trong terminal | Bảng mã của terminal không phải UTF-8 | Không phải lỗi dữ liệu. Kiểm tra bằng phpMyAdmin hoặc `mysql ... --default-character-set=utf8mb4` |
| `Đã thêm 0 bài học mới` | Bình thường khi chạy lần thứ hai | Không cần làm gì |

### 6.6. Sửa nội dung sau này

Khi ứng dụng đã chạy, bạn sửa bài học trong **Cổng quản trị** (đăng nhập bằng tài khoản ở mục 7). Hệ thống tự lưu bản cũ vào `lesson_versions`. Chỉ sửa trực tiếp bằng SQL khi thật sự cần, và khi đó bản cũ sẽ không được lưu.

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

Bạn chỉ cần tạo CSDL rỗng; bộ kiểm thử tự tạo bảng. Chạy lại được nhiều lần.

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
