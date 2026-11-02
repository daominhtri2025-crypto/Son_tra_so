<?php

declare(strict_types=1);

namespace SonTra\Http;

use SonTra\Controllers\AdminController;
use SonTra\Controllers\AssessmentController;
use SonTra\Controllers\AuthController;
use SonTra\Controllers\ContentController;
use SonTra\Controllers\LearnerController;
use SonTra\Repositories\AssessmentRepository;
use SonTra\Repositories\LessonRepository;
use SonTra\Repositories\NewsRepository;
use SonTra\Repositories\ProgressRepository;
use SonTra\Repositories\RateLimitRepository;
use SonTra\Repositories\SessionRepository;
use SonTra\Repositories\UserRepository;
use SonTra\Services\AccountService;
use SonTra\Services\AssessmentService;
use SonTra\Services\AuthService;
use SonTra\Services\DashboardService;
use SonTra\Services\GoogleTokenVerifier;
use SonTra\Services\LessonService;
use SonTra\Services\MediaService;
use SonTra\Services\NewsService;
use SonTra\Services\ProgressService;

/**
 * Container thủ công: ghép Repository → Service → Controller (Dependency Injection không cần thư viện).
 * Mỗi đối tượng được tạo một lần cho một request.
 */
final class Container
{
    private array $instances = [];

    public function get(string $class): object
    {
        return $this->instances[$class] ??= $this->build($class);
    }

    private function build(string $class): object
    {
        return match ($class) {
            UserRepository::class, SessionRepository::class, RateLimitRepository::class,
            LessonRepository::class, ProgressRepository::class, AssessmentRepository::class,
            NewsRepository::class => new $class(),
            GoogleTokenVerifier::class, MediaService::class => new $class(),
            AuthService::class => new AuthService(
                $this->get(UserRepository::class),
                $this->get(SessionRepository::class),
                $this->get(RateLimitRepository::class),
                $this->get(GoogleTokenVerifier::class),
            ),
            AccountService::class => new AccountService(
                $this->get(UserRepository::class),
                $this->get(SessionRepository::class),
            ),
            LessonService::class => new LessonService($this->get(LessonRepository::class)),
            ProgressService::class => new ProgressService(
                $this->get(ProgressRepository::class),
                $this->get(LessonRepository::class),
            ),
            AssessmentService::class => new AssessmentService(
                $this->get(AssessmentRepository::class),
                $this->get(UserRepository::class),
            ),
            DashboardService::class => new DashboardService(
                $this->get(AssessmentRepository::class),
                $this->get(UserRepository::class),
            ),
            NewsService::class => new NewsService($this->get(NewsRepository::class)),
            Authenticator::class => new Authenticator($this->get(AuthService::class)),
            AuthController::class => new AuthController(
                $this->get(Authenticator::class),
                $this->get(AuthService::class),
                $this->get(AccountService::class),
            ),
            ContentController::class => new ContentController(
                $this->get(Authenticator::class),
                $this->get(LessonService::class),
                $this->get(NewsService::class),
                $this->get(MediaService::class),
            ),
            LearnerController::class => new LearnerController(
                $this->get(Authenticator::class),
                $this->get(ProgressService::class),
            ),
            AssessmentController::class => new AssessmentController(
                $this->get(Authenticator::class),
                $this->get(AssessmentService::class),
                $this->get(DashboardService::class),
                $this->get(AccountService::class),
            ),
            AdminController::class => new AdminController(
                $this->get(Authenticator::class),
                $this->get(AccountService::class),
                $this->get(ProgressService::class),
            ),
            default => throw new \LogicException('Không có định nghĩa container cho ' . $class),
        };
    }
}
