<?php

declare(strict_types=1);

namespace SonTra\Controllers;

use SonTra\Http\Authenticator;
use SonTra\Http\Request;
use SonTra\Http\Response;
use SonTra\Services\ProgressService;

final class LearnerController
{
    public function __construct(
        private readonly Authenticator $authenticator,
        private readonly ProgressService $progress,
    ) {
    }

    public function mine(Request $req, array $params): Response
    {
        return Response::json(200, ['progress' => $this->progress->forLearner($this->authenticator->required($req))]);
    }

    public function update(Request $req, array $params): Response
    {
        $row = $this->progress->update($this->authenticator->required($req), $req->body);
        return Response::json(200, ['progress' => $row]);
    }
}
