<?php
// router.php - Bộ định tuyến máy chủ phát triển PHP (PHP Built-in Server Router)
// Chạy lệnh: php -S localhost:8000 router.php
// Đã vá lỗ hổng Path Traversal (Directory Traversal) bằng realpath()

date_default_timezone_set('Asia/Ho_Chi_Minh');

$rawUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$uri = rawurldecode($rawUri);

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
$basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
if ($basePath === '.' || $basePath === '/' || $basePath === '\\') {
    $basePath = '';
}

if ($basePath !== '' && str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath)) ?: '/';
}

if ($uri === '') {
    $uri = '/';
}

if (str_contains($uri, "\0")) {
    http_response_code(400);
    exit('400 Bad Request');
}
header('X-Content-Type-Options: nosniff');

// Chặn tuyệt đối mọi yêu cầu trực tiếp đến các tệp nhạy cảm (sqlite, env, db, sql, log, ini)
$reqExt = strtolower(pathinfo($uri, PATHINFO_EXTENSION));
if (in_array($reqExt, ['sqlite', 'sqlite3', 'db', 'env', 'htaccess', 'log', 'ini', 'sql'], true)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    exit('403 Forbidden: Tệp tin bị cấm truy cập.');
}

/**
 * Hàm kiểm tra an toàn: Tệp tin mục tiêu có thực sự nằm bên trong thư mục gốc cho phép hay không
 * Sử dụng realpath() để triệt tiêu toàn bộ các ký tự ../ hoặc ..\
 */
function isSafelyInside(string $filePath, string $baseDir): bool {
    $realFile = realpath($filePath);
    $realBase = realpath($baseDir);

    if ($realFile === false || $realBase === false) {
        return false;
    }

    // Chuẩn hóa dấu gạch chéo trên Windows (\ thành /)
    $normFile = str_replace('\\', '/', $realFile);
    $normBase = rtrim(str_replace('\\', '/', $realBase), '/');

    return str_starts_with($normFile, $normBase . '/') || $normFile === $normBase;
}

// 1. Phục vụ các tệp tĩnh từ thư mục uploads/ (ảnh sản phẩm, hóa đơn, biên nhận)
if (str_starts_with($uri, '/uploads/')) {
    $candidateUpload = __DIR__ . $uri;

    // BẮT BUỘC: Kiểm tra realpath() để ngăn chặn /uploads/../database/family_assets.sqlite
    if (file_exists($candidateUpload) && is_file($candidateUpload)) {
        if (!isSafelyInside($candidateUpload, __DIR__ . '/uploads')) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=UTF-8');
            exit('403 Forbidden: Path Traversal Detected. Truy cập bị từ chối.');
        }

        // Chặn tuyệt đối không cho tải tệp mã nguồn, database hoặc tệp nhạy cảm
        $ext = strtolower(pathinfo($candidateUpload, PATHINFO_EXTENSION));
        $forbiddenExts = ['php', 'phtml', 'phar', 'sqlite', 'sqlite3', 'db', 'env', 'exe', 'bat', 'sh', 'cmd', 'htaccess'];
        if (in_array($ext, $forbiddenExts, true)) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=UTF-8');
            exit('403 Forbidden: Tệp tin bị cấm truy cập.');
        }

        $mime = getMimeType($candidateUpload);
        header("Content-Type: $mime");
        readfile($candidateUpload);
        exit;
    } else {
        http_response_code(404);
        header('Content-Type: text/plain; charset=UTF-8');
        exit('404 Not Found: Tệp tin không tồn tại.');
    }
}

// 2. Phục vụ các tệp tĩnh từ thư mục public/ (css, js, html, icon)
if ($uri !== '/') {
    $candidatePublic = __DIR__ . '/public' . $uri;

    if (file_exists($candidatePublic) && is_file($candidatePublic)) {
        if (!isSafelyInside($candidatePublic, __DIR__ . '/public')) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=UTF-8');
            exit('403 Forbidden: Path Traversal Detected. Truy cập bị từ chối.');
        }

        $ext = strtolower(pathinfo($candidatePublic, PATHINFO_EXTENSION));
        $forbiddenExts = ['php', 'phtml', 'phar', 'sqlite', 'sqlite3', 'db', 'env', 'htaccess'];
        if (in_array($ext, $forbiddenExts, true)) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=UTF-8');
            exit('403 Forbidden: Tệp tin bị cấm truy cập.');
        }

        $mime = getMimeType($candidatePublic);
        header("Content-Type: $mime");
        readfile($candidatePublic);
        exit;
    }
}

// 3. Định tuyến API Backend (/api/...)
if (str_starts_with($uri, '/api/')) {
    $apiPath = substr($uri, 5); // Bỏ tiền tố '/api/'
    $segments = explode('/', $apiPath, 2);
    $module = $segments[0];
    $subPath = isset($segments[1]) ? '/' . $segments[1] : '';

    $_SERVER['PATH_INFO'] = $subPath;

    // Mapping module tương ứng (an toàn, chỉ gọi các module trong danh sách)
    $moduleMap = [
        'auth' => __DIR__ . '/api/auth.php',
        'assets' => __DIR__ . '/api/assets.php',
        'categories' => __DIR__ . '/api/categories.php',
        'warranty' => __DIR__ . '/api/warranty.php',
        'warranties' => __DIR__ . '/api/warranty.php',
        'repairs' => __DIR__ . '/api/repairs.php',
        'reports' => __DIR__ . '/api/reports.php',
        'notifications' => __DIR__ . '/api/notifications.php',
        'admin' => __DIR__ . '/api/admin.php',
    ];

    if (isset($moduleMap[$module]) && file_exists($moduleMap[$module])) {
        require $moduleMap[$module];
        exit;
    }

    http_response_code(404);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'success' => false,
        'message' => "Không tìm thấy API module '$module'"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 4. Kiểm tra tệp tĩnh: Nếu yêu cầu có phần mở rộng tệp tĩnh (.js, .css, .png, ...) mà không tồn tại -> Trả về 404 (không trả về index.html)
$staticExts = [
    'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp',
    'woff', 'woff2', 'ttf', 'eot', 'otf', 'map', 'json', 'pdf', 'txt', 'xml', 'csv', 'xlsx'
];
if (in_array($reqExt, $staticExts, true)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    exit('404 Not Found: Tệp tĩnh không tồn tại.');
}

// 5. Phục vụ giao diện Single Page Application (public/index.html) với mã hóa UTF-8
header('Content-Type: text/html; charset=UTF-8');
readfile(__DIR__ . '/public/index.html');
exit;

function getMimeType(string $filePath): string {
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimes = [
        'css' => 'text/css; charset=UTF-8',
        'js' => 'application/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'webp' => 'image/webp',
        'pdf' => 'application/pdf',
        'html' => 'text/html; charset=UTF-8',
    ];
    return $mimes[$ext] ?? 'application/octet-stream';
}
