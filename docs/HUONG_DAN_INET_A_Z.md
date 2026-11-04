# Hướng dẫn triển khai Sơn Trà Số lên hosting iNET (cPanel)

Tài liệu này đã được kiểm chứng với cấu hình thực tế đang chạy. Gồm hai phần:

- **Phần A — Cài đặt lần đầu** (làm một lần).
- **Phần B — Cập nhật khi có mã mới** (làm mỗi lần có thay đổi).

Chỉ có **một cách** đưa mã lên host: tải một tệp nén duy nhất rồi giải nén trên host. Không cần FTP, không cần SSH.

**Quy ước**
- `[...]` là phần bạn thay bằng thông tin của mình.
- Lệnh nằm trong khối `bash`, copy nguyên dòng, không copy dấu nhắc.
- Đường dẫn trên host bắt đầu bằng `/home/qiogdglehosting/`. Đây là thư mục gốc tài khoản cPanel.

| Thông tin | Giá trị |
|---|---|
| Tên miền | `cds-sontra.io.vn` |
| Thư mục web | `/home/qiogdglehosting/public_html/` |
| Tệp cấu hình trên host | `/home/qiogdglehosting/sontra-config/son-tra.env` (nằm ngoài `public_html`) |
| Cơ sở dữ liệu | `qiogdglehosting_sontra1` |
| Người dùng CSDL | `qiogdglehosting_sontra` (đã gán toàn quyền vào CSDL trên) |
| Email quản trị | `daominhtri2025@gmail.com` |

**Yêu cầu hosting:** PHP 8.1 trở lên; MySQL/MariaDB; HTTPS.

---

# PHẦN A. CÀI ĐẶT LẦN ĐẦU

## Bước A1. Build gói trên máy Windows

Mở **Git Bash** và chạy:

```bash
cd /d/UNG_DUNG_VIBE/Son_tra_so
git checkout claude/son-tra-so-code-analysis-xzgo0g
git pull origin claude/son-tra-so-code-analysis-xzgo0g
npm install
DB_USER=root bash deploy/build-release.sh
```

- Kết quả đúng: có dòng `kiểm thử API: đạt` và `Hoàn tất`.
- Lệnh cần **MySQL (XAMPP) đang chạy** trên máy Windows. `DB_USER=root` là tài khoản MySQL của máy Windows, dùng để chạy kiểm thử; **không** liên quan đến host.
- Nếu báo `THẤT BẠI`: dừng lại, gửi tôi các dòng có dấu `✗` hoặc nội dung trong `release\kiem-thu.log`.

Gói cần tải lên:

```
D:\UNG_DUNG_VIBE\Son_tra_so\release\son-tra-so-release.tar.gz
```

> Tùy chọn, chỉ khi bật đăng nhập Google: trước khi build, tạo `.env.production` ở thư mục gốc dự án với dòng `VITE_GOOGLE_CLIENT_ID=[client-id].apps.googleusercontent.com`.

## Bước A2. Tạo tệp cấu hình trên host

Tệp này chứa mật khẩu CSDL. Đặt ở thư mục gốc tài khoản, **ngoài `public_html`**, nên trình duyệt không truy cập được. Gói cài đặt không chứa tệp này, nên các lần cập nhật không làm mất nó.

1. cPanel → **File Manager**. Đang ở thư mục gốc `/home/qiogdglehosting/`, **không** mở `public_html`.
2. **+ Folder** → tên `sontra-config` → **Create New Folder**.
3. Mở `sontra-config` → **+ File** → tên `son-tra.env` → **Create New File**.
   - Tên phải là `son-tra.env`, không bắt đầu bằng dấu chấm.
4. Chuột phải `son-tra.env` → **Edit** → dán nội dung sau:

   ```dotenv
   APP_URL=https://cds-sontra.io.vn
   APP_DEBUG=false

   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=qiogdglehosting_sontra1
   DB_USER=qiogdglehosting_sontra
   DB_PASS=[mật-khẩu-csdl]
   DB_CHARSET=utf8mb4

   GOOGLE_CLIENT_ID=
   NEWS_SYNC_ENABLED=false
   MAIL_DRIVER=smtp
   ```

5. **Save Changes** → **Close**.

**Lưu ý:**
- `DB_PASS` là mật khẩu của người dùng `qiogdglehosting_sontra` trong cPanel. Không dùng dấu nháy `'` hoặc `"` ở đầu hoặc cuối mật khẩu.
- Nếu đổi mật khẩu MySQL sau này: cPanel → **MySQL® Databases** → **Current Users** → **Change Password**, rồi sửa `DB_PASS` trong tệp này.

## Bước A3. Tải gói lên host

1. cPanel → **File Manager** → mở `public_html`.
2. **Upload** → chọn `D:\UNG_DUNG_VIBE\Son_tra_so\release\son-tra-so-release.tar.gz`. Chờ thanh tiến trình xong.
3. Quay lại `public_html`, chuột phải `son-tra-so-release.tar.gz` → **Extract**. Trong hộp thoại, **tick “Overwrite existing files”** → **Extract Files**.
4. Xóa tệp `son-tra-so-release.tar.gz` trên host.

Kết quả: `public_html` có `index.html`, `assets/`, `api/`, `uploads/`, `.htaccess`, `.user.ini`.

Tệp `.htaccess` trong gói đã có sẵn dòng `SetEnv SONTRA_ENV_FILE /home/qiogdglehosting/sontra-config/son-tra.env`, nên không cần sửa tay.

## Bước A4. Tạo bảng và dữ liệu mẫu

Trong **phpMyAdmin** (cPanel → **Databases** → **phpMyAdmin**): ở cột trái, **chọn `qiogdglehosting_sontra1`** trước mỗi lần import.

1. Tab **Import** → **Choose File** → `D:\UNG_DUNG_VIBE\Son_tra_so\api\database\schema.sql` → **Go**.
2. Tab **Import** → **Choose File** → `D:\UNG_DUNG_VIBE\Son_tra_so\api\database\seed.sql` → **Go**.
3. Kiểm tra: bảng `lessons` có 9 dòng.

## Bước A5. Tạo tài khoản quản trị

Tạo `admin.sql` trên máy Windows:

```bash
cd /d/UNG_DUNG_VIBE/Son_tra_so
read -s -p "Mật khẩu quản trị (không hiện khi gõ): " SONTRA_ADMIN_PASSWORD; echo
export SONTRA_ADMIN_PASSWORD
php api/bin/make_admin_sql.php "daominhtri2025@gmail.com" "Đào Minh Trí" > admin.sql
unset SONTRA_ADMIN_PASSWORD
cat admin.sql
```

- Mật khẩu từ 10 đến 200 ký tự. Nếu báo lỗi, `admin.sql` rỗng: sửa và chạy lại.
- Trong phpMyAdmin, chọn `qiogdglehosting_sontra1` → tab **SQL** → dán toàn bộ nội dung `admin.sql` → **Go**.
- Kết quả: `1 row inserted` (hoặc `2 rows affected` nếu đã có tài khoản và được cập nhật lại).
- Xóa `admin.sql` khỏi máy sau khi xong.

**Mật khẩu này chỉ có trên host.** Tài khoản local và host là hai CSDL riêng; đổi mật khẩu local không ảnh hưởng host.

## Bước A6. Kiểm tra

1. Mở `https://cds-sontra.io.vn`, nhấn **Ctrl + F5**.
2. Mở `https://cds-sontra.io.vn/api/me` → thấy `{"authenticated":false}`.
3. Đăng nhập tab **Email / Mật khẩu** bằng tài khoản quản trị → vào được cổng quản trị.

Nếu chưa có ổ khóa HTTPS: cPanel → **SSL/TLS Status** (hoặc **Let's Encrypt SSL**) [Cần xác nhận] → cài cho `cds-sontra.io.vn`.

**Hết Phần A. Hệ thống đã chạy.**

---

# PHẦN B. CẬP NHẬT KHI CÓ MÃ MỚI

Các bước này **không** làm mất dữ liệu: CSDL, `uploads/` và `sontra-config/son-tra.env` đều được giữ nguyên.

## Bước B1. Sao lưu CSDL (bắt buộc)

phpMyAdmin → chọn `qiogdglehosting_sontra1` → tab **Export** → **Go**. Lưu tệp `.sql` với tên có ngày.

## Bước B2. Build gói mới

```bash
cd /d/UNG_DUNG_VIBE/Son_tra_so
git checkout claude/son-tra-so-code-analysis-xzgo0g
git pull origin claude/son-tra-so-code-analysis-xzgo0g
npm install
DB_USER=root bash deploy/build-release.sh
```

Dừng lại nếu có `THẤT BẠI`.

## Bước B3. Tải gói lên và giải nén

1. cPanel → **File Manager** → `public_html`.
2. Chọn thư mục **`assets`** → **Delete** (xóa giao diện cũ).
3. **Upload** → `D:\UNG_DUNG_VIBE\Son_tra_so\release\son-tra-so-release.tar.gz`.
4. Chuột phải tệp → **Extract** → **tick “Overwrite existing files”** → **Extract Files**.
5. Xóa tệp `.tar.gz` trên host.

Bắt buộc tick ô ghi đè: nếu không, `index.html` cũ được giữ lại và trình duyệt vẫn chạy giao diện cũ.

## Bước B4. Cập nhật bảng (chỉ khi có thay đổi CSDL)

Nếu bản mới có thay đổi về bảng: phpMyAdmin → chọn `qiogdglehosting_sontra1` → tab **Import** → `D:\UNG_DUNG_VIBE\Son_tra_so\api\database\schema.sql` → **Go**. Chạy lại an toàn, không mất dữ liệu.

## Bước B5. Kiểm tra

1. Mở `https://cds-sontra.io.vn`, nhấn **Ctrl + F5**.
2. Thử đúng tính năng vừa cập nhật.
3. Nếu giao diện vẫn cũ: so tên `index-XXXX.js` trong `public_html/index.html` (File Manager → chuột phải → **Edit**) với tên trong `release\public_html\index.html` trên máy Windows. Nếu khác, lặp lại Bước B3.

---

# PHỤ LỤC

## P1. Gửi thư khôi phục mật khẩu (SMTP)

Hàm `mail()` không dùng được trên gói này. Cần thông tin SMTP từ nhà cung cấp (OxMail hoặc dịch vụ khác). **[Cần xác nhận]** với iNET: máy chủ, cổng, mã hóa, giới hạn gửi.

Mở `sontra-config/son-tra.env` (File Manager → chuột phải → **Edit**), thêm vào cuối:

```dotenv
MAIL_FROM=no-reply@cds-sontra.io.vn
MAIL_FROM_NAME=Sơn Trà Số
SMTP_HOST=[máy-chủ-smtp]
SMTP_PORT=587
SMTP_ENCRYPTION=tls
SMTP_USER=[tài-khoản-smtp]
SMTP_PASS=[mật-khẩu-smtp]
```

Kiểm tra: trên trang web bấm **Quên mật khẩu?** với một email thử, rồi xem hộp thư (cả thư rác).

## P2. Đăng nhập Google (tùy chọn)

1. Google Cloud Console → OAuth client (Web application) → **Authorized JavaScript origins**: thêm `https://cds-sontra.io.vn`.
2. Trong `sontra-config/son-tra.env`, điền `GOOGLE_CLIENT_ID=[client-id]`.
3. Trên máy Windows, đặt `VITE_GOOGLE_CLIENT_ID` trong `.env.production`, rồi làm Phần B.

Không cần client secret.

## P3. Dọn dữ liệu thử trước khi đưa người dùng thật

Trên host đang có ba tài khoản học viên thử (`namtv@gmail.com`, `namtv2@gmail.com`, `anhtnt@gmail.com`). Trước khi mở cho người dùng thật: phpMyAdmin → `qiogdglehosting_sontra1` → bảng `accounts` → xóa các dòng thử. Tài khoản quản trị giữ nguyên.

## P4. Khi gặp lỗi

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| Đăng nhập báo **Hệ thống đang tạm thời không khả dụng** | Ứng dụng không kết nối được CSDL. Xem cPanel → **Errors**, tìm dòng `[SonTra] Database connection failed`. `Access denied ... (using password: YES)`: sai `DB_PASS`. `(using password: NO)`: không đọc được `son-tra.env`, kiểm tra đường dẫn và tên tệp. `Unknown database`: sai `DB_NAME`. |
| Đăng nhập báo **Yêu cầu ghi phải dùng Content-Type** | Đang chạy giao diện cũ hoặc gói cũ. Làm Bước B2–B3 với gói mới nhất và Ctrl + F5. |
| `/api/me` báo 404, hoặc trang trắng | Thiếu `.htaccess` hoặc gói chưa giải nén đủ. Làm lại Bước A3. |
| Đăng nhập được nhưng bị đăng xuất ngay | Chưa bật HTTPS. Bật theo Bước A6. |
| Không gửi được thư khôi phục | Xem P1. |
| Nút Google báo "chưa được cấu hình" | Xem P2. |

## P5. Sao lưu định kỳ

phpMyAdmin → **Export** (CSDL). File Manager → tải về `public_html/uploads/` và `sontra-config/son-tra.env`.
