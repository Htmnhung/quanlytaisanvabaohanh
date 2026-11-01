<?php
// helpers/auth.php - Xử lý xác thực Token JWT và phân quyền người dùng

require_once __DIR__ . '/utils.php';

const JWT_SECRET = 'family_assets_super_secret_key_2026_php_coursework';

/**
 * Base64URL encode
 */
function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

/**
 * Tạo token JWT có chữ ký HMAC-SHA256
 */
function generateJwt(array $payload, int $ttlSeconds = 604800): string {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['iat'] = time();
    $payload['exp'] = time() + $ttlSeconds;
    $payloadJson = json_encode($payload);

    $base64Header = base64UrlEncode($header);
    $base64Payload = base64UrlEncode($payloadJson);

    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
    $base64Signature = base64UrlEncode($signature);

    return "$base64Header.$base64Payload.$base64Signature";
}

/**
 * Kiểm tra tính hợp lệ và giải mã token JWT
 */
function verifyJwt(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$base64Header, $base64Payload, $base64Signature] = $parts;

    $expectedSignature = base64UrlEncode(hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true));
    if (!hash_equals($expectedSignature, $base64Signature)) {
        return null;
    }

    $payload = json_decode(base64UrlDecode($base64Payload), true);
    if (!is_array($payload)) {
        return null;
    }

    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null; // Token hết hạn
    }

    return $payload;
}

/**
 * Trích xuất Bearer Token từ Request Headers
 */
function getBearerToken(): ?string {
    $authHeader = null;

    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    $authHeader = $value;
                    break;
                }
            }
        }
    }

    if (!$authHeader && !empty($_GET['token'])) {
        return $_GET['token'];
    }

    if ($authHeader && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        return $matches[1];
    }

    return null;
}

/**
 * Lấy thông tin người dùng hiện tại từ Database
 */
function getCurrentUser(PDO $db): ?array {
    $token = getBearerToken();
    if (!$token) {
        return null;
    }

    $payload = verifyJwt($token);
    if (!$payload || !isset($payload['id'])) {
        return null;
    }

    $stmt = $db->prepare("SELECT id, full_name, email, phone, role, family_id, status, avatar FROM users WHERE id = ?");
    $stmt->execute([$payload['id']]);
    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active') {
        return null;
    }

    return $user;
}

/**
 * Bắt buộc người dùng phải đăng nhập
 */
function requireAuth(PDO $db): array {
    $user = getCurrentUser($db);
    if (!$user) {
        sendJson([
            'success' => false,
            'expired' => true,
            'message' => 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
        ], 401);
    }
    return $user;
}

/**
 * Bắt buộc quyền truy cập theo vai trò (Role check)
 */
function requireRole(PDO $db, array|string $roles): array {
    $user = requireAuth($db);
    $allowed = is_array($roles) ? $roles : [$roles];
    if (!in_array($user['role'], $allowed)) {
        sendJson([
            'success' => false,
            'message' => 'Bạn không có quyền thực hiện thao tác này (yêu cầu quyền quản trị).'
        ], 403);
    }
    return $user;
}
