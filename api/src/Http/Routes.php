<?php

declare(strict_types=1);

namespace SonTra\Http;

use SonTra\Controllers\AdminController;
use SonTra\Controllers\AssessmentController;
use SonTra\Controllers\AuthController;
use SonTra\Controllers\ContentController;
use SonTra\Controllers\LearnerController;

/** Bảng định tuyến API. Đường dẫn không kèm tiền tố /api. */
final class Routes
{
    public static function register(Router $router, Container $c): void
    {
        $auth = $c->get(AuthController::class);
        $content = $c->get(ContentController::class);
        $learner = $c->get(LearnerController::class);
        $assessment = $c->get(AssessmentController::class);
        $admin = $c->get(AdminController::class);

        // Xác thực và hồ sơ
        $router->add('GET', '/me', [$auth, 'me']);
        $router->add('POST', '/auth/register', [$auth, 'register']);
        $router->add('POST', '/auth/login', [$auth, 'login']);
        $router->add('POST', '/auth/google', [$auth, 'google']);
        $router->add('POST', '/auth/logout', [$auth, 'logout']);
        $router->add('POST', '/auth/forgot-password', [$auth, 'forgotPassword']);
        $router->add('POST', '/auth/reset-password', [$auth, 'resetPassword']);
        $router->add('POST', '/auth/change-password', [$auth, 'forcedPasswordChange']);
        $router->add('POST', '/profile', [$auth, 'updateProfile']);
        $router->add('POST', '/profile/password', [$auth, 'changePassword']);

        // Nội dung công khai (học viên, khách): bài học và bản tin
        $router->add('GET', '/lessons', [$content, 'lessons']);
        $router->add('GET', '/news', [$content, 'news']);

        // Học viên: tiến độ
        $router->add('GET', '/progress', [$learner, 'mine']);
        $router->add('PUT', '/progress', [$learner, 'update']);
        $router->add('POST', '/lessons/{no}/answer', [$learner, 'answer']);

        // Tình nguyện viên & Quản trị viên: phiếu quan sát và bảng tổng hợp
        $router->add('GET', '/learners', [$assessment, 'learners']);
        $router->add('GET', '/assessments', [$assessment, 'list']);
        $router->add('POST', '/assessments', [$assessment, 'create']);
        $router->add('GET', '/dashboard', [$assessment, 'dashboard']);

        // Quản trị viên
        $router->add('GET', '/admin/users', [$admin, 'users']);
        $router->add('GET', '/admin/progress', [$admin, 'progress']);
        $router->add('POST', '/admin/volunteers', [$admin, 'createVolunteer']);
        $router->add('PUT', '/admin/accounts/{id}', [$admin, 'updateAccount']);
        $router->add('GET', '/admin/lessons', [$content, 'lessons']);
        $router->add('POST', '/admin/lessons', [$content, 'createLesson']);
        $router->add('PUT', '/admin/lessons/{no}', [$content, 'updateLesson']);
        $router->add('DELETE', '/admin/lessons/{no}', [$content, 'deleteLesson']);
        $router->add('POST', '/admin/lessons/{no}/toggle', [$content, 'toggleLesson']);
        $router->add('POST', '/admin/lessons/{no}/restore', [$content, 'restoreLesson']);
        $router->add('GET', '/admin/lesson-versions', [$content, 'lessonVersions']);
        $router->add('POST', '/admin/media', [$content, 'uploadMedia']);
        $router->add('POST', '/admin/news', [$content, 'createNews']);
        $router->add('POST', '/admin/news/{id}/toggle', [$content, 'toggleNews']);
        $router->add('POST', '/admin/news/sync', [$content, 'syncNews']);
    }
}
