<?php
// api/admin.php - Khu vực quản trị hệ thống (Chỉ dành cho tài khoản Admin)

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/utils.php';

$db = Database::getConnection();
$adminUser = requireRole($db, 'admin');

$method = $_SERVER['REQUEST_METHOD'];
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$action = trim($pathInfo, '/');
$parts = array_values(array_filter(explode('/', $action)));

if (empty($parts)) {
    sendJson(['success' => false, 'message' => 'Hành động không hợp lệ'], 400);
}

$resource = $parts[0];
$resourceId = $parts[1] ?? null;
$subAction = $parts[2] ?? null;

switch ($resource) {
    case 'dashboard':
        handleAdminDashboard($db);
        break;

    case 'users':
        if ($resourceId === null) {
            if ($method === 'GET') handleGetUsers($db);
            elseif ($method === 'POST') handleCreateUser($db, $adminUser);
        } else {
            $userId = (int)$resourceId;
            if ($subAction === 'toggle-status') handleToggleUserStatus($db, $adminUser, $userId);
            elseif ($subAction === 'reset-password') handleResetUserPassword($db, $adminUser, $userId);
            elseif ($method === 'PUT' || $method === 'POST') handleUpdateUser($db, $adminUser, $userId);
            else sendJson(['success' => false, 'message' => 'Phương thức không hỗ trợ'], 405);
        }
        break;

    case 'categories':
        if ($resourceId === null) {
            if ($method === 'GET') handleGetCategories($db);
            elseif ($method === 'POST') handleCreateCategory($db, $adminUser);
        } else {
            $catId = (int)$resourceId;
            if ($method === 'PUT' || $method === 'POST') handleUpdateCategory($db, $adminUser, $catId);
            elseif ($method === 'DELETE') handleDeleteCategory($db, $adminUser, $catId);
            else sendJson(['success' => false, 'message' => 'Phương thức không hỗ trợ'], 405);
        }
        break;

    case 'assets':
        if ($subAction === 'flag' || ($resourceId && $method === 'PUT')) {
            handleToggleFlagAsset($db, $adminUser, (int)$resourceId);
        }
        break;

    case 'settings':
        if ($method === 'GET') handleGetSettings($db);
        elseif ($method === 'PUT' || $method === 'POST') handleUpdateSettings($db, $adminUser);
        break;

    case 'audit-logs':
        handleGetAuditLogs($db);
        break;

    case 'service-centers':
        if ($resourceId === null && $method === 'POST') handleCreateServiceCenter($db, $adminUser);
        elseif ($resourceId && ($method === 'PUT' || $method === 'POST')) handleUpdateServiceCenter($db, $adminUser, (int)$resourceId);
        elseif ($resourceId && $method === 'DELETE') handleDeleteServiceCenter($db, $adminUser, (int)$resourceId);
        break;

    case 'repair-shops':
        if ($resourceId === null && $method === 'POST') handleCreateRepairShop($db, $adminUser);
        elseif ($resourceId && ($method === 'PUT' || $method === 'POST')) handleUpdateRepairShop($db, $adminUser, (int)$resourceId);
        elseif ($resourceId && $method === 'DELETE') handleDeleteRepairShop($db, $adminUser, (int)$resourceId);
        break;

    default:
        sendJson(['success' => false, 'message' => 'Tài nguyên quản trị không tồn tại'], 404);
}

/**
 * 2.3.2.7. Dashboard toàn hệ thống
 */
function handleAdminDashboard(PDO $db): void {
    $totalUsers = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $activeUsers = (int)$db->query("SELECT COUNT(*) FROM users WHERE status = 'active'")->fetchColumn();
    $totalAssets = (int)$db->query("SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL")->fetchColumn();
    $totalPurchaseValue = (float)$db->query("SELECT COALESCE(SUM(purchase_price), 0) FROM assets WHERE deleted_at IS NULL")->fetchColumn();
    $repairingCount = (int)$db->query("SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND usage_status = 'repairing'")->fetchColumn();
    $totalRepairCost = (float)$db->query("SELECT COALESCE(SUM(cost), 0) FROM repairs")->fetchColumn();

    // Thống kê hạn bảo hành toàn hệ thống
    $stmtWarr = $db->query("
        SELECT w.end_date FROM warranties w
        JOIN assets a ON w.asset_id = a.id
        WHERE a.deleted_at IS NULL
    ");
    $wList = $stmtWarr->fetchAll();
    $activeWarr = 0; $expiringWarr = 0; $expiredWarr = 0;
    foreach ($wList as $w) {
        $info = computeWarrantyInfo($w['end_date']);
        if ($info['status'] === 'active') $activeWarr++;
        elseif ($info['status'] === 'expiring_soon') $expiringWarr++;
        elseif ($info['status'] === 'expired') $expiredWarr++;
    }

    $totalRepairs = (int)$db->query("SELECT COUNT(*) FROM repairs")->fetchColumn();
    $stmtLogs = $db->query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5");
    $recentLogs = $stmtLogs->fetchAll();

    sendJson([
        'success' => true,
        'stats' => [
            'totalUsers' => $totalUsers,
            'activeUsers' => $activeUsers,
            'totalAssets' => $totalAssets,
            'totalPurchaseValue' => $totalPurchaseValue,
            'totalAssetValue' => $totalPurchaseValue,
            'totalRepairs' => $totalRepairs,
            'repairingCount' => $repairingCount,
            'totalRepairCost' => $totalRepairCost,
            'activeWarranties' => $activeWarr,
            'expiringWarranties' => $expiringWarr,
            'expiredWarranties' => $expiredWarr
        ],
        'recentLogs' => $recentLogs
    ]);
}

/**
 * 2.3.2.1. Quản lý tài khoản người dùng
 */
function handleGetUsers(PDO $db): void {
    $stmt = $db->query("
        SELECT id, full_name, email, phone, role, family_id, status, avatar, created_at,
               (SELECT COUNT(*) FROM assets a WHERE a.user_id = users.id AND a.deleted_at IS NULL) as asset_count
        FROM users
        ORDER BY created_at DESC
    ");
    $users = $stmt->fetchAll();
    sendJson(['success' => true, 'users' => $users]);
}

function handleCreateUser(PDO $db, array $admin): void {
    $input = getJsonInput();
    $fullName = trim($input['full_name'] ?? '');
    $email = trim(strtolower($input['email'] ?? ''));
    $phone = trim($input['phone'] ?? '');
    $password = $input['password'] ?? 'User@123456';
    $role = $input['role'] ?? 'member';

    if (empty($fullName) || empty($email)) {
        sendJson(['success' => false, 'message' => 'Vui lòng cung cấp họ tên và email'], 422);
    }

    $stmtCheck = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmtCheck->execute([$email]);
    if ($stmtCheck->fetch()) {
        sendJson(['success' => false, 'message' => 'Email đã tồn tại'], 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO users (full_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, 'active')");
    $stmt->execute([$fullName, $email, $phone, $hash, $role]);
    $userId = (int)$db->lastInsertId();

    logAudit($db, $admin['id'], $admin['email'], 'ADMIN_CREATE_USER', 'user', $userId, "Tạo tài khoản: $email ($role)");

    sendJson(['success' => true, 'message' => 'Tạo người dùng mới thành công', 'user_id' => $userId], 201);
}

function handleUpdateUser(PDO $db, array $admin, int $userId): void {
    $input = getJsonInput();
    $fullName = trim($input['full_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $role = $input['role'] ?? 'member';

    $stmt = $db->prepare("UPDATE users SET full_name = ?, phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$fullName, $phone, $role, $userId]);

    logAudit($db, $admin['id'], $admin['email'], 'ADMIN_UPDATE_USER', 'user', $userId, "Cập nhật tài khoản #$userId");

    sendJson(['success' => true, 'message' => 'Cập nhật tài khoản thành công']);
}

function handleToggleUserStatus(PDO $db, array $admin, int $userId): void {
    if ($userId === $admin['id']) {
        sendJson(['success' => false, 'message' => 'Không thể tự khóa tài khoản của chính mình'], 400);
    }

    $stmtGet = $db->prepare("SELECT status, email FROM users WHERE id = ?");
    $stmtGet->execute([$userId]);
    $user = $stmtGet->fetch();

    if (!$user) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy người dùng'], 404);
    }

    $newStatus = $user['status'] === 'active' ? 'locked' : 'active';
    $stmt = $db->prepare("UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$newStatus, $userId]);

    $label = $newStatus === 'locked' ? 'Khóa' : 'Mở khóa';
    logAudit($db, $admin['id'], $admin['email'], 'TOGGLE_USER_STATUS', 'user', $userId, "$label tài khoản {$user['email']}");

    sendJson(['success' => true, 'message' => "Đã $label tài khoản thành công", 'new_status' => $newStatus]);
}

function handleResetUserPassword(PDO $db, array $admin, int $userId): void {
    $input = getJsonInput();
    $newPassword = $input['newPassword'] ?? $input['password'] ?? 'Reset@123456';

    $hash = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $db->prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$hash, $userId]);

    logAudit($db, $admin['id'], $admin['email'], 'RESET_USER_PASSWORD', 'user', $userId, "Đặt lại mật khẩu cho tài khoản #$userId");

    sendJson(['success' => true, 'message' => "Đặt lại mật khẩu thành công. Mật khẩu mới là: $newPassword"]);
}

/**
 * 2.3.2.2. Quản lý danh mục tài sản
 */
function handleGetCategories(PDO $db): void {
    $stmt = $db->query("
        SELECT c.*, p.name as parent_name,
               (SELECT COUNT(*) FROM assets a WHERE a.category_id = c.id AND a.deleted_at IS NULL) as asset_count
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        ORDER BY c.parent_id IS NOT NULL, c.name ASC
    ");
    $cats = $stmt->fetchAll();
    sendJson(['success' => true, 'categories' => $cats, 'data' => $cats]);
}

function handleCreateCategory(PDO $db, array $admin): void {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $icon = trim($input['icon'] ?? 'package');
    $parentId = !empty($input['parent_id']) ? (int)$input['parent_id'] : null;

    if (empty($name)) {
        sendJson(['success' => false, 'message' => 'Tên danh mục không được để trống'], 422);
    }

    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));

    $stmt = $db->prepare("INSERT INTO categories (name, slug, description, icon, parent_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$name, $slug, $description, $icon, $parentId]);
    $catId = (int)$db->lastInsertId();

    logAudit($db, $admin['id'], $admin['email'], 'CREATE_CATEGORY', 'category', $catId, "Tạo danh mục mới: $name");

    sendJson(['success' => true, 'message' => 'Tạo danh mục thành công', 'category_id' => $catId], 201);
}

function handleUpdateCategory(PDO $db, array $admin, int $catId): void {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $icon = trim($input['icon'] ?? 'package');
    $parentId = !empty($input['parent_id']) ? (int)$input['parent_id'] : null;

    $stmt = $db->prepare("UPDATE categories SET name = ?, description = ?, icon = ?, parent_id = ? WHERE id = ?");
    $stmt->execute([$name, $description, $icon, $parentId, $catId]);

    logAudit($db, $admin['id'], $admin['email'], 'UPDATE_CATEGORY', 'category', $catId, "Cập nhật danh mục #$catId: $name");

    sendJson(['success' => true, 'message' => 'Cập nhật danh mục thành công']);
}

function handleDeleteCategory(PDO $db, array $admin, int $catId): void {
    // Kiểm tra xem danh mục có đang chứa tài sản không
    $stmtCount = $db->prepare("SELECT COUNT(*) FROM assets WHERE category_id = ? AND deleted_at IS NULL");
    $stmtCount->execute([$catId]);
    $hasAssets = (int)$stmtCount->fetchColumn();

    if ($hasAssets > 0) {
        sendJson(['success' => false, 'message' => "Không thể xóa danh mục vì đang có $hasAssets tài sản thuộc danh mục này. Vui lòng chuyển các tài sản sang danh mục khác trước."], 400);
    }

    $stmt = $db->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->execute([$catId]);

    logAudit($db, $admin['id'], $admin['email'], 'DELETE_CATEGORY', 'category', $catId, "Xóa danh mục #$catId");

    sendJson(['success' => true, 'message' => 'Đã xóa danh mục thành công']);
}

/**
 * 2.3.2.3. Kiểm duyệt tài sản (Gắn cờ cảnh báo / Bỏ gắn cờ)
 */
function handleToggleFlagAsset(PDO $db, array $admin, int $assetId): void {
    $stmtGet = $db->prepare("SELECT is_flagged, name FROM assets WHERE id = ?");
    $stmtGet->execute([$assetId]);
    $asset = $stmtGet->fetch();

    if (!$asset) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài sản'], 404);
    }

    $newFlag = $asset['is_flagged'] ? 0 : 1;
    $stmt = $db->prepare("UPDATE assets SET is_flagged = ? WHERE id = ?");
    $stmt->execute([$newFlag, $assetId]);

    $actionText = $newFlag ? 'Gắn cờ kiểm duyệt' : 'Gỡ cờ kiểm duyệt';
    logAudit($db, $admin['id'], $admin['email'], 'FLAG_ASSET', 'asset', $assetId, "$actionText tài sản: {$asset['name']}");

    sendJson(['success' => true, 'message' => "Đã $actionText thành công", 'is_flagged' => $newFlag]);
}

/**
 * 2.3.2.4. Cấu hình ngưỡng cảnh báo & cài đặt hệ thống
 */
function handleGetSettings(PDO $db): void {
    $stmt = $db->query("SELECT * FROM system_settings");
    $settings = $stmt->fetchAll();
    sendJson(['success' => true, 'settings' => $settings]);
}

function handleUpdateSettings(PDO $db, array $admin): void {
    $input = getJsonInput();
    $settings = $input['settings'] ?? [];

    $stmt = $db->prepare("REPLACE INTO system_settings (`key`, value) VALUES (?, ?)");
    foreach ($settings as $key => $val) {
        $stmt->execute([$key, (string)$val]);
    }

    logAudit($db, $admin['id'], $admin['email'], 'UPDATE_SETTINGS', 'settings', null, 'Cập nhật cấu hình hệ thống');

    sendJson(['success' => true, 'message' => 'Lưu cài đặt hệ thống thành công']);
}

/**
 * 2.3.2.6. Nhật ký thao tác quan trọng (Audit Logs)
 */
function handleGetAuditLogs(PDO $db): void {
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
    $stmt = $db->prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?");
    $stmt->execute([$limit]);
    $logs = $stmt->fetchAll();
    sendJson(['success' => true, 'logs' => $logs]);
}

/**
 * Quản lý Trung tâm bảo hành chung (Service Centers)
 */
function handleCreateServiceCenter(PDO $db, array $admin): void {
    $input = getJsonInput();
    $stmt = $db->prepare("INSERT INTO service_centers (name, brand, hotline, address, website, notes) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        trim($input['name'] ?? ''),
        trim($input['brand'] ?? ''),
        trim($input['hotline'] ?? ''),
        trim($input['address'] ?? ''),
        trim($input['website'] ?? ''),
        trim($input['notes'] ?? '')
    ]);
    sendJson(['success' => true, 'message' => 'Thêm trung tâm bảo hành thành công']);
}

function handleUpdateServiceCenter(PDO $db, array $admin, int $id): void {
    $input = getJsonInput();
    $stmt = $db->prepare("UPDATE service_centers SET name = ?, brand = ?, hotline = ?, address = ?, website = ?, notes = ? WHERE id = ?");
    $stmt->execute([
        trim($input['name'] ?? ''),
        trim($input['brand'] ?? ''),
        trim($input['hotline'] ?? ''),
        trim($input['address'] ?? ''),
        trim($input['website'] ?? ''),
        trim($input['notes'] ?? ''),
        $id
    ]);
    sendJson(['success' => true, 'message' => 'Cập nhật trung tâm bảo hành thành công']);
}

function handleDeleteServiceCenter(PDO $db, array $admin, int $id): void {
    $stmt = $db->prepare("DELETE FROM service_centers WHERE id = ?");
    $stmt->execute([$id]);
    sendJson(['success' => true, 'message' => 'Đã xóa trung tâm bảo hành']);
}

/**
 * Quản lý Đơn vị sửa chữa uy tín (Repair Shops)
 */
function handleCreateRepairShop(PDO $db, array $admin): void {
    $input = getJsonInput();
    $stmt = $db->prepare("INSERT INTO repair_shops (name, phone, address, specialty, rating) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        trim($input['name'] ?? ''),
        trim($input['phone'] ?? ''),
        trim($input['address'] ?? ''),
        trim($input['specialty'] ?? ''),
        (float)($input['rating'] ?? 5.0)
    ]);
    sendJson(['success' => true, 'message' => 'Thêm đơn vị sửa chữa thành công']);
}

function handleUpdateRepairShop(PDO $db, array $admin, int $id): void {
    $input = getJsonInput();
    $stmt = $db->prepare("UPDATE repair_shops SET name = ?, phone = ?, address = ?, specialty = ?, rating = ? WHERE id = ?");
    $stmt->execute([
        trim($input['name'] ?? ''),
        trim($input['phone'] ?? ''),
        trim($input['address'] ?? ''),
        trim($input['specialty'] ?? ''),
        (float)($input['rating'] ?? 5.0),
        $id
    ]);
    sendJson(['success' => true, 'message' => 'Cập nhật đơn vị sửa chữa thành công']);
}

function handleDeleteRepairShop(PDO $db, array $admin, int $id): void {
    $stmt = $db->prepare("DELETE FROM repair_shops WHERE id = ?");
    $stmt->execute([$id]);
    sendJson(['success' => true, 'message' => 'Đã xóa đơn vị sửa chữa']);
}
