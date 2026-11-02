#!/usr/bin/env bash
# Đóng gói bản phát hành cho hosting chia sẻ: release/public_html + release/son-tra-so-release.tar.gz
# Chạy từ thư mục gốc dự án:  bash deploy/build-release.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "1/5 Kiểm tra kiểu TypeScript"
npx tsc --noEmit

echo "2/5 Build giao diện (Vite)"
npx vite build

echo "3/5 Kiểm tra cú pháp PHP"
if command -v php >/dev/null 2>&1; then
  find api -name '*.php' -not -path 'api/tests/*' -print0 | xargs -0 -n1 php -l >/dev/null
  DB_NAME="${SONTRA_TEST_DB:-sontra_test}" php api/tests/run.php >/dev/null && echo "    kiểm thử API: đạt" || { echo "    kiểm thử API: THẤT BẠI"; exit 1; }
else
  echo "    bỏ qua (không có php trên máy này)"
fi

echo "4/5 Sắp xếp cấu trúc public_html"
rm -rf release
mkdir -p release/public_html/uploads/media
cp -R dist/. release/public_html/
mkdir -p release/public_html/api
cp -R api/. release/public_html/api/
rm -rf release/public_html/api/tests release/public_html/api/.env release/public_html/api/database/seed/.gitkeep
cp deploy/public.htaccess release/public_html/.htaccess
cp deploy/uploads.htaccess release/public_html/uploads/.htaccess
cp deploy/uploads.htaccess release/public_html/uploads/media/.htaccess
cp deploy/user.ini release/public_html/.user.ini
find release/public_html -name '.env*' ! -name '.htaccess' -delete || true

echo "5/5 Nén gói phát hành"
tar -czf release/son-tra-so-release.tar.gz -C release public_html
echo "Hoàn tất: release/public_html và release/son-tra-so-release.tar.gz"
echo "Lưu ý: không đưa api/.env vào gói. Cấu hình đặt ở nơi an toàn trên máy chủ (xem docs/HUONG_DAN_TRIEN_KHAI.md)."
