# Hướng dẫn A–Z: cấu hình và đưa Sơn Trà Số lên hosting iNET (cPanel)

Tài liệu này dành cho lần **cài đặt đầu tiên** trên gói iNET AMD-H1 (cPanel, LiteSpeed, PHP 8.1 trở lên). Khi đã chạy và muốn **cập nhật mã mới**, xem [HUONG_DAN_CAP_NHAT.md](HUONG_DAN_CAP_NHAT.md).

**Quy ước**
- Lệnh nằm trong khối `bash`, copy nguyên dòng, **không** copy dấu nhắc.
- `[...]` là phần bạn thay bằng thông tin của mình.
- Dòng bắt đầu bằng `#` trong khối lệnh là chú thích.
- **[Cần xác nhận]** là điểm tôi chưa kiểm chứng trên cPanel thực tế của iNET.

---

## Bảng thông tin cần có

| Thông tin | Giá trị | Ghi chú |
|---|---|---|
| Tên miền | `cds-sontra.io.vn` | Đã trỏ về hosting iNET |
| Tên đăng nhập cPanel | `[tài-khoản-cpanel]` | Xem ở đầu File Manager |
| Thư mục web | `/home/[tài-khoản-cpanel]/public_html/` | Nơi đặt giao diện và API |
| Cơ sở dữ liệu | `qiogdglehosting_sontra` | Đã tạo |
| Người dùng CSDL | `qiogdglehosting_sontra` | Đã gán toàn quyền |
| Mật khẩu CSDL | `[mật-khẩu-csdl]` | Không ghi vào chat, email hay tài liệu chia sẻ |
| Tệp cấu hình máy chủ | `/home/[tài-khoản-cpanel]/sontra-config/son-tra.env` | Ngoài thư mục web |
| Email quản trị | `daominhtri2025@gmail.com` | Đăng nhập bằng tab Email / Mật khẩu |

**Yêu cầu:** PHP 8.1 trở lên; MySQL 8 hoặc MariaDB 10.6 trở lên; HTTPS hoạt động; các extension `pdo_mysql`, `curl`, `dom`, `mbstring`, `fileinfo`, `json`.

---

## Phần 1. Chuẩn bị máy Windows (máy build)

Hosting không build. Mọi bước build làm trên máy Windows, rồi tải kết quả lên.

1. Cài **Git for Windows** (có Git Bash), **Node.js LTS**, và **PHP 8.1 trở lên** có `pdo_mysql` (xem [HUONG_DAN_CHAY_LOCAL.md](HUONG_DAN_CHAY_LOCAL.md), mục 1 và 2).
2. Mở Git Bash, lấy mã nguồn mới nhất:

   ```bash
   cd /d/UNG_DUNG_VIBE/SON_TRA_02/Son_tra_so
   git checkout claude/son-tra-so-code-analysis-xzgo0g
   git pull origin claude/son-tra-so-code-analysis-xzgo0g
   npm install
   ```

3. **Tùy chọn, chỉ khi bật đăng nhập Google:** tạo tệp `.env.production` ở thư mục gốc dự án, một dòng:

   ```dotenv
   VITE_GOOGLE_CLIENT_ID=[client-id].apps.googleusercontent.com
   ```

   Không bật Google thì không cần tệp này.

4. Đóng gói:

   ```bash
   cd /d/UNG_DUNG_VIBE/SON_TRA_02/Son_tra_so
   bash deploy/build-release.sh
   ```

   Kết quả đúng: có dòng `kiểm thử API: đạt` và `Hoàn tất: release/public_html`.
   **Nếu báo THẤT BẠI, không tải lên.**

   Kết quả nằm trong thư mục `release/` của dự án: `release/public_html/` là nội dung cần tải lên host.

---

## Phần 2. Cấu hình máy chủ (ngoài thư mục web)

Tệp này chứa mật khẩu CSDL và cấu hình máy chủ. Đặt **ngoài** `public_html` để không bị truy cập từ trình duyệt.

### 2.1. Tạo tệp cấu hình

1. cPanel → **File Manager**.
2. Mở `/home/[tài-khoản-cpanel]/` (thư mục gốc, ngang hàng với `public_html`).
3. **+ Folder** → tạo thư mục `sontra-config`.
4. Mở `sontra-config`, **+ File** → tạo `son-tra.env`, dán nội dung sau:

   ```dotenv
   # Địa chỉ trang, phải đúng với tên miền đang dùng
   APP_URL=https://cds-sontra.io.vn
   APP_DEBUG=false

   # Cơ sở dữ liệu (lấy trong cPanel → MySQL® Databases)
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=qiogdglehosting_sontra
   DB_USER=qiogdglehosting_sontra
   DB_PASS=[mật-khẩu-csdl]
   DB_CHARSET=utf8mb4

   # Đăng nhập Google: để trống nếu không dùng
   GOOGLE_CLIENT_ID=

   # Tin tức: để tắt, chỉ đăng tin thủ công
   NEWS_SYNC_ENABLED=false

   # Gửi thư khôi phục mật khẩu: điền sau khi có thông tin SMTP (Phần 6)
   MAIL_DRIVER=smtp
   ```

5. Lưu tệp. Đặt quyền đọc hạn chế: chuột phải `son-tra.env` → **Permissions** → `600` (hoặc `640`) [Cần xác nhận].

### 2.2. Khai báo đường dẫn tệp cấu hình cho ứng dụng

1. cPanel → **File Manager** → `/home/[tài-khoản-cpanel]/public_html/` → bật **Show Hidden Files** (nếu cần) → mở `.htaccess` → **Edit**.
2. Thêm **dòng đầu tiên** của tệp (trước mọi nội dung khác):

   ```apache
   SetEnv SONTRA_ENV_FILE /home/[tài-khoản-cpanel]/sontra-config/son-tra.env
   ```

3. Lưu. Thay `[tài-khoản-cpanel]` bằng tên thật (ví dụ đường dẫn đầy đủ hiển thị ở đầu File Manager).

> Nếu không tạo được tệp ngoài, đặt `api/.env` trong `/home/[tài-khoản-cpanel]/public_html/api/`. Quy tắc `.htaccess` đã chặn truy cập trực tiếp tệp này, nhưng cách ngoài vẫn an toàn hơn.

---

## Phần 3. Cơ sở dữ liệu và tài khoản quản trị

Thực hiện trên **phpMyAdmin** (cPanel → **Databases** → **phpMyAdmin**). **Luôn chọn `qiogdglehosting_sontra` ở cột trái trước khi import.**

### 3.1. Tạo bảng

Tab **Import** → **Choose File** → chọn `api/database/schema.sql` (trong `release/public_html/api/database/`) → **Go**.

Kết quả: có 9 bảng (`accounts`, `sessions`, `rate_limits`, `lessons`, `lesson_versions`, `learner_progress`, `assessments`, `news`, `password_resets`).

### 3.2. Nạp 9 bài học mẫu

Tab **Import** → chọn `api/database/seed.sql` → **Go**. Kiểm tra bảng `lessons` có 9 dòng.

### 3.3. Tạo tài khoản quản trị

Tệp `admin.sql` được tạo trên máy Windows, không tạo trên host:

```bash
cd /d/UNG_DUNG_VIBE/SON_TRA_02/Son_tra_so
read -s -p "Mật khẩu quản trị (không hiện khi gõ): " SONTRA_ADMIN_PASSWORD; echo
export SONTRA_ADMIN_PASSWORD
php api/bin/make_admin_sql.php "daominhtri2025@gmail.com" "Đào Minh Trí" > admin.sql
unset SONTRA_ADMIN_PASSWORD
cat admin.sql
```

- Mật khẩu phải có 10 đến 200 ký tự. Nếu sai, `admin.sql` sẽ rỗng; sửa rồi chạy lại.
- `admin.sql` chỉ chứa hàm băm bcrypt, không chứa mật khẩu dạng rõ.

Sau đó trong phpMyAdmin: tab **SQL** → dán toàn bộ nội dung `admin.sql` → **Go**. Kết quả `1 row inserted` (hoặc `2 rows affected` nếu tài khoản đã tồn tại).

Xóa `admin.sql` khỏi máy sau khi dùng xong.

---

## Phần 4. Tải giao diện và API lên `public_html`

### 4.1. Tải lên

Có hai cách; chọn một.

**Cách 1: tải nguyên gói (nhanh nhất)**

1. Tải `release/son-tra-so-release.tar.gz` lên `/home/[tài-khoản-cpanel]/public_html/`.
2. Chuột phải tệp → **Extract** → giải nén vào `/home/[tài-khoản-cpanel]/public_html/`.
3. Xóa tệp `.tar.gz` sau khi giải nén.

**Cách 2: tải từng tệp**

1. Mở `/home/[tài-khoản-cpanel]/public_html/`.
2. Xóa thư mục `assets/` cũ (nếu có).
3. Tải **nội dung** của `release/public_html/` lên `public_html/`. Chọn **ghi đè**.

**Không** tải `api/.env` từ máy build. **Không** xóa `public_html/uploads/` nếu đã có.

### 4.2. Kiểm tra sau khi tải

Trong `/home/[tài-khoản-cpanel]/public_html/` phải có: `index.html`, `assets/`, `api/index.php`, `uploads/`, `.htaccess`, `.user.ini`.

Trong `api/` **không** được có `tests/` hay `.env`.

### 4.3. Kiểm tra bản giao diện khớp với bản vừa build

Khi trang đăng nhập báo lỗi lạ, thường là trình duyệt đang chạy giao diện cũ:

1. Trên máy Windows, mở `release/public_html/index.html`, ghi lại tên tệp `index-XXXX.js` trong thẻ `<script>`.
2. Trên host, mở `/home/[tài-khoản-cpanel]/public_html/index.html` (File Manager → chuột phải → **Edit**). Tên tệp phải giống hệt.
3. Nếu khác: quay lại mục 4.1 (cách 2), xóa `assets/` cũ rồi tải lại.
4. Trên trình duyệt, nhấn **Ctrl + F5**.

---

## Phần 5. HTTPS và PHP

### 5.1. Bật HTTPS

1. cPanel → **Security** → **SSL/TLS Status** hoặc **Let's Encrypt SSL** [Cần xác nhận].
2. Cài chứng chỉ cho `cds-sontra.io.vn` (và `www` nếu dùng).
3. Mở `https://cds-sontra.io.vn`, kiểm tra có ổ khóa. Quy tắc chuyển HTTP sang HTTPS đã có sẵn trong `.htaccess`.

### 5.2. Chọn PHP 8.1 trở lên và bật extension

1. cPanel → **Software** → **MultiPHP Manager** (hoặc **Select PHP Version**) [Cần xác nhận].
2. Chọn `cds-sontra.io.vn` → chọn **PHP 8.1** trở lên.
3. Bật: `pdo_mysql`, `curl`, `dom`, `mbstring`, `fileinfo`, `json`.
4. Giới hạn tải tệp: `.user.ini` trong gói đã đặt `upload_max_filesize = 32M`. Nếu iNET không đọc `.user.ini`, chỉnh tại **MultiPHP INI Editor** [Cần xác nhận].

---

## Phần 6. Gửi thư khôi phục mật khẩu (SMTP)

Hàm `mail()` không dùng được trên gói này nên ứng dụng gửi qua SMTP.

1. **Xác định dịch vụ SMTP.** iNET không tạo hộp thư trên gói hosting. Đang xem xét OxMail; **[Cần xác nhận]** với iNET: máy chủ SMTP, cổng, kiểu mã hóa, có cho gửi ra ngoài, giới hạn thư/ngày, thời hạn miễn phí.
2. Thêm vào `/home/[tài-khoản-cpanel]/sontra-config/son-tra.env`:

   ```dotenv
   MAIL_FROM=no-reply@cds-sontra.io.vn
   MAIL_FROM_NAME=Sơn Trà Số
   SMTP_HOST=[máy-chủ-smtp]
   SMTP_PORT=587
   SMTP_ENCRYPTION=tls
   SMTP_USER=[tài-khoản-smtp]
   SMTP_PASS=[mật-khẩu-smtp]
   ```

   - `tls` dùng cổng 587; `ssl` dùng cổng 465.
   - `MAIL_FROM` phải thuộc tên miền bạn sở hữu.
3. Kiểm tra. Nếu có Terminal (SSH) trong cPanel:

   ```bash
   cd ~/public_html
   php api/bin/test_mail.php [email-của-bạn@gmail.com]
   ```

   Kết quả đúng: thư đến hộp thư (kiểm tra cả thư rác). Lỗi `535`: sai tài khoản hoặc mật khẩu SMTP.
   Không có SSH: bấm **Quên mật khẩu?** trên trang với một email thử.
4. Thêm bản ghi **SPF** (và **DKIM** nếu nhà cung cấp hướng dẫn) vào DNS của tên miền để thư không bị chặn.

---

## Phần 7. Đăng nhập Google (tùy chọn)

Không bắt buộc. Nếu bỏ qua, học viên vẫn đăng nhập bằng email và mật khẩu.

1. **Google Cloud Console** → **APIs & Services** → **Credentials** → chọn OAuth client loại **Web application**.
2. **Authorized JavaScript origins:** thêm `https://cds-sontra.io.vn` (không có dấu `/` cuối). Nếu dùng `www`, thêm `https://www.cds-sontra.io.vn`. Giữ `http://localhost:8080` nếu vẫn chạy thử trên máy.
3. **Không cần client secret.** Nếu secret từng bị lộ: **Reset secret** ngay.
4. Client ID phải giống nhau ở hai nơi:
   - `GOOGLE_CLIENT_ID=...` trong `son-tra.env` (máy chủ kiểm tra token; đổi không cần build lại);
   - `VITE_GOOGLE_CLIENT_ID=...` trong `.env.production` (giao diện; đổi thì phải build và tải lại).
5. Kiểm tra máy chủ, thay tên miền:

   ```bash
   curl -s -X POST https://cds-sontra.io.vn/api/auth/google -H "Content-Type: application/json" -d '{"credential":"thu"}'
   ```

   - HTTP 503 "chưa được cấu hình": thiếu `GOOGLE_CLIENT_ID` trong tệp cấu hình.
   - HTTP 401: máy chủ đã nhận Client ID. Đây là kết quả đúng với token giả.

Nếu trình duyệt báo `origin_mismatch`: địa chỉ đang mở chưa có trong **Authorized JavaScript origins**.

---

## Phần 8. Kiểm tra sau khi đưa lên

Đánh dấu từng mục khi đạt:

- [ ] `https://cds-sontra.io.vn/` mở được, có ổ khóa, không lỗi trong console (F12).
- [ ] `https://cds-sontra.io.vn/api/me` trả `{"authenticated":false}`.
- [ ] `https://cds-sontra.io.vn/api/lessons` trả danh sách bài học.
- [ ] Đăng nhập quản trị bằng tab **Email / Mật khẩu** thành công.
- [ ] Tải lại trang vẫn giữ phiên đăng nhập.
- [ ] Đăng nhập sai 5 lần liên tiếp: thông báo khóa tạm 15 phút.
- [ ] `https://cds-sontra.io.vn/api/.env` trả 403.
- [ ] Gửi thư khôi phục mật khẩu tới email thử, nhận được thư (Phần 6).
- [ ] Trang bản tin hiển thị, bấm **Đọc bài viết** mở được nội dung.

---

## Phần 9. Xử lý sự cố

| Triệu chứng | Nguyên nhân khả dĩ | Cách xử lý |
|---|---|---|
| Đăng nhập báo "Yêu cầu ghi phải dùng Content-Type: application/json" | Trình duyệt đang chạy giao diện cũ | Phần 4.3 |
| `/api/*` trả 404 | `.htaccess` thiếu hoặc `mod_rewrite` tắt | Kiểm tra `public_html/.htaccess`; nhờ iNET bật mod_rewrite |
| 503 "tạm thời không khả dụng" | Sai thông tin CSDL trong `son-tra.env` | Kiểm tra `DB_NAME`, `DB_USER`, `DB_PASS` (tên có tiền tố tài khoản) |
| Đăng nhập được nhưng bị đăng xuất ngay | Chưa bật HTTPS nên cookie `Secure` bị từ chối | Phần 5.1 |
| Trang trắng | Thiếu `index.html` hoặc `assets/` | Phần 4 |
| Nút Google báo "chưa được cấu hình" | Chưa có `VITE_GOOGLE_CLIENT_ID` lúc build | Phần 7; build lại |
| Không tải được âm thanh | Tệp lớn hơn 10 MB hoặc giới hạn PHP | Nén tệp; kiểm tra Phần 5.2 |
| Không gửi được thư | Sai SMTP hoặc chưa có SPF | Phần 6 |

---

## Phần 10. Vận hành và cập nhật

- **Sao lưu:** phpMyAdmin → `qiogdglehosting_sontra` → **Export** → **Go**. Sao lưu cả `public_html/uploads/` và `son-tra.env`.
- **Cập nhật mã mới:** xem [HUONG_DAN_CAP_NHAT.md](HUONG_DAN_CAP_NHAT.md), Phần B.
- **Nhật ký lỗi:** cPanel → **Errors** hoặc **Metrics** [Cần xác nhận].

---

## Phần 11. Bảo mật sau khi đưa lên

1. Đổi mật khẩu quản trị trong giao diện quản trị ngay sau lần đăng nhập đầu, dùng mật khẩu dài và ngẫu nhiên.
2. Xóa `admin.sql` và mọi tệp chứa mật khẩu trên máy Windows.
3. Không gửi mật khẩu (CSDL, SMTP, quản trị) qua chat, email hay ảnh chụp màn hình.
4. Reset client secret Google nếu đã từng lộ.
5. Giữ quyền `600` hoặc `640` cho `son-tra.env`.

---

## Tóm tắt trình tự

| Bước | Việc | Nơi thực hiện | Phần |
|---|---|---|---|
| 1 | Chuẩn bị, lấy mã, đóng gói | Máy Windows | 1 |
| 2 | Tạo `son-tra.env`, khai báo `SetEnv` | cPanel → File Manager | 2 |
| 3 | Bảng, bài học, tài khoản quản trị | phpMyAdmin | 3 |
| 4 | Tải `public_html`, kiểm tra bản build | cPanel → File Manager | 4 |
| 5 | HTTPS, PHP 8.1, extension | cPanel | 5 |
| 6 | SMTP | `son-tra.env` | 6 |
| 7 | Google (tùy chọn) | Google Cloud, `son-tra.env` | 7 |
| 8 | Kiểm tra, đổi mật khẩu, sao lưu | Trình duyệt, cPanel | 8, 10, 11 |
