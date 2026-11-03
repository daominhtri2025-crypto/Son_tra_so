# Hướng dẫn chạy Sơn Trà Số trên máy local (Windows)

Đã có sẵn bản chạy và có cập nhật mới từ mã nguồn? Xem **[docs/HUONG_DAN_CAP_NHAT.md](HUONG_DAN_CAP_NHAT.md)** (mục A: pull và build lại trên máy local).

Hướng dẫn này dùng **Git Bash** (cửa sổ có dấu nhắc `MINGW64`). Mở Git Bash, không dùng PowerShell hay CMD. Các lệnh bắt đầu bằng `$` là lệnh bạn gõ; không gõ chính ký tự `$`.

Thời gian: khoảng 20–30 phút nếu chưa cài gì.

---

## 1. Phần mềm và thư viện cần cài

| # | Cái gì | Dùng để | Tải về |
|---|---|---|---|
| 1 | **Git for Windows** | Tải mã nguồn, chạy lệnh Bash | https://git-scm.com/download/win |
| 2 | **PHP 8.1 trở lên** (đã thử với 8.5) | Chạy máy chủ và các lệnh `api/bin/*.php` | https://windows.php.net/download/ (chọn bản *VS16 x64 Thread Safe*, giải nén vào `C:\php`), hoặc `winget install PHP.PHP.8.5` |
| 3 | **XAMPP** (gồm MySQL/MariaDB và phpMyAdmin) | Cơ sở dữ liệu | https://www.apachefriends.org/ (chọn XAMPP for Windows) |
| 4 | **Node.js LTS** | Cài thư viện giao diện và build | https://nodejs.org/ (chọn bản LTS, cài mặc định) |

Ghi chú:

- **Bun** (https://bun.sh/) là lựa chọn thay cho Node.js, không bắt buộc. Hướng dẫn này dùng `npm`, đi kèm Node.js.
- Thư viện giao diện (React, Vite, Tailwind, lucide-react…) **không cần tải tay**: lệnh `npm install` ở mục 10 tự tải về từ npm.
- Thư viện PHP cần có sẵn trong PHP: `pdo_mysql`, `curl`, `mbstring`, `fileinfo`, `dom`. Nếu thiếu, xem mục 2.

Kiểm tra nhanh sau khi cài (mỗi lệnh phải in ra phiên bản, không báo `command not found`):

```bash
$ git --version
$ php -v
$ node -v
$ npm -v
```

---

## 2. Bật extension PHP (chỉ khi thiếu)

```bash
$ php --ini
```

Dòng `Loaded Configuration File` cho biết đường dẫn `php.ini`. Mở file đó bằng Notepad, tìm và **bỏ dấu `;`** ở đầu các dòng sau:

```ini
extension=pdo_mysql
extension=curl
extension=mbstring
extension=fileinfo
extension=dom
```

Lưu file, đóng hết Git Bash, mở lại. Kiểm tra:

```bash
$ php -m | grep -i -E "pdo_mysql|curl|mbstring|fileinfo|dom"
```

Phải thấy đủ 5 dòng.

---

## 3. Bật MySQL trong XAMPP

1. Mở **XAMPP Control Panel**.
2. Bấm **Start** ở dòng **MySQL** (đến khi nền chuyển xanh).
3. Ghi nhớ mật khẩu `root`: nếu bạn chưa đặt, mặc định là **trống**.

---

## 4. Lấy mã nguồn

Bạn đã có thư mục `Son_tra_so` (ví dụ `D:\UNG_DUNG_VIBE\SON_TRA_02\Son_tra_so`) thì **không clone lại**. Chỉ cần vào thư mục và cập nhật:

```bash
$ cd /d/UNG_DUNG_VIBE/SON_TRA_02/Son_tra_so
$ git checkout claude/son-tra-so-code-analysis-xzgo0g
$ git pull origin claude/son-tra-so-code-analysis-xzgo0g
```

Chưa có thư mục đó thì clone mới (chạy ở thư mục cha):

```bash
$ cd /d/UNG_DUNG_VIBE/SON_TRA_02
$ git clone https://github.com/daominhtri2025-crypto/Son_tra_so
$ cd Son_tra_so
$ git checkout claude/son-tra-so-code-analysis-xzgo0g
```

---

## 5. Tạo tệp cấu hình `api/.env`

```bash
$ cp api/.env.example api/.env
$ notepad api/.env
```

Trong Notepad, sửa **đúng các dòng sau** (giữ nguyên các dòng khác):

```dotenv
APP_URL=http://localhost:8080
APP_DEBUG=true
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sontra_so
DB_USER=root
DB_PASS=
```

- `DB_PASS=` để trống nếu `root` của XAMPP chưa có mật khẩu. Nếu có, điền mật khẩu vào sau dấu `=`.
- **Tệp này chứa mật khẩu, không đưa lên git.** Tệp đã được `.gitignore` loại trừ.

Lưu file (Ctrl + S) và đóng Notepad.

> **Lưu ý:** tệp phải tên là `.env` nằm trong thư mục `api`, đường dẫn `api/.env`. Không lưu thành `.env` ở thư mục gốc `Son_tra_so`.

---

### 5.1. Bật đăng nhập Google (tùy chọn)

Bỏ qua mục này nếu chỉ dùng email và mật khẩu. Tab Google chỉ hiện khi đã có Client ID.

Client ID là thông tin công khai (dạng `...apps.googleusercontent.com`). **Không dùng và không đưa lên git client secret** (chuỗi `GOCSPX-...`), vì ứng dụng không cần nó.

Trong Git Bash, tại thư mục `Son_tra_so` (thay `CLIENT_ID` bằng Client ID của bạn):

```bash
$ printf 'VITE_GOOGLE_CLIENT_ID=CLIENT_ID\n' > .env.local
$ sed -i 's/^GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=CLIENT_ID/' api/.env
$ grep -n "GOOGLE_CLIENT_ID" api/.env
```

- `.env.local` nằm ở thư mục gốc, được `.gitignore` loại trừ.
- Trong Google Cloud Console, **Authorized JavaScript origins** phải có `http://localhost:8080`.
- **Mở trang bằng đúng địa chỉ đã đăng ký** là `http://localhost:8080`. `http://127.0.0.1:8080` là một origin khác và sẽ bị Google chặn (`origin_mismatch`). Nếu muốn dùng địa chỉ khác, thêm địa chỉ đó vào danh sách trong Google Cloud Console.
- Sau khi đặt, chạy lại `npm run build` (mục 10) rồi tải lại trang. Không cần khởi động lại `php -S`.

Kiểm tra: mở `http://localhost:8080`, phải thấy tab **Google OAuth2**. Nếu đăng nhập báo `origin_mismatch`, kiểm tra lại origin (xem mục 14).

---

## 6. Kiểm tra môi trường

```bash
$ php api/bin/doctor.php
```

Lúc này bạn sẽ thấy các dòng `[LỖI]` về CSDL (chưa tạo) là bình thường. Mục cần `[OK]` lúc này: phiên bản PHP và các extension. Nếu có `[LỖI]` ở extension, quay lại mục 2.

---

## 7. Tạo cơ sở dữ liệu `sontra_so`

```bash
$ php api/bin/create_database.php
```

Kết quả đúng:

```
Máy chủ: MySQL/MariaDB 10.4.x-MariaDB, cổng 3306
Đã có CSDL 'sontra_so' (utf8mb4). Tiếp theo: php api/bin/migrate.php
```

Lệnh này chỉ tạo CSDL trên **máy chủ đang chạy ở cổng 3306** (MySQL của XAMPP). Đọc dòng `Máy chủ:` để xác nhận đúng. Nếu báo `Access denied`: điền đúng `DB_PASS` ở mục 5.

---

## 8. Nạp dữ liệu: tạo 9 bảng và 9 bài học

```bash
$ php api/bin/migrate.php
$ php api/bin/seed.php
```

Kết quả đúng:

```
Đã áp dụng 10 lệnh schema.
Đã thêm 9 bài học mới (tổng 9 trong tệp seed).
```

Chạy lại hai lệnh này không gây lỗi và không tạo bản trùng. Kiểm tra lại bằng:

```bash
$ php api/bin/doctor.php
```

Phải thấy `[OK] Đủ 9 bảng` và `[OK] Có nội dung bài học (9 bài)`. Dòng cuối là `Môi trường sẵn sàng.`

Mã bài học bắt đầu từ **0** (0 đến 8).

---

## 9. Tạo tài khoản quản trị

Chọn mật khẩu của bạn (ít nhất 10 ký tự):

```bash
$ SONTRA_ADMIN_PASSWORD='mật-khẩu-admin-của-bạn' php api/bin/make_admin_sql.php admin@sontra.local "Quản trị viên" > admin.sql
```

Tệp `admin.sql` chỉ chứa **mật khẩu đã băm**, không chứa mật khẩu gốc. Import vào CSDL bằng phpMyAdmin:

1. Mở http://localhost/phpmyadmin.
2. Bấm **sontra_so** ở cột trái.
3. Chọn tab **SQL**.
4. Mở `admin.sql` bằng Notepad, sao chép toàn bộ, dán vào ô SQL, bấm **Go**.

Xóa tệp tạm:

```bash
$ rm admin.sql
```

Đăng nhập sau này: `admin@sontra.local` và mật khẩu bạn vừa đặt.

Muốn đổi mật khẩu quản trị sau này: lặp lại mục 9 (câu lệnh có cơ chế cập nhật, không tạo trùng).

---

## 10. Cài thư viện giao diện và build

```bash
$ npm install
$ npm run build
```

- `npm install` tải thư viện từ npm về thư mục `node_modules` (mất vài phút lần đầu).
- `npm run build` kiểm tra kiểu và tạo thư mục `dist` (giao diện đã biên dịch).

Kết quả đúng: dòng cuối có `built in ...ms`, không có dòng `error`.

---

## 11. Chạy giao diện

```bash
$ php -S 127.0.0.1:8080 -t dist scripts/php-dev-router.php
```

Giữ cửa sổ Git Bash này mở (máy chủ đang chạy). Mở trình duyệt tại **http://localhost:8080**.

Dừng máy chủ: nhấn `Ctrl + C`.

> **Sửa mã giao diện:** sau mỗi lần sửa file trong `src/`, chạy lại `npm run build` rồi tải lại trang. Máy chủ PHP không cần khởi động lại.

---

## 12. Kiểm tra nhanh

- [ ] Trang chủ hiển thị, có nút **Đăng nhập**.
- [ ] Đăng nhập bằng `admin@sontra.local` vào được cổng quản trị.
- [ ] Trong quản trị có 9 bài học.
- [ ] Đăng ký một học viên mới bằng email, vào được bài học.
- [ ] Mở một bài, chọn đáp án, bấm **Nộp câu trả lời**: có thông báo đúng/sai và giải thích.
- [ ] **Quên mật khẩu?** hiển thị thông báo chung. Trên máy local thư không được gửi (bình thường).

---

## 13. Chạy kiểm thử tự động (tùy chọn)

Kiểm thử xóa sạch dữ liệu, nên **luôn dùng CSDL riêng** có tên kết thúc bằng `_test`. Không dùng `sontra_so`.

Tạo CSDL kiểm thử bằng cách đặt tạm `DB_NAME` (không sửa `api/.env`):

```bash
$ DB_NAME=sontra_test php api/bin/create_database.php
$ DB_NAME=sontra_test php api/tests/run.php
```

Kết quả đúng: dòng cuối là `TẤT CẢ ĐẠT` và không có dòng `✗`.

---

## 14. Lỗi thường gặp

| Thông báo | Nguyên nhân | Cách sửa |
|---|---|---|
| `Undefined constant PDO::...` hoặc `Thiếu extension pdo_mysql` | PHP chưa bật `pdo_mysql` | Mục 2 |
| `Unknown database 'sontra_so'` | CSDL chưa tạo | Mục 7 |
| `Access denied for user 'root'` | `DB_PASS` trong `api/.env` sai hoặc thiếu | Sửa `DB_PASS` (mục 5), lưu, chạy lại |
| `Access denied for user 'u123456_...'` | `api/.env` vẫn là giá trị mẫu của hosting | Sửa `DB_USER=root` (mục 5) |
| `Connection refused` / `Không kết nối được MySQL` | MySQL trong XAMPP chưa chạy | Mục 3: bấm Start ở dòng MySQL |
| `The '<' operator is reserved` | Đang dùng PowerShell | Mở Git Bash, không dùng PowerShell |
| `command not found: npm` / `node` | Chưa cài Node.js hoặc chưa mở lại terminal | Cài Node.js (mục 1), đóng và mở lại Git Bash |
| Trang trắng, không có nội dung | Chưa chạy `npm run build` | Mục 10, rồi tải lại trang |
| `/api/...` trả 404 hoặc trả HTML | Chạy `php -S` thiếu `scripts/php-dev-router.php` | Dùng đúng lệnh mục 11 |
| Google báo `origin_mismatch` hoặc "Access blocked" | Trình duyệt đang mở `127.0.0.1` hoặc cổng khác với danh sách origin | Mở đúng `http://localhost:8080`; hoặc thêm chính xác địa chỉ đang mở vào Authorized JavaScript origins (mục 5.1) |
| Tab Google không hiện | `.env.local` chưa đặt, hoặc chưa build lại | Mục 5.1, rồi `npm run build` |
| Cổng 8080 đã bị dùng | Có máy chủ khác đang chạy | Đổi `8080` thành `8081` trong lệnh mục 11 và trong `APP_URL` của `api/.env` |
| Tải âm thanh bị từ chối | Tệp lớn hơn 10 MB hoặc sai định dạng | Dùng MP3, WAV, M4A hoặc OGG dưới 10 MB |
| Video | Không tải video lên được | Dán liên kết YouTube vào ô video |

Khi gặp lỗi khác: chụp màn hình cửa sổ Git Bash, gửi kèm kết quả của `php api/bin/doctor.php`. Không gửi mật khẩu.
