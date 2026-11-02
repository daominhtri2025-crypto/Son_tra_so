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

    /** @param array<string, mixed> $params */
    public function answer(Request $req, array $params): Response
    {
        $result = $this->progress->answerQuiz($this->authenticator->required($req), (int) $params['no'], $req->body['choice'] ?? null);
        return Response::json(200, $result);
    }
}
