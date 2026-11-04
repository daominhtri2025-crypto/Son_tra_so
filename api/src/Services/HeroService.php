<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Repositories\HeroRepository;
use SonTra\Support\Clock;
use SonTra\Support\Database;
use SonTra\Support\HttpException;
use SonTra\Support\Validator;

/**
 * Ảnh trình chiếu trang chủ.
 * - Quản trị có thể tạo nhiều slide; máy chủ chỉ hiển thị tối đa MAX_VISIBLE slide cùng lúc.
 * - Chế độ hiển thị: "order" (theo thứ tự sắp xếp) hoặc "random" (ngẫu nhiên mỗi lần tải trang).
 */
final class HeroService
{
    public const MAX_VISIBLE = 5;
    private const MODES = ['order', 'random'];

    public function __construct(private readonly HeroRepository $repo)
    {
    }

    /** Danh sách công khai: tối đa MAX_VISIBLE slide đang hiện, theo chế độ đã chọn. @return list<array<string, mixed>> */
    public function publicSlides(): array
    {
        $rows = $this->repo->listVisible();
        if ($this->mode() === 'random') {
            shuffle($rows);
        }
        return array_map([$this, 'view'], array_slice($rows, 0, self::MAX_VISIBLE));
    }

    /** @param array<string, mixed> $admin @return array{slides: list<array<string, mixed>>, mode: string, maxVisible: int} */
    public function adminOverview(array $admin): array
    {
        $this->assertAdmin($admin);
        return [
            'slides' => array_map([$this, 'view'], $this->repo->listAll()),
            'mode' => $this->mode(),
            'maxVisible' => self::MAX_VISIBLE,
        ];
    }

    /** @param array<string, mixed> $admin @param array<string, mixed> $input @return array<string, mixed> */
    public function create(array $admin, array $input): array
    {
        $this->assertAdmin($admin);
        $now = Clock::nowUtc();
        $fields = $this->validate($input, true);
        $fields += [
            'sort_order' => $this->repo->maxSortOrder() + 1,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $id = $this->repo->insert($fields);
        return $this->view($this->repo->find($id));
    }

    /** @param array<string, mixed> $admin @param array<string, mixed> $input @return array<string, mixed> */
    public function update(array $admin, int $id, array $input): array
    {
        $this->assertAdmin($admin);
        $this->requireSlide($id);
        $fields = $this->validate($input, false);
        if ($fields !== []) {
            $fields['updated_at'] = Clock::nowUtc();
            $this->repo->update($id, $fields);
        }
        return $this->view($this->repo->find($id));
    }

    /** @param array<string, mixed> $admin */
    public function delete(array $admin, int $id): void
    {
        $this->assertAdmin($admin);
        $this->requireSlide($id);
        $now = Clock::nowUtc();
        $this->repo->softDelete($id, $now);
    }

    /** @param array<string, mixed> $admin @param list<mixed> $ids */
    public function reorder(array $admin, array $ids): void
    {
        $this->assertAdmin($admin);
        $list = array_values(array_unique(array_map(static fn($v): int => (int) $v, $ids)));
        if ($list === []) {
            throw new HttpException(400, 'Danh sách thứ tự không được để trống.');
        }
        Database::transaction(function () use ($list): void {
            foreach ($list as $position => $id) {
                $this->requireSlide($id);
                $this->repo->update($id, ['sort_order' => $position + 1, 'updated_at' => Clock::nowUtc()]);
            }
        });
    }

    /** @param array<string, mixed> $admin */
    public function setMode(array $admin, string $mode): void
    {
        $this->assertAdmin($admin);
        if (!in_array($mode, self::MODES, true)) {
            throw new HttpException(400, 'Chế độ hiển thị không hợp lệ (order hoặc random).');
        }
        $this->repo->setSetting('hero_mode', $mode, Clock::nowUtc());
    }

    public function mode(): string
    {
        $value = $this->repo->getSetting('hero_mode');
        return in_array($value, self::MODES, true) ? (string) $value : 'order';
    }

    /**
     * Kiểm tra dữ liệu slide. Khi tạo mới ($create = true), các trường bắt buộc phải có.
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function validate(array $input, bool $create): array
    {
        $fields = [];
        if ($create || array_key_exists('title', $input)) {
            $fields['title'] = Validator::text($input['title'] ?? null, 'Tiêu đề', 3, 200);
        }
        if (array_key_exists('body', $input)) {
            $fields['body'] = Validator::optionalText($input['body'], 1000);
        }
        if ($create || array_key_exists('imageUrl', $input)) {
            $fields['image_url'] = $this->imageUrl($input['imageUrl'] ?? null);
        }
        if (array_key_exists('buttonLabel', $input)) {
            $fields['button_label'] = Validator::optionalText($input['buttonLabel'], 80);
        }
        if (array_key_exists('buttonUrl', $input)) {
            $fields['button_url'] = $this->linkUrl($input['buttonUrl']);
        }
        if (array_key_exists('hidden', $input)) {
            $fields['hidden'] = $input['hidden'] ? 1 : 0;
        }
        return $fields;
    }

    /** Ảnh: đường dẫn tải lên (/uploads/media/...) hoặc http(s). */
    private function imageUrl(mixed $value): string
    {
        if (!is_string($value) || trim($value) === '') {
            throw new HttpException(400, 'Ảnh minh họa là bắt buộc. Hãy tải ảnh lên hoặc dán đường dẫn ảnh.');
        }
        $url = trim($value);
        if (str_starts_with($url, '/uploads/media/')) {
            return mb_substr($url, 0, 500);
        }
        return Validator::httpUrl($url, 'Ảnh minh họa', true) ?? '';
    }

    /** Liên kết nút: http(s) hoặc đường dẫn nội bộ bắt đầu bằng "/". */
    private function linkUrl(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_string($value) && str_starts_with(trim($value), '/') && !str_starts_with(trim($value), '//')) {
            return mb_substr(trim($value), 0, 500);
        }
        return Validator::httpUrl($value, 'Liên kết nút', false);
    }

    private function requireSlide(int $id): void
    {
        if ($this->repo->find($id) === null) {
            throw new HttpException(404, 'Không tìm thấy slide.');
        }
    }

    /** @param array<string, mixed> $admin */
    private function assertAdmin(array $admin): void
    {
        if (($admin['role'] ?? '') !== 'admin') {
            throw new HttpException(403, 'Chỉ Quản trị viên mới được quản lý ảnh trình chiếu.');
        }
    }

    /** @param array<string, mixed>|null $row @return array<string, mixed> */
    public function view(?array $row): array
    {
        if ($row === null) {
            throw new HttpException(404, 'Không tìm thấy slide.');
        }
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'body' => $row['body'],
            'imageUrl' => $row['image_url'],
            'buttonLabel' => $row['button_label'],
            'buttonUrl' => $row['button_url'],
            'sortOrder' => (int) $row['sort_order'],
            'hidden' => (int) $row['hidden'] === 1,
            'updated' => $row['updated_at'],
        ];
    }
}
