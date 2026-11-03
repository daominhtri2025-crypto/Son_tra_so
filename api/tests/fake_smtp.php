<?php

declare(strict_types=1);

/**
 * Máy chủ SMTP giả dùng cho kiểm thử (chỉ chạy trên máy phát triển, không đưa lên hosting).
 * Dùng: php api/tests/fake_smtp.php <cổng> <tệp_ghi_log> <user> <pass> <AUTH: plain|login>
 * Nhận đúng một phiên, ghi JSON gồm lệnh, kết quả xác thực và nội dung thư, rồi thoát.
 */

[$_, $port, $logFile, $expectUser, $expectPass, $authMode] = $argv + [null, '0', '', '', '', 'plain'];

$server = stream_socket_server("tcp://127.0.0.1:{$port}", $errno, $errstr);
if ($server === false) {
    fwrite(STDERR, "bind failed: {$errstr}\n");
    exit(1);
}
file_put_contents($logFile . '.ready', '1');
$conn = stream_socket_accept($server, 20);
if ($conn === false) {
    exit(2);
}
stream_set_timeout($conn, 10);

$log = ['commands' => [], 'auth' => null, 'mail_from' => null, 'rcpt' => [], 'data' => null];
$send = static function (string $line) use ($conn): void {
    fwrite($conn, $line . "\r\n");
};
$readLine = static function () use ($conn): ?string {
    $line = fgets($conn, 4096);
    return $line === false ? null : rtrim($line, "\r\n");
};

$send('220 fake.smtp.test ESMTP');
while (($line = $readLine()) !== null) {
    $log['commands'][] = str_starts_with(strtoupper($line), 'AUTH') ? 'AUTH' : $line;
    $upper = strtoupper($line);

    if (str_starts_with($upper, 'EHLO') || str_starts_with($upper, 'HELO')) {
        $send('250-fake.smtp.test');
        $send($authMode === 'login' ? '250-AUTH LOGIN' : '250-AUTH PLAIN LOGIN');
        $send('250 OK');
    } elseif (str_starts_with($upper, 'AUTH PLAIN ')) {
        $decoded = explode("\0", (string) base64_decode(substr($line, 11)));
        $ok = count($decoded) === 3 && $decoded[1] === $expectUser && $decoded[2] === $expectPass;
        $log['auth'] = $ok ? 'ok' : 'fail';
        $send($ok ? '235 2.7.0 Authentication successful' : '535 5.7.8 Authentication failed');
    } elseif ($upper === 'AUTH LOGIN') {
        $send('334 VXNlcm5hbWU6');
        $user = base64_decode((string) $readLine());
        $send('334 UGFzc3dvcmQ6');
        $pass = base64_decode((string) $readLine());
        $ok = $user === $expectUser && $pass === $expectPass;
        $log['auth'] = $ok ? 'ok' : 'fail';
        $send($ok ? '235 2.7.0 Authentication successful' : '535 5.7.8 Authentication failed');
    } elseif (str_starts_with($upper, 'MAIL FROM:')) {
        $log['mail_from'] = $line;
        $send('250 OK');
    } elseif (str_starts_with($upper, 'RCPT TO:')) {
        $log['rcpt'][] = $line;
        $send('250 OK');
    } elseif ($upper === 'DATA') {
        $send('354 End data with <CR><LF>.<CR><LF>');
        $data = '';
        while (($dl = fgets($conn, 8192)) !== false) {
            if ($dl === ".\r\n") {
                break;
            }
            $data .= $dl;
        }
        $log['data'] = $data;
        $send('250 2.0.0 queued');
    } elseif ($upper === 'QUIT') {
        $send('221 Bye');
        break;
    } else {
        $send('500 unknown');
    }
}
fclose($conn);
fclose($server);
file_put_contents($logFile, json_encode($log, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
