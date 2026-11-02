<?php

declare(strict_types=1);

namespace SonTra\Support;

/** Gửi thư bằng hàm mail() của PHP (có sẵn trên Hostinger và iNET). Tiêu đề và nội dung UTF-8. */
final class PhpMailer implements Mailer
{
    public function send(string $to, string $subject, string $body): bool
    {
        $from = Env::get('MAIL_FROM');
        if ($from === '') {
            error_log('[SonTra] MAIL_FROM chưa được cấu hình; không gửi được thư.');
            return false;
        }
        $fromName = mb_encode_mimeheader(Env::get('MAIL_FROM_NAME', 'Sơn Trà Số'), 'UTF-8', 'B');
        $headers = implode("\r\n", [
            'From: ' . $fromName . ' <' . $from . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ]);
        return mail($to, mb_encode_mimeheader($subject, 'UTF-8', 'B'), $body, $headers);
    }
}
