<?php

declare(strict_types=1);

namespace SonTra\Http;

/** Phản hồi JSON. Mỗi phản hồi có mã trạng thái, thân dữ liệu và (tùy chọn) header bổ sung. */
final class Response
{
    /**
     * @param array<string, mixed> $body
     * @param array<string, string> $headers
     */
    public function __construct(
        public readonly int $status,
        public readonly array $body,
        public readonly array $headers = [],
    ) {
    }

    /** @param array<string, mixed> $body */
    public static function json(int $status, array $body, array $headers = []): self
    {
        return new self($status, $body, $headers);
    }

    public function send(): void
    {
        http_response_code($this->status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value, false);
        }
        echo json_encode($this->body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
