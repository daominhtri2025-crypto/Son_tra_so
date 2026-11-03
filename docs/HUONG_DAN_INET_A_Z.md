# Hướng dẫn từ A đến Z: cấu hình và đưa Sơn Trà Số lên hosting iNET (cPanel)

Tài liệu này gom toàn bộ quy trình từ chuẩn bị đến kiểm tra trên gói **iNET AMD-H1** (cPanel, LiteSpeed, PHP 8.1 trở lên). Các bước đã có chi tiết ở tài liệu khác được tóm tắt và dẫn liên kết, không lặp lại đầy đủ.

**Quy ước trình bày**
- Dòng lệnh chạy trên **máy Windows của bạn** (Git Bash hoặc PowerShell) được ghi trong khối `bash` hoặc `powershell`. Không gõ dấu nhắc `$` khi chạy.
- Giá trị trong ngoặc vuông `[...]` là chỗ bạn thay bằng thông tin của mình.
- Mục đánh dấu **[Cần xác nhận]** là điểm tôi chưa kiểm chứng được trên giao diện cPanel thực tế của iNET. Nếu tên nút khác, hãy báo lại để cập nhật.

---

## A. Chuẩn bị thông tin

Trước khi bắt đầu, hãy có sẵn:

| Thông tin | Ví dụ | Ghi chú |
|---|---|---|
| Tên miền chính thức | `cds-sontra.io.vn` | Phải trỏ về máy chủ iNET |
| Đăng nhập cPanel | Tên người dùng và mật khẩu cPanel | Do iNET cấp |
| Tên CSDL và người dùng CSDL | `qiogdglehosting_sontra` | Đã tạo trước đó |
| Mật khẩu CSDL | (bạn tự giữ) | Không ghi vào tài liệu hay chat |
| Email quản trị | `daominhtri2025@gmail.com` | Dùng để đăng nhập cổng quản trị |
| Thông tin SMTP | (chưa có) | Xem mục I |
| Client ID Google | (tùy chọn) | Xem mục J |

**Yêu cầu hosting:** PHP 8.1 trở lên; MySQL 8 hoặc MariaDB 10.6 trở lên; SSL hoạt động; các extension `pdo_mysql`, `curl`, `dom`, `mbstring`, `fileinfo`, `json`.

---

## B. Chuẩn bị trên máy Windows (máy build)

Máy build dùng để đóng gói mã nguồn. Hosting **không** build; bạn chỉ tải kết quả lên.

### B1. Cài công cụ
1. **Git for Windows** (cung cấp Git Bash).
2. **Node.js LTS** (kiểm tra bằng `node -v`).
3. **PHP 8.1 trở lên** kèm `pdo_mysql` (xem tài liệu [HUONG_DAN_CHAY_LOCAL.md](HUONG_DAN_CHAY_LOCAL.md) mục cài PHP).

### B2. Lấy mã nguồn mới nhất
```bash
cd /d/UNG_DUNG_VIBE/SON_TRA_02/Son_tra_so
git pull origin claude/son-tra-so-code-analysis-xzgo0g
npm install
```

### B3. Tạo tệp cấu hình giao diện cho production
Tạo tệp `.env.production` ở thư mục gốc dự án, nội dung một dòng (chỉ cần khi bật Google, nếu không thì để tệp trống hoặc không tạo):
```dotenv
VITE_GOOGLE_CLIENT_ID=[client-id].apps.googleusercontent.com
```
Giá trị này được ghi vào giao diện **lúc build**. Đổi nó nghĩa là phải build lại.

### B4. Đóng gói
```bash
bash deploy/build-release.sh
```
Kết quả đúng phải có các dòng `kiểm thử API: đạt` và `Hoàn tất: release/public_html`. **Nếu có lỗi, dừng lại, không tải lên.** Gửi nội dung lỗi để được hỗ trợ.

Sau khi build xong, tạo thư mục `release/public_html/` và tệp `release/son-tra-so-release.tar.gz`. Gói này **không** chứa `api/.env` và **không** chứa `uploads/` của máy chủ.

---

## C. Cơ sở dữ liệu trên cPanel

1. Đăng nhập cPanel → mục **Databases** → **MySQL® Databases** [Cần xác nhận tên mục].
2. Kiểm tra đã có:
   - CSDL: `qiogdglehosting_sontra`
   - Người dùng CSDL được gán vào CSDL đó với **toàn quyền** (ALL PRIVILEGES).
3. Nếu chưa có: tạo CSDL, tạo người dùng với mật khẩu mạnh, gán quyền toàn bộ.
4. Ghi lại tên CSDL, tên người dùng, mật khẩu. Máy chủ CSDL thường là `localhost`.

> Lưu ý: trên cPanel, tên CSDL và người dùng luôn có tiền tố tài khoản (ví dụ `qiogdglehosting_`). Dùng đúng tên đầy đủ.

---

## D. Tệp cấu hình máy chủ (`api/.env`)

Đây là tệp chứa mật khẩu CSDL và cấu hình máy chủ. Tệp này **không** đi trong gói và không nên đặt trong thư mục web công khai.

### D1. Cách khuyến nghị: đặt ngoài thư mục web
1. Cpanel → **File Manager** → vào thư mục home (ngang hàng với `public_html`).
2. Tạo thư mục `sontra-config`, rồi tạo tệp `son-tra.env` trong đó.
3. Nội dung:
   ```dotenv
   APP_URL=https://cds-sontra.io.vn
   APP_DEBUG=false
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=qiogdglehosting_sontra
   DB_USER=[tên-người-dùng-csdl]
   DB_PASS=[mật-khẩu-csdl]
   DB_CHARSET=utf8mb4
   GOOGLE_CLIENT_ID=
   NEWS_SYNC_ENABLED=false
   MAIL_DRIVER=smtp
   ```
   Các dòng SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_ENCRYPTION`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_FROM_NAME`) sẽ thêm ở mục I.
4. Mở `public_html/.htaccess`, thêm **ở dòng đầu tiên** (trước mọi quy tắc khác):
   ```apache
   SetEnv SONTRA_ENV_FILE /home/[tên-tài-khoản-cpanel]/sontra-config/son-tra.env
   ```
   Thay `[tên-tài-khoản-cpanel]` bằng tên đăng nhập cPanel của bạn (xem đường dẫn ở đầu File Manager).

### D2. Phương án thay thế
Đặt tệp `api/.env` trong `public_html/api/`. Quy tắc `.htaccess` đã chặn truy cập trực tiếp `api/.env`, nhưng D1 vẫn an toàn hơn.

### D3. Quy tắc bảo mật
- **Không** đưa mật khẩu CSDL, SMTP hay Client Secret vào chat, email hay tài liệu chia sẻ.
- Đặt quyền tệp `.env` ở mức không đọc được từ bên ngoài (cPanel File Manager → chuột phải → **Permissions**, thường là `600` hoặc `640`) [Cần xác nhận].

---

## E. Tải mã lên `public_html`

Có hai cách. Cách 2 nhanh hơn khi gói lớn.

### Cách 1: tải từng tệp
1. cPanel → **File Manager** → mở `public_html`.
2. Xóa nội dung cũ **trừ** các mục sau (nếu có):
   - `uploads/` (chứa tệp âm thanh đã tải lên)
   - `.user.ini` và `.htaccess` sẽ được ghi đè bằng gói mới; với `.htaccess` nhớ thêm lại dòng `SetEnv` ở mục D1
3. Tải lên nội dung của `release/public_html/` (bao gồm `index.html`, `assets/`, `api/`, `uploads/`, `.htaccess`, `.user.ini`).

### Cách 2: tải tệp nén rồi giải nén
1. Tải `son-tra-so-release.tar.gz` lên `public_html/`.
2. Chuột phải tệp → **Extract** → giải nén vào `public_html/`. Xóa tệp `.tar.gz` sau khi giải nén xong.

### Kiểm tra sau khi tải
- Có các mục: `index.html`, `assets/`, `api/index.php`, `uploads/`, `.htaccess`, `.user.ini`.
- **Không** có `api/tests/`, `api/.env`, `api/database/seed/.gitkeep`.
- Thư mục `uploads/media/` tồn tại và có `.htaccess` bên trong.

---

## F. Kiểm tra bản giao diện trên host có khớp bản vừa build

Đây là bước quan trọng nhất khi gặp lỗi kiểu "Yêu cầu ghi phải dùng Content-Type: application/json" trên trang đăng nhập. Lỗi đó thường do **trình duyệt đang chạy bản giao diện cũ** trên host.

1. Mở `release/public_html/index.html` trên máy Windows. Tìm dòng `<script ... src="/assets/index-XXXX.js">`. Ghi lại tên tệp `index-XXXX.js`.
2. Trên cPanel → File Manager → `public_html/index.html` (xem nội dung). Tên tệp JS phải **giống hệt**.
3. Nếu khác: tệp trên host là bản cũ. Làm lại mục E (xóa `assets/` cũ, tải lại).
4. Trên trình duyệt, nhấn **Ctrl + Shift + R** rồi thử lại.

---

## G. HTTPS và PHP

### G1. SSL
1. cPanel → **Security** → **SSL/TLS Status** hoặc **Let's Encrypt SSL** [Cần xác nhận].
2. Chọn tên miền và cài chứng chỉ. Đảm bảo `https://cds-sontra.io.vn` mở được với ổ khóa.
3. Bật chuyển hướng HTTP sang HTTPS (đã có trong `.htaccess`; không cần thêm).

### G2. Phiên bản PHP và extension
1. cPanel → **Software** → **MultiPHP Manager** (hoặc **Select PHP Version**) [Cần xác nhận].
2. Chọn tên miền → chọn **PHP 8.1** hoặc cao hơn.
3. Bật các extension: `pdo_mysql`, `curl`, `dom`, `mbstring`, `fileinfo`, `json`.
4. Tệp `.user.ini` trong gói đã đặt `upload_max_filesize = 32M` và `post_max_size = 34M`. Nếu iNET không cho dùng `.user.ini`, chỉnh trong **MultiPHP INI Editor** [Cần xác nhận].

---

## H. Tạo bảng, nội dung mẫu và tài khoản quản trị

Thực hiện trên **phpMyAdmin** (cPanel → **Databases** → **phpMyAdmin**). Chọn đúng CSDL `qiogdglehosting_sontra` ở cột trái trước mỗi bước.

### H1. Tạo bảng
1. Tab **Import** → chọn `api/database/schema.sql` trong gói → **Go**.
2. Kết quả: có 9 bảng (`accounts`, `sessions`, `rate_limits`, `lessons`, `lesson_versions`, `learner_progress`, `assessments`, `news`, `password_resets`).

### H2. Nạp 9 bài học mẫu
1. Tab **Import** → chọn `api/database/seed.sql` → **Go**.
2. Kiểm tra: bảng `lessons` có 9 dòng.

### H3. Tạo tài khoản quản trị
Tệp `admin.sql` được sinh trên máy Windows bằng `api/bin/make_admin_sql.php` (xem [HUONG_DAN_TRIEN_KHAI.md](HUONG_DAN_TRIEN_KHAI.md) mục 6.3). Sau đó:
1. Mở `admin.sql` bằng Notepad, chọn tất cả, sao chép.
2. phpMyAdmin → tab **SQL** → dán → **Go**.
3. Kết quả: `1 row inserted`. Nếu `2 rows affected` thì tài khoản đã tồn tại và được cập nhật lại.
4. Xóa `admin.sql` khỏi máy sau khi dùng xong.

> **Đăng nhập quản trị:** dùng tab **Email / Mật khẩu** trên trang web. Tài khoản quản trị không đăng nhập được bằng Google.

---

## I. Gửi thư khôi phục mật khẩu (SMTP)

Hàm `mail()` không dùng được trên gói này, nên dùng SMTP.

### I1. Chọn dịch vụ SMTP
- **Đã xác định:** iNET không tạo hộp thư trên gói hosting (theo câu trả lời trước đó).
- **Đang xem xét:** OxMail (dịch vụ hộp thư miễn phí trên tên miền). **[Cần xác nhận]** các thông số sau với iNET: máy chủ SMTP, cổng, kiểu mã hóa, có cho gửi ra ngoài không, giới hạn số thư/ngày, và thời hạn miễn phí.
- Nếu không gửi được thư qua tên miền, cần một dịch vụ SMTP giao dịch khác (ví dụ của nhà cung cấp email gửi hàng loạt).

### I2. Thêm cấu hình vào `son-tra.env` (mục D1)
```dotenv
MAIL_FROM=no-reply@cds-sontra.io.vn
MAIL_FROM_NAME=Sơn Trà Số
SMTP_HOST=[máy-chủ-smtp]
SMTP_PORT=587
SMTP_ENCRYPTION=tls
SMTP_USER=[tài-khoản-smtp]
SMTP_PASS=[mật-khẩu-smtp]
```
- `tls` dùng cổng 587 (STARTTLS). `ssl` dùng cổng 465.
- `MAIL_FROM` phải thuộc tên miền bạn sở hữu.

### I3. Kiểm tra
Nếu có Terminal (SSH) của cPanel:
```bash
cd ~/public_html
php api/bin/test_mail.php [email-của-bạn@gmail.com]
```
Kết quả đúng: thư đến hộp thư (kiểm tra cả mục thư rác). Lỗi `535` là sai tài khoản hoặc mật khẩu SMTP.

Nếu không có SSH: bấm **Quên mật khẩu?** trên trang với một email thử và kiểm tra hộp thư.

### I4. Chống thư rác
Thêm bản ghi **SPF** (và **DKIM** nếu nhà cung cấp hướng dẫn) vào DNS của tên miền, theo hướng dẫn của dịch vụ SMTP. Thiếu bước này, thư khôi phục mật khẩu có thể bị chặn.

---

## J. Đăng nhập Google (tùy chọn)

Không bắt buộc. Nếu không cấu hình, học viên vẫn đăng nhập bằng email và mật khẩu.

1. **Google Cloud Console** → **APIs & Services** → **Credentials** → chọn OAuth client (loại Web application).
2. Trong **Authorized JavaScript origins**, thêm đúng địa chỉ trang: `https://cds-sontra.io.vn`. Không có dấu `/` ở cuối. Nếu dùng cả `www`, thêm `https://www.cds-sontra.io.vn`.
3. Giữ `http://localhost:8080` nếu vẫn chạy thử trên máy.
4. Client ID phải giống nhau ở hai nơi:
   - `GOOGLE_CLIENT_ID=...` trong `son-tra.env` (máy chủ kiểm tra token; không cần build lại)
   - `VITE_GOOGLE_CLIENT_ID=...` trong `.env.production` (giao diện; cần build lại và tải lên lại)
5. **Không cần client secret.** Nếu secret đã từng bị lộ, vào Google Cloud Console → **Reset secret**.

Kiểm tra máy chủ (từ máy Windows, thay tên miền):
```bash
curl -s -X POST https://cds-sontra.io.vn/api/auth/google -H "Content-Type: application/json" -d '{"credential":"thu"}'
```
- HTTP 503 với thông báo "chưa được cấu hình": thiếu `GOOGLE_CLIENT_ID` trong tệp cấu hình.
- HTTP 401: máy chủ đã nhận Client ID. Đây là kết quả đúng với token giả.

Nếu trình duyệt báo `origin_mismatch`: địa chỉ đang mở chưa có trong **Authorized JavaScript origins**.

---

## K. Kiểm tra sau triển khai

Đánh dấu từng mục khi đạt:

- [ ] `https://cds-sontra.io.vn/` mở được, có ổ khóa HTTPS, không có lỗi trong console (F12).
- [ ] `https://cds-sontra.io.vn/api/me` trả `{"authenticated":false}`.
- [ ] `https://cds-sontra.io.vn/api/lessons` trả danh sách bài học.
- [ ] Đăng nhập quản trị bằng tab **Email / Mật khẩu** thành công.
- [ ] Sau khi đăng nhập, tải lại trang vẫn giữ phiên.
- [ ] Đăng nhập sai 5 lần liên tiếp, nhận thông báo khóa tạm 15 phút.
- [ ] `https://cds-sontra.io.vn/api/.env` trả 403 (không hiện nội dung).
- [ ] `https://cds-sontra.io.vn/api/src/Http/Security.php` trả 403.
- [ ] Gửi thư khôi phục mật khẩu tới email thử và nhận được thư (mục I).
- [ ] Dán liên kết YouTube vào một bài học, video hiển thị.

---

## L. Xử lý sự cố

| Triệu chứng | Nguyên nhân khả dĩ | Cách xử lý |
|---|---|---|
| Đăng nhập báo **"Yêu cầu ghi phải dùng Content-Type: application/json"** | Trình duyệt chạy giao diện cũ trên host | Mục F: so tên tệp JS, tải lại `assets/`, nhấn Ctrl + Shift + R |
| `/api/*` trả 404 | `.htaccess` thiếu, hoặc `mod_rewrite` tắt | Kiểm tra `.htaccess` ở `public_html/`; yêu cầu iNET bật mod_rewrite nếu cần |
| 503 "tạm thời không khả dụng" | Sai thông tin CSDL trong `son-tra.env` | Kiểm tra `DB_NAME`, `DB_USER`, `DB_PASS`; xem tên đầy đủ có tiền tố |
| Đăng nhập được nhưng bị đăng xuất ngay | Cookie `Secure` bị từ chối vì chưa HTTPS | Bật SSL (mục G1) |
| Trang trắng | Thiếu tệp `index.html` hoặc `assets/` | Kiểm tra lại mục E |
| Nút Google "chưa được cấu hình" | Chưa đặt `VITE_GOOGLE_CLIENT_ID` lúc build | Mục J; build lại |
| Không tải được âm thanh | Tệp lớn hơn 10 MB hoặc PHP giới hạn upload | Nén tệp; kiểm tra `.user.ini` (mục G2) |
| Không gửi được thư | Sai SMTP, hoặc chưa có SPF | Mục I |

---

## M. Vận hành định kỳ

- **Sao lưu CSDL:** phpMyAdmin → chọn CSDL → tab **Export** → **Go**. Làm trước mỗi lần cập nhật và định kỳ hằng tuần.
- **Sao lưu tệp:** tải về thư mục `public_html/uploads/` và `son-tra.env`.
- **Sao lưu toàn bộ:** cPanel → **Backup** (nếu gói có).
- **Cập nhật mã:** build lại gói (mục B), tải lên lại theo mục E (giữ `uploads/`, không ghi đè `son-tra.env`). Nếu có thay đổi cấu trúc CSDL, chạy lại `schema.sql` qua phpMyAdmin (an toàn khi chạy lặp). Chi tiết xem [HUONG_DAN_CAP_NHAT.md](HUONG_DAN_CAP_NHAT.md).
- **Nhật ký lỗi:** cPanel → **Errors** hoặc **Metrics → Errors** [Cần xác nhận].

---

## N. Bảo mật sau khi đưa lên

1. **Đổi mật khẩu quản trị** trong giao diện quản trị ngay sau lần đăng nhập đầu, dùng mật khẩu dài và ngẫu nhiên.
2. **Xóa `admin.sql`** và mọi tệp chứa mật khẩu trên máy Windows.
3. **Không gửi mật khẩu** (CSDL, SMTP, admin) qua chat, email hoặc ảnh chụp màn hình.
4. **Reset Client Secret** Google nếu đã từng lộ.
5. Kiểm tra quyền tệp `son-tra.env` (mục D3).

---

## O. Tóm tắt trình tự

| Thứ tự | Việc | Nơi thực hiện | Mục |
|---|---|---|---|
| 1 | Chuẩn bị thông tin | Ghi chú cá nhân | A |
| 2 | Cài công cụ, lấy mã mới | Máy Windows | B |
| 3 | Đóng gói | Máy Windows | B4 |
| 4 | Kiểm tra CSDL, tạo tệp cấu hình | cPanel | C, D |
| 5 | Tải `public_html` và kiểm tra khớp bản build | cPanel | E, F |
| 6 | SSL, PHP 8.1 và extension | cPanel | G |
| 7 | Bảng, bài học, tài khoản quản trị | phpMyAdmin | H |
| 8 | SMTP | `son-tra.env` | I |
| 9 | Google (nếu dùng) | Google Cloud, cPanel | J |
| 10 | Kiểm tra, đổi mật khẩu, sao lưu | Trình duyệt, cPanel | K, M, N |
