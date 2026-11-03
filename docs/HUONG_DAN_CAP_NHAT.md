# Hướng dẫn cập nhật Sơn Trà Số khi có mã nguồn mới

Áp dụng cho hai nơi:

- **Phần A — máy local (Windows, Git Bash)**: cập nhật bản đang chạy trên máy bạn.
- **Phần B — hosting thật (Hostinger, iNET)**: build gói mới và đưa lên host.

Lệnh bắt đầu bằng `$` chỉ là dấu nhắc: khi copy, **chỉ copy phần sau `$`**.

---

## Trước khi bắt đầu: những thứ không bị ảnh hưởng

`git pull` **không** ghi đè các tệp cấu hình và dữ liệu sau, vì git bỏ qua chúng:

| Tệp / thư mục | Nội dung |
|---|---|
| `api/.env` | Cấu hình máy chủ, mật khẩu CSDL |
| `.env.local`, `.env.production` | Client ID Google cho giao diện |
| `uploads/` | Tệp âm thanh đã tải lên |
| CSDL MySQL | Bài học, tin, tài khoản, tiến độ học viên |

Riêng CSDL và `uploads/` **cần sao lưu** trước mọi lần cập nhật (xem Phần B, bước B1).

Nếu cập nhật làm sai, có thể quay lại (xem mục "Quay lại bản cũ" cuối tài liệu).

---

## Phần A — Cập nhật trên máy local

Mở **Git Bash** tại thư mục dự án (ví dụ `D:\UNG_DUNG_VIBE\SON_TRA_02\Son_tra_so`).

### A1. Kiểm tra trạng thái

```bash
$ git status
```

- Nếu báo `nothing to commit, working tree clean`: làm tiếp A2.
- Nếu có file bị sửa trên máy (ví dụ `M src/...`): **không** sửa trực tiếp trong `src/` rồi pull. Hoặc commit thay đổi đó, hoặc cất tạm bằng `git stash` (xem bước A2 nếu gặp lỗi).

### A2. Kéo mã mới

```bash
$ git pull origin claude/son-tra-so-code-analysis-xzgo0g
$ git log --oneline -1
```

Nếu báo `Your local changes ... would be overwritten by merge`:

```bash
$ git stash
$ git pull origin claude/son-tra-so-code-analysis-xzgo0g
$ git stash pop
```

`git stash pop` đưa lại thay đổi cục bộ của bạn. Nếu cần, gửi tôi thông báo lỗi nguyên văn.

### A3. Cài lại thư viện (chỉ cần khi `package.json` có thay đổi, nhưng chạy luôn cũng không sao)

```bash
$ npm install
```

### A4. Cập nhật cơ sở dữ liệu (chạy mỗi lần cập nhật, an toàn khi chạy lại)

```bash
$ php api/bin/migrate.php
```

Kết quả: `Đã áp dụng 10 lệnh schema.` Lệnh này thêm bảng hoặc cột mới nếu có, không xóa dữ liệu.

Bước này **không** cập nhật nội dung bài học đã có. Xem mục "Lưu ý về nội dung bài học" cuối tài liệu.

### A5. Build lại giao diện

```bash
$ npm run build
```

Kết quả: dòng cuối có `built in ...ms`, không có dòng `error`.

### A6. Chạy lại và kiểm tra

Nếu máy chủ `php -S` đang chạy, không cần khởi động lại. Mở trình duyệt tại `http://localhost:8080` và tải lại bằng **Ctrl + F5**.

Nếu chưa chạy:

```bash
$ php -S 127.0.0.1:8080 -t dist scripts/php-dev-router.php
```

Kiểm tra môi trường:

```bash
$ php api/bin/doctor.php
```

Phải kết thúc bằng `Môi trường sẵn sàng.`

---

## Phần B — Cập nhật trên hosting thật

Thực hiện trên **máy build** (máy Windows của bạn), không thực hiện trực tiếp trên host.

### B1. Sao lưu trước khi làm (bắt buộc)

**CSDL:** vào phpMyAdmin của hosting (hPanel/cPanel → phpMyAdmin) → chọn CSDL → tab **Export** → **Go**. Lưu tệp `.sql` về máy.

**Tệp:** trong File Manager, tải về thư mục `uploads/` (nếu có) và `api/.env` (để giữ cấu hình).

Đặt tên tệp kèm ngày, ví dụ `sontra_so_2026-11-03.sql`.

### B2. Kéo mã mới và cài thư viện

```bash
$ cd /d/UNG_DUNG_VIBE/SON_TRA_02/Son_tra_so
$ git pull origin claude/son-tra-so-code-analysis-xzgo0g
$ npm install
```

### B3. Kiểm tra cấu hình build

- Có tệp `.env.production` ở thư mục gốc không? Nếu bật đăng nhập Google, tệp này phải chứa `VITE_GOOGLE_CLIENT_ID=...`. Kiểm tra:

  ```bash
  $ cat .env.production
  ```

- Script đóng gói chạy kiểm thử trên CSDL `sontra_test`. CSDL này phải tồn tại trên máy build. Nếu chưa có:

  ```bash
  $ DB_NAME=sontra_test php api/bin/create_database.php
  ```

  (Chỉ tạo CSDL; bộ kiểm thử tự tạo bảng khi chạy.)

### B4. Đóng gói

```bash
$ bash deploy/build-release.sh
```

Kết quả đúng: các dòng `kiểm thử API: đạt` và `Hoàn tất: release/public_html và release/son-tra-so-release.tar.gz`.

**Nếu kiểm thử thất bại, không tải gói lên**. Gửi tôi nội dung lỗi.

### B5. Tải gói lên hosting

1. Mở **File Manager** của hosting (hPanel/cPanel) và vào thư mục `public_html`.
2. Tải lên các tệp trong `release/public_html/` (có thể dùng FTP/SFTP, ví dụ FileZilla).
3. Chọn **ghi đè** khi được hỏi.

**Quan trọng:**
- **Không** tải `api/.env` từ máy build (gói không có tệp này; đừng thêm vào).
- Giữ nguyên `public_html/uploads/` đang có trên host.
- Nếu muốn dọn các tệp giao diện cũ, xóa thư mục `public_html/assets/` **trước** khi tải (giao diện có tên tệp băm, các tệp cũ không còn dùng nhưng không gây lỗi nếu giữ lại).

### B6. Cập nhật cơ sở dữ liệu trên host

Chọn **một** trong hai cách:

**Cách 1 — phpMyAdmin (khuyến nghị, không cần SSH):** chọn CSDL → tab **Import** → chọn tệp `api/database/schema.sql` có trong gói (hoặc `release/public_html/api/database/schema.sql`) → **Go**.

**Cách 2 — SSH (nếu gói hosting có SSH):**

```bash
$ cd ~/public_html
$ php api/bin/migrate.php
```

Cả hai cách đều an toàn khi chạy lại và không xóa dữ liệu.

### B7. Kiểm tra trên host

Mở `https://tên-miền-của-bạn`:

- [ ] Trang chủ hiển thị; bấm Ctrl + F5 để tải lại giao diện mới.
- [ ] `https://tên-miền-của-bạn/api/me` trả về `{"authenticated":false}`.
- [ ] Đăng nhập quản trị: vào được cổng quản trị.
- [ ] Nếu có thay đổi tính năng vừa cập nhật, thử lại đúng tính năng đó (ví dụ đọc bài viết, phân trang).

Kiểm tra nhanh bằng dòng lệnh (không cần đăng nhập):

```bash
$ curl -s https://tên-miền-của-bạn/api/me
```

### B8. Quay lại bản cũ (nếu có lỗi nghiêm trọng)

1. Khôi phục CSDL: phpMyAdmin → chọn CSDL → tab **Import** → chọn tệp `.sql` đã sao lưu ở B1 → **Go**. Lưu ý: tệp này là toàn bộ CSDL, nên các dữ liệu tạo sau thời điểm sao lưu sẽ bị mất. Chỉ làm khi thật sự cần.
2. Khôi phục mã: tải lại gói phát hành cũ (nếu còn) hoặc chạy lại `bash deploy/build-release.sh` sau khi `git checkout <commit-cũ>`.

---

## Lưu ý về nội dung bài học

- Tệp `api/database/seed/lessons.json` chỉ dùng để nạp **lần đầu**. Lệnh `seed.php` dùng `INSERT IGNORE`, nên bài đã có trong CSDL **không** được cập nhật từ tệp này.
- Khi nội dung bài học thay đổi trong mã (ví dụ đổi tên đơn vị hành chính), phải cập nhật bài trong **Cổng quản trị** (sửa bài, lưu lại) hoặc sửa trực tiếp trong CSDL. Hệ thống tự lưu lịch sử khi sửa qua quản trị.

---

## Tóm tắt nhanh

| Việc | Local | Hosting |
|---|---|---|
| Sao lưu CSDL và uploads | — | B1 (bắt buộc) |
| Kéo mã mới | A2 `git pull` | B2 `git pull` |
| Cài thư viện | A3 `npm install` | B2 `npm install` |
| Cập nhật CSDL | A4 `migrate.php` | B6 phpMyAdmin hoặc SSH |
| Build | A5 `npm run build` | B4 `build-release.sh` |
| Đưa lên | Chạy lại `php -S` (hoặc tải lại trang) | B5 tải `public_html` |
| Kiểm tra | A6 `doctor.php` và trình duyệt | B7 trên tên miền |
