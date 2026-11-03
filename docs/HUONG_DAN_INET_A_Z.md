# Hướng dẫn đưa Sơn Trà Số lên hosting iNET (cPanel) — từng bước

Tài liệu gồm hai phần:

- **Phần A — Cài đặt lần đầu** (làm một lần, khoảng 30 phút).
- **Phần B — Cập nhật khi có mã mới** (làm mỗi lần, 5 bước).

Chỉ có **một cách** tải lên: tải một tệp nén duy nhất rồi giải nén trên host. Không cần FTP, không cần SSH.

**Quy ước**
- `[...]` là phần bạn thay bằng thông tin của mình.
- Lệnh nằm trong khối `bash`, copy nguyên dòng, không copy dấu nhắc.
- Đường dẫn trên host luôn bắt đầu bằng `/home/[tài-khoản-cpanel]/`. Đây là thư mục gốc của tài khoản cPanel; xem tên đầy đủ ở đầu **File Manager**.
- **[Cần xác nhận]**: tên mục trên cPanel của iNET có thể khác một chút; nếu không thấy, báo lại để cập nhật.

| Thông tin | Giá trị |
|---|---|
| Tên miền | `cds-sontra.io.vn` |
| Thư mục web | `/home/[tài-khoản-cpanel]/public_html/` |
| Tệp cấu hình máy chủ | `/home/[tài-khoản-cpanel]/sontra-config/son-tra.env` (nằm ngoài `public_html`) |
| Cơ sở dữ liệu | `qiogdglehosting_sontra` (người dùng cùng tên, toàn quyền) |
| Email quản trị | `daominhtri2025@gmail.com` |

**Yêu cầu hosting:** PHP 8.1 trở lên; MySQL/MariaDB; HTTPS. Các extension `pdo_mysql`, `curl`, `dom`, `mbstring`, `fileinfo`, `json`.

---

# PHẦN A. CÀI ĐẶT LẦN ĐẦU

## Bước A1. Chuẩn bị gói trên máy Windows

Mở **Git Bash** và chạy lần lượt:

```bash
cd /d/UNG_DUNG_VIBE/Son_tra_so
git checkout claude/son-tra-so-code-analysis-xzgo0g
git pull origin claude/son-tra-so-code-analysis-xzgo0g
npm install
bash deploy/build-release.sh
```

Kết quả đúng: có dòng `kiểm thử API: đạt` và `Hoàn tất`.

Lệnh này cần **MySQL đang chạy trên máy Windows** (XAMPP) và `api\.env` đúng. Script tự tạo CSDL kiểm thử `sontra_test` nếu chưa có.

**Nếu có chữ THẤT BẠI, dừng lại và báo tôi kèm nội dung dòng đỏ đầu tiên.**

Gói cần tải lên nằm ở:

```
D:\UNG_DUNG_VIBE\Son_tra_so\release\son-tra-so-release.tar.gz
```

> Tùy chọn, chỉ khi bật đăng nhập Google: trước khi chạy `build-release.sh`, tạo tệp `.env.production` ở thư mục gốc dự án với một dòng `VITE_GOOGLE_CLIENT_ID=[client-id].apps.googleusercontent.com`.

## Bước A2. Tải gói lên host

1. cPanel → **File Manager** → mở `public_html`.
2. Nhấn **Upload** (thanh trên cùng) → chọn tệp `D:\UNG_DUNG_VIBE\Son_tra_so\release\son-tra-so-release.tar.gz` trên máy Windows → chờ thanh tiến trình xong.
3. Quay lại `public_html`, chuột phải `son-tra-so-release.tar.gz` → **Extract** → **Extract Files**.
4. Sau khi giải nén xong, **xóa tệp `son-tra-so-release.tar.gz`** trên host (chuột phải → **Delete**).

Kết quả: trong `public_html` có `index.html`, `assets/`, `api/`, `uploads/`, `.htaccess`, `.user.ini`.


## Bước A3. Tạo tệp cấu hình trên host

Tệp này chứa mật khẩu CSDL. Đặt ở **thư mục gốc tài khoản, ngoài `public_html`**, nên trình duyệt không truy cập được. Tên tệp `son-tra.env` (không có dấu chấm ở đầu) để host cho phép tạo. Gói cài đặt không chứa tệp này, nên các lần cập nhật không làm mất nó.

1. cPanel → **File Manager**. Bạn đang ở thư mục gốc (`/home/[tài-khoản-cpanel]/`), **không** mở `public_html`.
2. Nhấn **+ Folder** → tên `sontra-config` → **Create New Folder**.
3. Mở thư mục `sontra-config` → nhấn **+ File** → tên `son-tra.env` → **Create New File**.
4. Chuột phải `son-tra.env` → **Edit** → dán nội dung sau, thay `[...]`:

   ```dotenv
   APP_URL=https://cds-sontra.io.vn
   APP_DEBUG=false

   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=qiogdglehosting_sontra
   DB_USER=qiogdglehosting_sontra
   DB_PASS=[mật-khẩu-csdl]
   DB_CHARSET=utf8mb4

   GOOGLE_CLIENT_ID=
   NEWS_SYNC_ENABLED=false
   MAIL_DRIVER=smtp
   ```

5. Nhấn **Save Changes** → **Close**.

Đường dẫn đầy đủ: `/home/[tài-khoản-cpanel]/sontra-config/son-tra.env`. Ứng dụng tự tìm tệp này; không cần sửa `.htaccess`.

> Nếu host báo tên không hợp lệ, thử đặt tên `son-tra.env` đúng như trên; không dùng tên bắt đầu bằng dấu chấm.

## Bước A4. Tạo bảng và dữ liệu mẫu

Thực hiện trong **phpMyAdmin** (cPanel → **Databases** → **phpMyAdmin**). Ở cột trái, **chọn `qiogdglehosting_sontra`** trước mỗi lần import.

1. Tab **Import** → **Choose File** → chọn tệp `D:\UNG_DUNG_VIBE\Son_tra_so\api\database\schema.sql` trên máy Windows → **Go**.
2. Tab **Import** → **Choose File** → chọn `D:\UNG_DUNG_VIBE\Son_tra_so\api\database\seed.sql` → **Go**.
3. Kiểm tra: bảng `lessons` có 9 dòng.

## Bước A5. Tạo tài khoản quản trị

Tài khoản được tạo bằng một tệp SQL sinh trên máy Windows:

```bash
cd /d/UNG_DUNG_VIBE/Son_tra_so
read -s -p "Mật khẩu quản trị (không hiện khi gõ): " SONTRA_ADMIN_PASSWORD; echo
export SONTRA_ADMIN_PASSWORD
php api/bin/make_admin_sql.php "daominhtri2025@gmail.com" "Đào Minh Trí" > admin.sql
unset SONTRA_ADMIN_PASSWORD
cat admin.sql
```

- Mật khẩu phải có từ 10 đến 200 ký tự. Nếu sai, `admin.sql` rỗng: sửa và chạy lại.
- Trong phpMyAdmin, chọn `qiogdglehosting_sontra` → tab **SQL** → dán **toàn bộ** nội dung `admin.sql` → **Go**.
- Kết quả: `1 row inserted`. Xóa `admin.sql` khỏi máy sau khi xong.

## Bước A6. Kiểm tra trang web

Mở `https://cds-sontra.io.vn`, nhấn **Ctrl + F5**.

- [ ] Trang chủ hiển thị, có ổ khóa HTTPS.
- [ ] Vào `https://cds-sontra.io.vn/api/me`: thấy `{"authenticated":false}`.
- [ ] Đăng nhập tab **Email / Mật khẩu** bằng tài khoản quản trị: vào được cổng quản trị.

Nếu chưa có ổ khóa HTTPS: cPanel → **Security** → **SSL/TLS Status** (hoặc **Let's Encrypt SSL**) [Cần xác nhận] → cài cho `cds-sontra.io.vn`.

Nếu PHP thấp hơn 8.1: cPanel → **MultiPHP Manager** [Cần xác nhận] → chọn `cds-sontra.io.vn` → chọn PHP 8.1 trở lên.

**Hết Phần A. Hệ thống đã chạy.**

---

# PHẦN B. CẬP NHẬT KHI CÓ MÃ MỚI

Làm mỗi lần có mã nguồn mới. Các bước này **không** làm mất dữ liệu: CSDL, ảnh và âm thanh trên host, và `son-tra.env` đều được giữ nguyên.

## Bước B1. Sao lưu CSDL (phút đầu, bắt buộc)

phpMyAdmin → chọn `qiogdglehosting_sontra` → tab **Export** → **Go**. Lưu tệp `.sql` với tên có ngày.

## Bước B2. Build gói mới trên máy Windows

```bash
cd /d/UNG_DUNG_VIBE/Son_tra_so
git checkout claude/son-tra-so-code-analysis-xzgo0g
git pull origin claude/son-tra-so-code-analysis-xzgo0g
npm install
bash deploy/build-release.sh
```

Dừng lại nếu có `THẤT BẠI`.

## Bước B3. Tải gói lên và giải nén

1. cPanel → **File Manager** → `public_html`.
2. Chọn thư mục **`assets`** → **Delete** (đây là giao diện cũ; xóa để không còn tệp cũ).
3. **Upload** → `D:\UNG_DUNG_VIBE\Son_tra_so\release\son-tra-so-release.tar.gz`.
4. Chuột phải tệp → **Extract** → **Extract Files**. Chọn **Overwrite** nếu được hỏi.
5. Xóa tệp `son-tra-so-release.tar.gz` trên host.

**Không** xóa `uploads/`. Tệp `son-tra.env` nằm ngoài `public_html` nên cũng không bị ảnh hưởng.

## Bước B4. Cập nhật bảng dữ liệu (chỉ khi có thay đổi CSDL)

Nếu bản mới có thay đổi về bảng, chạy lại `schema.sql`: phpMyAdmin → chọn `qiogdglehosting_sontra` → tab **Import** → chọn `D:\UNG_DUNG_VIBE\Son_tra_so\api\database\schema.sql` → **Go**. Chạy lại không làm mất dữ liệu. Nếu không chắc, cứ chạy: an toàn.

## Bước B5. Kiểm tra

1. Mở `https://cds-sontra.io.vn`, nhấn **Ctrl + F5**.
2. Thử đúng tính năng vừa cập nhật.

Nếu trang vẫn cũ hoặc báo lỗi lạ trên màn hình đăng nhập: kiểm tra tên tệp `index-XXXX.js` trong `public_html/index.html` (File Manager → chuột phải → **Edit**) có khớp với tên trong `release/public_html/index.html` trên máy Windows. Nếu khác, lặp lại Bước B3.

---

# PHỤ LỤC

## P1. Gửi thư khôi phục mật khẩu (SMTP)

Hàm `mail()` không dùng được trên gói này. Cần thông tin SMTP từ nhà cung cấp (OxMail hoặc dịch vụ khác). **[Cần xác nhận]** với iNET các thông số: máy chủ, cổng, mã hóa, giới hạn gửi.

Mở `/home/[tài-khoản-cpanel]/sontra-config/son-tra.env` (File Manager → chuột phải → **Edit**), thêm vào cuối:

```dotenv
MAIL_FROM=no-reply@cds-sontra.io.vn
MAIL_FROM_NAME=Sơn Trà Số
SMTP_HOST=[máy-chủ-smtp]
SMTP_PORT=587
SMTP_ENCRYPTION=tls
SMTP_USER=[tài-khoản-smtp]
SMTP_PASS=[mật-khẩu-smtp]
```

Kiểm tra: trên trang web bấm **Quên mật khẩu?** với một email thử, rồi kiểm tra hộp thư (cả thư rác). Thêm bản ghi SPF vào DNS nếu thư bị chặn.

## P2. Đăng nhập Google (tùy chọn)

1. Google Cloud Console → **Credentials** → OAuth client loại **Web application** → **Authorized JavaScript origins**: thêm `https://cds-sontra.io.vn`.
2. Mở `sontra-config/son-tra.env`, điền `GOOGLE_CLIENT_ID=[client-id]`.
3. Tệp giao diện cần Client ID lúc build: đặt `VITE_GOOGLE_CLIENT_ID` trong `.env.production` trên máy Windows, rồi làm Phần B.

Không cần client secret. Nếu secret từng lộ, bấm **Reset secret** trong Google Cloud Console.

## P3. Khi gặp lỗi

| Hiện tượng | Cách xử lý |
|---|---|
| Trang trắng, hoặc `/api/me` báo lỗi 404 | `public_html/.htaccess` chưa có. Kiểm tra gói đã giải nén đủ chưa (Bước A4). |
| Báo "không khả dụng" khi đăng nhập | Sai thông tin CSDL trong `son-tra.env`. Kiểm tra `DB_NAME`, `DB_USER`, `DB_PASS`. |
| Đăng nhập được nhưng bị đăng xuất ngay | Chưa bật HTTPS. Bật theo Bước A6. |
| Đăng nhập báo "Yêu cầu ghi phải dùng Content-Type" | Trình duyệt chạy giao diện cũ. Làm Bước B3 và Ctrl + F5. |
| Tải âm thanh không được | Tệp lớn hơn 10 MB. Nén âm thanh rồi thử lại. |
| Không gửi được thư | Kiểm tra lại phần P1. |
| Nút Google báo "chưa được cấu hình" | Làm phần P2. |

## P4. Sao lưu định kỳ

phpMyAdmin → **Export** (CSDL). File Manager → tải về thư mục `public_html/uploads/` và tệp `sontra-config/son-tra.env`.
