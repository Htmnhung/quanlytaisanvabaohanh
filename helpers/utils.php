<?php
// helpers/utils.php - Các hàm phụ trợ chuẩn UTF-8, tính toán ngày và bảo hành

// Thiết lập múi giờ Việt Nam
date_default_timezone_set('Asia/Ho_Chi_Minh');

/**
 * Xuất phản hồi JSON chuẩn UTF-8
 */
function sendJson(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Đọc dữ liệu đầu vào JSON từ php://input hoặc mảng $_POST
 */
function getJsonInput(): array {
    $input = file_get_contents('php://input');
    if (!empty($input)) {
        $decoded = json_decode($input, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST ?? [];
}

/**
 * Tính toán động thông tin bảo hành từ ngày kết thúc
 * KHÔNG nhập cố định, luôn tự động tính toán dựa trên CURRENT_DATE
 */
function computeWarrantyInfo(?string $endDate, int $thresholdDays = 30): array {
    if (!$endDate) {
        return [
            'status' => 'no_warranty',
            'label' => 'Không có bảo hành',
            'color' => 'gray',
            'days_remaining' => 0,
            'is_expired' => false,
            'is_expiring' => false,
            'is_active' => false
        ];
    }

    $todayStr = date('Y-m-d');
    $todayTs = strtotime($todayStr);
    $endTs = strtotime($endDate);

    // Tính chính xác số ngày còn lại (nguyên ngày)
    $diffSeconds = $endTs - $todayTs;
    $daysRemaining = (int) floor($diffSeconds / 86400);

    if ($daysRemaining < 0) {
        return [
            'status' => 'expired',
            'label' => 'Đã hết hạn',
            'color' => 'red',
            'days_remaining' => $daysRemaining,
            'is_expired' => true,
            'is_expiring' => false,
            'is_active' => false
        ];
    } elseif ($daysRemaining <= $thresholdDays) {
        return [
            'status' => 'expiring_soon',
            'label' => 'Sắp hết hạn',
            'color' => 'orange',
            'days_remaining' => $daysRemaining,
            'is_expired' => false,
            'is_expiring' => true,
            'is_active' => false
        ];
    } else {
        return [
            'status' => 'active',
            'label' => 'Còn bảo hành',
            'color' => 'green',
            'days_remaining' => $daysRemaining,
            'is_expired' => false,
            'is_expiring' => false,
            'is_active' => true
        ];
    }
}

/**
 * Ghi nhật ký hoạt động hệ thống (Audit Logs)
 */
function logAudit(PDO $db, ?int $userId, ?string $userEmail, string $action, ?string $entityType = null, ?int $entityId = null, ?string $details = null): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $stmt = $db->prepare("
            INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $userEmail, $action, $entityType, $entityId, $details, $ip]);
    } catch (Exception $e) {
        error_log('Lỗi ghi audit log: ' . $e->getMessage());
    }
}

/**
 * Xử lý tải lên tệp tin an toàn tuyệt đối:
 * - Chỉ cho phép định dạng: jpg, jpeg, png, webp, pdf
 * - Kiểm tra cả phần mở rộng lẫn MIME type thực tế (finfo)
 * - Nghiêm cấm hoàn toàn tệp thực thi / script (.php, .phtml, .phar, .exe, ...)
 * - Đổi tên tệp ngẫu nhiên bằng mã băm cryptographically secure (random_bytes)
 */
function handleFileUpload(array $file, string $subfolder = 'assets'): ?string {
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return null;
    }

    // 1. Kiểm tra phần mở rộng (Extension Whitelist)
    $originalName = $file['name'] ?? '';
    // Loại bỏ ký tự lạ hoặc null byte
    $cleanName = str_replace(chr(0), '', $originalName);
    $ext = strtolower(pathinfo($cleanName, PATHINFO_EXTENSION));

    $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    if (!in_array($ext, $allowedExtensions, true)) {
        return null;
    }

    // Nghiêm cấm tuyệt đối mọi biến thể của PHP hoặc tệp thực thi
    $forbidden = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'phar', 'inc', 'cgi', 'pl', 'exe', 'sh', 'bat', 'cmd', 'js', 'html', 'htm'];
    if (in_array($ext, $forbidden, true) || preg_match('/\.(php[0-9]?|phtml|phar|exe|sh|bat)/i', $cleanName)) {
        return null;
    }

    // 2. Kiểm tra MIME Type thực tế từ nội dung tệp bằng Fileinfo (tránh fake đuôi file)
    $allowedMimes = [
        'jpg'  => ['image/jpeg', 'image/pjpeg'],
        'jpeg' => ['image/jpeg', 'image/pjpeg'],
        'png'  => ['image/png'],
        'webp' => ['image/webp'],
        'pdf'  => ['application/pdf', 'application/x-pdf']
    ];

    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $validMimesForExt = $allowedMimes[$ext] ?? [];
        if (!in_array($mime, $validMimesForExt, true)) {
            return null; // MIME type không khớp với đuôi file
        }
    }

    // 3. Kiểm tra quét nội dung tệp ảnh để tránh PHP webshell chèn trong EXIF
    if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
        $fileHeader = file_get_contents($file['tmp_name'], false, null, 0, 1024);
        if (stripos($fileHeader, '<?php') !== false || stripos($fileHeader, '<?=') !== false) {
            return null; // Chứa mã thực thi PHP ẩn
        }
    }

    // 4. Chuẩn bị thư mục lưu trữ hợp lệ
    $allowedSubfolders = ['assets', 'invoices', 'receipts', 'avatars'];
    if (!in_array($subfolder, $allowedSubfolders, true)) {
        $subfolder = 'assets';
    }

    $uploadDir = __DIR__ . '/../uploads/' . $subfolder . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // 5. Đổi tên tệp ngẫu nhiên hoàn toàn (Cryptographically secure random)
    $randomName = bin2hex(random_bytes(16)) . '.' . ($ext === 'jpeg' ? 'jpg' : $ext);
    $targetPath = $uploadDir . $randomName;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Đồng bộ sang public/uploads nếu có để phục vụ trực tiếp
        $publicUploadDir = __DIR__ . '/../public/uploads/' . $subfolder . '/';
        if (is_dir(__DIR__ . '/../public')) {
            if (!is_dir($publicUploadDir)) {
                mkdir($publicUploadDir, 0755, true);
            }
            @copy($targetPath, $publicUploadDir . $randomName);
        }

        return 'uploads/' . $subfolder . '/' . $randomName;
    }

    return null;
}
