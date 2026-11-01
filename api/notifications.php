<?php
// api/notifications.php - Thông báo hệ thống và cảnh báo hạn bảo hành

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
    // GET /notifications
    $stmt = $db->prepare("
        SELECT n.*, a.name as asset_name, a.brand as asset_brand
        FROM notifications n
        LEFT JOIN assets a ON n.asset_id = a.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50
    ");
    $stmt->execute([$user['id']]);
    $notifications = $stmt->fetchAll();

    $stmtCount = $db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
    $stmtCount->execute([$user['id']]);
    $unreadCount = (int)$stmtCount->fetchColumn();

    sendJson([
        'success' => true,
        'notifications' => $notifications,
        'unreadCount' => $unreadCount
    ]);
} elseif ($parts[0] === 'all' && ($parts[1] ?? '') === 'read') {
    // PUT /notifications/all/read
    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    sendJson(['success' => true, 'message' => 'Đã đánh dấu tất cả thông báo là đã đọc']);
} elseif (is_numeric($parts[0]) && ($parts[1] ?? '') === 'read') {
    // PUT /notifications/:id/read
    $notifId = (int)$parts[0];
    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
    $stmt->execute([$notifId, $user['id']]);
    sendJson(['success' => true, 'message' => 'Đã đánh dấu thông báo là đã đọc']);
} else {
    sendJson(['success' => false, 'message' => 'Hành động không hợp lệ'], 404);
}

