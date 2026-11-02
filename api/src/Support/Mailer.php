<?php

declare(strict_types=1);

namespace SonTra\Support;

/** Giao diện gửi thư. Tách riêng để kiểm thử bằng bản giả và đổi sang SMTP nếu cần. */
interface Mailer
{
    public function send(string $to, string $subject, string $body): bool;
}
