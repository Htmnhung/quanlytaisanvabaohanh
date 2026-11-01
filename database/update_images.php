<?php
// database/update_images.php - Cập nhật 3 ảnh thực tế cho các tài sản

require_once __DIR__ . '/../config/database.php';
$db = Database::getConnection();

// 1. Điều hòa Daikin (Asset ID 3 hoặc tên Điều hòa Daikin)
$db->exec("UPDATE assets SET image_url = 'uploads/assets/dieu_hoa_daikin.png' WHERE id = 3 OR (brand = 'Daikin' AND name LIKE '%Điều hòa%')");

// 2. Robot hút bụi Dreame (Asset ID 4 hoặc tên Robot hút bụi)
$db->exec("UPDATE assets SET image_url = 'uploads/assets/robot_hut_bui_dreame.png' WHERE id = 4 OR name LIKE '%Robot hút bụi%'");

// 3. Lò vi sóng Sharp (Asset ID 9 hoặc tên Lò vi sóng)
$checkLoviSong = $db->query("SELECT id FROM assets WHERE id = 9 OR name LIKE '%vi sóng%'")->fetch();
if ($checkLoviSong) {
    $db->exec("UPDATE assets SET image_url = 'uploads/assets/lo_vi_song_sharp.jpg' WHERE id = " . $checkLoviSong['id']);
}

// In kết quả kiểm tra
$stmt = $db->query("SELECT id, name, brand, image_url FROM assets WHERE id IN (3, 4, 9) OR name LIKE '%vi sóng%' OR name LIKE '%Robot%' OR name LIKE '%Daikin%'");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID " . $r['id'] . ": " . $r['name'] . " => " . $r['image_url'] . PHP_EOL;
}
