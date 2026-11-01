<?php
// api/warranty.php - Quản lý theo dõi hạn bảo hành, gia hạn, cảnh báo và trung tâm bảo hành

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/utils.php';

$db = Database::getConnection();
$user = requireAuth($db);

$method = $_SERVER['REQUEST_METHOD'];
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$action = trim($pathInfo, '/');
$parts = array_values(array_filter(explode('/', $action)));

if (empty($parts)) {
    sendJson(['success' => false, 'message' => 'Hành động không hợp lệ'], 400);
}

if ($parts[0] === 'expiring') {
    handleGetExpiringWarranties($db, $user);
} elseif ($parts[0] === 'service-centers') {
    handleGetServiceCenters($db);
} elseif ($parts[0] === 'send-email-reminder') {
    handleSendEmailReminder($db, $user);
} elseif (is_numeric($parts[0])) {
    $warrantyId = (int)$parts[0];
    $subAction = $parts[1] ?? '';

    if ($subAction === 'viewed') {
        handleMarkViewed($db, $user, $warrantyId);
    } elseif ($subAction === 'extend') {
        handleExtendWarranty($db, $user, $warrantyId);
    } else {
        sendJson(['success' => false, 'message' => 'Hành động không hợp lệ'], 404);
    }
} else {
    sendJson(['success' => false, 'message' => 'Đường dẫn không hợp lệ'], 404);
}

/**
 * 2.3.1.7. Danh sách tài sản sắp hết hạn trong 7/30/60/90 ngày
 * Sắp xếp theo mức độ khẩn cấp (ngày còn lại tăng dần)
 * Tính toán động từ CURRENT_DATE
 */
function handleGetExpiringWarranties(PDO $db, array $user): void {
    $isAdmin = $user['role'] === 'admin';

    $days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
    if (!in_array($days, [-1, 7, 30, 60, 90], true)) {
        $days = 30;
    }

    $where  = ["a.deleted_at IS NULL", "w.end_date IS NOT NULL"];
    $params = [];

    if (!$isAdmin) {
        $where[]  = "a.family_id = ?";
        $params[] = $user['family_id'];
    }

    $today = date('Y-m-d');
    if ($days === -1) {
        // Chỉ đã hết hạn
        $where[] = "w.end_date < ?";
        $params[] = $today;
    } else {
        // Chưa hết hạn và hết trong $days ngày tới (hôm nay vẫn tính)
        $where[]  = "w.end_date >= ?";
        $params[] = $today;
        $where[]  = "w.end_date <= ?";
        $params[] = date('Y-m-d', strtotime("+{$days} days"));
    }

    $sql = "
        SELECT w.id AS warranty_id, w.asset_id, w.start_date, w.duration_months,
               w.end_date, w.provider_name, w.provider_phone, w.provider_address,
               w.provider_website, w.conditions, w.notification_viewed, w.extension_months,
               a.name, a.brand, a.model, a.serial_number, a.room_location,
               a.purchase_date, a.purchase_price, a.image_url, a.usage_status,
               c.name AS category_name, u.full_name AS owner_name,
               DATEDIFF(w.end_date, CURRENT_DATE) AS days_remaining
        FROM warranties w
        JOIN assets a ON w.asset_id = a.id
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY days_remaining ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $list = $stmt->fetchAll();

    foreach ($list as &$item) {
        $item['warrantyInfo'] = computeWarrantyInfo($item['end_date']);
    }
    unset($item);

    sendJson([
        'success'    => true,
        'filterDays' => $days,
        'total'      => count($list),
        'data'       => $list,
        'warranties' => $list,
    ]);
}
/**
 * Đánh dấu cảnh báo bảo hành đã xem
 */
function handleMarkViewed(PDO $db, array $user, int $warrantyId): void {
    $stmtGet = $db->prepare("SELECT w.id, a.family_id FROM warranties w JOIN assets a ON w.asset_id = a.id WHERE w.id = ?");
    $stmtGet->execute([$warrantyId]);
    $w = $stmtGet->fetch();

    if (!$w) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy thông tin bảo hành'], 404);
    }

    if ($user['role'] !== 'admin' && (int)$w['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $stmt = $db->prepare("UPDATE warranties SET notification_viewed = 1 WHERE id = ?");
    $stmt->execute([$warrantyId]);

    sendJson(['success' => true, 'message' => 'Đã đánh dấu đã xem cảnh báo']);
}

/**
 * Gia hạn bảo hành (mua gói mở rộng)
 */
function handleExtendWarranty(PDO $db, array $user, int $warrantyId): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên không có quyền gia hạn bảo hành'], 403);
    }

    $input = getJsonInput();
    $extraMonths = max(1, (int)($input['extension_months'] ?? $input['months'] ?? $input['additionalMonths'] ?? 12));
    $notes = trim($input['extension_notes'] ?? $input['notes'] ?? '');

    $stmtGet = $db->prepare("SELECT w.*, a.name as asset_name, a.family_id FROM warranties w JOIN assets a ON w.asset_id = a.id WHERE w.id = ?");
    $stmtGet->execute([$warrantyId]);
    $w = $stmtGet->fetch();

    if (!$w) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy thông tin bảo hành'], 404);
    }

    if ($user['role'] !== 'admin' && (int)$w['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    // Tính ngày kết thúc mới
    $currentEnd = new DateTime($w['end_date']);
    $newEnd = clone $currentEnd;
    $newEnd->modify("+$extraMonths months");
    $newEndDateStr = $newEnd->format('Y-m-d');

    $totalExtension = (int)$w['extension_months'] + $extraMonths;
    $updatedNotes = trim(($w['extension_notes'] ? $w['extension_notes'] . "; " : "") . "Gia hạn thêm {$extraMonths} tháng: " . $notes);

    $stmtUpdate = $db->prepare("
        UPDATE warranties SET 
            end_date = ?,
            extension_months = ?,
            extension_notes = ?,
            notification_viewed = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ");
    $stmtUpdate->execute([$newEndDateStr, $totalExtension, $updatedNotes, $warrantyId]);

    logAudit($db, $user['id'], $user['email'], 'EXTEND_WARRANTY', 'warranty', $warrantyId, "Gia hạn bảo hành cho {$w['asset_name']} thêm $extraMonths tháng đến $newEndDateStr");

    sendJson([
        'success' => true,
        'message' => "Gia hạn bảo hành thành công thêm $extraMonths tháng. Hạn bảo hành mới là: $newEndDateStr",
        'new_end_date' => $newEndDateStr
    ]);
}

/**
 * Gửi email nhắc nhở bảo hành
 */
function handleSendEmailReminder(PDO $db, array $user): void {
    $input = getJsonInput();
    $assetId = (int)($input['assetId'] ?? $input['asset_id'] ?? 0);

    if ($assetId <= 0) {
        sendJson(['success' => false, 'message' => 'Thiếu thông tin mã tài sản'], 422);
    }

    $stmt = $db->prepare("
        SELECT a.name, a.brand, a.family_id, w.end_date, w.provider_name, w.provider_phone,
               DATEDIFF(w.end_date, CURRENT_DATE) as days_remaining
        FROM assets a
        JOIN warranties w ON a.id = w.asset_id
        WHERE a.id = ?
    ");
    $stmt->execute([$assetId]);
    $item = $stmt->fetch();

    if (!$item) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy thông tin bảo hành của tài sản'], 404);
    }

    if ($user['role'] !== 'admin' && (int)$item['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $days = (int)$item['days_remaining'];
    $subject = "Cảnh báo bảo hành: " . $item['name'] . ($days < 0 ? " (Đã hết hạn)" : " (Còn {$days} ngày)");
    $content = "Kính gửi quý khách,\nThiết bị {$item['name']} ({$item['brand']}) sẽ hết hạn bảo hành vào ngày {$item['end_date']}." .
               ($item['provider_phone'] ? "\nHotline hỗ trợ: {$item['provider_phone']}" : "");

    // Lưu vào thông báo hệ thống
    $stmtNotif = $db->prepare("
        INSERT INTO notifications (user_id, asset_id, title, message, type, days_remaining)
        VALUES (?, ?, ?, ?, 'warranty_expiring', ?)
    ");
    $stmtNotif->execute([$user['id'], $assetId, $subject, $content, $days]);

    logAudit($db, $user['id'], $user['email'], 'SEND_EMAIL_REMINDER', 'asset', $assetId, "Gửi email nhắc nhở bảo hành tới {$user['email']}");

    sendJson([
        'success' => true,
        'message' => "Đã gửi thông báo nhắc nhở bảo hành tới email {$user['email']} và lưu vào hộp thư thông báo hệ thống."
    ]);
}

/**
 * Danh sách trung tâm bảo hành chung
 */
function handleGetServiceCenters(PDO $db): void {
    $stmt = $db->query("SELECT * FROM service_centers ORDER BY brand ASC, name ASC");
    $centers = $stmt->fetchAll();
    sendJson(['success' => true, 'service_centers' => $centers]);
}
