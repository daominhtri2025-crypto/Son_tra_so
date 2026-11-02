<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Repositories\RateLimitRepository;
use SonTra\Repositories\SessionRepository;
use SonTra\Repositories\UserRepository;
use SonTra\Support\Clock;
use SonTra\Support\Database;
use SonTra\Support\HttpException;
use SonTra\Support\Ids;
use SonTra\Support\Validator;
use SonTra\Domain\UserView;

/**
 * Xác thực và phiên làm việc.
 *  - Mật khẩu: password_hash (bcrypt/argon2 theo PHP), so sánh bằng password_verify.
 *  - Khóa tạm: 5 lần sai liên tiếp → khóa 15 phút (HTTP 423). Xác minh mật khẩu trước khi
 *    trả trạng thái để không lộ tài khoản đang bị khóa/vô hiệu cho người không biết mật khẩu.
 *  - Phiên: token 256-bit trong cookie HttpOnly; CSDL chỉ lưu SHA-256 của token.
 */
final class AuthService
{
    private const MAX_FAILED_ATTEMPTS = 5;
    private const LOCK_MINUTES = 15;
    private const IP_LIMIT_WINDOW = 900;   // 15 phút
    private const IP_LIMIT_HITS = 30;

    /** Hash giả (tạo lúc chạy, cùng chi phí với hash thật) để cân bằng thời gian khi email không tồn tại. */
    private static ?string $dummyHash = null;

    public function __construct(
        private readonly UserRepository $users,
        private readonly SessionRepository $sessions,
        private readonly RateLimitRepository $limits,
        private readonly GoogleTokenVerifier $google,
        private readonly PasswordPolicy $policy,
    ) {
    }

    /** @return array{user: array<string, mixed>, token: string} */
    public function register(string $email, string $password, string $fullName, string $ip): array
    {
        $this->throttle('register', $ip, 10, 3600);
        $email = Validator::email($email);
        $password = $this->policy->assertAcceptable($password);
        $fullName = Validator::text($fullName, 'Họ và tên', 2, 200);

        if ($this->users->findByEmail($email) !== null) {
            throw new HttpException(409, 'Địa chỉ email này đã được đăng ký trong hệ thống.');
        }

        $account = Database::transaction(function () use ($email, $password, $fullName): array {
            $now = Clock::nowUtc();
            $row = [
                'id' => Ids::random('acc-lrn-'),
                'email' => $email,
                'full_name' => $fullName,
                'role' => 'learner',
                'auth_provider' => 'local',
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'learner_code' => $this->users->nextLearnerCode(),
                'active' => 1,
                'must_change' => 0,
                'failed_attempts' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $this->users->insert($row);
            return $row;
        });

        return ['user' => UserView::context($account), 'token' => $this->issueSession($account['id'])];
    }

    /** @return array{user: array<string, mixed>, token: string} */
    public function loginWithPassword(string $email, string $password, string $ip): array
    {
        $this->throttle('login', $ip, self::IP_LIMIT_HITS, self::IP_LIMIT_WINDOW);
        $email = strtolower(trim($email));
        $account = $this->users->findByEmail($email);
        $genericError = new HttpException(401, 'Email hoặc mật khẩu không chính xác.');

        if ($account === null) {
            password_verify($password, self::dummyHash());
            throw $genericError;
        }

        if ($account['locked_until'] !== null && strtotime($account['locked_until'] . ' UTC') > time()) {
            $minutes = (int) ceil((strtotime($account['locked_until'] . ' UTC') - time()) / 60);
            throw new HttpException(423, sprintf(
                'Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau %d phút.',
                $minutes
            ));
        }

        $hash = $account['password_hash'];
        if ($hash === null || !password_verify($password, $hash)) {
            $this->recordFailure($account);
            throw $genericError;
        }

        if ((int) $account['active'] !== 1) {
            throw new HttpException(403, 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.');
        }

        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            $this->users->update($account['id'], ['password_hash' => password_hash($password, PASSWORD_DEFAULT)]);
        }
        $this->users->update($account['id'], ['failed_attempts' => 0, 'locked_until' => null]);

        $account = $this->users->findById($account['id']) ?? $account;
        return ['user' => UserView::context($account), 'token' => $this->issueSession($account['id'])];
    }

    /** @return array{user: array<string, mixed>, token: string} */
    public function loginWithGoogle(string $credential, string $ip): array
    {
        $this->throttle('google', $ip, 30, self::IP_LIMIT_WINDOW);
        $profile = $this->google->verify($credential);

        $account = $this->users->findByGoogleSub($profile['sub']);
        if ($account === null) {
            $byEmail = $this->users->findByEmail($profile['email']);
            if ($byEmail !== null && $byEmail['role'] !== 'learner') {
                // Quản trị viên và tình nguyện viên không được đăng nhập bằng Google (tránh bỏ qua xác thực mật khẩu).
                throw new HttpException(403, 'Tài khoản này đăng nhập bằng email và mật khẩu.');
            }
            if ($byEmail !== null) {
                $this->users->update($byEmail['id'], ['google_sub' => $profile['sub']]);
                $account = $this->users->findById($byEmail['id']);
            } else {
                $account = $this->createGoogleLearner($profile);
            }
        }

        if ((int) $account['active'] !== 1) {
            throw new HttpException(403, 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.');
        }
        if ($account['avatar_url'] !== ($profile['picture'] ?? null) && $profile['picture'] !== null) {
            $this->users->update($account['id'], ['avatar_url' => $profile['picture']]);
            $account = $this->users->findById($account['id']);
        }

        return ['user' => UserView::context($account), 'token' => $this->issueSession($account['id'])];
    }

    /** @param array{sub:string, email:string, name:string, picture:?string} $profile */
    private function createGoogleLearner(array $profile): array
    {
        $id = Database::transaction(function () use ($profile): string {
            $now = Clock::nowUtc();
            $row = [
                'id' => Ids::random('acc-gg-'),
                'email' => $profile['email'],
                'full_name' => mb_substr($profile['name'], 0, 200),
                'role' => 'learner',
                'auth_provider' => 'google',
                'google_sub' => $profile['sub'],
                'learner_code' => $this->users->nextLearnerCode(),
                'avatar_url' => $profile['picture'],
                'active' => 1,
                'must_change' => 0,
                'failed_attempts' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $this->users->insert($row);
            return $row['id'];
        });
        return $this->users->findById($id);
    }

    public function issueSession(string $accountId): string
    {
        $token = bin2hex(random_bytes(32));
        $this->sessions->create(
            hash('sha256', $token),
            $accountId,
            Clock::inUtc('+12 hours'),
        );
        return $token;
    }

    /** @return array<string, mixed>|null  tài khoản đang hoạt động gắn với cookie, hoặc null */
    public function resolve(?string $token): ?array
    {
        if ($token === null || $token === '' || strlen($token) !== 64) {
            return null;
        }
        $account = $this->sessions->findActiveAccount(hash('sha256', $token));
        if ($account === null || (int) $account['active'] !== 1) {
            return null;
        }
        return $account;
    }

    public function logout(?string $token): void
    {
        if ($token !== null && $token !== '') {
            $this->sessions->delete(hash('sha256', $token));
        }
    }

    /** Đặt lại mật khẩu bắt buộc sau lần đăng nhập đầu (must_change), không cần mật khẩu cũ. */
    public function completeForcedPasswordChange(array $account, string $newPassword): string
    {
        $newPassword = $this->policy->assertAcceptable($newPassword);
        $this->users->update($account['id'], [
            'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
            'must_change' => 0,
        ]);
        $this->sessions->deleteForAccount($account['id']);
        return $this->issueSession($account['id']);
    }

    /** Đổi mật khẩu tự nguyện: xác thực mật khẩu hiện tại, thu hồi mọi phiên cũ. */
    public function changePassword(array $account, string $current, string $new, string $confirm): string
    {
        if ($account['password_hash'] === null || !password_verify($current, $account['password_hash'])) {
            throw new HttpException(401, 'Mật khẩu hiện tại không chính xác.');
        }
        if ($new !== $confirm) {
            throw new HttpException(400, 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
        }
        $new = $this->policy->assertAcceptable($new);
        if (hash_equals($current, $new)) {
            throw new HttpException(400, 'Mật khẩu mới không được trùng với mật khẩu hiện tại.');
        }
        $this->users->update($account['id'], [
            'password_hash' => password_hash($new, PASSWORD_DEFAULT),
            'must_change' => 0,
        ]);
        $this->sessions->deleteForAccount($account['id']);
        return $this->issueSession($account['id']);
    }

    private static function dummyHash(): string
    {
        return self::$dummyHash ??= password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    }

    /** @param array<string, mixed> $account */
    private function recordFailure(array $account): void
    {
        $failed = (int) $account['failed_attempts'] + 1;
        if ($failed >= self::MAX_FAILED_ATTEMPTS) {
            $this->users->update($account['id'], [
                'failed_attempts' => 0,
                'locked_until' => Clock::inUtc('+' . self::LOCK_MINUTES . ' minutes'),
            ]);
            throw new HttpException(423, sprintf(
                'Nhập sai %d lần liên tiếp. Tài khoản bị khóa tạm thời %d phút.',
                self::MAX_FAILED_ATTEMPTS,
                self::LOCK_MINUTES
            ));
        }
        $this->users->update($account['id'], ['failed_attempts' => $failed]);
    }

    private function throttle(string $scope, string $ip, int $maxHits, int $windowSeconds): void
    {
        $hits = $this->limits->hit($scope . ':ip:' . $ip, $windowSeconds);
        if ($hits > $maxHits) {
            throw new HttpException(429, 'Quá nhiều yêu cầu từ địa chỉ mạng này. Vui lòng thử lại sau.');
        }
    }
}
