<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Domain\UserView;
use SonTra\Repositories\SessionRepository;
use SonTra\Repositories\UserRepository;
use SonTra\Support\Clock;
use SonTra\Support\HttpException;
use SonTra\Support\Ids;
use SonTra\Support\Validator;

/** Hồ sơ cá nhân và quản lý tài khoản (Quản trị viên). */
final class AccountService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly SessionRepository $sessions,
    ) {
    }

    /**
     * Cập nhật hồ sơ: chỉ họ tên, điện thoại, đơn vị. Email, vai trò, mã định danh KHÔNG thể thay đổi
     * (đặc tả mục 2.2 — ranh giới cứng; mọi trường khác trong payload bị bỏ qua).
     *
     * @param array<string, mixed> $account
     * @param array<string, mixed> $input
     */
    public function updateProfile(array $account, array $input): array
    {
        if (!in_array($account['role'], ['admin', 'volunteer'], true)) {
            throw new HttpException(403, 'Chỉ Quản trị viên và Tình nguyện viên mới cập nhật hồ sơ tại đây.');
        }
        $fields = [
            'full_name' => Validator::text($input['fullName'] ?? null, 'Họ và tên', 2, 200),
            'phone' => Validator::optionalText($input['phone'] ?? null, 30),
            'organization' => Validator::optionalText($input['organization'] ?? null, 200),
        ];
        $this->users->update($account['id'], $fields);
        return UserView::context($this->users->findById($account['id']));
    }

    /** Danh sách học viên (không chứa dữ liệu nhạy cảm) cho TNV đánh giá và Quản trị viên. */
    public function learnersFor(array $account): array
    {
        if (!in_array($account['role'], ['admin', 'volunteer'], true)) {
            throw new HttpException(403, 'Chỉ Tình nguyện viên hoặc Quản trị viên được xem danh sách học viên.');
        }
        return array_map(static fn(array $row): array => [
            'id' => $row['id'],
            'code' => $row['learner_code'],
            'email' => $row['email'],
            'full_name' => $row['full_name'],
            'avatar_url' => $row['avatar_url'],
            'auth_provider' => $row['auth_provider'],
            'created' => Clock::toIso($row['created_at']),
        ], $this->users->listByRoles(['learner']));
    }

    /** @return array{users: list<array<string, mixed>>, learners: list<array<string, mixed>>} */
    public function listForAdmin(): array
    {
        $rows = $this->users->listByRoles(['admin', 'volunteer', 'learner']);
        $users = [];
        $learners = [];
        foreach ($rows as $row) {
            $users[] = UserView::admin($row);
            if ($row['role'] === 'learner') {
                $learners[] = [
                    'id' => $row['id'],
                    'code' => $row['learner_code'],
                    'email' => $row['email'],
                    'full_name' => $row['full_name'],
                    'avatar_url' => $row['avatar_url'],
                    'auth_provider' => $row['auth_provider'],
                    'created' => Clock::toIso($row['created_at']),
                ];
            }
        }
        return ['users' => $users, 'learners' => $learners];
    }

    /** @param array<string, mixed> $input */
    public function createVolunteer(array $admin, array $input): array
    {
        $this->assertAdmin($admin);
        $email = Validator::email($input['email'] ?? null);
        $fullName = Validator::text($input['fullName'] ?? null, 'Họ và tên', 2, 200);
        $password = Validator::password($input['initialPassword'] ?? null);

        if ($this->users->findByEmail($email) !== null) {
            throw new HttpException(409, 'Địa chỉ email này đã tồn tại trong danh sách tài khoản.');
        }
        $now = Clock::nowUtc();
        $this->users->insert([
            'id' => Ids::random('acc-vol-'),
            'email' => $email,
            'full_name' => $fullName,
            'role' => 'volunteer',
            'auth_provider' => 'local',
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'phone' => Validator::optionalText($input['phone'] ?? null, 30),
            'organization' => Validator::optionalText($input['organization'] ?? null, 200) ?? 'Tổ TNV Chuyển đổi số Sơn Trà',
            'active' => 1,
            'must_change' => 1,
            'failed_attempts' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        return UserView::admin($this->users->findByEmail($email));
    }

    /**
     * Kích hoạt/vô hiệu hóa hoặc bật/tắt yêu cầu đổi mật khẩu. Không tác động lên Quản trị viên
     * và không cho phép tự vô hiệu hóa chính mình. Vô hiệu hóa sẽ thu hồi mọi phiên đang hoạt động.
     *
     * @param array<string, mixed> $admin
     * @param array<string, mixed> $input
     */
    public function updateAccount(array $admin, string $accountId, array $input): array
    {
        $this->assertAdmin($admin);
        $target = $this->users->findById($accountId);
        if ($target === null) {
            throw new HttpException(404, 'Không tìm thấy tài khoản.');
        }
        if ($target['role'] === 'admin') {
            throw new HttpException(403, 'Không thể thay đổi trạng thái của tài khoản Quản trị viên.');
        }

        $fields = [];
        if (array_key_exists('active', $input)) {
            $active = (bool) $input['active'];
            if (!$active && $target['id'] === $admin['id']) {
                throw new HttpException(403, 'Không thể tự vô hiệu hóa tài khoản đang dùng.');
            }
            $fields['active'] = $active ? 1 : 0;
        }
        if (array_key_exists('mustChange', $input)) {
            $fields['must_change'] = (bool) $input['mustChange'] ? 1 : 0;
        }
        if ($fields !== []) {
            $this->users->update($accountId, $fields);
        }
        if (($fields['active'] ?? null) === 0) {
            $this->sessions->deleteForAccount($accountId);
        }
        return UserView::admin($this->users->findById($accountId));
    }

    private function assertAdmin(array $account): void
    {
        if ($account['role'] !== 'admin') {
            throw new HttpException(403, 'Chỉ Quản trị viên mới có quyền này.');
        }
    }
}
