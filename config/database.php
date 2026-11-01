<?php
// config/database.php - Quản lý kết nối cơ sở dữ liệu MySQL (XAMPP Port 3306)

class Database {
    private static ?PDO $instance = null;

    /**
     * Nạp cấu hình kết nối từ tệp .env
     */
    public static function loadEnv(): array {
        $envFile = __DIR__ . '/../.env';
        $config = [
            'DB_HOST' => '127.0.0.1',
            'DB_PORT' => '3306',
            'DB_NAME' => 'family_assets',
            'DB_USER' => 'root',
            'DB_PASS' => '',
        ];

        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $key = trim($parts[0]);
                    $val = trim($parts[1]);
                    $val = trim($val, "\"'");
                    $config[$key] = $val;
                    if (!isset($_ENV[$key])) {
                        $_ENV[$key] = $val;
                    }
                }
            }
        }
        return $config;
    }

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $env = self::loadEnv();
            $host = $env['DB_HOST'] ?? '127.0.0.1';
            $port = (int)($env['DB_PORT'] ?? 3306);
            $dbname = $env['DB_NAME'] ?? 'family_assets';
            $user = $env['DB_USER'] ?? 'root';
            $pass = $env['DB_PASS'] ?? '';

            try {
                // 1. Kết nối máy chủ MySQL để đảm bảo Database đã tồn tại
                $serverPdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                ]);
                $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

                // 2. Kết nối trực tiếp vào CSDL MySQL của dự án
                self::$instance = new PDO("mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4", $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                ]);

                // 3. Tự động khởi tạo bảng và dữ liệu mẫu nếu database còn trống
                self::initSchema(self::$instance);

            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode([
                    'success' => false,
                    'message' => 'Lỗi kết nối cơ sở dữ liệu MySQL (port ' . $port . '): ' . $e->getMessage()
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        return self::$instance;
    }

    private static function initSchema(PDO $db): void {
        $check = $db->query("SHOW TABLES LIKE 'users'")->fetch();
        if (!$check) {
            require_once __DIR__ . '/../database/init.php';
            initializeDatabase($db);
        }
    }
}
