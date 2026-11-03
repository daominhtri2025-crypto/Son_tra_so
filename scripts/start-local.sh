#!/usr/bin/env bash
# Khởi động Sơn Trà Số trên máy local (Git Bash). Chạy sau mỗi lần mở lại máy:
#   bash scripts/start-local.sh
# Kiểm tra trước: đã build giao diện, MySQL (XAMPP) đang chạy, cấu hình api/.env đúng.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

PORT="${PORT:-8080}"

if [ ! -f dist/index.html ]; then
  echo "Chưa có giao diện đã build. Chạy: npm run build"
  exit 1
fi

if [ ! -f api/.env ]; then
  echo "Thiếu api/.env. Xem docs/HUONG_DAN_CHAY_LOCAL.md mục 5."
  exit 1
fi

echo "Kiểm tra CSDL và cấu hình..."
if ! php api/bin/doctor.php; then
  echo ""
  echo "CHƯA SẴN SÀNG. Thường gặp nhất: MySQL trong XAMPP chưa bật."
  echo "Mở XAMPP Control Panel, bấm Start ở dòng MySQL, rồi chạy lại lệnh này."
  exit 1
fi

echo ""
echo "Mở trình duyệt tại: http://localhost:${PORT}  (nhấn Ctrl + C để dừng)"
exec php -S "127.0.0.1:${PORT}" -t dist scripts/php-dev-router.php
