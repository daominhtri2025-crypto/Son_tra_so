# Hướng dẫn Quản trị viên — Sơn Trà Số

Tài liệu này mô tả quyền và cách sử dụng cổng quản trị. Đối chiếu với mã nguồn hiện tại; các quyền được kiểm chứng bằng kiểm thử tự động (117 kiểm thử đạt).

## 1. Ba vai trò và quyền hạn

| Chức năng | Học viên | Tình nguyện viên | Quản trị viên |
|---|:-:|:-:|:-:|
| Học bài, làm kiểm tra, lưu tiến độ của chính mình | ✔ | — | — |
| Ghi phiếu quan sát năng lực cho học viên | — | ✔ | ✔ |
| Xem bảng tổng hợp và báo cáo đối chiếu trước – sau | — | — | ✔ |
| Xuất CSV báo cáo | — | — | ✔ |
| Tạo, sửa, ẩn, xóa mềm bài học | — | — | ✔ |
| Khôi phục bài học đã xóa mềm; xem lịch sử phiên bản bài | — | — | ✔ |
| Tải lên tệp âm thanh bài học | — | — | ✔ |
| Đăng, sửa, ẩn tin tức; đồng bộ tin từ nguồn RSS (khi bật) | — | — | ✔ |
| Quản lý ảnh trình chiếu trang chủ | — | — | ✔ |
| Tạo tài khoản tình nguyện viên; đặt lại mật khẩu; khóa tài khoản | — | — | ✔ |
| Đăng nhập bằng Google | ✔ | — | — (chỉ email và mật khẩu) |

Ghi chú:
- Tình nguyện viên **không tự đăng ký**. Chỉ quản trị viên tạo tài khoản.
- Khi tạo tài khoản tình nguyện viên, hệ thống bắt buộc họ đổi mật khẩu lần đầu trước khi ghi phiếu.
- Khóa tài khoản (vô hiệu hóa) không xóa dữ liệu phiếu đã ghi nhận.
- Tài khoản quản trị và tình nguyện viên không được tính là học viên trong báo cáo.

## 2. Đăng nhập cổng quản trị

1. Mở trang chủ, chọn **Quản trị viên** trong khung xác thực.
2. Nhập email và mật khẩu quản trị, bấm **Đăng nhập Cổng Quản trị viên**.
3. Sau khi đăng nhập, thanh điều hướng có các tab: **Thống kê & Báo cáo Chuyên sâu**, **Quản lý Tình nguyện viên**, **Quản lý Bài học & Xóa mềm**, **Bản tin Sơn Trà**, **Ảnh trang chủ**.

Quên mật khẩu: bấm **Quên mật khẩu?** và làm theo thư hướng dẫn (cần cấu hình gửi thư, xem `HUONG_DAN_INET_A_Z.md`).

## 3. Thống kê và báo cáo

Tab **Thống kê & Báo cáo Chuyên sâu** gồm ba mục:

- **Năng lực số Trước & Sau Khóa học** (đối chiếu theo Quy tắc 4.6): chỉ tính học viên hoàn thành đủ 5 nhiệm vụ ở **cả hai** lần đo. Học viên thiếu dữ liệu được loại khỏi bảng đối chiếu và được liệt kê số lượng riêng. Bấm **Xuất CSV (UTF-8 BOM, UTC+7)** để tải báo cáo.
- **Báo cáo 5 Nhóm bài**: thống kê theo từng nhóm nhiệm vụ.
- **Kiểm tra từng Học viên**: xem tiến độ và phiếu quan sát của từng học viên theo mã học viên.

Không được diễn giải số liệu khi mẫu số không đủ: báo cáo luôn ghi rõ số người đủ dữ liệu.

## 4. Quản lý tình nguyện viên

1. Tab **Quản lý Tình nguyện viên** → **Khởi tạo Tình nguyện viên mới**.
2. Nhập họ tên, email đăng nhập, mật khẩu tạm thời (10–200 ký tự) và đơn vị/tổ công tác.
3. Bấm **Cấp tài khoản & Bật cờ must_change**. Gửi email và mật khẩu tạm cho tình nguyện viên qua kênh riêng.
4. Khi tình nguyện viên đăng nhập lần đầu, hệ thống yêu cầu đổi mật khẩu.

Để ngừng quyền của một tình nguyện viên, dùng chức năng **khóa tài khoản** trong danh sách. Không xóa tài khoản nếu họ đã ghi phiếu.

## 5. Quản lý bài học

Tab **Quản lý Bài học & Xóa mềm**:

- **Thêm bài học mới**: nhập tiêu đề, nhóm nhiệm vụ (1–5), nội dung, câu hỏi kiểm tra với đáp án và giải thích, bước tiếp theo, và video/âm thanh (nếu có).
- **Video**: dán liên kết YouTube hoặc liên kết https. Hệ thống không nhận tệp video tải lên.
- **Âm thanh**: tải tệp .mp3, .wav, .m4a hoặc .ogg tối đa **10 MB**.
- **Sửa bài**: mỗi lần lưu, hệ thống tự lưu bản cũ vào lịch sử, kèm người sửa.
- **Ẩn bài**: bài ẩn không hiển thị với học viên.
- **Xóa mềm**: bài bị xóa vẫn được giữ trong lịch sử tiến độ; có thể **khôi phục** từ bộ lọc "Đã xóa mềm".
- **Bản lưu (n)**: xem các phiên bản trước của bài.

Bộ lọc theo nhóm và tìm kiếm giúp tìm nhanh bài cần sửa.

## 6. Quản lý bản tin

Tab **Bản tin Sơn Trà**:

- **Thêm tin thủ công**: nhập tiêu đề, tóm tắt, nội dung đầy đủ, ảnh minh họa (đường dẫn), liên kết nguồn (nếu có). Mỗi liên kết nguồn chỉ dùng cho một tin; để trống nếu không có.
- **Ẩn/hiện** tin bằng nút tương ứng.
- **Đồng bộ từ nguồn RSS**: chỉ hoạt động khi máy chủ được cấu hình nguồn (`NEWS_FEED_URL`, `NEWS_SYNC_ENABLED=true`). Khi chưa bật, nút báo trạng thái tắt; không có dữ liệu dự phòng.

## 7. Ảnh trình chiếu trang chủ

Tab **Ảnh trang chủ**. Hướng dẫn chi tiết nằm trong `HUONG_DAN_INET_A_Z.md`, Phần D. Tóm tắt:

- Trang chủ chỉ hiển thị **tối đa 5 ảnh**; có thể lưu nhiều hơn.
- Chọn chế độ **theo thứ tự sắp xếp** hoặc **ngẫu nhiên** (mỗi lần tải trang chọn 5 ảnh đang bật).
- Sắp xếp bằng nút mũi tên ↑ ↓; ẩn/hiện; sửa; xóa (xóa mềm).
- Mỗi ảnh có tiêu đề, nội dung (tùy chọn) và nút bấm (tùy chọn): mở bài học, mở tin tức, hoặc đường dẫn khác.
- Ảnh lớn được tự thu nhỏ trên trình duyệt trước khi tải lên.

## 8. Lưu ý bảo mật cho quản trị viên

- Không chia sẻ tài khoản quản trị. Mỗi người phụ trách có tài khoản riêng.
- Không gửi mật khẩu qua chat hoặc email không mã hóa.
- Đổi mật khẩu quản trị định kỳ và ngay khi nghi ngờ bị lộ (**Hồ sơ & Đổi MK**).
- Chỉ xuất báo cáo khi cần; giữ tệp CSV ở nơi an toàn và xóa khi không dùng nữa.
- Dữ liệu học viên không có họ tên, số điện thoại hay địa chỉ; không cố ghép với thông tin khác để nhận diện người dân.
