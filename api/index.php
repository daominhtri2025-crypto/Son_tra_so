<?php

declare(strict_types=1);

/**
 * Điểm vào duy nhất của API Sơn Trà Số (mọi yêu cầu /api/* được .htaccess chuyển đến đây).
 */

require __DIR__ . '/bootstrap.php';

use SonTra\Http\Authenticator;
use SonTra\Http\Container;
use SonTra\Http\Request;
use SonTra\Http\Response;
use SonTra\Http\Router;
use SonTra\Http\Routes;
use SonTra\Http\Security;
use SonTra\Repositories\SessionRepository;
use SonTra\Support\Env;
use SonTra\Support\HttpException;

ini_set('display_errors', '0');
error_reporting(E_ALL);

try {
    $request = Request::fromGlobals();
    Security::guard($request);

    // Dọn phiên hết hạn ngẫu nhiên (~1%) để không cần cron trên hosting chia sẻ.
    if (random_int(1, 100) === 1) {
        (new SessionRepository())->purgeExpired();
    }

    $router = new Router();
    Routes::register($router, new Container());
    $response = $router->dispatch($request);
} catch (HttpException $e) {
    $response = Response::json($e->status, ['error' => $e->getMessage()]);
} catch (\JsonException $e) {
    $response = Response::json(500, ['error' => 'Không xử lý được dữ liệu JSON.']);
} catch (\Throwable $e) {
    // Chi tiết kỹ thuật chỉ ghi vào nhật ký máy chủ; không trả về trình duyệt trừ khi APP_DEBUG=true.
    error_log('[SonTra] ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $message = Env::bool('APP_DEBUG') ? $e->getMessage() : 'Lỗi xử lý yêu cầu trên máy chủ.';
    $response = Response::json(500, ['error' => $message]);
}

$response->send();
