<?php

declare(strict_types=1);

namespace SonTra\Http;

use SonTra\Controllers\AdminController;
use SonTra\Controllers\AssessmentController;
use SonTra\Controllers\AuthController;
use SonTra\Controllers\ContentController;
use SonTra\Controllers\HeroController;
use SonTra\Controllers\LearnerController;
use SonTra\Repositories\AssessmentRepository;
use SonTra\Repositories\LessonRepository;
use SonTra\Repositories\HeroRepository;
use SonTra\Repositories\NewsRepository;
use SonTra\Repositories\ProgressRepository;
use SonTra\Repositories\RateLimitRepository;
use SonTra\Repositories\SessionRepository;
use SonTra\Repositories\UserRepository;
use SonTra\Services\AccountService;
use SonTra\Services\AssessmentService;
use SonTra\Services\AuthService;
use SonTra\Services\PasswordBreachChecker;
use SonTra\Services\PasswordPolicy;
use SonTra\Services\PasswordResetService;
use SonTra\Support\Mailer;
use SonTra\Support\PhpMailer;
use SonTra\Support\SmtpMailer;
use SonTra\Support\Env;
use SonTra\Services\DashboardService;
use SonTra\Services\GoogleTokenVerifier;
use SonTra\Services\LessonService;
use SonTra\Services\MediaService;
use SonTra\Services\HeroService;
use SonTra\Services\NewsService;
use SonTra\Services\ProgressService;

/**
 * Container thủ công: ghép Repository → Service → Controller (Dependency Injection không cần thư viện).
 * Mỗi đối tượng được tạo một lần cho một request.
 */
final class Container
{
    private array $instances = [];

    /** Thay thế một phụ thuộc (dùng trong kiểm thử, ví dụ thư giả hoặc dịch vụ mạng giả). */
    public function override(string $class, object $instance): void
    {
        $this->instances[$class] = $instance;
    }

    public function get(string $class): object
    {
        return $this->instances[$class] ??= $this->build($class);
    }

    /** Chọn bộ gửi thư: SMTP nếu MAIL_DRIVER=smtp hoặc có SMTP_HOST; ngược lại dùng hàm mail() của PHP. */
    private function mailer(): Mailer
    {
        $driver = Env::get('MAIL_DRIVER') ?: (Env::get('SMTP_HOST') !== '' ? 'smtp' : 'mail');
        return $driver === 'smtp' ? SmtpMailer::fromEnv() : new PhpMailer();
    }

    private function build(string $class): object
    {
        return match ($class) {
            UserRepository::class, SessionRepository::class, RateLimitRepository::class,
            LessonRepository::class, ProgressRepository::class, AssessmentRepository::class,
            NewsRepository::class, HeroRepository::class => new $class(),
            GoogleTokenVerifier::class, MediaService::class => new $class(),
            PasswordBreachChecker::class => new PasswordBreachChecker(),
            Mailer::class => $this->mailer(),
            PasswordPolicy::class => new PasswordPolicy($this->get(PasswordBreachChecker::class)),
            PasswordResetService::class => new PasswordResetService(
                $this->get(UserRepository::class),
                $this->get(SessionRepository::class),
                $this->get(RateLimitRepository::class),
                $this->get(PasswordPolicy::class),
                $this->get(Mailer::class),
            ),
            AuthService::class => new AuthService(
                $this->get(UserRepository::class),
                $this->get(SessionRepository::class),
                $this->get(RateLimitRepository::class),
                $this->get(GoogleTokenVerifier::class),
                $this->get(PasswordPolicy::class),
            ),
            AccountService::class => new AccountService(
                $this->get(UserRepository::class),
                $this->get(SessionRepository::class),
                $this->get(PasswordPolicy::class),
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
            HeroService::class => new HeroService($this->get(HeroRepository::class)),
            Authenticator::class => new Authenticator($this->get(AuthService::class)),
            AuthController::class => new AuthController(
                $this->get(Authenticator::class),
                $this->get(AuthService::class),
                $this->get(AccountService::class),
                $this->get(PasswordResetService::class),
            ),
            ContentController::class => new ContentController(
                $this->get(Authenticator::class),
                $this->get(LessonService::class),
                $this->get(NewsService::class),
                $this->get(MediaService::class),
            ),
            HeroController::class => new HeroController(
                $this->get(Authenticator::class),
                $this->get(HeroService::class),
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
