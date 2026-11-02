<?php

declare(strict_types=1);

namespace SonTra\Http;

use SonTra\Support\HttpException;

/**
 * Bảng định tuyến tường minh: METHOD + mẫu đường dẫn có tham số {name}.
 * Khi đường dẫn tồn tại nhưng sai phương thức, trả 405 thay vì 404.
 */
final class Router
{
    /** @var list<array{method: string, regex: string, names: list<string>, handler: callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $names = [];
        $regex = preg_replace_callback(
            '/\{([a-zA-Z_]+)\}/',
            static function (array $m) use (&$names): string {
                $names[] = $m[1];
                return '([^/]+)';
            },
            $pattern
        );
        $this->routes[] = [
            'method' => strtoupper($method),
            'regex' => '#^' . $regex . '$#',
            'names' => $names,
            'handler' => $handler,
        ];
    }

    public function dispatch(Request $request): Response
    {
        $pathMatched = false;
        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $request->path, $matches) !== 1) {
                continue;
            }
            $pathMatched = true;
            if ($route['method'] !== $request->method) {
                continue;
            }
            $params = [];
            foreach ($route['names'] as $index => $name) {
                $params[$name] = rawurldecode($matches[$index + 1]);
            }
            return ($route['handler'])($request, $params);
        }
        if ($pathMatched) {
            throw new HttpException(405, 'Phương thức không được hỗ trợ cho tài nguyên này.');
        }
        throw new HttpException(404, 'Không tìm thấy API.');
    }
}
