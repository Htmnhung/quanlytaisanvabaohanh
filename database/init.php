<?php
// database/init.php - Khởi tạo bảng và nạp dữ liệu mẫu MySQL chuẩn UTF-8

require_once __DIR__ . '/../config/database.php';

function initializeDatabase(PDO $db, bool $force = false): void {
    $db->exec("SET FOREIGN_KEY_CHECKS = 0;");

    if ($force) {
        $tables = [
            'notifications', 'audit_logs', 'repairs', 'warranties',
            'assets', 'repair_shops', 'service_centers', 'categories',
            'users', 'system_settings'
        ];
        foreach ($tables as $tbl) {
            $db->exec("DROP TABLE IF EXISTS `{$tbl}`;");
        }
    }

    // 1. Tạo các bảng cơ sở dữ liệu MySQL InnoDB UTF-8
    $db->exec("
        -- Bảng người dùng
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(191) NOT NULL UNIQUE,
            phone VARCHAR(50),
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'head',
            family_id INT DEFAULT 1,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            avatar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng danh mục tài sản (hỗ trợ phân cấp cha - con)
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255),
            description TEXT,
            icon VARCHAR(100) DEFAULT 'package',
            parent_id INT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng tài sản gia đình
        CREATE TABLE IF NOT EXISTS assets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            family_id INT DEFAULT 1,
            category_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            brand VARCHAR(255),
            model VARCHAR(255),
            serial_number VARCHAR(255),
            purchase_date DATE NOT NULL,
            purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
            purchase_location VARCHAR(255),
            room_location VARCHAR(255),
            usage_status VARCHAR(50) NOT NULL DEFAULT 'good',
            notes TEXT,
            image_url TEXT,
            invoice_url TEXT,
            is_flagged INT DEFAULT 0,
            deleted_at DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (category_id) REFERENCES categories(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng thông tin bảo hành
        CREATE TABLE IF NOT EXISTS warranties (
            id INT AUTO_INCREMENT PRIMARY KEY,
            asset_id INT NOT NULL UNIQUE,
            start_date DATE NOT NULL,
            duration_months INT NOT NULL DEFAULT 12,
            end_date DATE NOT NULL,
            provider_name VARCHAR(255),
            provider_phone VARCHAR(50),
            provider_address TEXT,
            provider_website VARCHAR(255),
            conditions TEXT,
            notification_viewed INT DEFAULT 0,
            extension_months INT DEFAULT 0,
            extension_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng lịch sử sửa chữa
        CREATE TABLE IF NOT EXISTS repairs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            asset_id INT NOT NULL,
            user_id INT NOT NULL,
            repair_date DATE NOT NULL,
            issue_description TEXT NOT NULL,
            repair_shop VARCHAR(255),
            cost DECIMAL(15,2) NOT NULL DEFAULT 0,
            is_under_warranty INT DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'completed',
            return_date DATE,
            receipt_url TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng trung tâm bảo hành chung
        CREATE TABLE IF NOT EXISTS service_centers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            brand VARCHAR(255),
            hotline VARCHAR(100) NOT NULL,
            address TEXT,
            website VARCHAR(255),
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng đơn vị sửa chữa uy tín
        CREATE TABLE IF NOT EXISTS repair_shops (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            address TEXT,
            specialty VARCHAR(255),
            rating DECIMAL(3,1) DEFAULT 5.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng cài đặt hệ thống
        CREATE TABLE IF NOT EXISTS system_settings (
            `key` VARCHAR(100) PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng nhật ký hoạt động (Audit Logs)
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            user_email VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(100),
            entity_id INT,
            details TEXT,
            ip_address VARCHAR(100),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- Bảng thông báo
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            asset_id INT,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(100) NOT NULL DEFAULT 'warranty_expiring',
            days_remaining INT,
            is_read INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // Kiểm tra xem đã có dữ liệu mẫu chưa
    $checkUser = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($checkUser > 0) {
        return; // Đã có dữ liệu, không nạp lại
    }

    // 2. Nạp dữ liệu tài khoản mẫu
    $hashAdmin = password_hash('Admin@123456', PASSWORD_BCRYPT);
    $hashHead = password_hash('An@123456', PASSWORD_BCRYPT);
    $hashMember = password_hash('Binh@123456', PASSWORD_BCRYPT);

    $stmtUser = $db->prepare("
        INSERT INTO users (full_name, email, phone, password, role, family_id, status, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtUser->execute(['Quản trị viên Hệ thống', 'admin@familyassets.vn', '0901234567', $hashAdmin, 'admin', 1, 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150']);
    $stmtUser->execute(['Nguyễn Văn An (Chủ hộ)', 'nguyenvanan@gmail.com', '0912345678', $hashHead, 'head', 1, 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150']);
    $headId = $db->lastInsertId();
    $stmtUser->execute(['Lê Thị Bình (Thành viên)', 'lethibinh@gmail.com', '0987654321', $hashMember, 'member', 1, 'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150']);
    $memberId = $db->lastInsertId();

    // 3. Nạp danh mục cha - con
    $stmtCat = $db->prepare("INSERT INTO categories (name, slug, description, icon, parent_id) VALUES (?, ?, ?, ?, ?)");
    
    // Cha
    $stmtCat->execute(['Điện tử & Công nghệ', 'dien-tu-cong-nghe', 'Tivi, máy tính, âm thanh, thiết bị số', 'tv', null]);
    $catDienTu = $db->lastInsertId();
    $stmtCat->execute(['Điện lạnh gia dụng', 'dien-lanh-gia-dung', 'Tủ lạnh, máy giặt, máy điều hòa', 'snowflake', null]);
    $catDienLanh = $db->lastInsertId();
    $stmtCat->execute(['Đồ bếp & Thiết bị gia dụng', 'do-bep-gia-dung', 'Nồi cơm, lò nướng, máy ép, máy hút bụi', 'utensils', null]);
    $catDoBep = $db->lastInsertId();
    $stmtCat->execute(['Nội thất & Gia đình', 'noi-that-gia-dinh', 'Bàn ghế, giường tủ, đèn nội thất', 'sofa', null]);
    $catNoiThat = $db->lastInsertId();
    $stmtCat->execute(['Phương tiện di chuyển', 'phuong-tien', 'Xe máy, xe đạp, ô tô gia đình', 'car', null]);
    $catXeCo = $db->lastInsertId();

    // Con
    $stmtCat->execute(['Tivi & Màn hình', 'tivi-man-hinh', 'Tivi OLED, 4K, Smart TV', 'tv', $catDienTu]);
    $catTV = $db->lastInsertId();
    $stmtCat->execute(['Máy tính & Laptop', 'laptop-may-tinh', 'Laptop văn phòng, Gaming, PC', 'laptop', $catDienTu]);
    $catLaptop = $db->lastInsertId();
    $stmtCat->execute(['Tủ lạnh & Tủ đông', 'tu-lanh', 'Tủ lạnh Inverter, side by side', 'refrigerator', $catDienLanh]);
    $catTuLanh = $db->lastInsertId();
    $stmtCat->execute(['Máy giặt & Máy sấy', 'may-giat', 'Máy giặt lồng ngang, lồng đứng', 'disc', $catDienLanh]);
    $catMayGiat = $db->lastInsertId();
    $stmtCat->execute(['Điều hòa không khí', 'dieu-hoa', 'Máy lạnh Inverter 1HP, 1.5HP', 'wind', $catDienLanh]);
    $catDieuHoa = $db->lastInsertId();
    $stmtCat->execute(['Máy lọc không khí', 'may-loc-khong-khi', 'Máy lọc bụi mịn HEPA, tạo ẩm', 'wind', $catDienLanh]);
    $catLocKhi = $db->lastInsertId();
    $stmtCat->execute(['Nồi chiên & Nồi cơm', 'noi-chien-noi-com', 'Nồi chiên không dầu, nồi áp suất', 'coffee', $catDoBep]);
    $catNoiChien = $db->lastInsertId();
    $stmtCat->execute(['Máy rửa chén & Lò nướng', 'may-rua-chen', 'Máy rửa chén bát, lò vi sóng, máy tiệt trùng', 'utensils', $catDoBep]);
    $catMayRuaChen = $db->lastInsertId();
    $stmtCat->execute(['Máy lọc nước gia đình', 'may-loc-nuoc', 'Máy lọc RO gia đình Hydrogen', 'coffee', $catDoBep]);
    $catLocNuoc = $db->lastInsertId();
    $stmtCat->execute(['Robot hút bụi & Vệ sinh', 'robot-hut-bui', 'Robot lau nhà thông minh', 'cpu', $catDoBep]);
    $catRobot = $db->lastInsertId();
    $stmtCat->execute(['Xe máy', 'xe-may', 'Xe tay ga, xe số gia đình', 'bike', $catXeCo]);
    $catXeMay = $db->lastInsertId();

    // 4. Trung tâm bảo hành chung
    $stmtCenter = $db->prepare("INSERT INTO service_centers (name, brand, hotline, address, website, notes) VALUES (?, ?, ?, ?, ?, ?)");
    $stmtCenter->execute(['Trung tâm Bảo hành Sony Toàn Quốc', 'Sony', '1800 588 885', 'Số 248 Trần Hưng Đạo, Q.1, TP.HCM', 'https://sony.com.vn', 'Bảo hành tận nhà cho TV từ 43 inch']);
    $stmtCenter->execute(['Trung tâm Chăm sóc Khách hàng LG Electronics', 'LG', '1800 1503', 'Tầng 35 Keangnam Hanoi Landmark Tower, Nam Từ Liêm, Hà Nội', 'https://lg.com/vn', 'Hỗ trợ kỹ thuật viên kiểm tra tại nhà 24/7']);
    $stmtCenter->execute(['Trung tâm Dịch vụ Khách hàng Panasonic', 'Panasonic', '1800 1593', 'Số 1 Đào Duy Anh, Đống Đa, Hà Nội', 'https://panasonic.com/vn', 'Bảo hành máy nén tủ lạnh 10-12 năm']);
    $stmtCenter->execute(['Trung tâm Dịch vụ Kỹ thuật Daikin Việt Nam', 'Daikin', '1800 6777', 'Số 102 Trường Chinh, Đống Đa, Hà Nội', 'https://daikin.com.vn', 'Bảo hành chính hãng máy lạnh Daikin']);
    $stmtCenter->execute(['Trung tâm Bảo hành Philips Việt Nam', 'Philips', '1800 599 988', 'Số 370 Cầu Giấy, Cầu Giấy, Hà Nội', 'https://philips.com.vn', 'Bảo hành 24 tháng toàn cầu cho đồ bếp']);
    $stmtCenter->execute(['Dreame Care Việt Nam', 'Dreame', '1900 636 578', 'Số 6 Kim Đồng, Hoàng Mai, Hà Nội', 'https://dreame.vn', 'Bảo hành robot hút bụi thông minh']);

    // 5. Đơn vị sửa chữa uy tín
    $stmtShop = $db->prepare("INSERT INTO repair_shops (name, phone, address, specialty, rating) VALUES (?, ?, ?, ?, ?)");
    $stmtShop->execute(['Điện lạnh Bách Khoa 24h', '0904 558 111', 'K9 Bách Khoa, Hai Bà Trưng, Hà Nội', 'Tủ lạnh, Máy giặt, Điều hòa, Bình nóng lạnh', 4.9]);
    $stmtShop->execute(['Sửa chữa Điện tử Màn hình An Phúc', '0988 221 334', '152 Nguyễn Trãi, Thanh Xuân, Hà Nội', 'Tivi OLED/LED, Loa, Amply, Bo mạch điện tử', 4.8]);
    $stmtShop->execute(['Bệnh viện Laptop & Máy tính Hoàng Gia', '0977 445 667', '48 Thái Hà, Đống Đa, Hà Nội', 'Laptop Dell, Macbook, Asus, cứu dữ liệu ổ cứng', 4.9]);
    $stmtShop->execute(['Tiệm Sửa Xe Máy & Cứu Hộ Tuấn Đạt', '0966 889 900', '224 Láng Hạ, Đống Đa, Hà Nội', 'Bảo dưỡng xe máy, phụ tùng Honda chính hãng', 4.7]);

    // 6. Cài đặt hệ thống
    $stmtSetting = $db->prepare("REPLACE INTO system_settings (`key`, value, description) VALUES (?, ?, ?)");
    $stmtSetting->execute(['warning_threshold_days', '30', 'Ngưỡng ngày cảnh báo bảo hành sắp hết hạn mặc định']);
    $stmtSetting->execute(['email_notifications_enabled', 'true', 'Cho phép gửi email cảnh báo bảo hành']);
    $stmtSetting->execute(['system_name', 'Hệ thống Quản lý Tài sản và Bảo hành Gia đình', 'Tên hệ thống hiển thị']);
    $stmtSetting->execute(['currency', '₫', 'Đơn vị tiền tệ mặc định']);

    // 7. Nạp danh sách tài sản và bảo hành thực tế (Dynamic Countdown)
    $today = new DateTime('today');
    
    $calcDate = function(string $modifier) use ($today): string {
        $clone = clone $today;
        $clone->modify($modifier);
        return $clone->format('Y-m-d');
    };

    $stmtAsset = $db->prepare("
        INSERT INTO assets (user_id, family_id, category_id, name, brand, model, serial_number, purchase_date, purchase_price, purchase_location, room_location, usage_status, notes, image_url, invoice_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtWarranty = $db->prepare("
        INSERT INTO warranties (asset_id, start_date, duration_months, end_date, provider_name, provider_phone, provider_address, provider_website, conditions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // 1. Tivi Sony (24 tháng, Còn bảo hành)
    $buyDate1 = $calcDate('-14 months -17 days');
    $endDate1 = (new DateTime($buyDate1))->modify('+24 months')->format('Y-m-d');
    $stmtAsset->execute([$headId, 1, $catTV, 'Smart TV Sony Bravia 4K 65 inch', 'Sony', 'KD-65X80L', 'SN-SONY-9988221', $buyDate1, 19500000, 'Điện Máy Xanh', 'Phòng khách', 'good', 'Tivi phòng khách chính, hỗ trợ Google TV', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500', 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500']);
    $astId1 = $db->lastInsertId();
    $stmtWarranty->execute([$astId1, $buyDate1, 24, $endDate1, 'Trung tâm Bảo hành Sony', '1800 588 885', '248 Trần Hưng Đạo, Q.1, TP.HCM', 'https://sony.com.vn', 'Bảo hành chính hãng 24 tháng, bao gồm tấm nền và bo mạch chính']);

    // 2. Tủ lạnh Panasonic (24 tháng, Sắp hết hạn đúng +15 ngày)
    $endDate2 = $calcDate('+15 days');
    $buyDate2 = (new DateTime($endDate2))->modify('-24 months')->format('Y-m-d');
    $stmtAsset->execute([$headId, 1, $catTuLanh, 'Tủ lạnh Panasonic Inverter 322 lít', 'Panasonic', 'NR-BC360QKVN', 'SN-PANA-334411', $buyDate2, 13490000, 'MediaMart', 'Bếp', 'good', 'Tủ lạnh ngăn đá dưới, có công nghệ Ag Meat Clean', 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500', 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500']);
    $astId2 = $db->lastInsertId();
    $stmtWarranty->execute([$astId2, $buyDate2, 24, $endDate2, 'Trung tâm Dịch vụ Panasonic', '1800 1593', 'Số 1 Đào Duy Anh, Đống Đa, Hà Nội', 'https://panasonic.com/vn', 'Bảo hành toàn bộ thân máy 24 tháng, máy nén 12 năm']);

    // 3. Điều hòa Daikin (24 tháng, Đã hết hạn bảo hành)
    $buyDate3 = $calcDate('-28 months -8 days');
    $endDate3 = (new DateTime($buyDate3))->modify('+24 months')->format('Y-m-d');
    $stmtAsset->execute([$headId, 1, $catDieuHoa, 'Điều hòa Daikin Inverter 1.5 HP', 'Daikin', 'FTKF35XVMV', 'SN-DAIKIN-776655', $buyDate3, 11800000, 'Nguyễn Kim', 'Phòng ngủ lớn', 'good', 'Máy lạnh phòng ngủ Master, phin lọc Enzyme Blue', 'uploads/assets/dieu_hoa_daikin.png', 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500']);
    $astId3 = $db->lastInsertId();
    $stmtWarranty->execute([$astId3, $buyDate3, 24, $endDate3, 'Trung tâm Daikin Việt Nam', '1800 6777', '102 Trường Chinh, Hà Nội', 'https://daikin.com.vn', 'Bảo hành 24 tháng thiết bị, 5 năm máy nén']);

    // 4. Robot Dreame (12 tháng, Còn bảo hành, thiết bị đang sửa chữa)
    $buyDate4 = $calcDate('-5 months -11 days');
    $endDate4 = (new DateTime($buyDate4))->modify('+12 months')->format('Y-m-d');
    $stmtAsset->execute([$headId, 1, $catRobot, 'Robot hút bụi lau nhà Dreame L10s Ultra', 'Dreame', 'RLS6LADC', 'SN-DREAME-887711', $buyDate4, 16990000, 'Shopee Mall Dreame', 'Phòng khách', 'repairing', 'Trạm sạc tự giặt giẻ và sấy khô, đang bị kẹt bánh xe', 'uploads/assets/robot_hut_bui_dreame.png', 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500']);
    $astId4 = $db->lastInsertId();
    $stmtWarranty->execute([$astId4, $buyDate4, 12, $endDate4, 'Dreame Care Việt Nam', '1900 636 578', '6 Kim Đồng, Hoàng Mai, Hà Nội', 'https://dreame.vn', 'Bảo hành 12 tháng bo mạch chính và trạm sạc']);

    // 5. Nồi chiên Philips (24 tháng, Sắp hết hạn đúng +6 ngày)
    $endDate5 = $calcDate('+6 days');
    $buyDate5 = (new DateTime($endDate5))->modify('-24 months')->format('Y-m-d');
    $stmtAsset->execute([$memberId, 1, $catNoiChien, 'Nồi chiên không dầu Philips Airfryer XXL', 'Philips', 'HD9280/90', 'SN-PHILIPS-110022', $buyDate5, 3890000, 'Lazada Mall', 'Bếp', 'good', 'Dung tích 7.2L có kết nối Wifi ứng dụng NutriU', 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500', 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500']);
    $astId5 = $db->lastInsertId();
    $stmtWarranty->execute([$astId5, $buyDate5, 24, $endDate5, 'Philips Việt Nam', '1800 599 988', '370 Cầu Giấy, Hà Nội', 'https://philips.com.vn', 'Bảo hành 24 tháng toàn cầu']);

    // 6. Lò vi sóng Sharp (24 tháng, Đã hết hạn bảo hành)
    $buyDate6 = $calcDate('-38 months -14 days');
    $endDate6 = (new DateTime($buyDate6))->modify('+24 months')->format('Y-m-d');
    $stmtAsset->execute([$headId, 1, $catDoBep, 'Lò vi sóng Sharp Inverter 23L', 'Sharp', 'R-G232VN-S', 'SN-SHARP-889900', $buyDate6, 2650000, 'Điện Máy Xanh', 'Bếp', 'good', 'Lò vi sóng có chức năng nướng đối lưu Inverter tiết kiệm điện', 'uploads/assets/lo_vi_song_sharp.jpg', 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500']);
    $astId6 = $db->lastInsertId();
    $stmtWarranty->execute([$astId6, $buyDate6, 24, $endDate6, 'Trung tâm Bảo hành Sharp Việt Nam', '1800 1599', 'Số 9 Đoàn Văn Bơ, Q.4, TP.HCM', 'https://sharp.vn', 'Bảo hành chính hãng 24 tháng thân máy']);

    // 7. Máy lọc Xiaomi (12 tháng, Còn bảo hành)
    $buyDate7 = $calcDate('-4 months -25 days');
    $endDate7 = (new DateTime($buyDate7))->modify('+12 months')->format('Y-m-d');
    $stmtAsset->execute([$headId, 1, $catLocKhi, 'Máy lọc không khí Xiaomi Smart Air Purifier 4 Pro', 'Xiaomi', 'AC-M15-SC', 'SN-MI-339911', $buyDate7, 4990000, 'Mi Store Việt Nam', 'Phòng ngủ lớn', 'good', 'Cảm biến bụi mịn laser PM2.5, lọc Formaldehyde hiệu quả', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500', 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500']);
    $astId7 = $db->lastInsertId();
    $stmtWarranty->execute([$astId7, $buyDate7, 12, $endDate7, 'Trung tâm Bảo hành Digiworld Xiaomi', '1900 555 567', '65A Hồ Xuân Hương, Q.3, TP.HCM', 'https://mi.com/vn', 'Bảo hành 12 tháng bo mạch và động cơ quạt hút']);

    // 8. Máy lọc nước Kangaroo (24 tháng, Đã hết hạn bảo hành)
    $buyDate8 = $calcDate('-33 months -3 days');
    $endDate8 = (new DateTime($buyDate8))->modify('+24 months')->format('Y-m-d');
    $stmtAsset->execute([$headId, 1, $catLocNuoc, 'Máy lọc nước RO Kangaroo Hydrogen 10 lõi', 'Kangaroo', 'KG100HA', 'SN-KG-771122', $buyDate8, 6850000, 'Mediamart Cầu Giấy', 'Bếp', 'good', 'Máy lọc nước kiềm hydrogen tốt cho sức khỏe, màng lọc RO Vortex', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500', 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500']);
    $astId8 = $db->lastInsertId();
    $stmtWarranty->execute([$astId8, $buyDate8, 24, $endDate8, 'Tập đoàn Kangaroo Việt Nam', '1900 555 566', 'Tầng 5 Ocean Park, 1 Đào Duy Anh, Hà Nội', 'https://kangaroo.vn', 'Bảo hành 24 tháng linh kiện điện (bơm, nguồn adaptor)']);

    // 8. Lịch sử sửa chữa
    $stmtRepair = $db->prepare("
        INSERT INTO repairs (asset_id, user_id, repair_date, issue_description, repair_shop, cost, is_under_warranty, status, return_date, receipt_url, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    // Bản ghi 1: Robot Dreame (ĐANG SỬA CHỮA, status = 'repairing', được bảo hành miễn phí)
    $stmtRepair->execute([$astId4, $headId, $calcDate('-3 days'), 'Kẹt cảm biến khoảng cách LiDAR và bánh xe trái không xoay', 'Dreame Care Việt Nam', 0, 1, 'repairing', $calcDate('+4 days'), 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500', 'Trung tâm hẹn kiểm tra và thay cụm bánh xe mới']);
    
    // Bản ghi 2: Smart TV Sony (Hoàn thành, được bảo hành miễn phí)
    $stmtRepair->execute([$astId1, $headId, $calcDate('-4 months -8 days'), 'Cổng HDMI 2 bị lỏng tiếp xúc chập chờn', 'Trung tâm Bảo hành Sony', 0, 1, 'completed', $calcDate('-4 months -2 days'), 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500', 'Kỹ thuật viên đến nhà thay bo mạch cổng tín hiệu miễn phí bảo hành']);

    // Bản ghi 3: Điều hòa Daikin (Hoàn thành, trả phí)
    $stmtRepair->execute([$astId3, $headId, $calcDate('-8 months -16 days'), 'Hết gas làm lạnh kém và bụi bẩn dàn lạnh', 'Điện lạnh Bách Khoa 24h', 450000, 0, 'completed', $calcDate('-8 months -16 days'), 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=500', 'Bơm bổ sung gas R32 và vệ sinh xịt rửa 2 dàn']);

    // 9. Thông báo
    $stmtNotif = $db->prepare("
        INSERT INTO notifications (user_id, asset_id, title, message, type, days_remaining, is_read)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtNotif->execute([$headId, $astId2, 'Cảnh báo bảo hành sắp hết hạn', 'Tủ lạnh Panasonic Inverter 322 lít chỉ còn 15 ngày bảo hành (hết hạn ngày ' . date('d/m/Y', strtotime($endDate2)) . '). Hãy kiểm tra hoặc gia hạn thêm gói bảo hành mở rộng!', 'warranty_expiring', 15, 0]);
    $stmtNotif->execute([$memberId, $astId5, 'Khẩn cấp: Sắp hết hạn bảo hành', 'Nồi chiên không dầu Philips Airfryer XXL chỉ còn 6 ngày bảo hành (hết hạn ngày ' . date('d/m/Y', strtotime($endDate5)) . ')! Vui lòng kiểm tra tình trạng máy trước khi hết hạn.', 'warranty_expiring', 6, 0]);

    // 10. Nhật ký Audit Logs
    $stmtAudit = $db->prepare("
        INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtAudit->execute([$headId, 'nguyenvanan@gmail.com', 'CREATE_ASSET', 'asset', $astId1, 'Thêm mới tài sản: Smart TV Sony Bravia 4K 65 inch', '127.0.0.1']);
    $stmtAudit->execute([$headId, 'nguyenvanan@gmail.com', 'CREATE_REPAIR', 'repair', 1, 'Tạo yêu cầu sửa chữa cho Robot Dreame L10s Ultra', '127.0.0.1']);
}

// Cho phép chạy trực tiếp từ dòng lệnh: php database/init.php (thêm cờ --force để làm mới toàn bộ dữ liệu)
if (php_sapi_name() === 'cli' && basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    $force = in_array('--force', $argv ?? []) || in_array('-f', $argv ?? []);
    echo "--- Khởi tạo cơ sở dữ liệu MySQL (XAMPP Port 3306) PHP chuẩn UTF-8 ---\n";
    if ($force) {
        echo "(!) Đang làm mới toàn bộ bảng và dữ liệu mẫu...\n";
    }
    $db = Database::getConnection();
    initializeDatabase($db, $force);
    echo "✓ Hoàn tất nạp dữ liệu mẫu vào MySQL!\n";
    echo "Tài khoản kiểm thử:\n";
    echo "1. Admin: admin@familyassets.vn / Admin@123456\n";
    echo "2. Chủ hộ: nguyenvanan@gmail.com / An@123456\n";
    echo "3. Thành viên: lethibinh@gmail.com / Binh@123456\n";
}
