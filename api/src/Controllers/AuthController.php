<?php

declare(strict_types=1);

namespace SonTra\Controllers;

use SonTra\Domain\UserView;
use SonTra\Http\Authenticator;
use SonTra\Http\Request;
use SonTra\Http\Response;
use SonTra\Http\SessionCookie;
use SonTra\Services\AccountService;
use SonTra\Services\AuthService;
use SonTra\Support\HttpException;
use SonTra\Support\Validator;

/** Đăng ký, đăng nhập, đăng xuất, hồ sơ cá nhân và đổi mật khẩu. */
final class AuthController
{
    public function __construct(
        private readonly Authenticator $authenticator,
        private readonly AuthService $auth,
        private readonly AccountService $accounts,
    ) {
    }

    public function me(Request $req, array $params): Response
    {
        $account = $this->authenticator->optional($req);
        if ($account === null) {
            return Response::json(200, ['authenticated' => false]);
        }
        return Response::json(200, ['authenticated' => true, 'user' => UserView::context($account)]);
    }

    public function register(Request $req, array $params): Response
    {
        $result = $this->auth->register(
            (string) ($req->body['email'] ?? ''),
            (string) ($req->body['password'] ?? ''),
            (string) ($req->body['fullName'] ?? ''),
            $req->ip,
        );
        return $this->session(201, $result);
    }

    public function login(Request $req, array $params): Response
    {
        // Đăng nhập bằng mã học viên đã bị loại bỏ (không có xác thực); mọi vai trò dùng email + mật khẩu.
        if (($req->body['type'] ?? null) === 'learner' && !isset($req->body['email'])) {
            throw new HttpException(400, 'Đăng nhập bằng mã học viên không còn được hỗ trợ. Vui lòng dùng email và mật khẩu.');
        }
        $email = Validator::email($req->body['email'] ?? null);
        $password = (string) ($req->body['password'] ?? '');
        if ($password === '') {
            throw new HttpException(400, 'Vui lòng nhập đầy đủ email và mật khẩu.');
        }
        return $this->session(200, $this->auth->loginWithPassword($email, $password, $req->ip));
    }

    public function google(Request $req, array $params): Response
    {
        $credential = (string) ($req->body['credential'] ?? '');
        if ($credential === '') {
            throw new HttpException(400, 'Thiếu thông tin đăng nhập Google.');
        }
        return $this->session(200, $this->auth->loginWithGoogle($credential, $req->ip));
    }

    public function logout(Request $req, array $params): Response
    {
        $this->auth->logout($req->cookie(SessionCookie::NAME));
        return Response::json(200, ['success' => true, 'message' => 'Đã đăng xuất.'], [
            'Set-Cookie' => SessionCookie::clear(),
        ]);
    }

    public function forcedPasswordChange(Request $req, array $params): Response
    {
        $account = $this->authenticator->required($req);
        $token = $this->auth->completeForcedPasswordChange($account, (string) ($req->body['newPassword'] ?? ''));
        $fresh = $this->authenticator->service()->resolve($token);
        return Response::json(200, [
            'success' => true,
            'message' => 'Đổi mật khẩu thành công.',
            'user' => UserView::context($fresh),
        ], ['Set-Cookie' => SessionCookie::issue($token)]);
    }

    public function updateProfile(Request $req, array $params): Response
    {
        $account = $this->authenticator->required($req);
        $user = $this->accounts->updateProfile($account, $req->body);
        return Response::json(200, ['user' => $user, 'message' => 'Cập nhật thông tin cá nhân thành công.']);
    }

    public function changePassword(Request $req, array $params): Response
    {
        $account = $this->authenticator->required($req);
        $token = $this->auth->changePassword(
            $account,
            (string) ($req->body['currentPassword'] ?? ''),
            (string) ($req->body['newPassword'] ?? ''),
            (string) ($req->body['confirmPassword'] ?? ''),
        );
        $fresh = $this->authenticator->service()->resolve($token);
        return Response::json(200, [
            'user' => UserView::context($fresh),
            'message' => 'Đổi mật khẩu bảo mật thành công.',
        ], ['Set-Cookie' => SessionCookie::issue($token)]);
    }

    /** @param array{user: array<string, mixed>, token: string} $result */
    private function session(int $status, array $result): Response
    {
        return Response::json($status, ['user' => $result['user']], [
            'Set-Cookie' => SessionCookie::issue($result['token']),
        ]);
    }
}
