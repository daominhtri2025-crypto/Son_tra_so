<?php

declare(strict_types=1);

namespace SonTra\Controllers;

use SonTra\Http\Authenticator;
use SonTra\Http\Request;
use SonTra\Http\Response;
use SonTra\Services\HeroService;
use SonTra\Support\HttpException;

/** Ảnh trình chiếu trang chủ: công khai (đọc) và quản trị (quản lý). */
final class HeroController
{
    public function __construct(
        private readonly Authenticator $authenticator,
        private readonly HeroService $hero,
    ) {
    }

    /** GET /hero-slides — công khai, tối đa 5 slide. */
    public function publicList(Request $req, array $params): Response
    {
        return Response::json(200, ['slides' => $this->hero->publicSlides(), 'mode' => $this->hero->mode()]);
    }

    /** GET /admin/hero-slides — toàn bộ slide (kể cả đang ẩn) và chế độ hiển thị. */
    public function adminList(Request $req, array $params): Response
    {
        return Response::json(200, $this->hero->adminOverview($this->authenticator->required($req)));
    }

    /** POST /admin/hero-slides */
    public function create(Request $req, array $params): Response
    {
        $slide = $this->hero->create($this->authenticator->required($req), $req->body);
        return Response::json(201, ['slide' => $slide, 'message' => 'Đã thêm slide.']);
    }

    /** PUT /admin/hero-slides/{id} */
    public function update(Request $req, array $params): Response
    {
        $slide = $this->hero->update($this->authenticator->required($req), (int) $params['id'], $req->body);
        return Response::json(200, ['slide' => $slide, 'message' => 'Đã cập nhật slide.']);
    }

    /** DELETE /admin/hero-slides/{id} — xóa mềm. */
    public function delete(Request $req, array $params): Response
    {
        $this->hero->delete($this->authenticator->required($req), (int) $params['id']);
        return Response::json(200, ['message' => 'Đã xóa slide.']);
    }

    /** POST /admin/hero-slides/order — body: {ids: [...]} theo thứ tự hiển thị mới. */
    public function reorder(Request $req, array $params): Response
    {
        $ids = $req->body['ids'] ?? null;
        if (!is_array($ids)) {
            throw new HttpException(400, 'Thiếu danh sách ids.');
        }
        $this->hero->reorder($this->authenticator->required($req), $ids);
        return Response::json(200, ['message' => 'Đã lưu thứ tự hiển thị.']);
    }

    /** PUT /admin/hero-slides/mode — body: {mode: "order" | "random"} */
    public function setMode(Request $req, array $params): Response
    {
        $mode = $req->body['mode'] ?? '';
        $this->hero->setMode($this->authenticator->required($req), is_string($mode) ? $mode : '');
        return Response::json(200, ['mode' => $this->hero->mode(), 'message' => 'Đã lưu chế độ hiển thị.']);
    }
}
