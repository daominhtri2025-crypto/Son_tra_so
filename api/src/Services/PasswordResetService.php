<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Repositories\RateLimitRepository;
use SonTra\Repositories\SessionRepository;
use SonTra\Repositories\UserRepository;
use SonTra\Support\Clock;
use SonTra\Support\Database;
use SonTra\Support\Env;
use SonTra\Support\HttpException;
use SonTra\Support\Mailer;
use SonTra\Support\Validator;

/**
 * Khôi phục mật khẩu qua email (đặc tả mục 8.1: 256 bit, băm SHA-256, 15 phút, dùng một lần).
 *  - Phản hồi yêu cầu luôn giống nhau, không tiết lộ email có tồn tại hay không.
 *  - Giới hạn: 10 yêu cầu/giờ theo IP; 3 thư/giờ theo email.
 *  - Đặt lại thành công: thu hồi mọi phiên, xóa khóa tạm, buộc đăng nhập lại.
 */
final class PasswordResetService
{
    public const GENERIC_MESSAGE = 'Nếu email này thuộc tài khoản Sơn Trà Số, một thư hướng dẫn đặt lại mật khẩu sẽ được gửi trong ít phút.';

    private const IP_LIMIT = 10;
    private const EMAIL_LIMIT = 3;
    private const WINDOW_SECONDS = 3600;

    public function __construct(
        private readonly UserRepository $users,
        private readonly SessionRepository $sessions,
        private readonly RateLimitRepository $limits,
        private readonly PasswordPolicy $policy,
        private readonly Mailer $mailer,
    ) {
    }

    public function request(string $email, string $ip): string
    {
        if ($this->limits->hit('reset-ip:' . $ip, self::WINDOW_SECONDS) > self::IP_LIMIT) {
            throw new HttpException(429, 'Quá nhiều yêu cầu từ địa chỉ mạng này. Vui lòng thử lại sau.');
        }

        $email = strtolower(trim($email));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return self::GENERIC_MESSAGE;
        }
        if ($this->limits->hit('reset-email:' . hash('sha256', $email), self::WINDOW_SECONDS) > self::EMAIL_LIMIT) {
            return self::GENERIC_MESSAGE; // im lặng: không gửi thêm thư
        }

        $account = $this->users->findByEmail($email);
        if ($account === null || (int) $account['active'] !== 1) {
            return self::GENERIC_MESSAGE;
        }

        $token = bin2hex(random_bytes(32));
        Database::transaction(function (\PDO $pdo) use ($account, $token): void {
            $pdo->prepare('DELETE FROM password_resets WHERE account_id = ? AND used_at IS NULL')->execute([$account['id']]);
            $pdo->prepare('INSERT INTO password_resets (token_hash, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
                ->execute([hash('sha256', $token), $account['id'], Clock::inUtc('+15 minutes'), Clock::nowUtc()]);
        });

        $appUrl = rtrim(Env::get('APP_URL'), '/');
        if ($appUrl === '') {
            throw new HttpException(503, 'Máy chủ chưa cấu hình APP_URL nên không gửi được liên kết.');
        }
        $link = $appUrl . '/?reset=' . $token;
        $body = "Chào " . $account['full_name'] . ",\n\n"
            . "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu Sơn Trà Số. Bấm liên kết sau để đặt mật khẩu mới:\n\n"
            . $link . "\n\n"
            . "Liên kết có hiệu lực trong 15 phút và chỉ dùng được một lần.\n"
            . "Nếu bạn không yêu cầu, hãy bỏ qua thư này; mật khẩu của bạn không thay đổi.\n";
        if (!$this->mailer->send($email, 'Đặt lại mật khẩu Sơn Trà Số', $body)) {
            error_log('[SonTra] Gửi thư đặt lại mật khẩu thất bại cho tài khoản ' . $account['id']);
        }
        return self::GENERIC_MESSAGE;
    }

    public function reset(string $token, mixed $newPassword, mixed $confirm): string
    {
        if (preg_match('/^[0-9a-f]{64}$/', $token) !== 1) {
            throw new HttpException(400, 'Liên kết không hợp lệ hoặc đã hết hạn.');
        }
        if (!is_string($newPassword) || $newPassword !== $confirm) {
            throw new HttpException(400, 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
        }
        $password = $this->policy->assertAcceptable($newPassword);

        $row = Database::connection()->prepare(
            'SELECT account_id, expires_at, used_at FROM password_resets WHERE token_hash = ?'
        );
        $row->execute([hash('sha256', $token)]);
        $reset = $row->fetch();
        if ($reset === false || $reset['used_at'] !== null || strtotime($reset['expires_at'] . ' UTC') <= time()) {
            throw new HttpException(400, 'Liên kết không hợp lệ hoặc đã hết hạn.');
        }

        Database::transaction(function (\PDO $pdo) use ($reset, $password): void {
            $now = Clock::nowUtc();
            $pdo->prepare(
                'UPDATE accounts SET password_hash = ?, must_change = 0, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?'
            )->execute([password_hash($password, PASSWORD_DEFAULT), $now, $reset['account_id']]);
            $pdo->prepare('UPDATE password_resets SET used_at = ? WHERE account_id = ? AND used_at IS NULL')
                ->execute([$now, $reset['account_id']]);
        });
        $this->sessions->deleteForAccount($reset['account_id']);

        return 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.';
    }
}
