# Hướng dẫn cập nhật Sơn Trà Số khi có mã nguồn mới

Áp dụng cho hai nơi:

- **Phần A — máy local (Windows, Git Bash):** cập nhật bản đang chạy trên máy bạn.
- **Phần B — hosting iNET (cPanel):** build gói mới trên máy bạn rồi tải lên host.

Lệnh viết trong khối `bash`, copy nguyên dòng, **không** copy dấu nhắc. Các chú thích bắt đầu bằng `#` là ghi chú, có thể bỏ qua khi chạy.

> Để cài đặt lần đầu trên hosting, xem [HUONG_DAN_INET_A_Z.md](HUONG_DAN_INET_A_Z.md). Tài liệu này chỉ dành cho việc **cập nhật** khi đã chạy được.

---

## 0. Quy trình tổng quát

Mỗi lần có mã nguồn mới, luôn làm đủ năm bước theo thứ tự:

1. **Kéo mã mới** về máy (`git pull`).
2. **Cài thư viện** nếu cần (`npm install`).
3. **Cập nhật CSDL** (`migrate.php` ở local; `schema.sql` ở host).
4. **Build giao diện** (`npm run build` ở local; `build-release.sh` để đóng gói host).
5. **Tải lại trang** và kiểm tra bằng **Ctrl + F5**.

Nếu bỏ bước 4, trình duyệt vẫn chạy bản cũ và có thể báo lỗi không khớp với máy chủ mới.

---

## 1. Những thứ không bị ảnh hưởng

`git pull` không ghi đè các tệp sau, vì chúng nằm trong danh sách bỏ qua của git:

| Tệp / thư mục | Vị trí | Nội dung |
|---|---|---|
| Cấu hình máy chủ | `api/.env` (local và host) | Mật khẩu CSDL, SMTP, Client ID |
| Cấu hình giao diện | `.env.local`, `.env.production` | Client ID Google lúc build |
| Tệp âm thanh đã tải lên | `uploads/` (local); `public_html/uploads/` (host) | Âm thanh bài học |
| Cơ sở dữ liệu | MySQL | Bài học, tin, tài khoản, tiến độ học viên |

Tệp cấu hình trên host `public_html/api/.env` cũng không bị ảnh hưởng.

**Trước mọi lần cập nhật trên host, phải sao lưu CSDL và `uploads/` (mục B1).**

---

## Phần A — Cập nhật trên máy local

Mở **Git Bash** và đi đến thư mục dự án, ví dụ `D:\UNG_DUNG_VIBE\Son_tra_so`:

```bash
cd /d/UNG_DUNG_VIBE/Son_tra_so
```

### A1. Kiểm tra trạng thái

```bash
git status
```

- `nothing to commit, working tree clean`: chuyển sang A2.
- Có tệp bị sửa (`M ...`): cất tạm bằng `git stash` rồi làm A2. Sau A2 đưa lại bằng `git stash pop` (mục A2).

### A2. Chuyển sang nhánh làm việc và kéo mã mới

```bash
git checkout claude/son-tra-so-code-analysis-xzgo0g
git pull origin claude/son-tra-so-code-analysis-xzgo0g
git log --oneline -1
```

Dòng cuối cho biết commit hiện tại. Nếu git báo `Your local changes ... would be overwritten by merge`:

```bash
git stash
git pull origin claude/son-tra-so-code-analysis-xzgo0g
git stash pop
```

`git stash pop` đưa lại thay đổi cục bộ của bạn. Nếu gặp xung đột, gửi tôi thông báo lỗi nguyên văn.

### A3. Cài thư viện

```bash
npm install
```

Có thể chạy an toàn mỗi lần cập nhật. Lần đầu mất vài phút.

### A4. Cập nhật cơ sở dữ liệu

```bash
php api/bin/migrate.php
```

Kết quả: `Đã áp dụng 10 lệnh schema.` Lệnh này thêm bảng hoặc cột mới nếu có, **không xóa dữ liệu**, và chạy lại an toàn.

### A5. Build lại giao diện (bắt buộc)

```bash
npm run build
```

Kết quả đúng: dòng cuối có `built in ...ms`, không có dòng `error`.

### A6. Tải lại và kiểm tra

Nếu máy chủ `php -S` đang chạy, giữ nguyên, chỉ cần tải lại trang trình duyệt bằng **Ctrl + F5** tại `http://localhost:8080`.

Nếu chưa chạy, khởi động:

```bash
php -S 127.0.0.1:8080 -t dist scripts/php-dev-router.php
```

Kiểm tra môi trường (kết thúc bằng `Môi trường sẵn sàng.`):

```bash
php api/bin/doctor.php
```

---

## Phần B — Cập nhật trên hosting iNET

Quy trình cập nhật trên hosting được gom vào một nơi duy nhất để tránh nhầm lẫn: **[HUONG_DAN_INET_A_Z.md](HUONG_DAN_INET_A_Z.md), Phần B** (5 bước: sao lưu, build, tải gói, cập nhật bảng nếu cần, kiểm tra).

Tóm tắt:
1. Sao lưu CSDL trong phpMyAdmin.
2. Trên máy Windows: `bash deploy/build-release.sh` (tạo `release/son-tra-so-release.tar.gz`).
3. Trên host: File Manager → xóa `public_html/assets/` → tải tệp `.tar.gz` lên `public_html` → **Extract** → xóa tệp `.tar.gz`.
4. Chỉ khi có thay đổi CSDL: import lại `api/database/schema.sql`.
5. Mở trang web, nhấn Ctrl + F5 và kiểm tra.

Không ghi đè `public_html/api/.env` và `public_html/uploads/`.

---

## Lưu ý về nội dung bài học

- `api/database/seed/lessons.json` chỉ nạp **lần đầu**. `seed.php` dùng `INSERT IGNORE`, nên bài đã có trong CSDL **không** được cập nhật từ tệp này.
- Khi nội dung bài học đổi trong mã, cập nhật trong **Cổng quản trị** (sửa bài, lưu lại). Hệ thống tự lưu lịch sử khi sửa qua quản trị.

---

## Tóm tắt nhanh

| Việc | Local (Phần A) | Hosting iNET (Phần B) |
|---|---|---|
| Sao lưu | — | phpMyAdmin → Export |
| Kéo mã mới | `git pull` | Trên máy Windows: `git pull` |
| Build | `npm run build` | `bash deploy/build-release.sh` |
| Cập nhật CSDL | `php api/bin/migrate.php` | Chỉ khi có thay đổi: import `schema.sql` |
| Đưa lên | Tải lại trang (Ctrl + F5) | Upload `.tar.gz` → Extract trong `public_html` |
| Kiểm tra | `php api/bin/doctor.php`, trình duyệt | Mở trang web, Ctrl + F5 |
