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

---

# PHẦN C. SAO LƯU VÀ KHÔI PHỤC TRÊN HOST

Cần sao lưu ba thứ. Chúng không nằm trong gói cài đặt nên không tự khôi phục được bằng cách tải lại mã:

| Thứ cần sao lưu | Nằm ở đâu trên host | Vì sao cần |
|---|---|---|
| Cơ sở dữ liệu | phpMyAdmin → `qiogdglehosting_sontra1` | Bài học, tin, tài khoản, tiến độ học viên |
| Ảnh và âm thanh tải lên | `/home/qiogdglehosting/public_html/uploads/` | Tệp người dùng và quản trị đã tải lên |
| Cấu hình máy chủ | `/home/qiogdglehosting/sontra-config/son-tra.env` | Mật khẩu CSDL, SMTP, Client ID |

Nên sao lưu **trước mỗi lần cập nhật** (Bước B1) và **định kỳ** (ví dụ mỗi tuần). Lưu các tệp sao lưu ở máy Windows, không chỉ trên host.

## C1. Sao lưu

### C1.1. Cơ sở dữ liệu

1. phpMyAdmin → chọn `qiogdglehosting_sontra1` ở cột trái.
2. Tab **Export** → chọn **Quick** (hoặc **Custom**, và tick **Add DROP TABLE / VIEW / PROCEDURE**) → định dạng **SQL** → **Go**.
3. Lưu tệp, đặt tên có ngày, ví dụ `sontra1_2026-11-04.sql`.

Tùy chọn **Add DROP TABLE** giúp khi khôi phục, bảng cũ được thay bằng bản sao lưu.

### C1.2. Ảnh và âm thanh

1. cPanel → **File Manager** → `/home/qiogdglehosting/public_html/`.
2. Chọn thư mục **`uploads`** → **Compress** → định dạng **Zip Archive** → **Compress File(s)**.
3. Chuột phải tệp `uploads.zip` vừa tạo → **Download**.
4. Xóa `uploads.zip` trên host sau khi đã tải về (tránh chiếm dung lượng và lộ dữ liệu).

Nếu thư mục `uploads` còn trống thì bước này chỉ là kiểm tra; không có gì để khôi phục.

### C1.3. Cấu hình máy chủ

1. File Manager → `/home/qiogdglehosting/sontra-config/`.
2. Chuột phải `son-tra.env` → **Download**.

Tệp này chứa mật khẩu. Cất ở nơi an toàn, không gửi qua chat hay email.

### C1.4. Gói mã đang chạy (tùy chọn, để quay lại phiên bản cũ)

Giữ lại tệp `son-tra-so-release.tar.gz` của lần triển khai trước (nếu còn trên máy Windows trong thư mục `release`). Đây là cách nhanh nhất để quay về giao diện và API cũ.

## C2. Khôi phục

Làm theo thứ tự: cấu hình, CSDL, ảnh, rồi mã.

### C2.1. Khôi phục cấu hình

1. File Manager → `/home/qiogdglehosting/sontra-config/`.
2. **Upload** → `son-tra.env` đã sao lưu → chọn **Overwrite** nếu được hỏi.

### C2.2. Khôi phục cơ sở dữ liệu

1. phpMyAdmin → chọn `qiogdglehosting_sontra1`.
2. Tab **Import** → **Choose File** → tệp `.sql` đã sao lưu → **Go**.
3. Kiểm tra: `accounts` và `lessons` có dữ liệu như trước khi sao lưu.

> Khôi phục ghi đè dữ liệu hiện có. Chỉ làm khi thật sự cần, và đảm bảo bạn đang chọn đúng CSDL `qiogdglehosting_sontra1` trước khi bấm **Go**.

### C2.3. Khôi phục ảnh và âm thanh

1. File Manager → `/home/qiogdglehosting/public_html/`.
2. **Upload** → tệp `uploads.zip` đã sao lưu.
3. Chuột phải → **Extract** → tick **Overwrite existing files** → **Extract Files**. Kết quả là thư mục `uploads/` được khôi phục.
4. Xóa `uploads.zip` trên host.

### C2.4. Khôi phục mã (giao diện và API)

Chỉ cần nếu mã trên host bị hỏng hoặc cần quay về phiên bản cũ:

1. File Manager → `public_html` → xóa thư mục `assets`.
2. **Upload** → tệp `son-tra-so-release.tar.gz` của phiên bản cần khôi phục.
3. **Extract** với **Overwrite existing files** được tick → xóa tệp `.tar.gz`.
4. Ctrl + F5 trên trình duyệt.

### C2.5. Kiểm tra sau khôi phục

- [ ] `https://cds-sontra.io.vn/api/me` trả `{"authenticated":false}`.
- [ ] Đăng nhập quản trị thành công.
- [ ] Số bài học trong quản trị đúng như trước khi sao lưu.
- [ ] Mở một bài có âm thanh (nếu có): tệp phát được.

# PHẦN D. QUẢN LÝ ẢNH TRÌNH CHIẾU TRANG CHỦ

Áp dụng cho cả máy local và host. Trên host, đăng nhập bằng tài khoản quản trị tại `https://cds-sontra.io.vn`.

**Bắt buộc sau khi cập nhật lên bản có tính năng này:** phpMyAdmin → chọn `qiogdglehosting_sontra1` → tab **Import** → `schema.sql` → **Go**. Nếu bỏ qua bước này, tab **Ảnh trang chủ** sẽ báo lỗi khi mở.

## D1. Cách quản lý ảnh trình chiếu

1. Vào **Cổng Quản trị** → tab **Ảnh trang chủ**.
2. **Thêm slide**: nhấn nút **Thêm slide**, chọn ảnh (JPG, PNG hoặc WebP, tối đa 5 MB), nhập:
   - **Tiêu đề** (3 đến 200 ký tự), bắt buộc.
   - **Nội dung** (tối đa 1000 ký tự), tùy chọn.
   - **Nhãn nút** và **Đường dẫn nút** (tùy chọn). Đường dẫn nội bộ như `/lessons`, hoặc đường dẫn `https://...`.
   - Nhấn **Lưu slide**.
3. **Sửa**: nhấn **Sửa** ở slide cần đổi, chỉnh rồi lưu. Có thể thay ảnh.
4. **Ẩn / Hiện**: slide đang ẩn không hiển thị trên trang chủ và không chiếm giới hạn.
5. **Xóa**: nhấn **Xóa** và xác nhận. Slide bị xóa khỏi danh sách; cần tạo lại nếu muốn dùng lại.
6. **Sắp xếp**: dùng mũi tên **↑** và **↓**. Trang chủ hiển thị theo thứ tự này (khi chọn chế độ "Theo thứ tự").
7. **Chế độ hiển thị**:
   - *Theo thứ tự sắp xếp*: lấy 5 slide đầu tiên.
   - *Ngẫu nhiên*: chọn ngẫu nhiên 5 slide trong số đang bật, đổi mỗi lần tải trang.

**Giới hạn và lưu ý:**
- Trang chủ chỉ hiển thị tối đa **5 slide**. Tab quản trị ghi rõ slide nào đang hiện và slide nào "vượt giới hạn". Có thể lưu nhiều hơn 5.
- Ảnh nên nằm ngang, khoảng tỉ lệ 16:6 (ví dụ 1600 × 600 px), dung lượng nhẹ để trang tải nhanh.
- Thay đổi hiện trên trang chủ sau khi **tải lại trang** (Ctrl + F5).
- Chỉ quản trị viên quản lý được slide. Học viên và khách chỉ xem.

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

## P5. Sao lưu và khôi phục

Xem **Phần C** ở trên.
