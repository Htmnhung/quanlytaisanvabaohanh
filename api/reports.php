<?php
// api/reports.php - Thống kê báo cáo và Xuất dữ liệu Excel/CSV chuẩn UTF-8

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/utils.php';

$db = Database::getConnection();
$user = requireAuth($db);

$method = $_SERVER['REQUEST_METHOD'];
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$action = trim($pathInfo, '/');
$parts = array_values(array_filter(explode('/', $action)));

if (empty($parts) || $parts[0] === 'statistics') {
    handleGetStatistics($db, $user);
} elseif ($parts[0] === 'export' && ($parts[1] ?? '') === 'excel') {
    handleExportExcel($db, $user);
} else {
    sendJson(['success' => false, 'message' => 'Hành động không hợp lệ'], 404);
}

/**
 * 2.3.1.8. Xem thống kê và báo cáo tài sản
 * Đồng bộ dữ liệu với Dashboard, Lịch sử sửa chữa và Cảnh báo bảo hành
 */
function handleGetStatistics(PDO $db, array $user): void {
    $familyId = $user['family_id'];
    $isAdmin = $user['role'] === 'admin';

    $whereFamily = $isAdmin ? "a.deleted_at IS NULL" : "a.family_id = ? AND a.deleted_at IS NULL";
    $paramsFamily = $isAdmin ? [] : [$familyId];

    // Lọc theo khoảng thời gian nếu người dùng chọn
    $fromDate = !empty($_GET['from_date']) ? $_GET['from_date'] : null;
    $toDate = !empty($_GET['to_date']) ? $_GET['to_date'] : null;

    $whereAssetDate = $whereFamily;
    $paramsAssetDate = $paramsFamily;
    if ($fromDate) {
        $whereAssetDate .= " AND a.purchase_date >= ?";
        $paramsAssetDate[] = $fromDate;
    }
    if ($toDate) {
        $whereAssetDate .= " AND a.purchase_date <= ?";
        $paramsAssetDate[] = $toDate;
    }

    // Lấy ngưỡng cảnh báo hạn bảo hành từ cấu hình hệ thống
    $stmtThresh = $db->query("SELECT value FROM system_settings WHERE `key` = 'warning_threshold_days'");
    $thresholdDays = (int)($stmtThresh->fetchColumn() ?: 30);

    // 1. Phân bố tài sản theo Danh mục (Biểu đồ tròn)
    $stmtCat = $db->prepare("
        SELECT COALESCE(c.name, 'Chưa phân loại') as category_name,
               COUNT(a.id) as count,
               COALESCE(SUM(a.purchase_price), 0) as total_value
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE $whereAssetDate
        GROUP BY c.id
        ORDER BY count DESC
    ");
    $stmtCat->execute($paramsAssetDate);
    $byCategory = $stmtCat->fetchAll();

    // 2. Phân bố tài sản theo Vị trí phòng (Biểu đồ tròn)
    $stmtRoom = $db->prepare("
        SELECT COALESCE(a.room_location, 'Chưa xác định') as room_location,
               COUNT(a.id) as count,
               COALESCE(SUM(a.purchase_price), 0) as total_value
        FROM assets a
        WHERE $whereAssetDate
        GROUP BY a.room_location
        ORDER BY count DESC
    ");
    $stmtRoom->execute($paramsAssetDate);
    $byRoom = $stmtRoom->fetchAll();

    // 3. Phân bố trạng thái bảo hành (Tính toán động theo end_date và thresholdDays)
    $stmtWarr = $db->prepare("
        SELECT w.end_date
        FROM assets a
        JOIN warranties w ON a.id = w.asset_id
        WHERE $whereAssetDate
    ");
    $stmtWarr->execute($paramsAssetDate);
    $warrList = $stmtWarr->fetchAll();

    $activeCount = 0;
    $expiringCount = 0;
    $expiredCount = 0;

    foreach ($warrList as $w) {
        $info = computeWarrantyInfo($w['end_date'], $thresholdDays);
        if ($info['status'] === 'active') {
            $activeCount++;
        } elseif ($info['status'] === 'expiring_soon') {
            $expiringCount++;
        } elseif ($info['status'] === 'expired') {
            $expiredCount++;
        }
    }

    $warrantyBreakdown = [
        'active' => $activeCount,
        'expiring' => $expiringCount,
        'expired' => $expiredCount
    ];

    // 4. Biểu đồ cột: Chi phí mua sắm vs Chi phí sửa chữa theo 12 tháng gần nhất
    $monthlyTrends = [];
    for ($i = 11; $i >= 0; $i--) {
        $monthDate = new DateTime("first day of -$i month");
        $monthStr = $monthDate->format('Y-m');
        $label = 'T' . $monthDate->format('m/Y');

        // Chi phí mua
        $stmtBuy = $db->prepare("
            SELECT COALESCE(SUM(purchase_price), 0) as buy_total
            FROM assets a
            WHERE $whereFamily AND DATE_FORMAT(a.purchase_date, '%Y-%m') = ?
        ");
        $stmtBuy->execute(array_merge($paramsFamily, [$monthStr]));
        $buyTotal = (float)$stmtBuy->fetchColumn();

        // Chi phí sửa chữa
        $whereRepairMonth = $isAdmin ? "a.deleted_at IS NULL" : "a.family_id = ? AND a.deleted_at IS NULL";
        $stmtRep = $db->prepare("
            SELECT COALESCE(SUM(r.cost), 0) as rep_total
            FROM repairs r
            JOIN assets a ON r.asset_id = a.id
            WHERE $whereRepairMonth AND DATE_FORMAT(r.repair_date, '%Y-%m') = ?
        ");
        $stmtRep->execute(array_merge($paramsFamily, [$monthStr]));
        $repTotal = (float)$stmtRep->fetchColumn();

        $monthlyTrends[] = [
            'month' => $monthStr,
            'label' => $label,
            'purchase' => $buyTotal,
            'purchase_cost' => $buyTotal,
            'repair' => $repTotal,
            'repair_cost' => $repTotal
        ];
    }

    // 5. Danh sách tài sản hay hỏng / chi phí sửa chữa cao
    $stmtFrequent = $db->prepare("
        SELECT 
            a.id, a.name, a.brand, a.image_url, a.room_location,
            COUNT(r.id) as repair_count,
            COALESCE(SUM(r.cost), 0) as total_repair_cost
        FROM assets a
        JOIN repairs r ON a.id = r.asset_id
        WHERE $whereFamily
        GROUP BY a.id
        ORDER BY total_repair_cost DESC, repair_count DESC
        LIMIT 5
    ");
    $stmtFrequent->execute($paramsFamily);
    $frequentRepairs = $stmtFrequent->fetchAll();

    // Top tài sản sửa chữa nhiều lần nhất
    $stmtMostBroken = $db->prepare("
        SELECT a.id, a.name, a.brand, a.image_url, a.room_location,
               COUNT(r.id) as repair_count, COALESCE(SUM(r.cost), 0) as total_repair_cost
        FROM assets a
        JOIN repairs r ON a.id = r.asset_id
        WHERE $whereFamily
        GROUP BY a.id
        ORDER BY repair_count DESC, total_repair_cost DESC
        LIMIT 5
    ");
    $stmtMostBroken->execute($paramsFamily);
    $mostBroken = $stmtMostBroken->fetchAll();

    // 6. Tổng quan chung (Đồng bộ tuyệt đối với Dashboard)
    $stmtSum = $db->prepare("
        SELECT COUNT(a.id) as total_assets, COALESCE(SUM(a.purchase_price), 0) as total_purchase_value
        FROM assets a
        WHERE $whereAssetDate
    ");
    $stmtSum->execute($paramsAssetDate);
    $sumRow = $stmtSum->fetch();

    // Số tài sản đang sửa chữa (usage_status = 'repairing')
    $stmtRepairing = $db->prepare("
        SELECT COUNT(a.id) as repairing_count
        FROM assets a
        WHERE $whereAssetDate AND a.usage_status = 'repairing'
    ");
    $stmtRepairing->execute($paramsAssetDate);
    $repairingCount = (int)$stmtRepairing->fetchColumn();

    // Lọc chi phí sửa chữa theo khoảng ngày nếu có
    $whereRepairTotal = $isAdmin ? "a.deleted_at IS NULL" : "a.family_id = ? AND a.deleted_at IS NULL";
    $paramsRepairTotal = $paramsFamily;
    if ($fromDate) {
        $whereRepairTotal .= " AND r.repair_date >= ?";
        $paramsRepairTotal[] = $fromDate;
    }
    if ($toDate) {
        $whereRepairTotal .= " AND r.repair_date <= ?";
        $paramsRepairTotal[] = $toDate;
    }

    $stmtSumRep = $db->prepare("
        SELECT COUNT(r.id) as total_repairs, COALESCE(SUM(r.cost), 0) as total_repair_cost
        FROM repairs r
        JOIN assets a ON r.asset_id = a.id
        WHERE $whereRepairTotal
    ");
    $stmtSumRep->execute($paramsRepairTotal);
    $sumRepRow = $stmtSumRep->fetch();

    $summaryData = [
        'totalAssets' => (int)$sumRow['total_assets'],
        'totalPurchaseValue' => (float)$sumRow['total_purchase_value'],
        'activeWarranties' => $activeCount,
        'expiringWarranties' => $expiringCount,
        'expiredWarranties' => $expiredCount,
        'repairingCount' => $repairingCount,
        'totalRepairs' => (int)$sumRepRow['total_repairs'],
        'totalRepairCost' => (float)$sumRepRow['total_repair_cost'],
        'warningThresholdDays' => $thresholdDays,
    ];

    sendJson([
        'success' => true,
        'summary' => $summaryData,
        'stats' => $summaryData, // Alias giúp tương thích cả 2 cách gọi
        'categoryStats' => $byCategory,
        'byCategory' => $byCategory,
        'locationStats' => $byRoom,
        'byRoom' => $byRoom,
        'warrantyCounts' => $warrantyBreakdown,
        'warrantyBreakdown' => $warrantyBreakdown,
        'monthlyTrends' => $monthlyTrends,
        'mostBroken' => $mostBroken,
        'highestRepairCost' => $frequentRepairs,
        'frequentRepairs' => $frequentRepairs
    ]);
}

/**
 * Hàm chống CSV Injection: Nếu ô bắt đầu bằng =, +, -, @ thì chèn thêm dấu '
 */
function sanitizeCsvCell(mixed $value): mixed {
    if (!is_string($value)) {
        return $value;
    }
    $first = substr($value, 0, 1);
    if (in_array($first, ['=', '+', '-', '@'], true)) {
        return "'" . $value;
    }
    return $value;
}

/**
 * Xuất báo cáo tài sản ra định dạng Excel/CSV tương thích hoàn hảo Microsoft Excel (UTF-8 BOM)
 */
function handleExportExcel(PDO $db, array $user): void {
    $familyId = $user['family_id'];
    $isAdmin = $user['role'] === 'admin';

    $where = ["a.deleted_at IS NULL"];
    $params = [];

    if (!$isAdmin) {
        $where[] = "a.family_id = ?";
        $params[] = $familyId;
    }

    if (!empty($_GET['from_date'])) {
        $where[] = "a.purchase_date >= ?";
        $params[] = $_GET['from_date'];
    }
    if (!empty($_GET['to_date'])) {
        $where[] = "a.purchase_date <= ?";
        $params[] = $_GET['to_date'];
    }

    $whereSql = "WHERE " . implode(" AND ", $where);

    $sql = "
        SELECT 
            a.id, a.name, a.brand, a.model, a.serial_number,
            a.purchase_date, a.purchase_price, a.purchase_location, a.room_location, a.usage_status,
            c.name as category_name,
            w.start_date, w.duration_months, w.end_date, w.provider_name, w.provider_phone,
            (SELECT COUNT(*) FROM repairs r WHERE r.asset_id = a.id) as repair_count,
            (SELECT COALESCE(SUM(cost), 0) FROM repairs r WHERE r.asset_id = a.id) as total_repair_cost
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN warranties w ON a.id = w.asset_id
        $whereSql
        ORDER BY a.created_at DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $filename = "Bao_cao_tai_san_gia_dinh_" . date('Ymd_His') . ".csv";

    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Expires: 0');

    // MÃ HÓA UTF-8 BOM: Giúp Microsoft Excel tự động nhận diện tiếng Việt có dấu chuẩn 100%
    echo "\xEF\xBB\xBF";

    $output = fopen('php://output', 'w');

    // Tiêu đề các cột
    $headers = [
        'STT',
        'Tên tài sản',
        'Danh mục',
        'Thương hiệu',
        'Model',
        'Số Serial',
        'Vị trí đặt',
        'Tình trạng sử dụng',
        'Ngày mua',
        'Giá mua (VNĐ)',
        'Nơi mua',
        'Hạn bảo hành',
        'Số ngày còn lại',
        'Trạng thái bảo hành',
        'Đơn vị bảo hành',
        'Hotline bảo hành',
        'Số lần sửa chữa',
        'Tổng chi phí sửa (VNĐ)'
    ];
    fputcsv($output, array_map('sanitizeCsvCell', $headers));

    $statusMap = [
        'new' => 'Mới mua',
        'good' => 'Tốt',
        'repairing' => 'Đang sửa chữa',
        'broken' => 'Hỏng hóc',
        'old' => 'Cũ'
    ];

    $stt = 1;
    foreach ($rows as $r) {
        $wInfo = computeWarrantyInfo($r['end_date'] ?? null);

        $row = [
            $stt++,
            $r['name'],
            $r['category_name'] ?? 'Chưa phân loại',
            $r['brand'] ?? '',
            $r['model'] ?? '',
            $r['serial_number'] ?? '',
            $r['room_location'] ?? 'Phòng khách',
            $statusMap[$r['usage_status']] ?? $r['usage_status'],
            $r['purchase_date'],
            number_format($r['purchase_price'], 0, ',', '.'),
            $r['purchase_location'] ?? '',
            $r['end_date'] ?? 'Không có',
            $wInfo['days_remaining'],
            $wInfo['label'],
            $r['provider_name'] ?? '',
            $r['provider_phone'] ?? '',
            $r['repair_count'],
            number_format($r['total_repair_cost'], 0, ',', '.')
        ];

        // Áp dụng chống CSV Injection cho từng ô dữ liệu
        fputcsv($output, array_map('sanitizeCsvCell', $row));
    }

    fclose($output);
    exit;
}
