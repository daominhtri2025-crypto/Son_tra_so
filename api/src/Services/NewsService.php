<?php

declare(strict_types=1);

namespace SonTra\Services;

use DOMDocument;
use DOMXPath;
use SonTra\Repositories\NewsRepository;
use SonTra\Support\Clock;
use SonTra\Support\Env;
use SonTra\Support\HttpException;
use SonTra\Support\Validator;

/**
 * Bản tin Sơn Trà.
 *  - Tin đăng tay: Quản trị viên nhập, kèm liên kết nguồn chính thức (mặc định).
 *  - Đồng bộ tự động: CHỈ chạy khi NEWS_SYNC_ENABLED=true. Khi nguồn lỗi hoặc không có mục tin,
 *    trả lỗi rõ ràng. KHÔNG có dữ liệu dự phòng — tin không lấy được thì không được hiển thị như tin chính thức.
 */
final class NewsService
{
    private const SYNC_TIMEOUT_SECONDS = 8;
    private const MAX_SYNC_ITEMS = 10;

    public function __construct(private readonly NewsRepository $news)
    {
    }

    /** @return list<array<string, mixed>> */
    public function listFor(?array $account): array
    {
        $isAdmin = $account !== null && $account['role'] === 'admin';
        return array_map([$this, 'view'], $this->news->list($isAdmin));
    }

    /** @param array<string, mixed> $admin @param array<string, mixed> $input */
    public function create(array $admin, array $input): array
    {
        $this->assertAdmin($admin);
        $title = Validator::text($input['title'] ?? null, 'Tiêu đề bài viết', 5, 500);
        $summary = Validator::text($input['summary'] ?? null, 'Tóm tắt', 5, 1000);
        $sourceUrl = Validator::httpUrl($input['sourceUrl'] ?? null, 'Liên kết nguồn');
        $imageUrl = Validator::httpUrl($input['imageUrl'] ?? null, 'Ảnh minh họa');
        $now = Clock::nowUtc();

        $row = [
            'title' => $title,
            'summary' => $summary,
            'content' => Validator::optionalText($input['content'] ?? null, 20000) ?? $summary,
            'source_url' => $sourceUrl,
            'source_hash' => $sourceUrl === null ? null : hash('sha256', $sourceUrl),
            'image_url' => $imageUrl,
            'source' => 'manual',
            'hidden' => 0,
            'published_at' => $this->publishedAt($input['publishedAt'] ?? null, $now),
            'created_by' => mb_substr((string) ($admin['full_name'] ?? $admin['email']), 0, 200),
            'created_at' => $now,
            'updated_at' => $now,
        ];
        if ($row['source_hash'] !== null && $this->news->existsBySourceHash($row['source_hash'])) {
            throw new HttpException(409, 'Liên kết nguồn này đã có trong bản tin.');
        }
        $id = $this->news->insert($row);
        return $this->view($this->news->find($id));
    }

    public function toggle(array $admin, int $id): array
    {
        $this->assertAdmin($admin);
        $row = $this->news->find($id);
        if ($row === null) {
            throw new HttpException(404, 'Không tìm thấy bài viết.');
        }
        $this->news->setHidden($id, (int) $row['hidden'] !== 1);
        return $this->view($this->news->find($id));
    }

    /** @param array<string, mixed> $admin @return array<string, mixed> */
    public function sync(array $admin): array
    {
        $this->assertAdmin($admin);
        if (!Env::bool('NEWS_SYNC_ENABLED', false)) {
            throw new HttpException(403, 'Đồng bộ tự động đang tắt. Nguồn chưa cho phép truy cập tự động (MASTER_SPEC mục 12.6). Vui lòng đăng tin thủ công.');
        }

        $source = Env::get('NEWS_SOURCE_URL', 'https://sontra.danang.gov.vn/');
        $html = $this->fetch($source);
        $items = $this->parseFeatured($html, $source);
        if ($items === []) {
            throw new HttpException(422, 'Không tìm thấy mục "Tin nổi bật" trong trang nguồn. Không có dữ liệu nào được lưu.');
        }

        $added = 0;
        $skipped = 0;
        $now = Clock::nowUtc();
        foreach ($items as $item) {
            $hash = hash('sha256', $item['url']);
            if ($this->news->existsBySourceHash($hash)) {
                $skipped++;
                continue;
            }
            $this->news->insert([
                'title' => $item['title'],
                'summary' => $item['title'],
                'content' => null,
                'source_url' => $item['url'],
                'source_hash' => $hash,
                'image_url' => null,
                'source' => 'sontra_gov',
                'hidden' => 0,
                'published_at' => $now,
                'created_by' => 'Đồng bộ từ cổng ' . parse_url($source, PHP_URL_HOST),
                'crawled_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $added++;
        }

        return [
            'success' => true,
            'added' => $added,
            'skipped' => $skipped,
            'total' => count($items),
            'source' => $source,
            'timestamp' => Clock::toIso($now),
            'message' => sprintf('Đã đồng bộ từ %s: thêm %d tin mới, bỏ qua %d tin đã có.', $source, $added, $skipped),
            'items' => array_map([$this, 'view'], $this->news->list(true)),
        ];
    }

    private function fetch(string $url): string
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_TIMEOUT => self::SYNC_TIMEOUT_SECONDS,
            CURLOPT_USERAGENT => 'SonTraSoBot/1.0 (+bản tin đồng bộ)',
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        if ($body === false || $status >= 400) {
            throw new HttpException(502, 'Không kết nối được tới cổng nguồn. Không có dữ liệu nào được lưu.');
        }
        return (string) $body;
    }

    /**
     * Tìm liên kết trong khối có class chứa "noi-bat" (tin nổi bật).
     *
     * @return list<array{title:string, url:string}>
     */
    public function parseFeatured(string $html, string $baseUrl): array
    {
        $dom = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new DOMXPath($dom);
        $containers = $xpath->query('//*[contains(translate(@class, "ABCDEFGHIJKLMNOPQRSTUVWXYZ_", "abcdefghijklmnopqrstuvwxyz-"), "noi-bat")]');
        $items = [];
        $seen = [];
        foreach ($containers ?: [] as $container) {
            foreach ($xpath->query('.//a[@href]', $container) ?: [] as $anchor) {
                $title = trim(preg_replace('/\s+/u', ' ', (string) ($anchor->getAttribute('title') ?: $anchor->textContent)) ?? '');
                $href = trim($anchor->getAttribute('href'));
                if (mb_strlen($title) < 15 || $href === '' || str_starts_with(strtolower($href), 'javascript:') || $href === '#') {
                    continue;
                }
                $url = $this->absoluteUrl($href, $baseUrl);
                if ($url === null || isset($seen[$url])) {
                    continue;
                }
                $seen[$url] = true;
                $items[] = ['title' => mb_substr($title, 0, 500), 'url' => $url];
                if (count($items) >= self::MAX_SYNC_ITEMS) {
                    return $items;
                }
            }
        }
        return $items;
    }

    private function absoluteUrl(string $href, string $baseUrl): ?string
    {
        if (preg_match('#^https?://#i', $href)) {
            return $href;
        }
        $base = parse_url($baseUrl);
        if (!isset($base['scheme'], $base['host'])) {
            return null;
        }
        $origin = $base['scheme'] . '://' . $base['host'];
        return str_starts_with($href, '/') ? $origin . $href : $origin . '/' . $href;
    }

    private function publishedAt(mixed $value, string $fallback): string
    {
        if (!is_string($value) || $value === '') {
            return $fallback;
        }
        $ts = strtotime($value);
        if ($ts === false) {
            throw new HttpException(400, 'Ngày đăng không hợp lệ.');
        }
        return gmdate('Y-m-d H:i:s', $ts);
    }

    private function assertAdmin(array $account): void
    {
        if ($account['role'] !== 'admin') {
            throw new HttpException(403, 'Chỉ Quản trị viên mới được quản lý bản tin.');
        }
    }

    /** @param array<string, mixed> $row */
    public function view(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'summary' => $row['summary'],
            'content' => $row['content'],
            'source_url' => $row['source_url'],
            'image_url' => $row['image_url'],
            'source' => $row['source'],
            'status' => 'published',
            'crawled_at' => Clock::toIso($row['crawled_at'] ?? null),
            'hidden' => (int) $row['hidden'],
            'published_at' => Clock::toIso($row['published_at']),
            'created_by' => $row['created_by'],
            'created' => Clock::toIso($row['created_at']),
            'updated' => Clock::toIso($row['updated_at']),
        ];
    }
}
