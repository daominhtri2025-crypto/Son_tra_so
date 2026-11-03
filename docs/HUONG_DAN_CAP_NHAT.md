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
| Cấu hình máy chủ | `api/.env` (local) | Mật khẩu CSDL, SMTP, Client ID |
| Cấu hình giao diện | `.env.local`, `.env.production` | Client ID Google lúc build |
| Tệp âm thanh đã tải lên | `uploads/` (local); `public_html/uploads/` (host) | Âm thanh bài học |
| Cơ sở dữ liệu | MySQL | Bài học, tin, tài khoản, tiến độ học viên |

Tệp cấu hình ngoài trên host (ví dụ `/home/<tài-khoản-cpanel>/sontra-config/son-tra.env`) cũng không bị ảnh hưởng.

**Trước mọi lần cập nhật trên host, phải sao lưu CSDL và `uploads/` (mục B1).**

---

## Phần A — Cập nhật trên máy local

Mở **Git Bash** và đi đến thư mục dự án, ví dụ `D:\UNG_DUNG_VIBE\SON_TRA_02\Son_tra_so`:

```bash
cd /d/UNG_DUNG_VIBE/SON_TRA_02/Son_tra_so
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

Thực hiện trên **máy Windows** (máy build). Hosting chỉ nhận tệp, không build.

Đường dẫn trên host dùng trong tài liệu này:

| Mục | Đường dẫn đầy đủ trên host |
|---|---|
| Thư mục web | `/home/<tài-khoản-cpanel>/public_html/` |
| Thư mục âm thanh | `/home/<tài-khoản-cpanel>/public_html/uploads/` |
| Cấu hình máy chủ | `/home/<tài-khoản-cpanel>/sontra-config/son-tra.env` |

Thay `<tài-khoản-cpanel>` bằng tên đăng nhập cPanel của bạn (xem ở đầu File Manager).

### B1. Sao lưu (bắt buộc)

1. **CSDL:** cPanel → **phpMyAdmin** → chọn `qiogdglehosting_sontra` → tab **Export** → **Go**. Lưu tệp `.sql` với tên có ngày, ví dụ `sontra_so_2026-11-03.sql`.
2. **Âm thanh:** cPanel → **File Manager** → `/home/<tài-khoản-cpanel>/public_html/uploads/` → chọn → **Compress** hoặc tải về.
3. **Cấu hình:** tải về `/home/<tài-khoản-cpanel>/sontra-config/son-tra.env`.

### B2. Kéo mã mới

```bash
cd /d/UNG_DUNG_VIBE/SON_TRA_02/Son_tra_so
git checkout claude/son-tra-so-code-analysis-xzgo0g
git pull origin claude/son-tra-so-code-analysis-xzgo0g
npm install
```

### B3. Kiểm tra cấu hình build

Nếu dùng đăng nhập Google, tệp `.env.production` ở thư mục gốc dự án phải có dòng:

```dotenv
VITE_GOOGLE_CLIENT_ID=[client-id].apps.googleusercontent.com
```

Kiểm tra:

```bash
cat .env.production
```

### B4. Đóng gói

```bash
bash deploy/build-release.sh
```

Kết quả đúng: có dòng `kiểm thử API: đạt` và `Hoàn tất: release/public_html`.

**Nếu có dòng `THẤT BẠI` hoặc lỗi `error`, không tải lên.** Gửi tôi nội dung lỗi.

### B5. Tải gói lên `public_html`

1. cPanel → **File Manager** → mở `/home/<tài-khoản-cpanel>/public_html/`.
2. **Xóa thư mục `assets/` cũ** trong `public_html/` (tránh còn sót tệp giao diện cũ).
3. Tải **nội dung** của `release/public_html/` lên `public_html/`. Chọn **ghi đè** khi được hỏi.

**Không** làm các việc sau:
- Không tải `api/.env` từ máy build (gói không chứa tệp này).
- Không xóa hoặc ghi đè `public_html/uploads/`.
- Không xóa `/home/<tài-khoản-cpanel>/sontra-config/son-tra.env`.

### B6. Cập nhật cơ sở dữ liệu trên host

Thực hiện khi bản mới có thay đổi cấu trúc CSDL (xem ghi chú trong `docs/SUA_LOI.md`), hoặc làm luôn để chắc chắn. Bước này an toàn khi chạy lại:

1. phpMyAdmin → chọn `qiogdglehosting_sontra` → tab **Import**.
2. Chọn tệp `api/database/schema.sql` trong gói → **Go**.

Lệnh này chạy lại an toàn và không xóa dữ liệu.

### B7. Kiểm tra trên host

1. **Tải lại giao diện:** mở `https://cds-sontra.io.vn` (thay bằng tên miền của bạn), nhấn **Ctrl + F5**.
2. **Đối chiếu bản build** (nếu trang vẫn cũ hoặc báo lỗi trên màn hình đăng nhập):
   - Trên máy Windows, mở `release/public_html/index.html`, ghi lại tên tệp `index-XXXX.js`.
   - Trên host, mở `/home/<tài-khoản-cpanel>/public_html/index.html` (File Manager → chuột phải → **Edit**), tìm tên tệp JS. Tên phải giống hệt.
   - Nếu khác, quay lại B5.
3. **Kiểm tra API:**

   ```bash
   curl -s https://cds-sontra.io.vn/api/me
   ```

   Kết quả đúng: `{"authenticated":false}` khi chưa đăng nhập.
4. Đăng nhập quản trị và thử lại đúng tính năng vừa cập nhật.

### B8. Quay lại bản cũ (khi có lỗi nghiêm trọng)

1. **CSDL:** phpMyAdmin → `qiogdglehosting_sontra` → **Import** → chọn tệp `.sql` đã sao lưu ở B1. Dữ liệu tạo sau thời điểm sao lưu sẽ mất.
2. **Giao diện và API:** trên máy Windows, `git checkout <commit-cũ>` rồi chạy lại B4 và B5.

---

## Lưu ý về nội dung bài học

- `api/database/seed/lessons.json` chỉ nạp **lần đầu**. `seed.php` dùng `INSERT IGNORE`, nên bài đã có trong CSDL **không** được cập nhật từ tệp này.
- Khi nội dung bài học đổi trong mã, cập nhật trong **Cổng quản trị** (sửa bài, lưu lại). Hệ thống tự lưu lịch sử khi sửa qua quản trị.

---

## Tóm tắt nhanh

| Việc | Local (Phần A) | Hosting iNET (Phần B) |
|---|---|---|
| Sao lưu CSDL và uploads | — | B1 (bắt buộc) |
| Kéo mã mới | A2 `git pull` | B2 `git pull` |
| Cài thư viện | A3 `npm install` | B2 `npm install` |
| Cập nhật CSDL | A4 `migrate.php` | B6 phpMyAdmin → `schema.sql` |
| Build giao diện | A5 `npm run build` | B4 `build-release.sh` |
| Đưa lên | Tải lại trang (Ctrl + F5) | B5 tải `public_html/` |
| Kiểm tra | A6 `doctor.php`, trình duyệt | B7 đối chiếu bản build, `/api/me` |
