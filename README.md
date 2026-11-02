# Sơn Trà Số

Nền tảng chuyển đổi số và nâng cao năng lực số cho người dân quận Sơn Trà, Đà Nẵng.

- **Giao diện:** React 19 + TypeScript + Vite + Tailwind CSS (thư mục `src/`).
- **Máy chủ:** PHP 8.1+ với PDO MySQL, không framework (thư mục `api/`).
- **CSDL:** MySQL 8.0 hoặc MariaDB 10.6+ (`api/database/schema.sql`).
- **Triển khai mục tiêu:** Hostinger hoặc iNET (gói chia sẻ PHP + MySQL).

## Chạy cục bộ

```bash
bun install            # hoặc: npm install
bun run typecheck      # kiểm tra kiểu
bun run build          # build giao diện vào dist/
php api/tests/run.php  # kiểm thử API (cần CSDL có tên kết thúc bằng _test)
```

Kiểm thử API yêu cầu tệp `api/.env` trỏ tới CSDL thử nghiệm. Tên CSDL phải kết thúc bằng `_test`, vì bộ kiểm thử xóa dữ liệu.

## Triển khai

Xem **[docs/HUONG_DAN_TRIEN_KHAI.md](docs/HUONG_DAN_TRIEN_KHAI.md)**. Tóm tắt: `bash deploy/build-release.sh` tạo `release/public_html/`, tải lên hosting, rồi chạy `php api/bin/migrate.php`, `php api/bin/seed.php` và `php api/bin/create_admin.php`.

## Tài liệu

- `docs/SUA_LOI.md`: ánh xạ phát hiện → cách sửa → bằng chứng kiểm thử.
- `docs/BAO_CAO_PHAN_TICH_SON_TRA_SO.md`: phân tích mã nguồn ban đầu.
- `docs/spec/MASTER_SPEC_SON_TRA_SO_d7642915.md`: đặc tả chính thức (lưu ý: mô tả kiến trúc Next.js/D1 khác với mã hiện tại).
