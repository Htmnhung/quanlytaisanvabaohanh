<?php
// api/repairs.php - Quản lý lịch sử sửa chữa thiết bị và đơn vị sửa chữa

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
    if ($method === 'GET') {
        handleGetRepairs($db, $user);
    } elseif ($method === 'POST') {
        handleCreateRepair($db, $user);
    } else {
        sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
    }
} elseif ($parts[0] === 'repair-shops') {
    handleGetRepairShops($db);
} elseif (is_numeric($parts[0])) {
    $repairId = (int)$parts[0];
    if ($method === 'PUT' || $method === 'POST') {
        handleUpdateRepair($db, $user, $repairId);
    } elseif ($method === 'DELETE') {
        handleDeleteRepair($db, $user, $repairId);
    } else {
        sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
    }
} else {
    sendJson(['success' => false, 'message' => 'Đường dẫn không hợp lệ'], 404);
}

/**
 * 2.3.1.6. Xem danh sách lịch sử sửa chữa
 */
function handleGetRepairs(PDO $db, array $user): void {
    $familyId = $user['family_id'];
    $isAdmin = $user['role'] === 'admin';

    $where = ["a.deleted_at IS NULL"];
    $params = [];

    if (!$isAdmin) {
        $where[] = "a.family_id = ?";
        $params[] = $familyId;
    }

    // Lọc theo trạng thái sửa chữa: repairing / completed
    if (!empty($_GET['status'])) {
        $where[] = "r.status = ?";
        $params[] = trim($_GET['status']);
    }

    // Lọc theo tài sản cụ thể
    if (!empty($_GET['asset_id'])) {
        $where[] = "r.asset_id = ?";
        $params[] = (int)$_GET['asset_id'];
    }

    $whereSql = "WHERE " . implode(" AND ", $where);

    $sql = "
        SELECT 
            r.*,
            a.name as asset_name,
            a.brand as asset_brand,
            a.model as asset_model,
            a.room_location,
            a.image_url as asset_image,
            c.name as category_name,
            u.full_name as recorder_name
        FROM repairs r
        JOIN assets a ON r.asset_id = a.id
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON r.user_id = u.id
        $whereSql
        ORDER BY r.repair_date DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $repairs = $stmt->fetchAll();

    // Thống kê tổng hợp
    $totalCost = 0;
    $repairingCount = 0;
    foreach ($repairs as $r) {
        $totalCost += (float)$r['cost'];
        if ($r['status'] === 'repairing') {
            $repairingCount++;
        }
    }

    sendJson([
        'success' => true,
        'data' => $repairs,
        'repairs' => $repairs,
        'totalCount' => count($repairs),
        'activeRepairCount' => $repairingCount,
        'totalCost' => $totalCost,
        'stats' => [
            'totalCount' => count($repairs),
            'repairingCount' => $repairingCount,
            'activeRepairCount' => $repairingCount,
            'totalCost' => $totalCost
        ]
    ]);
}

/**
 * 2.3.1.6. Thêm bản ghi sửa chữa
 * Tự động cập nhật tình trạng tài sản khi sửa chữa diễn ra
 */
function handleCreateRepair(PDO $db, array $user): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên không có quyền thêm bản ghi sửa chữa'], 403);
    }

    $input = getJsonInput();

    $assetId = (int)($input['asset_id'] ?? 0);
    $repairDate = $input['repair_date'] ?? date('Y-m-d');
    $issueDescription = trim($input['issue_description'] ?? '');
    $repairShop = trim($input['repair_shop'] ?? '');
    $cost = max(0, (float)($input['cost'] ?? 0));
    $isUnderWarranty = !empty($input['is_under_warranty']) ? 1 : 0;
    $status = $input['status'] ?? 'completed';
    $returnDate = !empty($input['return_date']) ? $input['return_date'] : null;
    $notes = trim($input['notes'] ?? '');
    $receiptUrl = $input['receipt_url'] ?? null;

    if ($assetId <= 0 || empty($issueDescription)) {
        sendJson(['success' => false, 'message' => 'Vui lòng chọn tài sản và mô tả lỗi hỏng hóc'], 422);
    }

    // Kiểm tra tài sản có tồn tại và thuộc gia đình mình không
    $stmtAssetCheck = $db->prepare("SELECT id, family_id FROM assets WHERE id = ?");
    $stmtAssetCheck->execute([$assetId]);
    $targetAsset = $stmtAssetCheck->fetch();

    if (!$targetAsset) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài sản'], 404);
    }

    if ($user['role'] !== 'admin' && (int)$targetAsset['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    if (isset($_FILES['receipt'])) {
        $up = handleFileUpload($_FILES['receipt'], 'receipts');
        if ($up) $receiptUrl = $up;
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("
            INSERT INTO repairs (asset_id, user_id, repair_date, issue_description, repair_shop, cost, is_under_warranty, status, return_date, receipt_url, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $assetId, $user['id'], $repairDate, $issueDescription, $repairShop,
            $cost, $isUnderWarranty, $status, $returnDate, $receiptUrl, $notes
        ]);
        $repairId = (int)$db->lastInsertId();

        // Tự động cập nhật tình trạng tài sản (Transaction)
        if ($status === 'repairing') {
            $stmtAsset = $db->prepare("UPDATE assets SET usage_status = 'repairing', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmtAsset->execute([$assetId]);
        } elseif ($status === 'completed') {
            $stmtAsset = $db->prepare("UPDATE assets SET usage_status = 'good', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmtAsset->execute([$assetId]);
        }

        $db->commit();
        logAudit($db, $user['id'], $user['email'], 'CREATE_REPAIR', 'repair', $repairId, "Thêm lịch sử sửa chữa cho tài sản #$assetId");

        sendJson([
            'success' => true,
            'message' => 'Thêm bản ghi sửa chữa thành công',
            'repair_id' => $repairId
        ], 201);

    } catch (Exception $e) {
        $db->rollBack();
        sendJson(['success' => false, 'message' => 'Lỗi lưu dữ liệu: ' . $e->getMessage()], 500);
    }
}

/**
 * Cập nhật bản ghi sửa chữa
 */
function handleUpdateRepair(PDO $db, array $user, int $repairId): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên không có quyền sửa bản ghi'], 403);
    }

    $stmtCheck = $db->prepare("SELECT r.*, a.family_id FROM repairs r JOIN assets a ON r.asset_id = a.id WHERE r.id = ?");
    $stmtCheck->execute([$repairId]);
    $repair = $stmtCheck->fetch();

    if (!$repair) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy bản ghi sửa chữa'], 404);
    }

    if ($user['role'] !== 'admin' && (int)$repair['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $input = getJsonInput();

    $repairDate = $input['repair_date'] ?? $repair['repair_date'];
    $issueDescription = trim($input['issue_description'] ?? $repair['issue_description']);
    $repairShop = trim($input['repair_shop'] ?? $repair['repair_shop']);
    $cost = isset($input['cost']) ? max(0, (float)$input['cost']) : $repair['cost'];
    $isUnderWarranty = isset($input['is_under_warranty']) ? (!empty($input['is_under_warranty']) ? 1 : 0) : $repair['is_under_warranty'];
    $status = $input['status'] ?? $repair['status'];
    $returnDate = isset($input['return_date']) ? (!empty($input['return_date']) ? $input['return_date'] : null) : $repair['return_date'];
    $notes = trim($input['notes'] ?? $repair['notes']);
    $receiptUrl = $input['receipt_url'] ?? $repair['receipt_url'];

    if (isset($_FILES['receipt'])) {
        $up = handleFileUpload($_FILES['receipt'], 'receipts');
        if ($up) $receiptUrl = $up;
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("
            UPDATE repairs SET 
                repair_date = ?, issue_description = ?, repair_shop = ?, cost = ?,
                is_under_warranty = ?, status = ?, return_date = ?, receipt_url = ?, notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([
            $repairDate, $issueDescription, $repairShop, $cost,
            $isUnderWarranty, $status, $returnDate, $receiptUrl, $notes,
            $repairId
        ]);

        // Cập nhật tình trạng thiết bị (Transaction)
        if ($status === 'repairing') {
            $stmtAsset = $db->prepare("UPDATE assets SET usage_status = 'repairing', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmtAsset->execute([$repair['asset_id']]);
        } elseif ($status === 'completed') {
            $stmtAsset = $db->prepare("UPDATE assets SET usage_status = 'good', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmtAsset->execute([$repair['asset_id']]);
        }

        $db->commit();
        logAudit($db, $user['id'], $user['email'], 'UPDATE_REPAIR', 'repair', $repairId, "Cập nhật lịch sử sửa chữa #$repairId");

        sendJson(['success' => true, 'message' => 'Cập nhật bản ghi sửa chữa thành công']);

    } catch (Exception $e) {
        $db->rollBack();
        sendJson(['success' => false, 'message' => 'Lỗi cập nhật: ' . $e->getMessage()], 500);
    }
}

/**
 * Xóa bản ghi sửa chữa
 */
function handleDeleteRepair(PDO $db, array $user, int $repairId): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên không có quyền xóa bản ghi'], 403);
    }

    $stmtCheck = $db->prepare("SELECT r.*, a.family_id FROM repairs r JOIN assets a ON r.asset_id = a.id WHERE r.id = ?");
    $stmtCheck->execute([$repairId]);
    $repair = $stmtCheck->fetch();

    if (!$repair) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy bản ghi sửa chữa'], 404);
    }

    if ($user['role'] !== 'admin' && (int)$repair['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("DELETE FROM repairs WHERE id = ?");
        $stmt->execute([$repairId]);

        // Nếu tài sản đang ở trạng thái repairing mà không còn sửa chữa nào khác đang diễn ra, khôi phục lại 'good'
        $stmtCheckOthers = $db->prepare("SELECT COUNT(*) FROM repairs WHERE asset_id = ? AND status = 'repairing'");
        $stmtCheckOthers->execute([$repair['asset_id']]);
        if ($stmtCheckOthers->fetchColumn() == 0) {
            $stmtAsset = $db->prepare("UPDATE assets SET usage_status = 'good', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usage_status = 'repairing'");
            $stmtAsset->execute([$repair['asset_id']]);
        }

        $db->commit();
        logAudit($db, $user['id'], $user['email'], 'DELETE_REPAIR', 'repair', $repairId, "Xóa bản ghi sửa chữa #$repairId");

        sendJson(['success' => true, 'message' => 'Đã xóa bản ghi sửa chữa thành công']);

    } catch (Exception $e) {
        $db->rollBack();
        sendJson(['success' => false, 'message' => 'Lỗi xóa bản ghi: ' . $e->getMessage()], 500);
    }
}

/**
 * Lấy danh bạ các đơn vị sửa chữa uy tín
 */
function handleGetRepairShops(PDO $db): void {
    $stmt = $db->query("SELECT * FROM repair_shops ORDER BY rating DESC, name ASC");
    $shops = $stmt->fetchAll();
    sendJson(['success' => true, 'repair_shops' => $shops]);
}
