<?php

declare(strict_types=1);

namespace SonTra\Support;

use PDO;
use PDOException;

/**
 * Kết nối PDO MySQL dùng chung (một kết nối mỗi request).
 * Lệnh SQL luôn dùng prepared statement; không nối chuỗi dữ liệu người dùng.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function connection(): PDO
    {
        if (self::$pdo === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                Env::get('DB_HOST', 'localhost'),
                Env::get('DB_PORT', '3306'),
                Env::get('DB_NAME'),
                Env::get('DB_CHARSET', 'utf8mb4')
            );
            try {
                self::$pdo = new PDO($dsn, Env::get('DB_USER'), Env::get('DB_PASS'), [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '+00:00'",
                ]);
            } catch (PDOException $e) {
                // Không lộ thông tin kết nối ra ngoài; chi tiết ghi vào nhật ký máy chủ.
                error_log('[SonTra] Database connection failed: ' . $e->getMessage());
                throw new HttpException(503, 'Hệ thống đang tạm thời không khả dụng. Vui lòng thử lại sau.');
            }
        }
        return self::$pdo;
    }

    /**
     * Thực thi $work trong giao dịch. Tự rollback khi có ngoại lệ.
     *
     * @template T
     * @param callable(PDO): T $work
     * @return T
     */
    public static function transaction(callable $work): mixed
    {
        $pdo = self::connection();
        $pdo->beginTransaction();
        try {
            $result = $work($pdo);
            $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
