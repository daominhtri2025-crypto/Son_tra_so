# Báo cáo phân tích mã nguồn — Ứng dụng Sơn Trà Số

**Nguồn phân tích:** `8c227457-s_n-tr_-s_.zip` (47 tệp, ~630 KB), giải nén tại thư mục nháp của phiên làm việc.
**Ngày:** 02/11/2026
**Phạm vi:** Đọc toàn bộ tầng logic (`src/services`, `src/repository`, `src/lib`, `src/utils`, `src/types`, `src/App.tsx`), cấu hình, và đối chiếu với tài liệu `MASTER_SPEC`. Các component giao diện lớn (`AdminPortal.tsx` ~114 KB, `LearnerPortal.tsx` ~59 KB, `AssessmentPortal.tsx`) **chỉ được kiểm tra bằng tìm kiếm mẫu (grep)**, chưa đọc toàn bộ từng dòng.

---

## 0. Ghi chú về phương pháp

- Các nhận định được gắn nhãn: **[Thực nghiệm]** là kết quả đã chạy và quan sát được; **[Đọc mã]** là suy ra trực tiếp từ đoạn mã; **[Suy luận]** là suy diễn, cần xác minh thêm.
- Đã thực hiện: (a) cài đặt bằng `bun install --frozen-lockfile` trên một bản sao; (b) `tsc --noEmit`; (c) `vite build`; (d) chạy trực tiếp các hàm `apiRouter`, `authService`, `lessonService`, `newsCrawlerService` bằng `tsx` trên bản sao để kiểm chứng 10 hành vi.
- Repository `/home/user/Son_tra_so` hiện **rỗng (chưa có commit)**. Tôi **không** ghi đè hay commit gì vào đó.

---

## 1. Tổng quan dự án

| Mục | Nội dung | Nguồn |
|---|---|---|
| Tên | Sơn Trà Số — nền tảng chuyển đổi số và nâng cao năng lực số cho người dân quận Sơn Trà, Đà Nẵng | `metadata.json` |
| Loại | Ứng dụng web một trang (SPA), React 19 + TypeScript + Vite 8 + Tailwind CSS 4 | `package.json` |
| Ba phân hệ | Học viên (learner), Tình nguyện viên (volunteer, ghi phiếu quan sát), Quản trị viên (admin) | `src/types/index.ts`, `src/App.tsx` |
| Kiến trúc ghi nhận trong mã | Route → Service → Repository (ghi chú trong `App.tsx`, `apiRouter.ts`) | Đọc mã |
| Nguồn gốc | Sinh từ nền tảng AI Studio (README, `metadata.json`, `vite.config.ts` có ghi chú riêng) | Đọc mã |

### 1.1 Cấu trúc thư mục và chức năng

```
.
├── index.html                  Trang vỏ, lang="en" dù nội dung tiếng Việt
├── package.json / bun.lock     Phụ thuộc; lockfile là Bun
├── tsconfig.json               Không bật "strict"
├── vite.config.ts              Plugin React + Tailwind, alias "@"
├── metadata.json               Mô tả ứng dụng (AI Studio)
├── .env.example                Chỉ có GEMINI_API_KEY, APP_URL — không được mã nguồn sử dụng
├── public/assets/aistudio/
│   └── MASTER_SPEC_...md       Đặc tả chính thức (56 KB, có mục "Module dở dang" và "Mâu thuẫn")
└── src/
    ├── main.tsx, App.tsx       Điểm vào; App giữ toàn bộ state và định tuyến theo vai trò
    ├── types/index.ts          Kiểu dữ liệu: Lesson, Assessment, Account, NewsItem, ...
    ├── utils/rules.ts          Quy tắc nghiệp vụ thuần (merge tiến độ, lọc học viên đủ 5 nhiệm vụ)
    ├── data/initialData.ts     Dữ liệu mẫu: bài học, tin, tài khoản, học viên (23 KB)
    ├── lib/crypto.ts           PBKDF2-SHA256 (100.000 vòng), SHA-256, token ngẫu nhiên 256 bit
    ├── services/
    │   ├── apiRouter.ts        "Bộ định tuyến HTTP" giả lập: nhận {method, path, headers, body}
    │   ├── authService.ts      Đăng ký, đăng nhập, khóa tạm, đổi mật khẩu, kiểm quyền
    │   ├── initAuth.ts         Khởi tạo tài khoản mẫu (có mật khẩu viết cứng)
    │   ├── lessonService.ts    CRUD bài học, lịch sử phiên bản, xóa mềm, kiểm định dạng media
    │   └── newsCrawlerService.ts  Cào "Tin nổi bật" từ sontra.danang.gov.vn + dữ liệu dự phòng
    ├── repository/             Lớp dữ liệu — TẤT CẢ là Map trong bộ nhớ (InMemory*)
    │   ├── authRepository.ts   Tài khoản, phiên, học viên, giới hạn tần suất
    │   ├── lessonRepository.ts Bài học, lịch sử
    │   └── newsRepository.ts   Tin tức, upsert
    └── components/             Giao diện (xem mục 1.2)
```

### 1.2 Các component

| Tệp | Vai trò | Trạng thái sử dụng |
|---|---|---|
| `WelcomeLanding.tsx`, `LoginModal.tsx` | Trang chào, đăng nhập/đăng ký học viên (Google, mã học viên, email) | Dùng — `App.tsx` |
| `LearnerPortal.tsx` | Bài học, quiz, tiến độ, tin tức | Dùng |
| `AssessmentPortal.tsx` | Ghi phiếu quan sát năng lực số (TNV) | Dùng |
| `AdminPortal.tsx` | Quản lý bài học, TNV, tin tức, đồng bộ | Dùng |
| `ProfileSettingsModal.tsx`, `ForcedChangePasswordModal.tsx`, `AccessDenied.tsx` | Hồ sơ, đổi mật khẩu bắt buộc, từ chối truy cập | Dùng |
| `Header.tsx` | Điều hướng vai trò | Dùng |
| `SecurityAuditPanel.tsx` | Bảng "kiểm thử bảo mật" tự động | **Không được import ở đâu — mã chết** [Thực nghiệm: grep] |
| `TechnicalSpecModal.tsx` | Modal mô tả kỹ thuật | **Không được import — mã chết** [Thực nghiệm: grep] |

---

## 2. Kiến trúc và luồng dữ liệu thực tế

**Dữ liệu thực nghiệm / Sự thật:**
1. `apiRouter.handle()` được **gọi trực tiếp từ React** trong cùng một tiến trình trình duyệt. Không có máy chủ HTTP nào trong repo (không có `express`/`server.js` dù `express` nằm trong `dependencies`). [Đọc mã + Thực nghiệm: 0 tệp import express]
2. Toàn bộ "cơ sở dữ liệu" là các `Map` trong bộ nhớ, khởi tạo lại mỗi lần tải trang. [Đọc mã: `authRepository.ts`, `lessonRepository.ts`, `newsRepository.ts`]
3. Cookie `st_session` được ghi bằng `document.cookie` trong `App.tsx:155`, **không có HttpOnly**. Chuỗi `set-cookie` do `apiRouter` trả về (có HttpOnly) bị JavaScript phía client nhận và bỏ qua; không có trình duyệt nào áp dụng nó. [Đọc mã]

**Suy luận khoa học:**
- Vì "máy chủ" nằm trong trình duyệt của người dùng, mọi kiểm soát quyền (`role`, `Origin`, khóa tài khoản) đều **có thể bị vượt qua bởi bất kỳ ai có khả năng chỉnh sửa mã trong trình duyệt** (DevTools, gọi hàm trực tiếp). Đây là ràng buộc cấu trúc, không phải lỗi cài đặt riêng lẻ. Kết luận: mô hình bảo mật hiện tại chỉ có giá trị trình diễn, không thể triển khai như một hệ thống thật.
- Dữ liệu không bền vững: đăng ký học viên, tạo TNV, phiếu quan sát đều mất khi tải lại trang. Suy ra từ việc sessions và accounts nằm trong bộ nhớ. [Suy luận từ đọc mã — chưa chạy trong trình duyệt]

---

## 3. Phát hiện về bảo mật

Đánh giá mức độ theo khung OWASP Top 10 (OWASP Foundation, 2021) và hướng dẫn NIST về mật khẩu (NIST, 2017). [Cần bổ sung nguồn: xác minh URL chính thức trước khi trích dẫn trong ấn phẩm]

### 3.1 Nghiêm trọng

**S1. Mật khẩu quản trị và tình nguyện viên viết cứng trong mã nguồn phía client.** [Đọc mã + Thực nghiệm]
- `src/services/initAuth.ts:19,35,51,67`: `AdminSontra2026!`, `TnvKim2026!`, `TnvAn2026!`, `TnvBich2026!`.
- Thực nghiệm: đăng nhập `anhdnt@sontra.edu.vn` / `AdminSontra2026!` → HTTP 200, vai trò `admin`.
- Mật khẩu cũng xuất hiện trong `SecurityAuditPanel.tsx` và `AdminPortal.tsx:132` (giá trị mặc định `TnvSontra2026!`).
- Chú thích trong `initAuth.ts:5` nói "Tuyệt đối không lưu mật khẩu dạng rõ trong … mã nguồn" — **mâu thuẫn trực tiếp với chính mã**.
- Đối chiếu MASTER_SPEC §3.3: `ADMIN_PASSWORD` chỉ là biến môi trường bí mật, chỉ đọc khi chưa có tài khoản quản trị. Mã hiện tại không tuân thủ.

**S2. Đăng nhập Google không xác thực token.** [Thực nghiệm]
- `authService.loginOrRegisterGoogle()` nhận `profile.email` trực tiếp từ body, không kiểm tra chữ ký ID token của Google.
- Thực nghiệm: `POST /api/auth/google` với `email: anhdnt@sontra.edu.vn` và không có token → HTTP 200, vai trò `admin`.
- Hệ quả: bất kỳ email nào, kể cả của quản trị viên, có thể lấy phiên đăng nhập với đúng vai trò của tài khoản đó.

**S3. Đăng nhập học viên chỉ bằng mã số, không mật khẩu.** [Thực nghiệm]
- `loginLearner(code)` cấp phiên chỉ với `ST-HV-001`…`003`. Mã học viên được hiển thị công khai trong `initialData` và `authRepository.seedInitialData()`. Ai biết mã có thể vào hệ thống với vai trò học viên.
- Đối chiếu MASTER_SPEC §12.2: thiết kế đăng nhập học viên **"chưa có thiết kế được duyệt"**. Mã đã triển khai tính năng này.

### 3.2 Cao

**S4. Cho phép dò tìm tài khoản (account enumeration).** [Thực nghiệm]
- `authService.loginEmailPassword()` kiểm tra `active` **trước** khi kiểm tra mật khẩu (`authService.ts:298-303`).
- Kết quả: tài khoản vô hiệu hóa → HTTP 403 (không cần mật khẩu đúng); email không tồn tại → HTTP 401. Kẻ tấn công phân biệt được hai trạng thái.
- Khóa tạm (423) cũng được kiểm tra trước mật khẩu, nên có thể dùng để khóa tài khoản người khác (DoS).

**S5. Kiểm tra `Origin` có lỗ hổng so khớp chuỗi.** [Thực nghiệm]
- `authService.ts:58`: `origin.includes('run.app')`. Thực nghiệm: `https://evil-run.app.example.com` → được chấp nhận.
- Ngoài ra, nếu `Origin` vắng mặt, hàm trả về `true` (`authService.ts:51`).

**S6. Cookie phiên không thể bảo vệ bằng HttpOnly.** [Đọc mã]
- `App.tsx:155` và `App.tsx:84,188`: thao tác cookie bằng JavaScript. Chuỗi phiên có thể bị đọc bởi mọi mã chạy trên trang (XSS nếu xuất hiện).
- MASTER_SPEC §8.1 yêu cầu `HttpOnly; Secure; SameSite=Lax` — không đạt.

**S7. Không có kiểm soát đầu vào cho bài học.** [Thực nghiệm]
- `createLesson` với `correctChoice = 99` và chỉ 1 phương án trả lời → được chấp nhận (`lessonService.ts:163-178`). Quiz không được kiểm tra phạm vi.
- Video/âm thanh chỉ kiểm tra đuôi tệp và kích thước chuỗi, không kiểm tra chữ ký tệp (MASTER_SPEC §8.3 yêu cầu kiểm tra chữ ký, và ghi nhận là chưa triển khai).

### 3.3 Trung bình

**S8. Mật khẩu so sánh bằng `===`** (`crypto.ts:75`), không phải so sánh thời gian hằng số. Mức rủi ro thấp khi chạy trong trình duyệt, nhưng nên sửa nếu chuyển sang máy chủ.

**S9. Chính sách mật khẩu chỉ kiểm tra độ dài 10–200 ký tự.** Phù hợp với hướng dẫn NIST về độ dài tối thiểu, nhưng không kiểm tra mật khẩu phổ biến hay bị rò rỉ. [Cần bổ sung nguồn cụ thể cho khuyến nghị này]

**S10. Mã "Sơn Trà" tạo tài khoản với email mẫu của cơ quan.** `LoginModal.tsx:321-331` có nút đăng nhập "nhanh" gán email `@danang.gov.vn` và `@gmail.com` cho người dùng. Thực tế, đây là đăng nhập giả lập không có xác thực.

**S11. Lộ đáp án quiz trong gói client.** Toàn bộ `correctChoice` nằm trong bundle JavaScript (`initialData.ts`). Chấp nhận được với mục đích học tập không chính thức; không phù hợp nếu đánh giá có điểm.

---

## 4. Phát hiện về chức năng và lỗi logic

**F1. Học viên ST-HV-002 và ST-HV-003 bị đăng xuất ngay sau khi đăng nhập.** [Thực nghiệm: đăng nhập OK nhưng `/api/me` trả `authenticated=false`]
- Nguyên nhân: `authService.resolveSession()` chỉ tra `accounts`; học viên theo mã không có bản ghi trong `accounts`, nên rơi xuống nhánh **hard-code `ST-HV-001`** (`authService.ts:463`). Với học viên khác, hàm trả `null`.

**F2. Lịch sử thay đổi ghi nhận email quản trị viên cố định.** `AdminPortal.tsx:408` truyền chuỗi `'anhdnt@sontra.edu.vn'` thay vì người dùng đang đăng nhập.

**F3. Phiếu quan sát không được lưu.** [Thực nghiệm] `/api/assessment` trả 200 "Đã lưu phiếu…" nhưng không gọi bất kỳ repository nào (`apiRouter.ts:333-348`). Dữ liệu chỉ tồn tại trong React state và mất khi tải lại.

**F4. Bảng điều khiển tổng hợp là placeholder.** [Thực nghiệm] `/api/dashboard` chỉ trả `{success, message}` (`apiRouter.ts:363-367`). Chưa có số liệu thật, trong khi MASTER_SPEC §7 (quy tắc 4.6, 4.8) mô tả tính toán trước–sau. Hàm `filterEligibleLearnersForComparison` trong `utils/rules.ts` **không được gọi từ route** (`apiRouter.ts`); chỉ được gọi từ component phía giao diện. [Đọc mã + grep]

**F5. Điều kiện `|| true` vô hiệu hóa tham số.** `apiRouter.ts:386`: `includeDeleted = header === 'true' || true` — luôn bằng `true`. Hiện an toàn vì `assertAdmin` chặn trước, nhưng đây là mã gây hiểu nhầm và có thể làm lộ bài đã xóa mềm nếu quyền kiểm tra bị gỡ.

**F6. Dữ liệu tin tức "chính thức" được bịa khi cào thất bại.** Đây là phát hiện nghiêm trọng về tính toàn vẹn thông tin:
- Khi `fetch` thất bại, `newsCrawlerService.ts:318-323` tự động thay bằng `getOfficialFailoverFeed()` — **năm bài viết viết cứng** với URL `sontra.danang.gov.vn/chi-tiet-tin/...` và ngày `2026-10-28` đến `2026-11-01` (`newsCrawlerService.ts:214-252`).
- Thực nghiệm: `syncNewsFromSonTra()` trả về `source: "Snapshot Feed - Dự phòng kết nối"`, thêm 5 bài, và `newsRepository.ts:206` gán `created_by: 'Cổng TTĐT Sơn Trà (Tự động cào)'`, `source: 'sontra_gov'`.
- **Hệ quả:** người dùng thấy các tin được gắn nhãn là từ cổng chính thức của UBND quận, nhưng nội dung không đến từ cổng đó. Không xác minh được URL và nội dung. [Đọc mã + Thực nghiệm]
- Đối chiếu MASTER_SPEC §12.6: FR-NEWS-03 (tự động cào) **"chưa thực hiện. Nguồn chưa cho phép truy cập tự động"**. Mã đã có hàm cào và dữ liệu dự phòng — mâu thuẫn với đặc tả.
- Ghi chú về trình duyệt: `fetch` từ trang khác tên miền sẽ bị chặn bởi CORS trừ khi máy chủ đích cho phép. [Suy luận — chưa kiểm chứng trên trình duyệt thật]. Trong mọi trường hợp, `cheerio` (thư viện dành cho Node) đang được đóng gói vào bundle của trình duyệt.

**F7. Mất phiên khi tải lại trang.** [Suy luận từ đọc mã] `App.tsx:74-87` đọc cookie, gọi `resolveSession`, nhưng `sessions` nằm trong bộ nhớ và đã trống sau khi tải lại → cookie bị xóa và người dùng bị đăng xuất.

**F8. Hàm `updateStaffProfile` chỉ chặn một số trường.** Kiểm tra `attempted*` là tốt, nhưng `phone` và `organization` không được chuẩn hóa độ dài hay định dạng.

---

## 5. Đối chiếu mã với MASTER_SPEC (mâu thuẫn quan trọng)

Đây là phát hiện có tác động lớn nhất đến việc **hiểu đúng dự án**. [Đọc mã + đọc đặc tả]

| Hạng mục | MASTER_SPEC mô tả | Mã trong zip |
|---|---|---|
| Framework | Next.js 16 + vinext + Cloudflare Workers | Vite 8 + React SPA |
| CSDL | Cloudflare D1 (SQLite), chuyển sang Neon PostgreSQL | Map trong bộ nhớ |
| Route API | `route.ts`, `env.DB`, `cloudflare:workers` | `apiRouter.ts` gọi trực tiếp, không có `route.ts` |
| Lưu tệp | R2 + presigned URL | Chuỗi base64 trong bài học |
| Thư mục `shared/`, `drizzle/`, `tests/` | Có mô tả | **Không có trong zip** |
| Đăng nhập học viên | "Chưa có thiết kế được duyệt" | Đã triển khai ba cách |
| Tự cào tin | "Chưa thực hiện" | Có hàm cào và dữ liệu dự phòng |
| Mật khẩu bootstrap | Biến môi trường | Viết cứng trong mã |

**Kết luận đọc mã:** zip này có thể là một **phiên bản khác** (sinh từ AI Studio) của cùng dự án, không phải bản đang được mô tả trong MASTER_SPEC. Cần xác nhận với người phụ trách trước khi đưa ra khuyến nghị kiến trúc. Đây là câu hỏi quan trọng nhất (xem mục 8).

---

## 6. Tối ưu và chất lượng mã

**Đã kiểm chứng [Thực nghiệm]:**
- `tsc --noEmit` với lockfile Bun: **đạt, 0 lỗi**.
- `vite build`: **thành công**. JS 766 KB (gzip 225 KB), cảnh báo chunk > 500 KB.
- `npm install` (theo `package.json`, không lockfile): **thất bại ERESOLVE** — `esbuild@^0.25.0` (devDependency) xung đột với peer của `vite@8.3.5` yêu cầu `^0.27 || ^0.28`. Lockfile Bun hoạt động vì đã ghim phiên bản. Người dùng dùng npm sẽ gặp lỗi ngay khi cài đặt.

**Phụ thuộc không dùng** [Thực nghiệm: không có tệp `src/` nào import]: `express`, `dotenv`, `tsx`, `esbuild`, `motion`, `@google/genai`, `autoprefixer`. Riêng `@google/genai` cùng với `GEMINI_API_KEY` trong README và `.env.example` là dấu vết của mã AI Studio cũ, không có tác dụng.

**Khuyến nghị tối ưu (theo thứ tự ưu tiên):**
1. **Tách `cheerio` và `newsCrawlerService` khỏi bundle trình duyệt.** [Thực nghiệm: `cheerio` có trong `dist/assets/*.js`; chuỗi dữ liệu cào xuất hiện trong bundle] Phần này chỉ có ý nghĩa phía máy chủ. Mức giảm kích thước chưa đo.
2. **Chia nhỏ bundle** bằng `import()` động cho `AdminPortal` (phần lớn nhất, ~114 KB mã nguồn).
3. **Xóa mã chết:** `SecurityAuditPanel.tsx`, `TechnicalSpecModal.tsx` (đặc biệt vì chứa mật khẩu).
4. **Xóa phụ thuộc không dùng** và sửa script `clean` (tham chiếu `server.js` không tồn tại).
5. **Bật `"strict": true`** trong `tsconfig.json`. Hiện tại `tsc` không bắt được nhiều lỗi kiểu, vì chế độ strict đang tắt.
6. **Sửa `<html lang="en">` thành `lang="vi"`** trong `index.html`. Ảnh hưởng đến trình đọc màn hình và SEO.
7. **Thêm kiểm thử.** Script `test` chỉ chạy `tsc`, không có tệp kiểm thử nào trong repo. Ưu tiên kiểm thử `authService` và `rules.ts` (hàm thuần, dễ kiểm thử).

**Về kiến trúc (quan trọng hơn tối ưu cục bộ):**
- Tầng `apiRouter` là một điểm tốt: tách được route khỏi nghiệp vụ. Nếu chuyển sang máy chủ thật, phần này có thể giữ nguyên, chỉ thay repository bằng adapter gọi CSDL.
- `authRepository` đã có interface `IAuthRepository`, nhưng `lessonRepository` và `newsRepository` gắn trực tiếp với `InMemory*`. Nên thống nhất.
- Các `setState` trong `App.tsx` đang giữ cả logic nghiệp vụ (ví dụ `handleUpdateLesson` tạo bản sao lịch sử). Nên chuyển logic này xuống service, như mục tiêu kiến trúc đã nêu.

---

## 7. Điểm mạnh (ghi nhận công bằng)

- Có chủ đích rõ ràng về băm mật khẩu (PBKDF2-SHA256, 100.000 vòng, muối ngẫu nhiên 16 byte) và token phiên 256 bit lưu dưới dạng băm SHA-256.
- Có kiểm tra tài khoản giả khi email không tồn tại (`dummy-pwd`, `authService.ts:281`), giảm chênh lệch thời gian khi dò tìm.
- Logic khóa tạm sau 5 lần sai được triển khai đúng ngưỡng 15 phút.
- Quy tắc nghiệp vụ được ghi chú theo mã hiệu (4.1, 4.2, 4.6, 4.12…) và liên kết với đặc tả.
- `rules.ts` là hàm thuần, dễ kiểm thử.
- Lịch sử phiên bản bài học và xóa mềm được thiết kế đúng hướng bảo toàn tham chiếu.

---

## 8. Câu hỏi cần làm rõ trước khi đi tiếp

Theo phương pháp làm việc của bạn, các câu sau cần được trả lời trước khi viết mã sửa lỗi:

1. **Zip này có phải là bản đang triển khai không?** MASTER_SPEC mô tả Next.js + D1/PostgreSQL + Vercel, khác hẳn zip. Nếu zip là bản thử nghiệm AI Studio, khuyến nghị sẽ khác.
2. **Mục tiêu của bản này là trình diễn hay vận hành thật?** Mức độ nghiêm trọng của S1–S3 phụ thuộc hoàn toàn vào câu trả lời.
3. **Đăng nhập học viên theo mã có được phép tồn tại không?** MASTER_SPEC §12.2 ghi chưa có thiết kế được duyệt.
4. **Tin tức có được phép hiển thị dữ liệu dự phòng không?** Nếu không, cần xóa `getOfficialFailoverFeed` và hiển thị lỗi thật.
5. **Tiêu chí đánh giá (metrics) của dashboard là gì?** Đặc tả có quy tắc 4.6 nhưng chưa có công thức đầy đủ trong mã.

---

## 9. Thứ tự khuyến nghị

| Ưu tiên | Việc | Mức |
|---|---|---|
| 1 | Gỡ toàn bộ mật khẩu viết cứng (S1), xóa `SecurityAuditPanel`, không prefill mật khẩu trong `AdminPortal` | Khẩn |
| 2 | Vô hiệu hóa đăng nhập Google giả (S2) hoặc xác minh ID token phía máy chủ | Khẩn |
| 3 | Xác nhận kiến trúc mục tiêu (mục 8, câu 1–2) trước mọi thay đổi khác | Trước khi làm |
| 4 | Sửa F1 (học viên theo mã bị đăng xuất) và F7 (mất phiên khi tải lại) | Cao |
| 5 | Dừng gắn nhãn dữ liệu dự phòng là "Cổng TTĐT Sơn Trà" (F6) | Cao |
| 6 | Sửa lỗi cài đặt npm (esbuild) và bật `strict` | Trung bình |
| 7 | Tối ưu bundle (cheerio, code-splitting) | Thấp |
| 8 | Bổ sung kiểm thử cho `authService` và `rules.ts` | Thấp |

---

## 10. Hạn chế của phân tích

- Chưa đọc đầy đủ `AdminPortal.tsx`, `LearnerPortal.tsx`, `AssessmentPortal.tsx`. Kết quả với các tệp này dựa trên tìm kiếm mẫu.
- Chưa kiểm tra trên trình duyệt thật: CORS với `sontra.danang.gov.vn`, lưu trữ cookie, hành vi tải lại trang.
- Chưa kiểm tra giao diện trên điện thoại (360 px).
- Không có truy cập mạng ra ngoài để xác minh nội dung tin tức của cổng Sơn Trà.

---

## Tài liệu tham khảo

OWASP Foundation. (2021). *OWASP Top Ten*. https://owasp.org/Top10/ [Cần bổ sung: xác minh URL trước khi trích dẫn chính thức]

National Institute of Standards and Technology. (2017). *Digital identity guidelines: Authentication and lifecycle management* (NIST Special Publication 800-63B). https://pages.nist.gov/800-63-3/ [Cần bổ sung: xác minh URL và số phiên bản hiện hành]

Tài liệu nội bộ: *MASTER SYSTEM PROMPT & SPECIFICATION — Ứng dụng Chuyển đổi số Sơn Trà*, `public/assets/aistudio/MASTER_SPEC_SON_TRA_SO_d7642915.md`.
