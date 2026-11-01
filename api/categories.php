<?php
// api/categories.php - Danh mục thiết bị gia đình

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/utils.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Lấy danh sách danh mục (cả cha và con)
    $stmt = $db->query("
        SELECT c.*, p.name as parent_name,
               (SELECT COUNT(*) FROM assets a WHERE a.category_id = c.id AND a.deleted_at IS NULL) as asset_count
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        ORDER BY COALESCE(c.parent_id, c.id), c.parent_id IS NOT NULL, c.name ASC
    ");
    $categories = $stmt->fetchAll();

    sendJson([
        'success' => true,
        'categories' => $categories,
        'data' => $categories
    ]);
} elseif ($method === 'POST') {
    $user = requireAuth($db);
    // Thành viên (member) chỉ có quyền xem
    if ($user['role'] === 'member') {
        sendJson(['success' => false, 'message' => 'Bạn không có quyền tạo danh mục mới'], 403);
    }

    $input = getJsonInput();
    $name = trim($input['name'] ?? '');
    if (empty($name)) {
        sendJson(['success' => false, 'message' => 'Vui lòng nhập tên danh mục'], 422);
    }

    $parentId = !empty($input['parent_id']) ? (int)$input['parent_id'] : null;
    $slug = toSlug($name);
    $description = trim($input['description'] ?? '');
    $icon = trim($input['icon'] ?? 'package');

    $stmt = $db->prepare("INSERT INTO categories (name, slug, description, icon, parent_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$name, $slug, $description, $icon, $parentId]);
    $newId = (int)$db->lastInsertId();

    sendJson([
        'success' => true,
        'message' => 'Tạo danh mục mới thành công',
        'category' => [
            'id' => $newId,
            'name' => $name,
            'parent_id' => $parentId
        ]
    ], 201);
} else {
    sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
}
