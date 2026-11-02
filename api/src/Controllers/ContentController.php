<?php

declare(strict_types=1);

namespace SonTra\Controllers;

use SonTra\Http\Authenticator;
use SonTra\Http\Request;
use SonTra\Http\Response;
use SonTra\Services\LessonService;
use SonTra\Services\MediaService;
use SonTra\Services\NewsService;
use SonTra\Support\HttpException;

/** Bài học, bản tin và tệp đa phương tiện. */
final class ContentController
{
    public function __construct(
        private readonly Authenticator $authenticator,
        private readonly LessonService $lessons,
        private readonly NewsService $news,
        private readonly MediaService $media,
    ) {
    }

    public function lessons(Request $req, array $params): Response
    {
        $account = $this->authenticator->optional($req);
        return Response::json(200, ['lessons' => $this->lessons->listFor($account)]);
    }

    public function lessonVersions(Request $req, array $params): Response
    {
        return Response::json(200, ['versions' => $this->lessons->versions($this->authenticator->required($req))]);
    }

    public function createLesson(Request $req, array $params): Response
    {
        $lesson = $this->lessons->create($this->authenticator->required($req), $req->body);
        return Response::json(201, ['lesson' => $lesson, 'message' => 'Đã tạo bài học mới.']);
    }

    public function updateLesson(Request $req, array $params): Response
    {
        $lesson = $this->lessons->update($this->authenticator->required($req), (int) $params['no'], $req->body);
        return Response::json(200, ['lesson' => $lesson, 'message' => 'Đã cập nhật bài học và lưu phiên bản cũ.']);
    }

    public function deleteLesson(Request $req, array $params): Response
    {
        $lesson = $this->lessons->softDelete($this->authenticator->required($req), (int) $params['no']);
        return Response::json(200, ['lesson' => $lesson, 'message' => 'Đã xóa mềm bài học (giữ lịch sử).']);
    }

    public function restoreLesson(Request $req, array $params): Response
    {
        $lesson = $this->lessons->restore($this->authenticator->required($req), (int) $params['no']);
        return Response::json(200, ['lesson' => $lesson, 'message' => 'Đã khôi phục bài học.']);
    }

    public function toggleLesson(Request $req, array $params): Response
    {
        $lesson = $this->lessons->toggleVisibility($this->authenticator->required($req), (int) $params['no']);
        return Response::json(200, ['lesson' => $lesson, 'message' => 'Đã đổi trạng thái ẩn/hiện.']);
    }

    /** Tệp đa phương tiện gửi dạng multipart/form-data: fields "kind" (video|audio) và "file". */
    public function uploadMedia(Request $req, array $params): Response
    {
        $this->requireAdmin($req);
        $file = $_FILES['file'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new HttpException(400, 'Tải tệp lên thất bại hoặc tệp vượt giới hạn máy chủ (upload_max_filesize).');
        }
        $stored = $this->media->store((string) ($_POST['kind'] ?? ''), (string) $file['tmp_name'], (string) $file['name']);
        return Response::json(201, $stored);
    }

    public function news(Request $req, array $params): Response
    {
        $account = $this->authenticator->optional($req);
        return Response::json(200, ['news' => $this->news->listFor($account)]);
    }

    public function createNews(Request $req, array $params): Response
    {
        $item = $this->news->create($this->authenticator->required($req), $req->body);
        return Response::json(201, ['news' => $item, 'message' => 'Đã đăng bài viết mới.']);
    }

    public function toggleNews(Request $req, array $params): Response
    {
        $item = $this->news->toggle($this->authenticator->required($req), (int) $params['id']);
        return Response::json(200, ['news' => $item, 'message' => 'Đã đổi trạng thái bài viết.']);
    }

    public function syncNews(Request $req, array $params): Response
    {
        return Response::json(200, $this->news->sync($this->authenticator->required($req)));
    }

    private function requireAdmin(Request $req): void
    {
        if ($this->authenticator->required($req)['role'] !== 'admin') {
            throw new HttpException(403, 'Chỉ Quản trị viên được tải tệp đa phương tiện.');
        }
    }
}
