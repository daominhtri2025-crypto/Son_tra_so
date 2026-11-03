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
use SonTra\Support\Mailer;
use SonTra\Services\PasswordBreachChecker;

/** Thư giả: ghi lại thư gửi đi để kiểm thử liên kết khôi phục. */
final class FakeMailer implements Mailer
{
    /** @var list<array{to:string, subject:string, body:string}> */
    public array $sent = [];

    public function send(string $to, string $subject, string $body): bool
    {
        $this->sent[] = ['to' => $to, 'subject' => $subject, 'body' => $body];
        return true;
    }
}

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

echo "[Đơn vị] Chữ ký tệp âm thanh (đặc tả 8.3); video không tải lên\n";
check(MediaService::detectExtension('audio', 'ID3\x04') === 'mp3', 'MP3 có thẻ ID3');
check(MediaService::detectExtension('audio', "RIFF\x00\x00\x00\x00WAVE") === 'wav', 'WAV nhận diện bằng RIFF/WAVE');
check(MediaService::detectExtension('audio', 'OggS') === 'ogg', 'OGG nhận diện bằng OggS');
check(MediaService::detectExtension('audio', 'MZ\x90\x00') === null, 'Tệp thực thi đổi tên thành .mp3 bị từ chối');
check(MediaService::detectExtension('audio', '<html>') === null, 'HTML giả danh âm thanh bị từ chối');
$videoRejected = false;
try { (new MediaService())->store('video', '/nonexistent', 'bai.mp4'); }
catch (HttpException $e) { $videoRejected = $e->status === 400 && str_contains($e->getMessage(), 'YouTube'); }
check($videoRejected, 'Tải video lên bị từ chối, hướng dẫn dùng liên kết YouTube');

echo "[Đơn vị] Đọc nguồn RSS/Atom (không truy cập mạng)\n";
$news = new NewsService(new \SonTra\Repositories\NewsRepository());
$rss = '<?xml version="1.0"?><rss version="2.0"><channel><title>Nguồn</title>'
    . '<item><title>Thông báo kiểm thử đầu tiên</title><link>https://nguon.example/tin-1</link><description>&lt;p&gt;Tóm tắt&lt;/p&gt;</description><pubDate>Mon, 02 Nov 2026 08:00:00 GMT</pubDate></item>'
    . '<item><title>Tin thứ hai đủ dài để hợp lệ</title><link>/tin-2</link><description>Mô tả</description></item>'
    . '<item><title>ngắn</title><link>https://nguon.example/tin-3</link></item></channel></rss>';
$items = $news->parseFeed($rss, 'https://nguon.example/rss');
check(count($items) === 2 && $items[0]['url'] === 'https://nguon.example/tin-1', 'RSS 2.0: đọc tiêu đề, liên kết, bỏ tin quá ngắn');
check($items[0]['summary'] === 'Tóm tắt' && $items[0]['published'] === '2026-11-02 08:00:00', 'RSS: làm sạch HTML trong tóm tắt, đọc ngày đăng');
check($items[1]['url'] === 'https://nguon.example/tin-2', 'RSS: liên kết tương đối được chuyển thành tuyệt đối');
$atom = '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Bản tin Atom thử nghiệm</title>'
    . '<link rel="alternate" href="https://nguon.example/atom-1"/><summary>Tóm tắt Atom</summary><updated>2026-10-30T10:00:00Z</updated></entry></feed>';
$atomItems = $news->parseFeed($atom, 'https://nguon.example/atom');
check(count($atomItems) === 1 && $atomItems[0]['url'] === 'https://nguon.example/atom-1', 'Atom: đọc liên kết alternate và tóm tắt');
check($news->parseFeed('<html><body>không phải feed</body></html>', 'https://x.example') === [], 'Trang HTML không phải feed: không lưu gì');

// ----------------------------------------------------------------- Tích hợp
$dbName = Env::get('DB_NAME');
if (!str_ends_with($dbName, '_test')) {
    echo "\nBỏ qua kiểm thử tích hợp: DB_NAME phải kết thúc bằng _test (hiện: {$dbName}).\n";
    exit(1);
}

echo "[Tích hợp] Đặt lại CSDL kiểm thử\n";
$pdo = Database::connection();
\SonTra\Support\Schema::apply($pdo); // bảo đảm đủ bảng, kể cả CSDL mới tạo
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach (['password_resets', 'sessions', 'rate_limits', 'learner_progress', 'assessments', 'lesson_versions', 'lessons', 'news', 'accounts'] as $t) {
    $pdo->exec("TRUNCATE TABLE {$t}");
}
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
$pdo->exec("INSERT INTO accounts (id,email,full_name,role,auth_provider,password_hash,active,must_change,failed_attempts,created_at,updated_at)
  VALUES ('acc-admin-t','admin@t.test','Quản trị Kiểm thử','admin','local','" . password_hash('AdminPass2026!', PASSWORD_DEFAULT) . "',1,0,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())");
passthru(PHP_BINARY . ' ' . escapeshellarg(__DIR__ . '/../bin/seed.php') . ' > /dev/null');

$router = new Router();
$container = new Container();
$mailer = new FakeMailer();
$container->override(Mailer::class, $mailer);
// Không gọi mạng trong kiểm thử: mọi mật khẩu được coi là chưa bị rò rỉ, trừ khi kiểm thử nói khác.
$breach = new PasswordBreachChecker(static fn(string $prefix): ?string => '');
$container->override(PasswordBreachChecker::class, $breach);
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
check($r->body['progress']['done'] === 1 && $r->body['progress']['score'] === 0, 'Gửi lại tiến độ không hạ được done; score từ client bị bỏ qua');
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

echo "[Tích hợp] Video bằng liên kết YouTube; học viên chỉ đăng nhập bằng email\n";
$r = call($router, 'POST', '/admin/lessons', ['title' => 'Bài có video YouTube', 'group_no' => 3, 'body' => 'Nội dung bài học có video đủ dài để kiểm tra.', 'quiz' => ['question' => 'Câu hỏi video?', 'options' => ['A', 'B'], 'correctChoice' => 0], 'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'], $adminCookie, [], '10.0.13.1');
check($r->status === 201 && $r->body['lesson']['video_type'] === 'url', 'Lưu bài học với liên kết YouTube');
$r = call($router, 'POST', '/admin/lessons', ['title' => 'Video giả dạng tệp', 'group_no' => 3, 'body' => 'Nội dung bài học có video đủ dài để kiểm tra.', 'quiz' => ['question' => 'Câu hỏi video?', 'options' => ['A', 'B'], 'correctChoice' => 0], 'video_url' => 'javascript:alert(1)'], $adminCookie, [], '10.0.13.2');
check($r->status === 400, 'Liên kết video javascript: bị từ chối');
$r = call($router, 'POST', '/auth/login', ['type' => 'learner', 'code' => 'ST-HV-001'], null, [], '10.0.13.3');
check($r->status === 400, 'Học viên không đăng nhập được bằng mã (chỉ email/mật khẩu hoặc Google)');
$r = call($router, 'POST', '/auth/login', ['email' => 'hv1@t.test', 'password' => 'HocVien2026!!'], null, [], '10.0.13.4');
check($r->status === 200 && $r->body['user']['role'] === 'learner', 'Học viên đăng nhập bằng email và mật khẩu');

echo "[Đơn vị] Gửi thư SMTP qua máy chủ SMTP giả\n";
$smtpRun = static function (int $port, string $password): array {
    $logFile = sys_get_temp_dir() . '/sontra_smtp_' . getmypid() . '_' . $port . '.json';
    @unlink($logFile); @unlink($logFile . '.ready');
    $proc = proc_open(
        [PHP_BINARY, __DIR__ . '/fake_smtp.php', (string) $port, $logFile, 'mailer@test.local', $password, 'login'],
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes
    );
    for ($i = 0; $i < 100 && !is_file($logFile . '.ready'); $i++) {
        usleep(50000);
    }
    $mailer = new \SonTra\Support\SmtpMailer('127.0.0.1', $port, 'none', 'mailer@test.local', 'secret-pass', 'no-reply@test.local', 'Sơn Trà Số');
    $ok = $mailer->send('hv@test.local', 'Đặt lại mật khẩu Sơn Trà Số', "Dòng một\n.Dòng có dấu chấm\nDòng cuối");
    foreach ($pipes as $pipe) { fclose($pipe); }
    proc_close($proc);
    $log = is_file($logFile) ? json_decode((string) file_get_contents($logFile), true) : null;
    @unlink($logFile); @unlink($logFile . '.ready');
    return [$ok, $log];
};
[$okSmtp, $logSmtp] = $smtpRun(25881, 'secret-pass');
check($okSmtp === true && ($logSmtp['auth'] ?? null) === 'ok', 'SMTP: xác thực đúng tài khoản và gửi thành công');
check(str_contains((string) ($logSmtp['data'] ?? ''), '=?UTF-8?B?') && str_contains((string) ($logSmtp['data'] ?? ''), 'From: '), 'SMTP: tiêu đề tiếng Việt được mã hóa, có From');
check(str_contains((string) ($logSmtp['data'] ?? ''), "\r\n..Dòng có dấu chấm"), 'SMTP: dấu chấm đầu dòng được escape');
check(($logSmtp['rcpt'][0] ?? '') === 'RCPT TO:<hv@test.local>', 'SMTP: người nhận đúng');
[$okBad, $logBad] = $smtpRun(25882, 'mat-khau-khac');
check($okBad === false && ($logBad['auth'] ?? null) === 'fail', 'SMTP: sai mật khẩu → trả false, không gửi thư');
check((new \SonTra\Support\SmtpMailer('', 25, 'none', '', '', '', 'x'))->send('a@test.local', 't', 'b') === false, 'SMTP: thiếu cấu hình → trả false');

echo "[Tích hợp] Đăng nhập Google\n";
$r = call($router, 'POST', '/auth/google', ['credential' => 'eyJhbGciOi.fake.token'], null, [], '10.0.9.1');
check($r->status === 503, 'Chưa cấu hình GOOGLE_CLIENT_ID → 503 (không chấp nhận thông tin tự khai)');

echo "[Tích hợp] Chấm quiz trên máy chủ\n";
$r = call($router, 'GET', '/lessons', []);
$quizPublic = $r->body['lessons'][0]['quiz'] ?? [];
check(!array_key_exists('correctChoice', $quizPublic) && !array_key_exists('explanation', $quizPublic), 'API công khai không lộ đáp án và giải thích');
$r = call($router, 'GET', '/admin/lessons', [], $adminCookie, [], '10.0.5.9');
check(isset($r->body['lessons'][0]['quiz']['correctChoice']), 'Quản trị viên vẫn thấy đáp án để soạn bài');
$lessonNo = (int) $pdo->query("SELECT lesson_no FROM lessons WHERE deleted_at IS NULL AND hidden = 0 ORDER BY lesson_no LIMIT 1")->fetchColumn();
$pdo->prepare('UPDATE lessons SET quiz_json = ? WHERE lesson_no = ?')->execute([json_encode(['question' => 'Câu hỏi kiểm thử?', 'options' => ['A', 'B', 'C'], 'correctChoice' => 1, 'explanation' => 'Giải thích kiểm thử.'], JSON_UNESCAPED_UNICODE), $lessonNo]);
$r = call($router, 'PUT', '/progress', ['lesson' => $lessonNo, 'score' => 1], $lrn1Cookie, [], '10.0.10.1');
check($r->body['progress']['score'] === 0, 'Học viên không tự đặt được score bằng PUT /progress');
$r = call($router, 'POST', "/lessons/{$lessonNo}/answer", ['choice' => 0], $lrn1Cookie, [], '10.0.10.2');
check($r->status === 200 && $r->body['correct'] === false && $r->body['progress']['score'] === 0, 'Đáp án sai: không tính điểm');
check($r->body['correctChoice'] === 1 && $r->body['explanation'] === 'Giải thích kiểm thử.', 'Sau khi nộp mới trả đáp án và giải thích');
$r = call($router, 'POST', "/lessons/{$lessonNo}/answer", ['choice' => 1], $lrn1Cookie, [], '10.0.10.3');
check($r->body['correct'] === true && $r->body['progress']['score'] === 1, 'Đáp án đúng: ghi điểm trên máy chủ');
$r = call($router, 'POST', "/lessons/{$lessonNo}/answer", ['choice' => 0], $lrn1Cookie, [], '10.0.10.4');
check($r->body['progress']['score'] === 1, 'Làm sai sau khi đúng không làm mất điểm (Quy tắc 4.1)');
$r = call($router, 'POST', "/lessons/{$lessonNo}/answer", ['choice' => 9], $lrn1Cookie, [], '10.0.10.5');
check($r->status === 400, 'Lựa chọn ngoài phạm vi → 400');
$r = call($router, 'POST', "/lessons/{$lessonNo}/answer", ['choice' => 0], $adminCookie, [], '10.0.10.6');
check($r->status === 403, 'Quản trị viên không làm quiz như học viên');

echo "[Tích hợp] Kiểm tra mật khẩu bị rò rỉ\n";
$leakedSuffix = strtoupper(substr(sha1('Mat-khau-bi-lo-2026'), 5));
$breach->__construct(static fn(string $prefix): ?string => $leakedSuffix . ':12345');
$r = call($router, 'POST', '/auth/register', ['email' => 'leak@t.test', 'password' => 'Mat-khau-bi-lo-2026', 'fullName' => 'Thử Rò Rỉ'], null, [], '10.0.11.1');
check($r->status === 400 && str_contains($r->body['error'], 'rò rỉ'), 'Mật khẩu đã bị rò rỉ bị từ chối khi đăng ký');
$breach->__construct(static fn(string $prefix): ?string => null);
$r = call($router, 'POST', '/auth/register', ['email' => 'leak2@t.test', 'password' => 'Mat-khau-moi-2026!', 'fullName' => 'Thử Mạng Lỗi'], null, [], '10.0.11.2');
check($r->status === 201, 'Dịch vụ rò rỉ lỗi: mặc định cho qua (PWNED_CHECK_FAIL_OPEN=true)');
$breach->__construct(static fn(string $prefix): ?string => '');

echo "[Tích hợp] Khôi phục mật khẩu qua email\n";
$mailer->sent = [];
$r = call($router, 'POST', '/auth/forgot-password', ['email' => 'khong.co@t.test'], null, [], '10.0.12.1');
check($r->status === 200 && count($mailer->sent) === 0, 'Email không tồn tại: phản hồi chung, không gửi thư');
$r = call($router, 'POST', '/auth/forgot-password', ['email' => 'hv1@t.test'], null, [], '10.0.12.2');
check($r->status === 200 && str_contains($r->body['message'], 'Nếu email'), 'Email tồn tại: phản hồi giống hệt');
check(count($mailer->sent) === 1, 'Email tồn tại: gửi một thư');
preg_match('/reset=([0-9a-f]{64})/', $mailer->sent[0]['body'] ?? '', $mm);
$token = $mm[1] ?? '';
check(strlen($token) === 64, 'Thư chứa liên kết với token 256 bit');
$stored = $pdo->query("SELECT token_hash FROM password_resets WHERE token_hash = '" . hash('sha256', $token) . "'")->fetchColumn();
check($stored !== false, 'CSDL chỉ lưu băm của token');
$r = call($router, 'POST', '/auth/reset-password', ['token' => $token, 'newPassword' => 'MatKhauMoi2026!!', 'confirmPassword' => 'KhacNhau2026!!'], null, [], '10.0.12.3');
check($r->status === 400, 'Xác nhận mật khẩu không khớp → 400');
$r = call($router, 'POST', '/auth/reset-password', ['token' => $token, 'newPassword' => 'MatKhauMoi2026!!', 'confirmPassword' => 'MatKhauMoi2026!!'], null, [], '10.0.12.4');
check($r->status === 200, 'Đặt lại mật khẩu thành công');
$r = call($router, 'POST', '/auth/reset-password', ['token' => $token, 'newPassword' => 'LanNua2026!!!!', 'confirmPassword' => 'LanNua2026!!!!'], null, [], '10.0.12.5');
check($r->status === 400, 'Token đã dùng không dùng lại được (một lần)');
$r = call($router, 'POST', '/auth/login', ['email' => 'hv1@t.test', 'password' => 'HocVien2026!!'], null, [], '10.0.12.6');
check($r->status === 401, 'Mật khẩu cũ không còn hiệu lực');
$r = call($router, 'POST', '/auth/login', ['email' => 'hv1@t.test', 'password' => 'MatKhauMoi2026!!'], null, [], '10.0.12.7');
check($r->status === 200, 'Đăng nhập bằng mật khẩu mới');
check(call($router, 'GET', '/me', [], $lrn1Cookie)->body['authenticated'] === false, 'Phiên cũ bị thu hồi sau khi đặt lại');
$r = call($router, 'POST', '/auth/forgot-password', ['email' => 'hv1@t.test'], null, [], '10.0.12.8');
preg_match('/reset=([0-9a-f]{64})/', $mailer->sent[count($mailer->sent) - 1]['body'], $mm2);
$pdo->exec("UPDATE password_resets SET expires_at = '2000-01-01 00:00:00' WHERE token_hash = '" . hash('sha256', $mm2[1]) . "'");
$r = call($router, 'POST', '/auth/reset-password', ['token' => $mm2[1], 'newPassword' => 'MatKhauMoi2026!!', 'confirmPassword' => 'MatKhauMoi2026!!'], null, [], '10.0.12.9');
check($r->status === 400, 'Token hết hạn bị từ chối');
$r = call($router, 'POST', '/auth/reset-password', ['token' => 'khong-hop-le', 'newPassword' => 'MatKhauMoi2026!!', 'confirmPassword' => 'MatKhauMoi2026!!'], null, [], '10.0.12.10');
check($r->status === 400, 'Token sai định dạng bị từ chối');
$mailer->sent = [];
for ($i = 0; $i < 4; $i++) { call($router, 'POST', '/auth/forgot-password', ['email' => 'hv2@t.test'], null, [], '10.0.12.' . (20 + $i)); }
check(count($mailer->sent) === 3, 'Giới hạn 3 thư/giờ cho mỗi email');

// ----------------------------------------------------------------- Kết quả
echo "\n" . ($failures === [] ? "TẤT CẢ ĐẠT" : "CÓ LỖI") . ": {$passes} đạt, " . count($failures) . " lỗi.\n";
foreach ($failures as $f) {
    echo "  - {$f}\n";
}
exit($failures === [] ? 0 : 1);
