<?php

declare(strict_types=1);

namespace SonTra\Services;

use SonTra\Repositories\NewsRepository;
use SonTra\Support\Clock;
use SonTra\Support\Env;
use SonTra\Support\HttpException;
use SonTra\Support\Validator;

/**
 * Bản tin Sơn Trà.
 *  - Tin đăng tay: Quản trị viên nhập, kèm liên kết nguồn (mặc định).
 *  - Đồng bộ RSS/Atom: CHỈ chạy khi NEWS_SYNC_ENABLED=true và NEWS_FEED_URL trỏ tới nguồn đã được cấp phép.
 *    Không có dữ liệu dự phòng; lỗi nguồn thì trả lỗi rõ ràng và không lưu gì.
 */
final class NewsService
{
    private const SYNC_TIMEOUT_SECONDS = 8;
    private const MAX_SYNC_ITEMS = 20;
    private const MAX_FEED_BYTES = 2 * 1024 * 1024;

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

    /**
     * Đồng bộ tin từ nguồn RSS/Atom do chủ dự án cấu hình (NEWS_FEED_URL).
     * Chỉ chạy khi NEWS_SYNC_ENABLED=true. Không có dữ liệu dự phòng: lỗi nguồn thì không lưu gì.
     *
     * @param array<string, mixed> $admin
     * @return array<string, mixed>
     */
    public function sync(array $admin): array
    {
        $this->assertAdmin($admin);
        if (!Env::bool('NEWS_SYNC_ENABLED', false)) {
            throw new HttpException(403, 'Đồng bộ tin tự động đang tắt. Chỉ bật khi có nguồn RSS/Atom được cấp phép (NEWS_FEED_URL).');
        }
        $feedUrl = Env::get('NEWS_FEED_URL');
        if ($feedUrl === '' || !preg_match('#^https?://#i', $feedUrl)) {
            throw new HttpException(503, 'Chưa cấu hình NEWS_FEED_URL. Không có dữ liệu nào được lưu.');
        }

        $items = $this->parseFeed($this->fetch($feedUrl), $feedUrl);
        if ($items === []) {
            throw new HttpException(422, 'Nguồn không có mục tin nào đọc được (RSS/Atom). Không có dữ liệu nào được lưu.');
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
                'summary' => $item['summary'],
                'content' => null,
                'source_url' => $item['url'],
                'source_hash' => $hash,
                'image_url' => null,
                'source' => 'feed',
                'hidden' => 0,
                'published_at' => $item['published'] ?? $now,
                'created_by' => 'Nguồn RSS: ' . parse_url($feedUrl, PHP_URL_HOST),
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
            'source' => $feedUrl,
            'timestamp' => Clock::toIso($now),
            'message' => sprintf('Đã đọc nguồn RSS/Atom: thêm %d tin mới, bỏ qua %d tin đã có.', $added, $skipped),
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
            CURLOPT_USERAGENT => 'SonTraSoBot/1.0 (đồng bộ bản tin đã được cấp phép)',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_MAXFILESIZE => self::MAX_FEED_BYTES,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        if ($body === false || $status >= 400 || strlen((string) $body) > self::MAX_FEED_BYTES) {
            throw new HttpException(502, 'Không đọc được nguồn RSS/Atom. Không có dữ liệu nào được lưu.');
        }
        return (string) $body;
    }

    /**
     * Đọc RSS 2.0 (channel/item) hoặc Atom (entry). Không tải tài nguyên ngoài (LIBXML_NONET).
     *
     * @return list<array{title:string, url:string, summary:string, published:?string}>
     */
    public function parseFeed(string $xml, string $baseUrl): array
    {
        $previous = libxml_use_internal_errors(true);
        $doc = simplexml_load_string($xml, \SimpleXMLElement::class, LIBXML_NONET | LIBXML_NOCDATA);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if ($doc === false) {
            return [];
        }

        $entries = [];
        $isAtom = $doc->getName() === 'feed';
        $nodes = $isAtom ? $doc->entry : $doc->channel->item;
        foreach ($nodes ?? [] as $node) {
            $title = $this->clean((string) $node->title);
            $url = $isAtom ? $this->atomLink($node) : trim((string) $node->link);
            $url = $this->absoluteUrl($url, $baseUrl);
            if (mb_strlen($title) < 5 || $url === null || !preg_match('#^https?://#i', $url)) {
                continue;
            }
            $summary = $this->clean((string) ($isAtom ? ($node->summary ?: $node->content) : $node->description));
            $date = $isAtom ? ((string) $node->published ?: (string) $node->updated) : (string) $node->pubDate;
            $ts = $date !== '' ? strtotime($date) : false;
            $entries[] = [
                'title' => mb_substr($title, 0, 500),
                'url' => $url,
                'summary' => mb_substr($summary !== '' ? $summary : $title, 0, 1000),
                'published' => $ts === false ? null : gmdate('Y-m-d H:i:s', $ts),
            ];
            if (count($entries) >= self::MAX_SYNC_ITEMS) {
                break;
            }
        }
        return $entries;
    }

    private function atomLink(\SimpleXMLElement $node): string
    {
        foreach ($node->link as $link) {
            $rel = (string) ($link['rel'] ?? 'alternate');
            if ($rel === 'alternate' || $rel === '') {
                return trim((string) $link['href']);
            }
        }
        return '';
    }

    private function clean(string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', strip_tags(html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8'))));
    }

    private function absoluteUrl(string $href, string $baseUrl): ?string
    {
        if (preg_match('#^https?://#i', $href)) {
            return $href;
        }
        $base = parse_url($baseUrl);
        if (!isset($base['scheme'], $base['host']) || $href === '') {
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
