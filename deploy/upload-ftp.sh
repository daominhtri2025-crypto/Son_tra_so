#!/usr/bin/env bash
# Đóng gói rồi tải release/public_html lên hosting qua FTP/FTPS (dùng curl có sẵn trong Git Bash).
#
# Cách dùng (từ thư mục gốc dự án):
#   read -s -p "Mật khẩu FTP: " FTP_PASS; echo; export FTP_PASS
#   FTP_HOST=ftp.cds-sontra.io.vn FTP_USER=[tài-khoản-ftp] FTP_REMOTE=/public_html \
#     bash deploy/upload-ftp.sh
#
# Tùy chọn:
#   DRY_RUN=1      chỉ in danh sách tệp sẽ tải, không gửi gì
#   SKIP_BUILD=1   bỏ qua bước build-release (dùng khi vừa build xong)
#
# An toàn:
#   - Không bao giờ tải nội dung uploads/ (âm thanh đã tải lên trên host); chỉ tải .htaccess bảo vệ.
#   - Không bao giờ tải api/.env (gói không chứa tệp này).
#   - Không xóa gì trên host; chỉ ghi đè tệp cùng tên.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${FTP_HOST:?Thiếu FTP_HOST, ví dụ ftp.cds-sontra.io.vn}"
: "${FTP_USER:?Thiếu FTP_USER (tài khoản FTP trong cPanel)}"
FTP_REMOTE="${FTP_REMOTE:-/public_html}"
FTP_REMOTE="${FTP_REMOTE%/}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

if [ "$DRY_RUN" != "1" ]; then
  : "${FTP_PASS:?Thiếu FTP_PASS. Đặt bằng: read -s -p \"Mật khẩu FTP: \" FTP_PASS; export FTP_PASS}"
fi

if [ "$SKIP_BUILD" != "1" ]; then
  echo "1/2 Đóng gói bản phát hành..."
  bash deploy/build-release.sh
fi

SRC="release/public_html"
if [ ! -f "$SRC/index.html" ]; then
  echo "Không tìm thấy $SRC/index.html. Build chưa thành công."
  exit 1
fi

echo "2/2 Tải lên ftp://$FTP_HOST$FTP_REMOTE (FTPS)"
total=0
failed=0
while IFS= read -r -d '' file; do
  rel="${file#$SRC/}"
  case "$rel" in
    api/.env|api/.env.*) continue ;;
    uploads/*)
      # Chỉ tải tệp .htaccess bảo vệ thư mục; không tải nội dung uploads/ (dữ liệu trên host).
      [ "$(basename "$rel")" = ".htaccess" ] || continue ;;
  esac
  total=$((total + 1))
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [dry-run] $rel"
    continue
  fi
  if curl -sS --fail --ssl-reqd --ftp-create-dirs \
      -u "$FTP_USER:$FTP_PASS" \
      -T "$file" "ftp://$FTP_HOST$FTP_REMOTE/$rel" -o /dev/null; then
    echo "  ✓ $rel"
  else
    echo "  ✗ $rel"
    failed=$((failed + 1))
  fi
done < <(find "$SRC" -type f -print0)

echo ""
if [ "$DRY_RUN" = "1" ]; then
  echo "Dry-run: $total tệp sẽ được tải."
  exit 0
fi
if [ "$failed" -gt 0 ]; then
  echo "Có $failed/$total tệp lỗi. Chạy lại lệnh (các tệp đã tải sẽ được ghi đè an toàn)."
  exit 1
fi
echo "Hoàn tất: $total tệp đã tải lên $FTP_REMOTE."
echo "Bước cuối: mở https://cds-sontra.io.vn và nhấn Ctrl + F5."
