<?php

declare(strict_types=1);

namespace SonTra\Controllers;

use SonTra\Http\Authenticator;
use SonTra\Http\Request;
use SonTra\Http\Response;
use SonTra\Services\AccountService;
use SonTra\Services\AssessmentService;
use SonTra\Services\DashboardService;

final class AssessmentController
{
    public function __construct(
        private readonly Authenticator $authenticator,
        private readonly AssessmentService $assessments,
        private readonly DashboardService $dashboard,
        private readonly AccountService $accounts,
    ) {
    }

    public function list(Request $req, array $params): Response
    {
        return Response::json(200, ['assessments' => $this->assessments->list($this->authenticator->required($req))]);
    }

    public function learners(Request $req, array $params): Response
    {
        return Response::json(200, ['learners' => $this->accounts->learnersFor($this->authenticator->required($req))]);
    }

    public function create(Request $req, array $params): Response
    {
        $result = $this->assessments->create($this->authenticator->required($req), $req->body);
        return Response::json($result['created'] ? 201 : 200, [
            'assessment' => $result['assessment'],
            'message' => $result['created'] ? 'Đã lưu phiếu quan sát thực nghiệm.' : 'Phiếu này đã được lưu trước đó.',
        ]);
    }

    public function dashboard(Request $req, array $params): Response
    {
        return Response::json(200, ['summary' => $this->dashboard->summary($this->authenticator->required($req))]);
    }
}
