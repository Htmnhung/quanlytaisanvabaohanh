<?php
// api/assets.php - Quản lý tài sản gia đình, tổng quan Dashboard và thông tin bảo hành

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/utils.php';

$db = Database::getConnection();
$user = requireAuth($db);

$method = $_SERVER['REQUEST_METHOD'];
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$action = trim($pathInfo, '/');

// Xử lý các đường dẫn con như /assets/dashboard hoặc /assets/123/restore
$parts = array_values(array_filter(explode('/', $action)));

if (empty($parts)) {
    // Route /assets
    if ($method === 'GET') {
        handleGetAssets($db, $user);
    } elseif ($method === 'POST') {
        handleCreateAsset($db, $user);
    } else {
        sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
    }
} elseif ($parts[0] === 'dashboard') {
    handleGetDashboard($db, $user);
} elseif (is_numeric($parts[0])) {
    $assetId = (int)$parts[0];
    $subAction = $parts[1] ?? null;

    if ($subAction === 'restore' && $method === 'POST') {
        handleRestoreAsset($db, $user, $assetId);
    } elseif ($subAction === 'destroy' && $method === 'DELETE') {
        handleDestroyAsset($db, $user, $assetId);
    } elseif ($subAction === 'photo' && $method === 'POST') {
        handleUpdateAssetPhoto($db, $user, $assetId);
    } elseif ($subAction === null) {
        if ($method === 'GET') {
            handleGetAssetById($db, $user, $assetId);
        } elseif ($method === 'PUT' || $method === 'POST') {
            handleUpdateAsset($db, $user, $assetId);
        } elseif ($method === 'DELETE') {
            handleDeleteAsset($db, $user, $assetId);
        } else {
            sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
        }
    } else {
        sendJson(['success' => false, 'message' => 'Hành động không hợp lệ'], 404);
    }
} else {
    sendJson(['success' => false, 'message' => 'Đường dẫn không hợp lệ'], 404);
}

/**
 * 2.3.1.2. Xem thông tin tổng quan tài sản (Dashboard)
 * Phân biệt rõ số tài sản hết hạn bảo hành và số tài sản đang sửa chữa
 */
function handleGetDashboard(PDO $db, array $user): void {
    $familyId = $user['family_id'];
    $isAdmin = $user['role'] === 'admin';

    $whereFamily = $isAdmin ? "a.deleted_at IS NULL" : "a.family_id = ? AND a.deleted_at IS NULL";
    $paramsFamily = $isAdmin ? [] : [$familyId];

    // Lấy ngưỡng cảnh báo từ cấu hình
    $stmtThresh = $db->query("SELECT value FROM system_settings WHERE `key` = 'warning_threshold_days'");
    $thresholdDays = (int)($stmtThresh->fetchColumn() ?: 30);

    // 1. Tổng số tài sản và tổng giá trị mua
    $stmtTotal = $db->prepare("
        SELECT COUNT(a.id) as total_assets, COALESCE(SUM(a.purchase_price), 0) as total_purchase_value
        FROM assets a
        WHERE $whereFamily
    ");
    $stmtTotal->execute($paramsFamily);
    $totalRow = $stmtTotal->fetch();
    $totalAssets = (int)$totalRow['total_assets'];
    $totalPurchaseValue = (float)$totalRow['total_purchase_value'];

    // 2. Thống kê bảo hành (Tính toán động từ end_date so với CURRENT_DATE)
    $stmtWarr = $db->prepare("
        SELECT 
            w.end_date
        FROM assets a
        JOIN warranties w ON a.id = w.asset_id
        WHERE $whereFamily
    ");
    $stmtWarr->execute($paramsFamily);
    $warrRows = $stmtWarr->fetchAll();

    $activeWarranties = 0;
    $expiringWarranties = 0;
    $expiredWarranties = 0;

    foreach ($warrRows as $row) {
        $info = computeWarrantyInfo($row['end_date'], $thresholdDays);
        if ($info['status'] === 'active') {
            $activeWarranties++;
        } elseif ($info['status'] === 'expiring_soon') {
            $expiringWarranties++;
        } elseif ($info['status'] === 'expired') {
            $expiredWarranties++;
        }
    }

    // 3. Số tài sản đang sửa chữa (TÁCH BIỆT HOÀN TOÀN với hết hạn bảo hành)
    $stmtRepairing = $db->prepare("
        SELECT COUNT(a.id) as repairing_count
        FROM assets a
        WHERE $whereFamily AND a.usage_status = 'repairing'
    ");
    $stmtRepairing->execute($paramsFamily);
    $repairingCount = (int)$stmtRepairing->fetchColumn();

    // 4. Tổng chi phí sửa chữa
    $whereRepair = $isAdmin ? "1=1" : "a.family_id = ?";
    $stmtCost = $db->prepare("
        SELECT COALESCE(SUM(r.cost), 0) as total_repair_cost
        FROM repairs r
        JOIN assets a ON r.asset_id = a.id
        WHERE $whereRepair
    ");
    $stmtCost->execute($paramsFamily);
    $totalRepairCost = (float)$stmtCost->fetchColumn();

    // 5. Danh sách tài sản thêm gần đây
    $stmtRecent = $db->prepare("
        SELECT 
            a.*, 
            c.name as category_name, 
            w.id as warranty_id,
            w.start_date,
            w.start_date as warranty_start,
            w.start_date as warranty_start_date,
            w.end_date,
            w.end_date as warranty_end,
            w.end_date as warranty_end_date,
            w.duration_months,
            w.duration_months as warranty_duration_months
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN warranties w ON a.id = w.asset_id
        WHERE $whereFamily
        ORDER BY a.created_at DESC
        LIMIT 6
    ");
    $stmtRecent->execute($paramsFamily);
    $recentAssets = $stmtRecent->fetchAll();
    foreach ($recentAssets as &$item) {
        $wInfo = computeWarrantyInfo($item['end_date'] ?? null, $thresholdDays);
        $item['days_remaining'] = $wInfo['days_remaining'];
        $item['warranty_status'] = $wInfo['status'];
        $item['warrantyInfo'] = $wInfo;
    }

    // 6. Danh sách cảnh báo bảo hành mới nhất (sắp hết hạn hoặc đã hết hạn)
    $stmtWarnings = $db->prepare("
        SELECT a.id, a.name, a.brand, a.image_url, a.room_location, w.end_date, w.provider_phone,
               DATEDIFF(w.end_date, CURRENT_DATE) as days_remaining
        FROM assets a
        JOIN warranties w ON a.id = w.asset_id
        WHERE $whereFamily AND DATEDIFF(w.end_date, CURRENT_DATE) <= ?
        ORDER BY DATEDIFF(w.end_date, CURRENT_DATE) ASC
        LIMIT 5
    ");
    $paramsWarn = array_merge($paramsFamily, [$thresholdDays]);
    $stmtWarnings->execute($paramsWarn);
    $recentWarnings = $stmtWarnings->fetchAll();
    foreach ($recentWarnings as &$wItem) {
        $wItem['warrantyInfo'] = computeWarrantyInfo($wItem['end_date'], $thresholdDays);
    }

    sendJson([
        'success' => true,
        'stats' => [
            'totalAssets' => $totalAssets,
            'totalPurchaseValue' => $totalPurchaseValue,
            'activeWarranties' => $activeWarranties,
            'expiringWarranties' => $expiringWarranties,
            'expiredWarranties' => $expiredWarranties,
            'repairingCount' => $repairingCount,
            'totalRepairCost' => $totalRepairCost,
            'warningThresholdDays' => $thresholdDays
        ],
        'recentAssets' => $recentAssets,
        'recentWarnings' => $recentWarnings
    ]);
}

/**
 * 2.3.1.3. Xem danh sách và tìm kiếm tài sản (có phân trang, lọc đa tiêu chí)
 */
function handleGetAssets(PDO $db, array $user): void {
    $familyId = $user['family_id'];
    $isAdmin = $user['role'] === 'admin';

    $where = [];
    $params = [];

    // Kiểm tra thùng rác (soft delete)
    $isTrash = isset($_GET['trash']) && $_GET['trash'] === '1';
    if ($isTrash) {
        $where[] = "a.deleted_at IS NOT NULL";
    } else {
        $where[] = "a.deleted_at IS NULL";
    }

    if (!$isAdmin) {
        $where[] = "a.family_id = ?";
        $params[] = $familyId;
    }

    // Tìm kiếm theo từ khóa (tên, hãng, model, serial)
    if (!empty($_GET['search'])) {
        $s = '%' . trim($_GET['search']) . '%';
        $where[] = "(a.name LIKE ? OR a.brand LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ?)";
        $params[] = $s;
        $params[] = $s;
        $params[] = $s;
        $params[] = $s;
    }

    // Lọc theo danh mục
    if (!empty($_GET['category_id'])) {
        $where[] = "a.category_id = ?";
        $params[] = (int)$_GET['category_id'];
    }

    // Lọc theo vị trí phòng
    if (!empty($_GET['room_location'])) {
        $where[] = "a.room_location = ?";
        $params[] = trim($_GET['room_location']);
    }

    // Lọc theo tình trạng sử dụng
    if (!empty($_GET['usage_status'])) {
        $where[] = "a.usage_status = ?";
        $params[] = trim($_GET['usage_status']);
    }

    // Lọc theo khoảng giá
    if (isset($_GET['min_price']) && is_numeric($_GET['min_price'])) {
        $where[] = "a.purchase_price >= ?";
        $params[] = (float)$_GET['min_price'];
    }
    if (isset($_GET['max_price']) && is_numeric($_GET['max_price'])) {
        $where[] = "a.purchase_price <= ?";
        $params[] = (float)$_GET['max_price'];
    }

    // Lọc theo ngày mua
    if (!empty($_GET['purchase_from'])) {
        $where[] = "a.purchase_date >= ?";
        $params[] = $_GET['purchase_from'];
    }
    if (!empty($_GET['purchase_to'])) {
        $where[] = "a.purchase_date <= ?";
        $params[] = $_GET['purchase_to'];
    }

    // Lọc theo tình trạng bảo hành (active, expiring, expired)
    $warrantyFilter = $_GET['warranty_status'] ?? null;
    $today = date('Y-m-d');
    $future30 = date('Y-m-d', strtotime('+30 days'));
    if ($warrantyFilter === 'active') {
        $where[] = "w.end_date > ?";
        $params[] = $future30;
    } elseif ($warrantyFilter === 'expiring') {
        $where[] = "w.end_date >= ? AND w.end_date <= ?";
        $params[] = $today;
        $params[] = $future30;
    } elseif ($warrantyFilter === 'expired') {
        $where[] = "w.end_date < ?";
        $params[] = $today;
    }

    $whereSql = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

    // Phân trang
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 12)));
    $offset = ($page - 1) * $limit;

    // Sắp xếp
    $allowedSorts = [
        'purchase_date' => 'a.purchase_date',
        'purchase_price' => 'a.purchase_price',
        'name' => 'a.name',
        'end_date' => 'w.end_date',
        'created_at' => 'a.created_at'
    ];
    $sortBy = $allowedSorts[$_GET['sort'] ?? ''] ?? 'a.created_at';
    $order = strtoupper($_GET['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

    // Đếm tổng số bản ghi
    $countSql = "
        SELECT COUNT(a.id)
        FROM assets a
        LEFT JOIN warranties w ON a.id = w.asset_id
        $whereSql
    ";
    $stmtCount = $db->prepare($countSql);
    $stmtCount->execute($params);
    $totalCount = (int)$stmtCount->fetchColumn();

    // Truy vấn dữ liệu
    $dataSql = "
        SELECT 
            a.*,
            c.name as category_name,
            c.icon as category_icon,
            u.full_name as owner_name,
            w.id as warranty_id,
            w.start_date,
            w.start_date as warranty_start,
            w.start_date as warranty_start_date,
            w.duration_months,
            w.duration_months as warranty_duration_months,
            w.end_date,
            w.end_date as warranty_end,
            w.end_date as warranty_end_date,
            w.provider_name,
            w.provider_name as warranty_provider_name,
            w.provider_phone,
            w.provider_phone as warranty_provider_phone,
            w.provider_address,
            w.provider_address as warranty_provider_address,
            w.provider_website,
            w.provider_website as warranty_provider_website,
            w.conditions,
            w.conditions as warranty_conditions,
            w.extension_months,
            w.extension_months as warranty_extension_months,
            w.extension_notes,
            w.extension_notes as warranty_extension_notes,
            (SELECT COUNT(*) FROM repairs r WHERE r.asset_id = a.id) as repair_count,
            (SELECT COALESCE(SUM(cost), 0) FROM repairs r WHERE r.asset_id = a.id) as total_repair_cost
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN warranties w ON a.id = w.asset_id
        $whereSql
        ORDER BY $sortBy $order
        LIMIT ? OFFSET ?
    ";

    $dataParams = array_merge($params, [$limit, $offset]);
    $stmtData = $db->prepare($dataSql);
    $stmtData->execute($dataParams);
    $assets = $stmtData->fetchAll();

    foreach ($assets as &$asset) {
        $wInfo = computeWarrantyInfo($asset['end_date'] ?? $asset['warranty_end'] ?? null);
        $asset['days_remaining'] = $wInfo['days_remaining'];
        $asset['warranty_status'] = $wInfo['status'];
        $asset['warrantyInfo'] = $wInfo;
    }

    sendJson([
        'success' => true,
        'data' => $assets,
        'assets' => $assets,
        'pagination' => [
            'total' => $totalCount,
            'totalItems' => $totalCount,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($totalCount / $limit)
        ]
    ]);
}

/**
 * 2.3.1.5. Xem chi tiết tài sản và thông tin bảo hành
 */
function handleGetAssetById(PDO $db, array $user, int $assetId): void {
    $familyId = $user['family_id'];
    $isAdmin = $user['role'] === 'admin';

    $stmt = $db->prepare("
        SELECT 
            a.*,
            c.name as category_name,
            c.icon as category_icon,
            u.full_name as owner_name,
            u.email as owner_email,
            w.id as warranty_id,
            w.start_date,
            w.start_date as warranty_start,
            w.start_date as warranty_start_date,
            w.duration_months,
            w.duration_months as warranty_duration_months,
            w.end_date,
            w.end_date as warranty_end,
            w.end_date as warranty_end_date,
            w.provider_name,
            w.provider_name as warranty_provider_name,
            w.provider_phone,
            w.provider_phone as warranty_provider_phone,
            w.provider_address,
            w.provider_address as warranty_provider_address,
            w.provider_website,
            w.provider_website as warranty_provider_website,
            w.conditions,
            w.conditions as warranty_conditions,
            w.extension_months,
            w.extension_months as warranty_extension_months,
            w.extension_notes,
            w.extension_notes as warranty_extension_notes
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN warranties w ON a.id = w.asset_id
        WHERE a.id = ? " . ($isAdmin ? "" : "AND a.family_id = ?") . "
    ");
    $params = $isAdmin ? [$assetId] : [$assetId, $familyId];
    $stmt->execute($params);
    $asset = $stmt->fetch();

    if (!$asset) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài sản'], 404);
    }

    $wInfo = computeWarrantyInfo($asset['end_date'] ?? $asset['warranty_end'] ?? null);
    $asset['days_remaining'] = $wInfo['days_remaining'];
    $asset['warranty_status'] = $wInfo['status'];
    $asset['warrantyInfo'] = $wInfo;

    // Lấy lịch sử sửa chữa của tài sản
    $stmtRepairs = $db->prepare("
        SELECT r.*, u.full_name as recorder_name
        FROM repairs r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.asset_id = ?
        ORDER BY r.repair_date DESC
    ");
    $stmtRepairs->execute([$assetId]);
    $asset['repairs'] = $stmtRepairs->fetchAll();

    // Tính tổng chi phí sửa chữa
    $totalRepairCost = 0;
    foreach ($asset['repairs'] as $rep) {
        $totalRepairCost += (float)$rep['cost'];
    }
    $asset['totalRepairCost'] = $totalRepairCost;

    sendJson(['success' => true, 'asset' => $asset, 'data' => $asset]);
}

/**
 * 2.3.1.4. Thêm tài sản mới
 */
function handleCreateAsset(PDO $db, array $user): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên chỉ có quyền xem, không thể thêm tài sản'], 403);
    }

    $input = getJsonInput();

    $name = trim($input['name'] ?? '');
    $categoryId = (int)($input['category_id'] ?? 0);
    $brand = trim($input['brand'] ?? '');
    $model = trim($input['model'] ?? '');
    $serialNumber = trim($input['serial_number'] ?? '');
    $purchaseDate = $input['purchase_date'] ?? date('Y-m-d');
    $purchasePrice = max(0, (float)($input['purchase_price'] ?? 0));
    $purchaseLocation = trim($input['purchase_location'] ?? '');
    $roomLocation = trim($input['room_location'] ?? 'Phòng khách');
    $usageStatus = $input['usage_status'] ?? 'good';
    $notes = trim($input['notes'] ?? '');
    $imageUrl = $input['image_url'] ?? null;
    $invoiceUrl = $input['invoice_url'] ?? null;

    // Kiểm tra tính hợp lệ
    if (empty($name) || $categoryId <= 0) {
        sendJson(['success' => false, 'message' => 'Vui lòng nhập tên tài sản và chọn danh mục'], 422);
    }

    if (strtotime($purchaseDate) > strtotime(date('Y-m-d'))) {
        sendJson(['success' => false, 'message' => 'Ngày mua không thể lớn hơn ngày hiện tại'], 422);
    }

    // Xử lý tải ảnh nếu có
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $up = handleFileUpload($_FILES['image'], 'assets');
        if ($up) $imageUrl = $up;
    }
    if (isset($_FILES['invoice']) && $_FILES['invoice']['error'] === UPLOAD_ERR_OK) {
        $up = handleFileUpload($_FILES['invoice'], 'invoices');
        if ($up) $invoiceUrl = $up;
    }

    // Nếu người dùng không tải ảnh lên, kiểm tra xem có URL ảnh nhập tay không hoặc tự động gán ảnh thông minh theo thiết bị
    if (empty($imageUrl)) {
        $rawUrl = trim($input['image_url'] ?? $_POST['image_url'] ?? '');
        if (!empty($rawUrl)) {
            $imageUrl = $rawUrl;
        } else {
            $imageUrl = getSmartDefaultAssetImage($name, $categoryId, $db);
        }
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("
            INSERT INTO assets (user_id, family_id, category_id, name, brand, model, serial_number, purchase_date, purchase_price, purchase_location, room_location, usage_status, notes, image_url, invoice_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $user['id'],
            $user['family_id'],
            $categoryId,
            $name,
            $brand,
            $model,
            $serialNumber,
            $purchaseDate,
            $purchasePrice,
            $purchaseLocation,
            $roomLocation,
            $usageStatus,
            $notes,
            $imageUrl,
            $invoiceUrl
        ]);
        $assetId = (int)$db->lastInsertId();

        // Đọc thông tin thời hạn bảo hành (hỗ trợ cả warranty_duration_months và duration_months)
        $rawDuration = $input['warranty_duration_months'] 
            ?? $input['duration_months'] 
            ?? $_POST['warranty_duration_months'] 
            ?? $_POST['duration_months'] 
            ?? null;
        $durationMonths = ($rawDuration !== null && $rawDuration !== '') ? max(0, (int)$rawDuration) : 12;

        $startDate = $input['warranty_start_date'] 
            ?? $input['start_date'] 
            ?? $_POST['warranty_start_date'] 
            ?? $_POST['start_date'] 
            ?? $purchaseDate;
        
        $startDt = new DateTime($startDate);
        $endDt = clone $startDt;
        $endDt->modify("+$durationMonths months");
        $endDate = $endDt->format('Y-m-d');

        $providerName = trim($input['warranty_provider_name'] ?? $input['provider_name'] ?? $_POST['warranty_provider_name'] ?? $_POST['provider_name'] ?? '');
        $providerPhone = trim($input['warranty_provider_phone'] ?? $input['provider_phone'] ?? $_POST['warranty_provider_phone'] ?? $_POST['provider_phone'] ?? '');
        $providerAddress = trim($input['warranty_provider_address'] ?? $input['provider_address'] ?? $_POST['warranty_provider_address'] ?? $_POST['provider_address'] ?? '');
        $providerWebsite = trim($input['warranty_provider_website'] ?? $input['provider_website'] ?? $_POST['warranty_provider_website'] ?? $_POST['provider_website'] ?? '');
        $conditions = trim($input['warranty_conditions'] ?? $input['conditions'] ?? $_POST['warranty_conditions'] ?? $_POST['conditions'] ?? '');

        $stmtWarr = $db->prepare("
            INSERT INTO warranties (asset_id, start_date, duration_months, end_date, provider_name, provider_phone, provider_address, provider_website, conditions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmtWarr->execute([
            $assetId,
            $startDate,
            $durationMonths,
            $endDate,
            $providerName,
            $providerPhone,
            $providerAddress,
            $providerWebsite,
            $conditions
        ]);

        $db->commit();

        logAudit($db, $user['id'], $user['email'], 'CREATE_ASSET', 'asset', $assetId, "Thêm tài sản: $name");

        sendJson([
            'success' => true,
            'message' => 'Thêm tài sản mới thành công',
            'asset_id' => $assetId
        ], 201);

    } catch (Exception $e) {
        $db->rollBack();
        sendJson(['success' => false, 'message' => 'Lỗi lưu tài sản: ' . $e->getMessage()], 500);
    }
}

/**
 * 2.3.1.4. Cập nhật tài sản
 */
function handleUpdateAsset(PDO $db, array $user, int $assetId): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên chỉ có quyền xem, không thể sửa tài sản'], 403);
    }

    $isAdmin = $user['role'] === 'admin';
    $stmtCheck = $db->prepare("SELECT * FROM assets WHERE id = ?");
    $stmtCheck->execute([$assetId]);
    $asset = $stmtCheck->fetch();

    if (!$asset) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài sản'], 404);
    }

    if (!$isAdmin && (int)$asset['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $input = getJsonInput();

    $name = trim($input['name'] ?? $asset['name']);
    $categoryId = (int)($input['category_id'] ?? $asset['category_id']);
    $brand = trim($input['brand'] ?? $asset['brand']);
    $model = trim($input['model'] ?? $asset['model']);
    $serialNumber = trim($input['serial_number'] ?? $asset['serial_number']);
    $purchaseDate = $input['purchase_date'] ?? $asset['purchase_date'];
    $purchasePrice = isset($input['purchase_price']) ? max(0, (float)$input['purchase_price']) : $asset['purchase_price'];
    $purchaseLocation = trim($input['purchase_location'] ?? $asset['purchase_location']);
    $roomLocation = trim($input['room_location'] ?? $asset['room_location']);
    $usageStatus = $input['usage_status'] ?? $asset['usage_status'];
    $notes = trim($input['notes'] ?? $asset['notes']);
    $imageUrl = $input['image_url'] ?? $asset['image_url'];
    $invoiceUrl = $input['invoice_url'] ?? $asset['invoice_url'];

    if (strtotime($purchaseDate) > strtotime(date('Y-m-d'))) {
        sendJson(['success' => false, 'message' => 'Ngày mua không thể lớn hơn ngày hiện tại'], 422);
    }

    if (isset($_FILES['image'])) {
        $up = handleFileUpload($_FILES['image'], 'assets');
        if ($up) $imageUrl = $up;
    }
    if (isset($_FILES['invoice'])) {
        $up = handleFileUpload($_FILES['invoice'], 'invoices');
        if ($up) $invoiceUrl = $up;
    }

    $db->beginTransaction();
    try {
        $stmtUpdate = $db->prepare("
            UPDATE assets SET 
                name = ?, category_id = ?, brand = ?, model = ?, serial_number = ?,
                purchase_date = ?, purchase_price = ?, purchase_location = ?, room_location = ?,
                usage_status = ?, notes = ?, image_url = ?, invoice_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmtUpdate->execute([
            $name, $categoryId, $brand, $model, $serialNumber,
            $purchaseDate, $purchasePrice, $purchaseLocation, $roomLocation,
            $usageStatus, $notes, $imageUrl, $invoiceUrl, $assetId
        ]);

        // Cập nhật thông tin bảo hành (hỗ trợ cả warranty_duration_months và duration_months)
        $hasWarrantyUpdate = isset($input['warranty_duration_months']) || isset($input['duration_months']) ||
            isset($_POST['warranty_duration_months']) || isset($_POST['duration_months']) ||
            isset($input['warranty_start_date']) || isset($input['start_date']) ||
            isset($_POST['warranty_start_date']) || isset($_POST['start_date']) ||
            isset($input['warranty_provider_name']) || isset($input['provider_name']) ||
            isset($_POST['warranty_provider_name']) || isset($_POST['provider_name']);

        if ($hasWarrantyUpdate) {
            $rawDuration = $input['warranty_duration_months'] 
                ?? $input['duration_months'] 
                ?? $_POST['warranty_duration_months'] 
                ?? $_POST['duration_months'] 
                ?? null;
            $durationMonths = ($rawDuration !== null && $rawDuration !== '') ? max(0, (int)$rawDuration) : 12;

            $startDate = $input['warranty_start_date'] 
                ?? $input['start_date'] 
                ?? $_POST['warranty_start_date'] 
                ?? $_POST['start_date'] 
                ?? $purchaseDate;
            
            $startDt = new DateTime($startDate);
            $endDt = clone $startDt;
            $endDt->modify("+$durationMonths months");
            $endDate = $endDt->format('Y-m-d');

            $providerName = trim($input['warranty_provider_name'] ?? $input['provider_name'] ?? $_POST['warranty_provider_name'] ?? $_POST['provider_name'] ?? '');
            $providerPhone = trim($input['warranty_provider_phone'] ?? $input['provider_phone'] ?? $_POST['warranty_provider_phone'] ?? $_POST['provider_phone'] ?? '');
            $providerAddress = trim($input['warranty_provider_address'] ?? $input['provider_address'] ?? $_POST['warranty_provider_address'] ?? $_POST['provider_address'] ?? '');
            $providerWebsite = trim($input['warranty_provider_website'] ?? $input['provider_website'] ?? $_POST['warranty_provider_website'] ?? $_POST['provider_website'] ?? '');
            $conditions = trim($input['warranty_conditions'] ?? $input['conditions'] ?? $_POST['warranty_conditions'] ?? $_POST['conditions'] ?? '');

            // Kiểm tra xem đã có bản ghi bảo hành chưa
            $checkWarr = $db->prepare("SELECT id FROM warranties WHERE asset_id = ?");
            $checkWarr->execute([$assetId]);
            $warrId = $checkWarr->fetchColumn();

            if ($warrId) {
                $stmtWarr = $db->prepare("
                    UPDATE warranties SET 
                        start_date = ?, duration_months = ?, end_date = ?,
                        provider_name = ?, provider_phone = ?, provider_address = ?, provider_website = ?, conditions = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $stmtWarr->execute([
                    $startDate, $durationMonths, $endDate,
                    $providerName, $providerPhone, $providerAddress, $providerWebsite, $conditions,
                    $warrId
                ]);
            } else {
                $stmtWarr = $db->prepare("
                    INSERT INTO warranties (asset_id, start_date, duration_months, end_date, provider_name, provider_phone, provider_address, provider_website, conditions)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmtWarr->execute([
                    $assetId, $startDate, $durationMonths, $endDate,
                    $providerName, $providerPhone, $providerAddress, $providerWebsite, $conditions
                ]);
            }
        }

        $db->commit();
        logAudit($db, $user['id'], $user['email'], 'UPDATE_ASSET', 'asset', $assetId, "Cập nhật tài sản: $name");

        sendJson(['success' => true, 'message' => 'Cập nhật tài sản thành công']);

    } catch (Exception $e) {
        $db->rollBack();
        sendJson(['success' => false, 'message' => 'Lỗi cập nhật: ' . $e->getMessage()], 500);
    }
}

/**
 * 2.3.1.4. Xóa mềm tài sản (Soft Delete)
 */
function handleDeleteAsset(PDO $db, array $user, int $assetId): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên chỉ có quyền xem, không thể xóa tài sản'], 403);
    }

    $isAdmin = $user['role'] === 'admin';
    $stmtCheck = $db->prepare("SELECT * FROM assets WHERE id = ?");
    $stmtCheck->execute([$assetId]);
    $asset = $stmtCheck->fetch();

    if (!$asset) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài sản'], 404);
    }

    if (!$isAdmin && (int)$asset['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $stmt = $db->prepare("UPDATE assets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$assetId]);

    logAudit($db, $user['id'], $user['email'], 'SOFT_DELETE_ASSET', 'asset', $assetId, "Xóa mềm tài sản: " . $asset['name']);

    sendJson(['success' => true, 'message' => 'Đã chuyển tài sản vào thùng rác thành công']);
}

/**
 * Khôi phục tài sản từ thùng rác
 */
function handleRestoreAsset(PDO $db, array $user, int $assetId): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên chỉ có quyền xem, không thể khôi phục tài sản'], 403);
    }

    $isAdmin = $user['role'] === 'admin';
    $stmtCheck = $db->prepare("SELECT * FROM assets WHERE id = ?");
    $stmtCheck->execute([$assetId]);
    $asset = $stmtCheck->fetch();

    if (!$asset) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài sản'], 404);
    }

    if (!$isAdmin && (int)$asset['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $stmt = $db->prepare("UPDATE assets SET deleted_at = NULL WHERE id = ?");
    $stmt->execute([$assetId]);

    logAudit($db, $user['id'], $user['email'], 'RESTORE_ASSET', 'asset', $assetId, "Khôi phục tài sản từ thùng rác");

    sendJson(['success' => true, 'message' => 'Đã khôi phục tài sản thành công']);
}

/**
 * Xóa vĩnh viễn tài sản (Hard Destroy)
 */
function handleDestroyAsset(PDO $db, array $user, int $assetId): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên chỉ có quyền xem, không thể xóa tài sản'], 403);
    }

    if ($user['role'] !== 'admin' && $user['role'] !== 'head') {
        sendJson(['success' => false, 'message' => 'Chỉ Chủ hộ hoặc Quản trị viên mới được xóa vĩnh viễn tài sản'], 403);
    }

    $isAdmin = $user['role'] === 'admin';
    $stmtCheck = $db->prepare("SELECT * FROM assets WHERE id = ?");
    $stmtCheck->execute([$assetId]);
    $asset = $stmtCheck->fetch();

    if (!$asset) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài sản'], 404);
    }

    if (!$isAdmin && (int)$asset['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $stmt = $db->prepare("DELETE FROM assets WHERE id = ?");
    $stmt->execute([$assetId]);

    logAudit($db, $user['id'], $user['email'], 'DESTROY_ASSET', 'asset', $assetId, "Xóa vĩnh viễn tài sản khỏi cơ sở dữ liệu");

    sendJson(['success' => true, 'message' => 'Đã xóa vĩnh viễn tài sản khỏi hệ thống']);
}

/**
 * Cập nhật riêng ảnh của tài sản (Tải tệp hoặc dán URL)
 */
function handleUpdateAssetPhoto(PDO $db, array $user, int $assetId): void {
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Tài khoản thành viên không có quyền thay đổi ảnh'], 403);
    }

    $stmt = $db->prepare("SELECT * FROM assets WHERE id = ?");
    $stmt->execute([$assetId]);
    $asset = $stmt->fetch();
    if (!$asset) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài sản'], 404);
    }

    $isAdmin = $user['role'] === 'admin';
    if (!$isAdmin && (int)$asset['family_id'] !== (int)$user['family_id']) {
        sendJson(['success' => false, 'message' => 'Bạn chỉ có quyền thao tác tài sản thuộc gia đình mình'], 403);
    }

    $imageUrl = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $up = handleFileUpload($_FILES['image'], 'assets');
        if ($up) {
            $imageUrl = $up;
        } else {
            sendJson(['success' => false, 'message' => 'Tải ảnh thất bại. Chỉ chấp nhận tệp JPG, PNG, WEBP.'], 422);
        }
    } else {
        $input = getJsonInput();
        $url = trim($input['image_url'] ?? $_POST['image_url'] ?? '');
        if (!empty($url)) {
            $imageUrl = $url;
        }
    }

    if (empty($imageUrl)) {
        sendJson(['success' => false, 'message' => 'Vui lòng chọn ảnh từ máy tính hoặc nhập liên kết ảnh'], 422);
    }

    $stmtUp = $db->prepare("UPDATE assets SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmtUp->execute([$imageUrl, $assetId]);

    logAudit($db, $user['id'], $user['email'], 'UPDATE_ASSET_PHOTO', 'asset', $assetId, "Cập nhật ảnh cho: {$asset['name']}");

    sendJson([
        'success' => true,
        'message' => 'Cập nhật ảnh sản phẩm thành công',
        'image_url' => $imageUrl
    ]);
}

/**
 * Tự động chọn ảnh mẫu chất lượng cao phù hợp theo tên thiết bị hoặc danh mục
 * Ngăn chặn trường hợp sản phẩm không có ảnh bị rơi vào ảnh vẽ phác thảo chung
 */
function getSmartDefaultAssetImage(string $name, int $categoryId, PDO $db): string {
    $lower = mb_strtolower($name, 'UTF-8');

    // 1. Nhận diện theo tên tài sản
    if (str_contains($lower, 'chuột') || str_contains($lower, 'mouse')) {
        return 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500'; // Chuột máy tính
    }
    if (str_contains($lower, 'bàn phím') || str_contains($lower, 'keyboard')) {
        return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500'; // Bàn phím cơ
    }
    if (str_contains($lower, 'rửa chén') || str_contains($lower, 'rửa bát') || str_contains($lower, 'dishwasher')) {
        return 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=500'; // Máy rửa chén
    }
    if (str_contains($lower, 'lò nướng') || str_contains($lower, 'lò vi sóng')) {
        return 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500'; // Lò nướng/vi sóng
    }
    if (str_contains($lower, 'tủ lạnh')) {
        return 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500'; // Tủ lạnh
    }
    if (str_contains($lower, 'điều hòa') || str_contains($lower, 'máy lạnh')) {
        return 'https://images.unsplash.com/photo-1614633833026-0620ba577b21?w=500'; // Điều hòa
    }
    if (str_contains($lower, 'máy giặt') || str_contains($lower, 'máy sấy')) {
        return 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500'; // Máy giặt
    }
    if (str_contains($lower, 'tivi') || str_contains($lower, 'tv') || str_contains($lower, 'màn hình')) {
        return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500'; // TV màn hình lớn
    }
    if (str_contains($lower, 'laptop') || str_contains($lower, 'máy tính') || str_contains($lower, 'macbook')) {
        return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500'; // Laptop
    }
    if (str_contains($lower, 'lọc không khí')) {
        return 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500'; // Máy lọc không khí
    }
    if (str_contains($lower, 'lọc nước')) {
        return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500'; // Máy lọc nước
    }
    if (str_contains($lower, 'robot') || str_contains($lower, 'hút bụi')) {
        return 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=500'; // Robot hút bụi
    }
    if (str_contains($lower, 'nồi chiên') || str_contains($lower, 'nồi cơm')) {
        return 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500'; // Nồi chiên/nồi cơm
    }
    if (str_contains($lower, 'xe máy') || str_contains($lower, 'xe đạp') || str_contains($lower, 'ô tô')) {
        return 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500'; // Xe máy
    }

    // 2. Nhận diện theo nhóm danh mục
    if ($categoryId > 0) {
        $stmt = $db->prepare("SELECT name FROM categories WHERE id = ?");
        $stmt->execute([$categoryId]);
        $catName = mb_strtolower($stmt->fetchColumn() ?: '', 'UTF-8');
        if (str_contains($catName, 'tivi') || str_contains($catName, 'màn hình')) {
            return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500';
        }
        if (str_contains($catName, 'máy tính') || str_contains($catName, 'laptop')) {
            return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500';
        }
        if (str_contains($catName, 'tủ lạnh')) {
            return 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500';
        }
        if (str_contains($catName, 'máy giặt')) {
            return 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500';
        }
        if (str_contains($catName, 'điều hòa')) {
            return 'https://images.unsplash.com/photo-1614633833026-0620ba577b21?w=500';
        }
        if (str_contains($catName, 'lọc không khí')) {
            return 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500';
        }
        if (str_contains($catName, 'rửa chén') || str_contains($catName, 'lò nướng')) {
            return 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=500';
        }
        if (str_contains($catName, 'lọc nước')) {
            return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500';
        }
        if (str_contains($catName, 'nồi chiên')) {
            return 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500';
        }
        if (str_contains($catName, 'robot')) {
            return 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=500';
        }
        if (str_contains($catName, 'bếp') || str_contains($catName, 'gia dụng')) {
            return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500';
        }
        if (str_contains($catName, 'nội thất')) {
            return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500';
        }
        if (str_contains($catName, 'phương tiện') || str_contains($catName, 'xe')) {
            return 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500';
        }
    }

    return 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500'; // Thiết bị công nghệ tinh tế
}

