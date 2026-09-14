<?php
require __DIR__ . '/instagram-feed.lib.php';

$fails = 0;
function expect_true($cond, $name) {
    global $fails;
    if ($cond) {
        echo "PASS $name\n";
        return;
    }
    $fails++;
    echo "FAIL $name\n";
}
function expect_eq($actual, $expected, $name) {
    expect_true($actual === $expected, $name);
    if ($actual !== $expected) {
        echo "  expected " . var_export($expected, true) . "\n";
        echo "  actual   " . var_export($actual, true) . "\n";
    }
}

expect_eq(
    instagram_normalize_permalink('https://www.instagram.com/reel/AAAA/?utm_source=ig'),
    'https://www.instagram.com/reel/AAAA/',
    'normalize strips query and forces slash'
);
expect_eq(
    instagram_normalize_permalink('https://www.instagram.com/reels/BBBB'),
    'https://www.instagram.com/reel/BBBB/',
    'normalize reels path to reel'
);
expect_eq(instagram_normalize_permalink('https://www.instagram.com/p/CCCC/'), null, 'feed posts are invalid');
expect_eq(instagram_normalize_permalink('https://www.instagram.com/formas.ar/'), null, 'profile url is invalid');
expect_eq(instagram_normalize_permalink(''), null, 'empty is invalid');

$media = array(
    array('id' => '1', 'media_type' => 'VIDEO', 'media_product_type' => 'REELS', 'permalink' => 'https://www.instagram.com/reel/R1/', 'timestamp' => '2026-01-01'),
    array('id' => '2', 'media_type' => 'IMAGE', 'media_product_type' => 'FEED', 'permalink' => 'https://www.instagram.com/p/IMG/', 'timestamp' => '2026-01-02'),
    array('id' => '3', 'media_type' => 'VIDEO', 'media_product_type' => 'REELS', 'permalink' => 'https://www.instagram.com/reel/R2/', 'timestamp' => '2026-01-03'),
);
$reels = instagram_filter_reels($media);
expect_eq(count($reels), 2, 'filter keeps only REELS');

$assembled = instagram_assemble_items(
    array(
        'https://www.instagram.com/reel/PIN1/',
        'https://www.instagram.com/p/NOTAREEL/',
        'https://www.instagram.com/reel/R1/',
    ),
    $reels,
    6
);
expect_eq(count($assembled['items']), 3, 'pins first then remaining reels, no duplicate R1, skip bad pin');
expect_eq($assembled['items'][0]['permalink'], 'https://www.instagram.com/reel/PIN1/', 'first pin order');
expect_eq($assembled['items'][0]['pinned'], true, 'pin flagged');
expect_eq($assembled['items'][1]['permalink'], 'https://www.instagram.com/reel/R1/', 'second pin is also in API list');
expect_eq($assembled['items'][1]['pinned'], true, 'API overlap stays pinned');
expect_eq($assembled['items'][2]['permalink'], 'https://www.instagram.com/reel/R2/', 'unpinned recent fill');
expect_eq($assembled['items'][2]['pinned'], false, 'fill is not pinned');
expect_eq(count($assembled['skipped_pins']), 1, 'bad pin recorded');

$capped = instagram_assemble_items(
    array('https://www.instagram.com/reel/A/', 'https://www.instagram.com/reel/B/'),
    array(
        array('id' => 'x', 'permalink' => 'https://www.instagram.com/reel/C/', 'media_product_type' => 'REELS'),
        array('id' => 'y', 'permalink' => 'https://www.instagram.com/reel/D/', 'media_product_type' => 'REELS'),
    ),
    3
);
expect_eq(count($capped['items']), 3, 'respects limit');

expect_eq(instagram_cache_is_fresh(array('saved_at' => 1000, 'items' => array()), 1000 + 1799, 1800), true, 'fresh cache');
expect_eq(instagram_cache_is_fresh(array('saved_at' => 1000, 'items' => array()), 1000 + 1801, 1800), false, 'stale cache');
expect_eq(instagram_cache_is_fresh(null, 1000, 1800), false, 'missing cache');

expect_eq(instagram_should_refresh_token(1000 + 604800, 1000, 604800), true, 'refresh at 7 days');
expect_eq(instagram_should_refresh_token(1000 + 604801, 1000, 604800), false, 'do not refresh when more than 7 days remain');
expect_eq(instagram_should_refresh_token(0, 1000, 604800), true, 'missing expiry refreshes');

$tok = instagram_parse_token_refresh(array('access_token' => 'NEW', 'expires_in' => 5184000), 1000);
expect_eq($tok['access_token'], 'NEW', 'refresh token value');
expect_eq($tok['expires_at'], 1000 + 5184000, 'refresh expiry');
expect_eq(instagram_parse_token_refresh(array('error' => 'fail'), 1000), null, 'bad refresh json');

$pinsConfig = array('sort' => 'recent', 'limit' => 6, 'pinned' => array('https://www.instagram.com/reel/PIN1/'));
$warm = array(
    'saved_at' => 1000,
    'items' => array(array('id' => 'c', 'permalink' => 'https://www.instagram.com/reel/CACHED/', 'pinned' => false)),
);
$fresh = instagram_resolve_feed($pinsConfig, $warm, function () {
    throw new Exception('should not fetch');
}, 1000 + 10, 1800);
expect_eq($fresh['source'], 'cache', 'fresh cache skips live');
expect_eq($fresh['save_cache'], false, 'fresh cache does not rewrite');
expect_eq($fresh['items'][0]['permalink'], 'https://www.instagram.com/reel/CACHED/', 'returns cached items');

$live = instagram_resolve_feed($pinsConfig, null, function () use ($media) {
    return $media;
}, 2000, 1800);
expect_eq($live['source'], 'live', 'live source');
expect_eq($live['save_cache'], true, 'live writes cache');
expect_eq($live['items'][0]['permalink'], 'https://www.instagram.com/reel/PIN1/', 'live pins first');

$stale = array(
    'saved_at' => 1,
    'items' => array(array('id' => 'old', 'permalink' => 'https://www.instagram.com/reel/OLD/', 'pinned' => false)),
);
$fallback = instagram_resolve_feed($pinsConfig, $stale, function () {
    throw new Exception('graph down');
}, 99999, 1800);
expect_eq($fallback['source'], 'cache', 'stale cache used on error');
expect_eq($fallback['items'][0]['permalink'], 'https://www.instagram.com/reel/OLD/', 'stale items returned');

$pinsOnly = instagram_resolve_feed($pinsConfig, null, function () {
    throw new Exception('graph down');
}, 3000, 1800);
expect_eq($pinsOnly['source'], 'pins-only', 'no cache means pins-only');
expect_eq($pinsOnly['items'][0]['permalink'], 'https://www.instagram.com/reel/PIN1/', 'pins-only still embeds pins');

$empty = instagram_resolve_feed(
    array('sort' => 'recent', 'limit' => 6, 'pinned' => array()),
    null,
    function () {
        throw new Exception('graph down');
    },
    3000,
    1800
);
expect_eq($empty['source'], 'pins-only', 'empty pins source');
expect_eq($empty['items'], array(), 'empty items');

if ($fails > 0) {
    echo "\n$fails failed\n";
    exit(1);
}
echo "\nall passed\n";
exit(0);
