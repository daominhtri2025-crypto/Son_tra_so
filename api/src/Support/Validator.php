<?php

declare(strict_types=1);

namespace SonTra\Support;

/**
 * Kiểm tra đầu vào tập trung. Mọi hàm ném HttpException(400) với thông điệp tiếng Việt.
 */
final class Validator
{
    public const PASSWORD_MIN = 10;
    public const PASSWORD_MAX = 200;

    public static function email(mixed $value): string
    {
        $email = is_string($value) ? strtolower(trim($value)) : '';
        if ($email === '' || strlen($email) > 190 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new HttpException(400, 'Địa chỉ email không hợp lệ.');
        }
        return $email;
    }

    public static function text(mixed $value, string $field, int $min, int $max): string
    {
        $text = is_string($value) ? trim($value) : '';
        $length = mb_strlen($text, 'UTF-8');
        if ($length < $min || $length > $max) {
            throw new HttpException(400, sprintf('%s phải có từ %d đến %d ký tự.', $field, $min, $max));
        }
        return $text;
    }

    public static function optionalText(mixed $value, int $max): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            throw new HttpException(400, 'Dữ liệu văn bản không hợp lệ.');
        }
        $text = trim($value);
        if (mb_strlen($text, 'UTF-8') > $max) {
            throw new HttpException(400, sprintf('Nội dung vượt quá %d ký tự.', $max));
        }
        return $text === '' ? null : $text;
    }

    public static function password(mixed $value): string
    {
        if (!is_string($value)) {
            throw new HttpException(400, 'Mật khẩu không hợp lệ.');
        }
        $length = mb_strlen($value, 'UTF-8');
        if ($length < self::PASSWORD_MIN || $length > self::PASSWORD_MAX) {
            throw new HttpException(400, sprintf(
                'Mật khẩu phải có độ dài từ %d đến %d ký tự theo Quy tắc 4.13.',
                self::PASSWORD_MIN,
                self::PASSWORD_MAX
            ));
        }
        return $value;
    }

    public static function int(mixed $value, string $field, int $min, int $max): int
    {
        if (is_string($value) && ctype_digit($value)) {
            $value = (int) $value;
        }
        if (!is_int($value) || $value < $min || $value > $max) {
            throw new HttpException(400, sprintf('%s phải là số nguyên từ %d đến %d.', $field, $min, $max));
        }
        return $value;
    }

    public static function nullableInt(mixed $value, string $field, int $min, int $max): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        return self::int($value, $field, $min, $max);
    }

    public static function httpUrl(mixed $value, string $field, bool $required = false): ?string
    {
        if ($value === null || $value === '') {
            if ($required) {
                throw new HttpException(400, sprintf('%s là bắt buộc.', $field));
            }
            return null;
        }
        $url = is_string($value) ? trim($value) : '';
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true) || filter_var($url, FILTER_VALIDATE_URL) === false) {
            throw new HttpException(400, sprintf('%s phải là đường dẫn http hoặc https hợp lệ.', $field));
        }
        if (strlen($url) > 500) {
            throw new HttpException(400, sprintf('%s quá dài.', $field));
        }
        return $url;
    }
}
