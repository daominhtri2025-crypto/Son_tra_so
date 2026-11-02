<?php

declare(strict_types=1);

/**
 * Bộ kiểm thử không phụ thuộc PHPUnit: đơn vị (quy tắc thuần) + tích hợp (Router thật trên CSDL).
 * Chạy: php tests/run.php   — CHỈ chạy trên CSDL có tên kết thúc bằng "_test" (dữ liệu bị xóa sạch).
 */

require __DIR__ . '/../bootstrap.php';

use SonTra\Domain\Rules;
use SonTra\Http\Container;
use SonTra\Http\Request;
use SonTra\Http\Response;
use SonTra\Http\Router;
use SonTra\Http\Routes;
use SonTra\Http\Security;
use SonTra\Services\MediaService;
use SonTra\Services\NewsService;
use SonTra\Support\Database;
use SonTra\Support\Env;
use SonTra\Support\HttpException;

$failures = [];
$passes = 0;
function check(bool $ok, string $label): void
{
    global $failures, $passes;
    if ($ok) {
        $passes++;
        echo "  ✓ {$label}\n";
    } else {
        $failures[] = $label;
        echo "  ✗ {$label}\n";
    }
}

// ----------------------------------------------------------------- Đơn vị
echo "[Đơn vị] Quy tắc nghiệp vụ\n";
$p = Rules::mergeProgress(['is_read' => 1, 'is_done' => 1, 'score' => 0, 'completed_at' => '2026-01-01 00:00:00'],
    ['read' => 0, 'done' => 0, 'score' => 1], '2026-02-01 00:00:00');
check($p['is_done'] === 1 && $p['is_read'] === 1 && $p['score'] === 1, 'Quy tắc 4.1: done không bị hạ, score tăng');
check($p['completed_at'] === '2026-01-01 00:00:00', 'Quy tắc 4.1: giữ nguyên thời điểm hoàn thành cũ');
$p2 = Rules::mergeProgress(null, ['read' => 1, 'done' => 1, 'score' => 0], '2026-02-01 00:00:00');
check($p2['completed_at'] === '2026-02-01 00:00:00', 'Hoàn thành lần đầu ghi nhận thời điểm');

$full = [1 => 3, 2 => 3, 3 => 3, 4 => 3, 5 => 3];
$partial = [1 => 3, 2 => null, 3 => 3, 4 => 3, 5 => 3];
$rows = [
    ['learner_id' => 'L1', 'phase' => 'pre', 'scores' => $full, 'created_at' => '2026-01-01 00:00:00'],
    ['learner_id' => 'L1', 'phase' => 'post', 'scores' => $full, 'created_at' => '2026-02-01 00:00:00'],
    ['learner_id' => 'L2', 'phase' => 'pre', 'scores' => $partial, 'created_at' => '2026-01-01 00:00:00'],
    ['learner_id' => 'L2', 'phase' => 'post', 'scores' => $full, 'created_at' => '2026-02-01 00:00:00'],
];
$pairs = Rules::eligiblePairs($rows);
check(isset($pairs['L1']) && !isset($pairs['L2']), 'Quy tắc 4.6: chỉ học viên đủ 5 nhiệm vụ ở cả hai lần đo');

$quiz = Rules::normalizeQuiz(['question' => 'Câu hỏi thử nghiệm?', 'options' => ['A', ' B ', ''], 'correctChoice' => '1']);
check($quiz['options'] === ['A', 'B'] && $quiz['correctChoice'] === 1, 'Quiz: lọc phương án rỗng, chuẩn hóa đáp án');
$bad = false;
try { Rules::normalizeQuiz(['question' => 'Câu hỏi thử?', 'options' => ['A', 'B'], 'correctChoice' => 9]); }
catch (HttpException $e) { $bad = $e->status === 400; }
check($bad, 'Quiz: đáp án ngoài phạm vi bị từ chối (lỗi S7 đã sửa)');

echo "[Đơn vị] Chữ ký tệp đa phương tiện (đặc tả 8.3)\n";
check(MediaService::detectExtension('video', "\x00\x00\x00\x18ftypmp42") === 'mp4', 'MP4 nhận diện bằng ftyp');
check(MediaService::detectExtension('video', "\x1A\x45\xDF\xA3\x00") === 'webm', 'WebM nhận diện bằng EBML');
check(MediaService::detectExtension('video', '<html>') === null, 'HTML giả danh video bị từ chối');
check(MediaService::detectExtension('audio', 'ID3\x04') === 'mp3', 'MP3 có thẻ ID3');
check(MediaService::detectExtension('audio', "RIFF\x00\x00\x00\x00WAVE") === 'wav', 'WAV nhận diện bằng RIFF/WAVE');
check(MediaService::detectExtension('audio', 'OggS') === 'ogg', 'OGG nhận diện bằng OggS');
check(MediaService::detectExtension('audio', 'MZ\x90\x00') === null, 'Tệp thực thi đổi tên thành .mp3 bị từ chối');

echo "[Đơn vị] Phân tích tin nổi bật (không truy cập mạng)\n";
$html = '<div class="tin-noi-bat"><a href="/chi-tiet/tin-1">UBND quận triển khai chương trình số hóa cộng đồng</a>'
    . '<a href="#">Xem thêm mục này nhé các bạn</a><a href="/chi-tiet/tin-1">Trùng liên kết cũ</a></div>';
$parsed = (new NewsService(new \SonTra\Repositories\NewsRepository()))->parseFeatured($html, 'https://sontra.danang.gov.vn/');
check(count($parsed) === 1 && $parsed[0]['url'] === 'https://sontra.danang.gov.vn/chi-tiet/tin-1', 'Parser: chuẩn hóa URL, bỏ liên kết # và trùng');

// ----------------------------------------------------------------- Tích hợp
$dbName = Env::get('DB_NAME');
if (!str_ends_with($dbName, '_test')) {
    echo "\nBỏ qua kiểm thử tích hợp: DB_NAME phải kết thúc bằng _test (hiện: {$dbName}).\n";
    exit(1);
}

echo "[Tích hợp] Đặt lại CSDL kiểm thử\n";
$pdo = Database::connection();
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach (['sessions', 'rate_limits', 'learner_progress', 'assessments', 'lesson_versions', 'lessons', 'news', 'accounts'] as $t) {
    $pdo->exec("TRUNCATE TABLE {$t}");
}
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
$pdo->exec("INSERT INTO accounts (id,email,full_name,role,auth_provider,password_hash,active,must_change,failed_attempts,created_at,updated_at)
  VALUES ('acc-admin-t','admin@t.test','Quản trị Kiểm thử','admin','local','" . password_hash('AdminPass2026!', PASSWORD_DEFAULT) . "',1,0,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())");
passthru(PHP_BINARY . ' ' . escapeshellarg(__DIR__ . '/../bin/seed.php') . ' > /dev/null');

$router = new Router();
$container = new Container();
Routes::register($router, $container);

/** @return Response */
function call(Router $router, string $method, string $path, array $body = [], ?string $cookie = null, array $headers = [], string $ip = '10.0.0.1'): Response
{
    $defaults = ['content-type' => 'application/json'];
    $request = new Request($method, $path, [], $body, $headers + $defaults, $cookie ? ['st_session' => $cookie] : [], $ip);
    try {
        Security::guard($request);
        return $router->dispatch($request);
    } catch (HttpException $e) {
        return Response::json($e->status, ['error' => $e->getMessage()]);
    }
}
function cookieFrom(Response $r): ?string
{
    $sc = $r->headers['Set-Cookie'] ?? '';
    return preg_match('/st_session=([0-9a-f]{64})/', $sc, $m) ? $m[1] : null;
}

echo "[Tích hợp] Đăng nhập và phiên\n";
$r = call($router, 'POST', '/auth/login', ['email' => 'admin@t.test', 'password' => 'SaiMatKhau!!']);
check($r->status === 401 && cookieFrom($r) === null, 'Sai mật khẩu → 401, không cấp phiên');
$r = call($router, 'POST', '/auth/login', ['email' => 'admin@t.test', 'password' => 'AdminPass2026!'], null, [], '10.0.0.2');
$adminCookie = cookieFrom($r);
check($r->status === 200 && $adminCookie !== null, 'Đăng nhập đúng → 200, cookie 256-bit');
check(str_contains($r->headers['Set-Cookie'], 'HttpOnly') && str_contains($r->headers['Set-Cookie'], 'SameSite=Lax'), 'Cookie có HttpOnly và SameSite=Lax');
$me = call($router, 'GET', '/me', [], $adminCookie);
check(($me->body['authenticated'] ?? false) === true && $me->body['user']['role'] === 'admin', '/me trả về phiên hợp lệ');
$stored = $pdo->query("SELECT token_hash FROM sessions WHERE token_hash = '" . hash('sha256', $adminCookie) . "'")->fetchColumn();
check($stored !== false, 'CSDL chỉ lưu SHA-256 của token (không lưu token gốc)');

echo "[Tích hợp] Khóa tạm sau 5 lần sai\n";
for ($i = 1; $i <= 4; $i++) {
    call($router, 'POST', '/auth/login', ['email' => 'admin@t.test', 'password' => 'x'], null, [], '10.0.1.' . $i);
}
$r5 = call($router, 'POST', '/auth/login', ['email' => 'admin@t.test', 'password' => 'x'], null, [], '10.0.1.9');
check($r5->status === 423, 'Lần sai thứ 5 → 423 khóa 15 phút');
$rOk = call($router, 'POST', '/auth/login', ['email' => 'admin@t.test', 'password' => 'AdminPass2026!'], null, [], '10.0.1.10');
check($rOk->status === 423, 'Đang khóa → mật khẩu đúng vẫn bị 423');
$pdo->exec("UPDATE accounts SET locked_until = NULL, failed_attempts = 0 WHERE id = 'acc-admin-t'");

echo "[Tích hợp] Bảo vệ CSRF\n";
$r = call($router, 'POST', '/lessons', [], null, ['origin' => 'https://evil.example'], '10.0.2.1');
check($r->status === 403, 'Origin lạ → 403');
$r = call($router, 'POST', '/auth/login', ['email' => 'a@b.c', 'password' => 'x'], null, ['content-type' => 'text/plain'], '10.0.2.2');
check($r->status === 415, 'Yêu cầu ghi không phải JSON → 415');

echo "[Tích hợp] Đăng ký học viên và mã học viên\n";
$r = call($router, 'POST', '/auth/register', ['email' => 'hv1@t.test', 'password' => 'HocVien2026!!', 'fullName' => 'Bác Thử Nghiệm'], null, [], '10.0.3.1');
$lrn1Cookie = cookieFrom($r);
check($r->status === 201 && ($r->body['user']['code'] ?? '') === 'ST-HV-001', 'Đăng ký → 201, mã ST-HV-001');
$r = call($router, 'POST', '/auth/register', ['email' => 'hv2@t.test', 'password' => 'HocVien2026!!', 'fullName' => 'Cô Thử Hai'], null, [], '10.0.3.2');
check(($r->body['user']['code'] ?? '') === 'ST-HV-002', 'Mã học viên tăng tuần tự ST-HV-002');
$r = call($router, 'POST', '/auth/login', ['type' => 'learner', 'code' => 'ST-HV-002'], null, [], '10.0.3.3');
check($r->status === 400, 'Đăng nhập bằng mã học viên (không mật khẩu) bị từ chối (lỗi S3 đã sửa)');
$me = call($router, 'GET', '/me', [], $lrn1Cookie);
check(($me->body['authenticated'] ?? false) === true, 'Học viên giữ được phiên sau khi đăng nhập (lỗi F1 đã sửa)');

echo "[Tích hợp] Tiến độ học viên\n";
$r = call($router, 'PUT', '/progress', ['lesson' => 0, 'read' => 1, 'done' => 1, 'score' => 0], $lrn1Cookie, [], '10.0.4.1');
check($r->status === 200 && $r->body['progress']['done'] === 1, 'Ghi tiến độ bài 0 → done');
$r = call($router, 'PUT', '/progress', ['lesson' => 0, 'read' => 0, 'done' => 0, 'score' => 1], $lrn1Cookie, [], '10.0.4.1');
check($r->body['progress']['done'] === 1 && $r->body['progress']['score'] === 1, 'Gửi lại tiến độ cũ không hạ được done (Quy tắc 4.1)');
$r = call($router, 'PUT', '/progress', ['lesson' => 0, 'read' => 1], $adminCookie);
check($r->status === 403, 'Quản trị viên không ghi được tiến độ học viên');

echo "[Tích hợp] Bài học\n";
$r = call($router, 'GET', '/lessons', []);
$visibleCount = count($r->body['lessons']);
check($visibleCount === 9, 'Khách xem được 9 bài đã seed');
$r = call($router, 'POST', '/admin/lessons/0/toggle', [], $adminCookie, [], '10.0.5.1');
check($r->status === 200 && $r->body['lesson']['hidden'] === 1, 'Ẩn bài 0');
$r = call($router, 'GET', '/lessons', []);
check(count($r->body['lessons']) === 8, 'Học viên không thấy bài đã ẩn');
$r = call($router, 'PUT', '/admin/lessons/0', ['title' => 'Tiêu đề mới của bài 0'], $adminCookie, [], '10.0.5.2');
check($r->status === 200, 'Sửa bài 0');
$savedBy = $pdo->query("SELECT saved_by FROM lesson_versions WHERE lesson_no = 0 ORDER BY id DESC LIMIT 1")->fetchColumn();
check($savedBy === 'admin@t.test', 'Sửa nội dung lưu phiên bản cũ kèm người lưu (Quy tắc 4.4)');
$r = call($router, 'PUT', '/admin/lessons/0', ['quiz' => ['question' => 'Câu hỏi hợp lệ?', 'options' => ['A', 'B'], 'correctChoice' => 5]], $adminCookie, [], '10.0.5.3');
check($r->status === 400, 'Sửa quiz với đáp án ngoài phạm vi → 400');
$r = call($router, 'DELETE', '/admin/lessons/0', [], $adminCookie, [], '10.0.5.4');
check($r->status === 200 && $r->body['lesson']['deleted_at'] !== null, 'Xóa mềm bài 0');
$r = call($router, 'GET', '/admin/lessons', [], $adminCookie, [], '10.0.5.5');
check(count($r->body['lessons']) === 9, 'Quản trị viên vẫn thấy bài đã xóa mềm');
$r = call($router, 'POST', '/admin/lessons/0/restore', [], $adminCookie, [], '10.0.5.6');
check($r->status === 200 && $r->body['lesson']['deleted_at'] === null, 'Khôi phục bài 0');

echo "[Tích hợp] Tình nguyện viên và phiếu quan sát\n";
$r = call($router, 'POST', '/admin/volunteers', ['email' => 'tnv1@t.test', 'fullName' => 'TNV Một Thử', 'initialPassword' => 'TnvMotPass2026!'], $adminCookie, [], '10.0.6.1');
check($r->status === 201 && $r->body['volunteer']['mustChange'] === 1, 'Tạo TNV mới bắt buộc đổi mật khẩu');
$tnvId = $r->body['volunteer']['id'];
$r = call($router, 'POST', '/assessments', ['learner' => 'acc-lrn-x', 'phase' => 'pre', 'scores' => ['task1' => 1], 'clientId' => 'client-0001'], $adminCookie, [], '10.0.6.2');
check($r->status === 404, 'Phiếu cho ID không phải học viên → 404');
$lrn1Id = $pdo->query("SELECT id FROM accounts WHERE email = 'hv1@t.test'")->fetchColumn();
$r = call($router, 'POST', '/auth/login', ['email' => 'tnv1@t.test', 'password' => 'TnvMotPass2026!'], null, [], '10.0.6.3');
$tnvCookie = cookieFrom($r);
$r = call($router, 'POST', '/assessments', ['learner' => $lrn1Id, 'phase' => 'pre', 'scores' => ['task1' => 2], 'clientId' => 'client-0002'], $tnvCookie, [], '10.0.6.4');
check($r->status === 403, 'TNV còn must_change=1 không được ghi phiếu (Quy tắc 4.12)');
$r = call($router, 'POST', '/auth/change-password', ['newPassword' => 'TnvMoi2026!!'], $tnvCookie, [], '10.0.6.5');
$tnvCookie = cookieFrom($r) ?? $tnvCookie;
check($r->status === 200 && $r->body['user']['mustChange'] === 0, 'TNV đổi mật khẩu bắt buộc thành công');
$payload = ['learner' => $lrn1Id, 'phase' => 'pre', 'scores' => ['task1' => 2, 'task2' => 3, 'task3' => null, 'task4' => 1, 'task5' => 0], 'clientId' => 'client-0003'];
$r = call($router, 'POST', '/assessments', $payload, $tnvCookie, [], '10.0.6.6');
check($r->status === 201 && $r->body['assessment']['scores']['task3'] === null, 'Lưu phiếu, điểm null giữ nguyên (Quy tắc 4.2)');
$r = call($router, 'POST', '/assessments', $payload, $tnvCookie, [], '10.0.6.7');
check($r->status === 200 && $r->body['assessment']['client_id'] === 'client-0003', 'Gửi lại cùng client_id không tạo trùng (Quy tắc 4.3)');
$count = $pdo->query("SELECT COUNT(*) FROM assessments WHERE client_id = 'client-0003'")->fetchColumn();
check((int) $count === 1, 'CSDL chỉ có một phiếu sau khi gửi lại');
$r = call($router, 'POST', '/assessments', ['learner' => $lrn1Id, 'phase' => 'pre', 'scores' => ['task1' => 9], 'clientId' => 'client-0004'], $tnvCookie, [], '10.0.6.8');
check($r->status === 400, 'Điểm ngoài 0–5 bị từ chối');
$r = call($router, 'GET', '/dashboard', [], $tnvCookie, [], '10.0.6.9');
check($r->status === 403, 'TNV không xem được bảng tổng hợp (Quy tắc 4.8)');
$r = call($router, 'PUT', '/admin/accounts/' . $tnvId, ['active' => false], $adminCookie, [], '10.0.6.10');
check($r->status === 200, 'Quản trị viên vô hiệu hóa TNV');
$r = call($router, 'GET', '/me', [], $tnvCookie, [], '10.0.6.11');
check(($r->body['authenticated'] ?? true) === false, 'Vô hiệu hóa TNV làm mất phiên ngay lập tức');
$r = call($router, 'PUT', '/admin/accounts/acc-admin-t', ['active' => false], $adminCookie, [], '10.0.6.12');
check($r->status === 403, 'Không thể vô hiệu hóa Quản trị viên');

echo "[Tích hợp] Bảng tổng hợp\n";
$r = call($router, 'GET', '/dashboard', [], $adminCookie, [], '10.0.7.1');
check($r->status === 200 && $r->body['summary']['assessmentCount'] === 1, 'Quản trị viên xem bảng tổng hợp');

echo "[Tích hợp] Tin tức\n";
$r = call($router, 'POST', '/admin/news/sync', [], $adminCookie, [], '10.0.8.1');
check($r->status === 403 && str_contains($r->body['error'], 'tắt'), 'Đồng bộ tự động đang tắt → 403 có thông báo rõ');
$r = call($router, 'POST', '/admin/news', ['title' => 'Bản tin thử nghiệm đầu tiên', 'summary' => 'Tóm tắt thử nghiệm', 'sourceUrl' => 'https://sontra.danang.gov.vn/tin-thu'], $adminCookie, [], '10.0.8.2');
check($r->status === 201 && $r->body['news']['source'] === 'manual', 'Đăng tin thủ công');
$r = call($router, 'POST', '/admin/news', ['title' => 'Bản tin thử nghiệm đầu tiên', 'summary' => 'Tóm tắt thử nghiệm', 'sourceUrl' => 'https://sontra.danang.gov.vn/tin-thu'], $adminCookie, [], '10.0.8.3');
check($r->status === 409, 'Trùng liên kết nguồn → 409');
$newsId = $r->body['news']['id'] ?? (int) $pdo->query('SELECT id FROM news LIMIT 1')->fetchColumn();
call($router, 'POST', "/admin/news/{$newsId}/toggle", [], $adminCookie, [], '10.0.8.4');
$r = call($router, 'GET', '/news', []);
check(count($r->body['news']) === 0, 'Tin đã ẩn không hiển thị với khách');

echo "[Tích hợp] Đăng nhập Google\n";
$r = call($router, 'POST', '/auth/google', ['credential' => 'eyJhbGciOi.fake.token'], null, [], '10.0.9.1');
check($r->status === 503, 'Chưa cấu hình GOOGLE_CLIENT_ID → 503 (không chấp nhận thông tin tự khai)');

// ----------------------------------------------------------------- Kết quả
echo "\n" . ($failures === [] ? "TẤT CẢ ĐẠT" : "CÓ LỖI") . ": {$passes} đạt, " . count($failures) . " lỗi.\n";
foreach ($failures as $f) {
    echo "  - {$f}\n";
}
exit($failures === [] ? 0 : 1);
