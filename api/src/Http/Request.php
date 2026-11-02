<?php

declare(strict_types=1);

namespace SonTra\Http;

use SonTra\Support\HttpException;

/** Yêu cầu HTTP đã chuẩn hóa. Thân JSON được giải mã một lần và kiểm tra kiểu. */
final class Request
{
    /** @param array<string, mixed> $body */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $headers,
        public readonly array $cookies,
        public readonly string $ip,
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        // Bỏ tiền tố /api để router chỉ làm việc với đường dẫn logic.
        $path = preg_replace('#^/api(?=/|$)#', '', rtrim($uri, '/')) ?: '/';

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_') && is_string($value)) {
                $headers[strtolower(str_replace('_', '-', substr($key, 5)))] = $value;
            }
        }

        // Chỉ giải mã thân JSON. Content-Type khác (ví dụ text/plain) để Security::guard từ chối bằng 415.
        $body = [];
        $contentType = strtolower($headers['content-type'] ?? '');
        if (in_array($method, ['POST', 'PUT', 'DELETE'], true) && str_starts_with($contentType, 'application/json')) {
            $raw = file_get_contents('php://input') ?: '';
            if (trim($raw) !== '') {
                $decoded = json_decode($raw, true);
                if (!is_array($decoded)) {
                    throw new HttpException(400, 'Dữ liệu gửi lên phải là JSON hợp lệ.');
                }
                $body = $decoded;
            }
        }

        return new self(
            $method,
            $path,
            $_GET,
            $body,
            $headers,
            $_COOKIE,
            (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'),
        );
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function cookie(string $name): ?string
    {
        $value = $this->cookies[$name] ?? null;
        return is_string($value) && $value !== '' ? $value : null;
    }

    /** Tham số query có kiểu chuỗi, hỗ trợ ?name=true/1. */
    public function queryFlag(string $name): bool
    {
        $value = strtolower((string) ($this->query[$name] ?? ''));
        return in_array($value, ['1', 'true', 'yes'], true);
    }
}
