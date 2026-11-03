<?php

declare(strict_types=1);

namespace SonTra\Support;

/**
 * Gửi thư qua SMTP thuần PHP (không cần Composer). Hỗ trợ:
 *  - mã hóa: 'tls' (STARTTLS, thường cổng 587), 'ssl' (SMTPS, cổng 465), 'none' (chỉ dùng nội bộ);
 *  - xác thực AUTH PLAIN hoặc AUTH LOGIN, chọn theo máy chủ quảng cáo;
 *  - tiêu đề và nội dung UTF-8, dấu chấm đầu dòng được escape (dot-stuffing).
 * Mật khẩu không bao giờ được ghi vào nhật ký.
 */
final class SmtpMailer implements Mailer
{
    /** @var resource|null */
    private $sock = null;

    public function __construct(
        private readonly string $host,
        private readonly int $port,
        private readonly string $encryption,
        private readonly string $user,
        private readonly string $pass,
        private readonly string $from,
        private readonly string $fromName,
        private readonly int $timeout = 15,
    ) {
    }

    /** Đọc cấu hình từ api/.env: SMTP_HOST, SMTP_PORT, SMTP_ENCRYPTION, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_FROM_NAME. */
    public static function fromEnv(): self
    {
        return new self(
            Env::get('SMTP_HOST'),
            (int) Env::get('SMTP_PORT', '587'),
            strtolower(Env::get('SMTP_ENCRYPTION', 'tls')),
            Env::get('SMTP_USER'),
            Env::get('SMTP_PASS'),
            Env::get('MAIL_FROM'),
            Env::get('MAIL_FROM_NAME', 'Sơn Trà Số'),
        );
    }

    public function send(string $to, string $subject, string $body): bool
    {
        if ($this->host === '' || $this->from === '' || !in_array($this->encryption, ['tls', 'ssl', 'none'], true)) {
            error_log('[SonTra] SMTP chưa cấu hình đầy đủ (SMTP_HOST, MAIL_FROM, SMTP_ENCRYPTION).');
            return false;
        }
        try {
            $this->connect();
            $this->command(null, 220);
            $ehlo = $this->command('EHLO ' . $this->localName(), 250);

            if ($this->encryption === 'tls') {
                $this->command('STARTTLS', 220);
                if (!stream_socket_enable_crypto($this->sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('Không bật được TLS (STARTTLS).');
                }
                $ehlo = $this->command('EHLO ' . $this->localName(), 250);
            }

            if ($this->user !== '') {
                $this->authenticate($ehlo);
            }

            $this->command('MAIL FROM:<' . $this->from . '>', 250);
            $this->command('RCPT TO:<' . $to . '>', [250, 251]);
            $this->command('DATA', 354);
            $this->writeRaw($this->message($to, $subject, $body) . "\r\n.\r\n");
            $this->command(null, 250);
            $this->command('QUIT', 221);
            return true;
        } catch (\RuntimeException $e) {
            // Thông điệp lỗi không chứa mật khẩu (chỉ mô tả bước thất bại).
            error_log('[SonTra] Gửi thư SMTP thất bại: ' . $e->getMessage());
            return false;
        } finally {
            $this->close();
        }
    }

    private function connect(): void
    {
        $scheme = $this->encryption === 'ssl' ? 'ssl://' : 'tcp://';
        $errno = 0;
        $errstr = '';
        $sock = @stream_socket_client(
            $scheme . $this->host . ':' . $this->port,
            $errno,
            $errstr,
            $this->timeout,
        );
        if ($sock === false) {
            throw new \RuntimeException("Không kết nối được {$this->host}:{$this->port} ({$errstr}).");
        }
        stream_set_timeout($sock, $this->timeout);
        $this->sock = $sock;
    }

    /** @param list<string> $ehloLines */
    private function authenticate(array $ehloLines): void
    {
        $advertised = implode(' ', $ehloLines);
        if (str_contains($advertised, 'AUTH') && str_contains($advertised, 'PLAIN')) {
            $this->command('AUTH PLAIN ' . base64_encode("\0{$this->user}\0{$this->pass}"), 235);
            return;
        }
        $this->command('AUTH LOGIN', 334);
        $this->command(base64_encode($this->user), 334);
        $this->command(base64_encode($this->pass), 235);
    }

    /**
     * Gửi một lệnh (nếu có) rồi đọc phản hồi. Trả về danh sách dòng phản hồi.
     * @param int|list<int> $expected
     * @return list<string>
     */
    private function command(?string $cmd, int|array $expected): array
    {
        if ($cmd !== null) {
            $this->writeRaw($cmd . "\r\n");
        }
        $reply = $this->read();
        $codes = is_array($expected) ? $expected : [$expected];
        if (!in_array($reply['code'], $codes, true)) {
            // Không đưa dòng lệnh vào lỗi (có thể chứa mật khẩu đã mã hóa base64).
            // Các bước xác thực gửi chuỗi base64 (tên đăng nhập, mật khẩu): chỉ ghi nhãn chung.
            $verb = $cmd !== null ? strtoupper(explode(' ', $cmd)[0]) : '';
            $label = match (true) {
                $cmd === null => 'kết nối',
                in_array($verb, ['EHLO', 'HELO', 'STARTTLS', 'MAIL', 'RCPT', 'DATA', 'QUIT'], true) => $verb,
                default => 'xác thực',
            };
            throw new \RuntimeException("Máy chủ từ chối bước {$label} (mã {$reply['code']}): " . $reply['text']);
        }
        return $reply['lines'];
    }

    /** @return array{code:int, text:string, lines:list<string>} */
    private function read(): array
    {
        $lines = [];
        $code = 0;
        while (($line = fgets($this->sock, 2048)) !== false) {
            $line = rtrim($line, "\r\n");
            $lines[] = $line;
            $code = (int) substr($line, 0, 3);
            // Dòng cuối của phản hồi nhiều dòng có ký tự thứ 4 là khoảng trắng (không phải '-').
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }
        if ($lines === []) {
            $meta = stream_get_meta_data($this->sock);
            throw new \RuntimeException(!empty($meta['timed_out']) ? 'Hết thời gian chờ máy chủ SMTP.' : 'Máy chủ SMTP đóng kết nối.');
        }
        return ['code' => $code, 'text' => (string) end($lines), 'lines' => $lines];
    }

    private function writeRaw(string $data): void
    {
        $written = fwrite($this->sock, $data);
        if ($written === false || $written < strlen($data)) {
            throw new \RuntimeException('Không ghi được dữ liệu tới máy chủ SMTP.');
        }
    }

    private function message(string $to, string $subject, string $body): string
    {
        $encodedName = mb_encode_mimeheader($this->fromName, 'UTF-8', 'B');
        $headers = [
            'From: ' . $encodedName . ' <' . $this->from . '>',
            'To: <' . $to . '>',
            'Subject: ' . mb_encode_mimeheader($subject, 'UTF-8', 'B'),
            'Date: ' . date('r'),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        // Chuẩn hóa xuống dòng về CRLF và escape dấu chấm đầu dòng.
        $lines = preg_split('/\r\n|\r|\n/', $body) ?: [];
        $lines = array_map(static fn(string $l): string => str_starts_with($l, '.') ? '.' . $l : $l, $lines);
        return implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $lines);
    }

    private function localName(): string
    {
        $host = gethostname();
        return $host !== false && $host !== '' ? $host : 'localhost';
    }

    private function close(): void
    {
        if (is_resource($this->sock)) {
            fclose($this->sock);
        }
        $this->sock = null;
    }
}
