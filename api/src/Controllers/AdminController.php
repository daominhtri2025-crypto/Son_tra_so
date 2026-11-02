<?php

declare(strict_types=1);

namespace SonTra\Controllers;

use SonTra\Http\Authenticator;
use SonTra\Http\Request;
use SonTra\Http\Response;
use SonTra\Services\AccountService;
use SonTra\Services\ProgressService;
use SonTra\Support\HttpException;

/** Quản trị tài khoản, tình nguyện viên và tiến độ toàn hệ thống. */
final class AdminController
{
    public function __construct(
        private readonly Authenticator $authenticator,
        private readonly AccountService $accounts,
        private readonly ProgressService $progress,
    ) {
    }

    public function users(Request $req, array $params): Response
    {
        $this->requireAdmin($req);
        return Response::json(200, $this->accounts->listForAdmin());
    }

    public function progress(Request $req, array $params): Response
    {
        return Response::json(200, ['progress' => $this->progress->all($this->authenticator->required($req))]);
    }

    public function createVolunteer(Request $req, array $params): Response
    {
        $this->requireAdmin($req);
        $volunteer = $this->accounts->createVolunteer($this->authenticator->required($req), $req->body);
        return Response::json(201, ['volunteer' => $volunteer, 'message' => 'Đã khởi tạo tài khoản tình nguyện viên.']);
    }

    public function updateAccount(Request $req, array $params): Response
    {
        $account = $this->accounts->updateAccount($this->authenticator->required($req), $params['id'], $req->body);
        return Response::json(200, ['account' => $account, 'message' => 'Đã cập nhật tài khoản.']);
    }

    private function requireAdmin(Request $req): void
    {
        if ($this->authenticator->required($req)['role'] !== 'admin') {
            throw new HttpException(403, 'Chỉ Quản trị viên mới có quyền này.');
        }
    }
}
