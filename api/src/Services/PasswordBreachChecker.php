<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Support\Env;

/**
 * Kiểm tra mật khẩu có trong dữ liệu bị rò rỉ không, theo mô hình k-anonymity của
 * API Pwned Passwords: chỉ gửi 5 ký tự đầu của băm SHA-1; mật khẩu không rời máy chủ.
 */
final class PasswordBreachChecker
{
    private const ENDPOINT = 'https://api.pwnedpasswords.com/range/';

    /** @var (callable(string): ?string)|null  nhận tiền tố 5 ký tự, trả nội dung range hoặc null nếu lỗi */
    private $fetch;

    /** @param (callable(string): ?string)|null $fetch  để kiểm thử; mặc định gọi mạng */
    public function __construct(?callable $fetch = null)
    {
        $this->fetch = $fetch;
    }

    /**
     * @return int|null  số lần xuất hiện (0 = không tìm thấy); null nếu không kiểm tra được
     */
    public function breachCount(string $password): ?int
    {
        if (!Env::bool('PWNED_CHECK_ENABLED', true)) {
            return 0;
        }
        $sha1 = strtoupper(sha1($password));
        $prefix = substr($sha1, 0, 5);
        $suffix = substr($sha1, 5);

        $body = $this->fetch !== null ? ($this->fetch)($prefix) : $this->download($prefix);
        if ($body === null) {
            return null;
        }
        foreach (preg_split('/\r?\n/', $body) ?: [] as $line) {
            [$hash, $count] = array_pad(explode(':', trim($line), 2), 2, '0');
            if (hash_equals($suffix, strtoupper($hash))) {
                return (int) $count;
            }
        }
        return 0;
    }

    private function download(string $prefix): ?string
    {
        $ch = curl_init(self::ENDPOINT . $prefix);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ['Add-Padding: true', 'User-Agent: SonTraSo/1.0'],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        return ($body !== false && $status === 200) ? (string) $body : null;
    }
}
