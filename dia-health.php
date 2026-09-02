<?php
declare(strict_types=1);

// Runtime health endpoint: this file is intentionally watched by Railway auto-deploy.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$dbHost = getenv('WORDPRESS_DB_HOST') ?: '';
$dbName = getenv('WORDPRESS_DB_NAME') ?: '';
$dbUser = getenv('WORDPRESS_DB_USER') ?: '';
$dbPassword = getenv('WORDPRESS_DB_PASSWORD') ?: '';

if ($dbHost === '' || $dbName === '' || $dbUser === '') {
    http_response_code(503);
    echo json_encode([
        'status' => 'unhealthy',
        'database' => 'configuration_missing',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

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

mysqli_report(MYSQLI_REPORT_OFF);
$mysqli = mysqli_init();

if ($mysqli === false) {
    http_response_code(503);
    echo json_encode([
        'status' => 'unhealthy',
        'database' => 'client_init_failed',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

$mysqli->options(MYSQLI_OPT_CONNECT_TIMEOUT, 3);
$connected = @$mysqli->real_connect($host, $dbUser, $dbPassword, $dbName, $port);

if (!$connected) {
    error_log('[DIA] Health check could not establish a MariaDB connection.');
    http_response_code(503);
    echo json_encode([
        'status' => 'unhealthy',
        'database' => 'unreachable',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

$ping = @$mysqli->ping();
$mysqli->close();

if (!$ping) {
    error_log('[DIA] Health check connected to MariaDB but ping failed.');
    http_response_code(503);
    echo json_encode([
        'status' => 'unhealthy',
        'database' => 'ping_failed',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code(200);
echo json_encode([
    'status' => 'ok',
    'php' => 'ok',
    'database' => 'reachable',
], JSON_UNESCAPED_SLASHES);
