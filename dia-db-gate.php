<?php
declare(strict_types=1);

$dbHost = getenv('WORDPRESS_DB_HOST');

if ($dbHost !== false && $dbHost !== '' && function_exists('fsockopen')) {
    $host = $dbHost;
    $port = 3306;

    if (str_starts_with($dbHost, '[') && preg_match('/^\[(.+)](?::(\d+))?$/', $dbHost, $matches)) {
        $host = $matches[1];
        if (!empty($matches[2])) {
            $port = (int) $matches[2];
        }
    } elseif (substr_count($dbHost, ':') === 1) {
        [$candidateHost, $candidatePort] = explode(':', $dbHost, 2);
        if ($candidateHost !== '' && ctype_digit($candidatePort)) {
            $host = $candidateHost;
            $port = (int) $candidatePort;
        }
    }

    $maxWaitSeconds = (float) (getenv('DIA_DB_WAKE_TIMEOUT_SECONDS') ?: '20');
    $connectTimeoutSeconds = 1.0;
    $retryIntervalMicroseconds = 250000;
    $startedAt = microtime(true);
    $deadline = $startedAt + max(1.0, $maxWaitSeconds);
    $attempts = 0;

    do {
        $attempts++;
        $errno = 0;
        $errstr = '';
        $socket = @fsockopen($host, $port, $errno, $errstr, $connectTimeoutSeconds);

        if (is_resource($socket)) {
            fclose($socket);
            if ($attempts > 1) {
                $waitedMs = (int) round((microtime(true) - $startedAt) * 1000);
                error_log(sprintf('[DIA] Database became reachable after %d ms (%d attempts).', $waitedMs, $attempts));
            }
            break;
        }

        if (microtime(true) >= $deadline) {
            error_log(sprintf('[DIA] Database wake gate timed out after %d attempts; WordPress will handle the connection error.', $attempts));
            break;
        }

        usleep($retryIntervalMicroseconds);
    } while (true);
}
