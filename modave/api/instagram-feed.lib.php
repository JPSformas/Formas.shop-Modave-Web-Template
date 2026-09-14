<?php

function instagram_normalize_permalink($url) {
    if (!is_string($url)) {
        return null;
    }
    $url = trim($url);
    if ($url === '') {
        return null;
    }
    $parts = parse_url($url);
    if ($parts === false || empty($parts['host']) || empty($parts['path'])) {
        return null;
    }
    $host = strtolower($parts['host']);
    if ($host !== 'instagram.com' && $host !== 'www.instagram.com') {
        return null;
    }
    if (!preg_match('#^/(reels?)/([A-Za-z0-9_-]+)/?$#', $parts['path'], $m)) {
        return null;
    }
    return 'https://www.instagram.com/reel/' . $m[2] . '/';
}

function instagram_profile_url_from_username($username) {
    if (!is_string($username)) {
        return null;
    }
    $username = ltrim(trim($username), '@');
    if (!preg_match('/^[A-Za-z0-9._]{1,30}$/', $username)) {
        return null;
    }
    $reserved = array(
        'about', 'accounts', 'developer', 'explore', 'legal', 'p', 'reel', 'reels',
        'share', 'stories', 'tv',
    );
    if (in_array(strtolower($username), $reserved, true)) {
        return null;
    }
    return 'https://www.instagram.com/' . $username . '/';
}

function instagram_normalize_profile_url($url) {
    if (!is_string($url)) {
        return null;
    }
    $url = trim($url);
    if ($url === '') {
        return null;
    }
    $fromName = instagram_profile_url_from_username($url);
    if ($fromName !== null) {
        return $fromName;
    }
    $parts = parse_url($url);
    if ($parts === false || empty($parts['host']) || empty($parts['path'])) {
        return null;
    }
    $host = strtolower($parts['host']);
    if ($host !== 'instagram.com' && $host !== 'www.instagram.com') {
        return null;
    }
    if (!preg_match('#^/([A-Za-z0-9._]{1,30})/?$#', $parts['path'], $m)) {
        return null;
    }
    return instagram_profile_url_from_username($m[1]);
}

function instagram_profile_url_from_graph_user($json) {
    if (!is_array($json) || empty($json['username'])) {
        return null;
    }
    return instagram_profile_url_from_username($json['username']);
}

function instagram_resolve_profile_url($configured, $cached, $graph) {
    $candidates = array($configured, $graph, $cached);
    foreach ($candidates as $candidate) {
        $normalized = instagram_normalize_profile_url($candidate);
        if ($normalized !== null) {
            return $normalized;
        }
    }
    return '';
}

function instagram_token_fingerprint($accessToken) {
    if (!is_string($accessToken) || $accessToken === '') {
        return '';
    }
    return substr(hash('sha256', $accessToken), 0, 16);
}

function instagram_cache_for_token($cache, $fingerprint) {
    if (!is_array($cache)) {
        return null;
    }
    if ($fingerprint === '' || !isset($cache['token_fp'])) {
        return $cache;
    }
    if ($cache['token_fp'] !== $fingerprint) {
        return null;
    }
    return $cache;
}

function instagram_filter_reels($media) {
    $out = array();
    if (!is_array($media)) {
        return $out;
    }
    foreach ($media as $item) {
        if (!is_array($item)) {
            continue;
        }
        if (isset($item['media_product_type']) && $item['media_product_type'] === 'REELS') {
            $out[] = $item;
        }
    }
    return $out;
}

function instagram_assemble_items($pinnedUrls, $reels, $limit) {
    $limit = (int) $limit;
    if ($limit < 1) {
        $limit = 6;
    }
    $items = array();
    $seen = array();
    $skipped = array();

    if (!is_array($pinnedUrls)) {
        $pinnedUrls = array();
    }
    foreach ($pinnedUrls as $raw) {
        $permalink = instagram_normalize_permalink($raw);
        if ($permalink === null) {
            $skipped[] = is_string($raw) ? $raw : '';
            continue;
        }
        if (isset($seen[$permalink])) {
            continue;
        }
        $seen[$permalink] = true;
        $code = basename(rtrim(parse_url($permalink, PHP_URL_PATH), '/'));
        $items[] = array(
            'id' => 'pin:' . $code,
            'permalink' => $permalink,
            'pinned' => true,
        );
        if (count($items) >= $limit) {
            return array('items' => $items, 'skipped_pins' => $skipped);
        }
    }

    if (!is_array($reels)) {
        $reels = array();
    }
    foreach ($reels as $item) {
        $permalink = instagram_normalize_permalink(isset($item['permalink']) ? $item['permalink'] : '');
        if ($permalink === null || isset($seen[$permalink])) {
            continue;
        }
        $seen[$permalink] = true;
        $id = isset($item['id']) ? (string) $item['id'] : $permalink;
        $items[] = array(
            'id' => $id,
            'permalink' => $permalink,
            'pinned' => false,
        );
        if (count($items) >= $limit) {
            break;
        }
    }

    return array('items' => $items, 'skipped_pins' => $skipped);
}

function instagram_cache_is_fresh($cache, $now, $ttl) {
    if (!is_array($cache) || !isset($cache['saved_at']) || !isset($cache['items'])) {
        return false;
    }
    return ((int) $now - (int) $cache['saved_at']) < (int) $ttl;
}

function instagram_should_refresh_token($expiresAt, $now, $window = 604800) {
    $expiresAt = (int) $expiresAt;
    if ($expiresAt <= 0) {
        return true;
    }
    return ($expiresAt - (int) $now) <= (int) $window;
}

function instagram_parse_token_refresh($json, $now) {
    if (!is_array($json) || empty($json['access_token']) || !isset($json['expires_in'])) {
        return null;
    }
    return array(
        'access_token' => (string) $json['access_token'],
        'expires_at' => (int) $now + (int) $json['expires_in'],
    );
}

function instagram_resolve_feed($pinsConfig, $cache, $fetchLive, $now, $ttl) {
    if (!is_array($pinsConfig)) {
        $pinsConfig = array();
    }
    $limit = isset($pinsConfig['limit']) ? (int) $pinsConfig['limit'] : 6;
    $pinnedUrls = isset($pinsConfig['pinned']) && is_array($pinsConfig['pinned']) ? $pinsConfig['pinned'] : array();

    if (instagram_cache_is_fresh($cache, $now, $ttl)) {
        return array(
            'items' => $cache['items'],
            'source' => 'cache',
            'save_cache' => false,
            'skipped_pins' => array(),
        );
    }

    try {
        $media = call_user_func($fetchLive);
        $assembled = instagram_assemble_items($pinnedUrls, instagram_filter_reels($media), $limit);
        return array(
            'items' => $assembled['items'],
            'source' => 'live',
            'save_cache' => true,
            'skipped_pins' => $assembled['skipped_pins'],
        );
    } catch (Exception $e) {
        if (is_array($cache) && isset($cache['items']) && is_array($cache['items'])) {
            return array(
                'items' => $cache['items'],
                'source' => 'cache',
                'save_cache' => false,
                'skipped_pins' => array(),
            );
        }
        $assembled = instagram_assemble_items($pinnedUrls, array(), $limit);
        return array(
            'items' => $assembled['items'],
            'source' => 'pins-only',
            'save_cache' => false,
            'skipped_pins' => $assembled['skipped_pins'],
        );
    }
}
