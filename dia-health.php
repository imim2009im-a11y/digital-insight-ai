<?php
declare(strict_types=1);

// Runtime liveness endpoint. Railway should restart this service only when the
// web/PHP runtime itself is unhealthy. MariaDB is allowed to sleep, so database
// reachability is reported as metadata rather than making liveness fail.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$dbHost = getenv('WORDPRESS_DB_HOST') ?: '';
$dbName = getenv('WORDPRESS_DB_NAME') ?: '';
$dbUser = getenv('WORDPRESS_DB_USER') ?: '';
$dbPassword = getenv('WORDPRESS_DB_PASSWORD') ?: '';

$response = [
    'status' => 'ok',
    'php' => 'ok',
    'database' => 'unknown',
];

if ($dbHost === '' || $dbName === '' || $dbUser === '') {
    $response['database'] = 'configuration_missing';
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_SLASHES);
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
    $response['database'] = 'client_init_failed';
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_SLASHES);
    exit;
}

$mysqli->options(MYSQLI_OPT_CONNECT_TIMEOUT, 2);
$connected = @$mysqli->real_connect($host, $dbUser, $dbPassword, $dbName, $port);

if (!$connected) {
    $response['database'] = 'sleeping_or_unreachable';
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_SLASHES);
    exit;
}

$response['database'] = @$mysqli->ping() ? 'reachable' : 'ping_failed';
$mysqli->close();

http_response_code(200);
echo json_encode($response, JSON_UNESCAPED_SLASHES);
