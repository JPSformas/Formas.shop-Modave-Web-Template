<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array('items' => array(), 'source' => 'pins-only'));
    exit;
}

require __DIR__ . '/instagram-feed.lib.php';

$root = dirname(__DIR__);
$configPath = $root . '/config/instagram.local.php';
$tokenPath = $root . '/config/instagram-token.json';
$pinsPath = $root . '/data/instagram-pins.json';
$cachePath = $root . '/data/instagram-reels-cache.json';
$logPath = $root . '/data/instagram-reels.log';

function instagram_log($logPath, $code, $detail) {
    $line = date('c') . "\t" . $code . "\t" . str_replace(array("\r", "\n"), ' ', (string) $detail) . "\n";
    @file_put_contents($logPath, $line, FILE_APPEND | LOCK_EX);
}

function instagram_http_get($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        $caFile = dirname(__DIR__) . '/config/cacert.pem';
        if (is_readable($caFile)) {
            curl_setopt($ch, CURLOPT_CAINFO, $caFile);
        }
        $body = curl_exec($ch);
        $err = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false) {
            throw new Exception('curl: ' . $err);
        }
        if ($status < 200 || $status >= 300) {
            throw new Exception('http ' . $status);
        }
        return $body;
    }
    $body = @file_get_contents($url);
    if ($body === false) {
        throw new Exception('file_get_contents failed');
    }
    return $body;
}

function instagram_read_json_file($path) {
    if (!is_readable($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

$ttl = 1800;
if (is_readable($configPath)) {
    $cfg = include $configPath;
    if (is_array($cfg) && isset($cfg['cache_ttl_seconds'])) {
        $ttl = (int) $cfg['cache_ttl_seconds'];
    }
}

$pinsConfig = instagram_read_json_file($pinsPath);
if ($pinsConfig === null) {
    $pinsConfig = array('sort' => 'recent', 'limit' => 6, 'pinned' => array());
}

$tokenInfo = instagram_read_json_file($tokenPath);
if ($tokenInfo === null) {
    $tokenInfo = array('access_token' => '', 'expires_at' => 0);
}

$cache = instagram_read_json_file($cachePath);
$now = time();

if (!empty($tokenInfo['access_token']) && instagram_should_refresh_token(isset($tokenInfo['expires_at']) ? $tokenInfo['expires_at'] : 0, $now)) {
    try {
        $refreshUrl = 'https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' . rawurlencode($tokenInfo['access_token']);
        $parsed = instagram_parse_token_refresh(json_decode(instagram_http_get($refreshUrl), true), $now);
        if ($parsed === null) {
            throw new Exception('invalid refresh payload');
        }
        $tokenInfo = $parsed;
        $tokenWritten = @file_put_contents($tokenPath, json_encode($tokenInfo, JSON_PRETTY_PRINT), LOCK_EX);
        if ($tokenWritten === false) {
            instagram_log($logPath, 'token_persist_failed', $tokenPath);
        }
    } catch (Exception $e) {
        instagram_log($logPath, 'token_refresh_failed', $e->getMessage());
    }
}

$fetchLive = function () use ($tokenInfo, $logPath) {
    if (empty($tokenInfo['access_token'])) {
        instagram_log($logPath, 'graph_error', 'missing token');
        throw new Exception('missing token');
    }
    try {
        $url = 'https://graph.instagram.com/me/media?fields=id,media_type,media_product_type,permalink,timestamp&limit=25&access_token=' . rawurlencode($tokenInfo['access_token']);
        $decoded = json_decode(instagram_http_get($url), true);
        if (!is_array($decoded) || isset($decoded['error']) || !isset($decoded['data']) || !is_array($decoded['data'])) {
            throw new Exception('invalid media payload');
        }
        return $decoded['data'];
    } catch (Exception $e) {
        instagram_log($logPath, 'graph_error', $e->getMessage());
        throw $e;
    }
};

$result = instagram_resolve_feed($pinsConfig, $cache, $fetchLive, $now, $ttl);

foreach ($result['skipped_pins'] as $bad) {
    instagram_log($logPath, 'bad_pin', $bad);
}

if ($result['save_cache']) {
    $written = @file_put_contents($cachePath, json_encode(array(
        'saved_at' => $now,
        'items' => $result['items'],
    ), JSON_PRETTY_PRINT), LOCK_EX);
    if ($written === false) {
        instagram_log($logPath, 'cache_write_failed', $cachePath);
    }
}

echo json_encode(array(
    'items' => $result['items'],
    'source' => $result['source'],
));
