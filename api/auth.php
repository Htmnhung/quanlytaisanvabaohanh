<?php
// api/auth.php - Xử lý đăng ký, đăng nhập, hồ sơ, mật khẩu và thành viên gia đình

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/utils.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$pathInfo = $_SERVER['PATH_INFO'] ?? '';

// Nếu gọi qua query parameter hoặc router rewrite
$action = trim($pathInfo, '/');
if (empty($action) && isset($_GET['action'])) {
    $action = $_GET['action'];
}

switch ($action) {
    case 'register':
        handleRegister($db);
        break;
    case 'login':
        handleLogin($db);
        break;
    case 'me':
        handleGetMe($db);
        break;
    case 'profile':
        handleUpdateProfile($db);
        break;
    case 'change-password':
        handleChangePassword($db);
        break;
    case 'forgot-password':
        handleForgotPassword($db);
        break;
    case 'family-members':
        handleGetFamilyMembers($db);
        break;
    default:
        sendJson(['success' => false, 'message' => 'Hành động không hợp lệ: ' . $action], 404);
}

function handleRegister(PDO $db): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
    }

    $input = getJsonInput();
    $fullName = trim($input['full_name'] ?? '');
    $email = trim(strtolower($input['email'] ?? ''));
    $phone = trim($input['phone'] ?? '');
    $password = $input['password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? $input['confirmPassword'] ?? '';

    // Kiểm tra dữ liệu
    if (empty($fullName) || empty($email) || empty($password)) {
        sendJson(['success' => false, 'message' => 'Vui lòng điền đầy đủ họ tên, email và mật khẩu'], 422);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson(['success' => false, 'message' => 'Email không đúng định dạng'], 422);
    }

    if (strlen($password) < 8) {
        sendJson(['success' => false, 'message' => 'Mật khẩu phải có độ dài tối thiểu 8 ký tự'], 422);
    }

    if (!empty($confirmPassword) && $password !== $confirmPassword) {
        sendJson(['success' => false, 'message' => 'Xác nhận mật khẩu không khớp'], 422);
    }

    // Kiểm tra trùng email
    $stmtCheck = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmtCheck->execute([$email]);
    if ($stmtCheck->fetch()) {
        sendJson(['success' => false, 'message' => 'Email này đã được sử dụng trên hệ thống'], 409);
    }

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare("
        INSERT INTO users (full_name, email, phone, password, role, family_id, status)
        VALUES (?, ?, ?, ?, 'head', 1, 'active')
    ");
    $stmt->execute([$fullName, $email, $phone, $hashedPassword]);
    $userId = (int)$db->lastInsertId();

    $user = [
        'id' => $userId,
        'full_name' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'role' => 'head',
        'family_id' => 1,
        'status' => 'active'
    ];

    $token = generateJwt(['id' => $userId, 'email' => $email, 'role' => 'head']);
    logAudit($db, $userId, $email, 'USER_REGISTER', 'user', $userId, 'Người dùng đăng ký tài khoản mới');

    sendJson([
        'success' => true,
        'message' => 'Đăng ký tài khoản thành công',
        'token' => $token,
        'user' => $user
    ], 201);
}

function handleLogin(PDO $db): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
    }

    $input = getJsonInput();
    $email = trim(strtolower($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    if (empty($email) || empty($password)) {
        sendJson(['success' => false, 'message' => 'Vui lòng nhập email và mật khẩu'], 422);
    }

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        sendJson(['success' => false, 'message' => 'Email hoặc mật khẩu không chính xác'], 401);
    }

    if ($user['status'] === 'locked') {
        sendJson(['success' => false, 'message' => 'Tài khoản của bạn đã bị khóa bởi Quản trị viên'], 403);
    }

    $token = generateJwt([
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role']
    ]);

    logAudit($db, $user['id'], $user['email'], 'USER_LOGIN', 'user', $user['id'], 'Đăng nhập thành công');

    unset($user['password']);

    sendJson([
        'success' => true,
        'message' => 'Đăng nhập thành công',
        'token' => $token,
        'user' => $user
    ]);
}

function handleGetMe(PDO $db): void {
    $user = requireAuth($db);
    sendJson(['success' => true, 'user' => $user]);
}

function handleUpdateProfile(PDO $db): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
    }

    $currentUser = requireAuth($db);
    $input = getJsonInput();

    $fullName = trim($input['full_name'] ?? $currentUser['full_name']);
    $phone = trim($input['phone'] ?? $currentUser['phone']);
    $avatar = $input['avatar'] ?? $currentUser['avatar'];

    if (isset($_FILES['avatar'])) {
        $uploaded = handleFileUpload($_FILES['avatar'], 'avatars');
        if ($uploaded) {
            $avatar = $uploaded;
        }
    }

    $stmt = $db->prepare("UPDATE users SET full_name = ?, phone = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$fullName, $phone, $avatar, $currentUser['id']]);

    logAudit($db, $currentUser['id'], $currentUser['email'], 'UPDATE_PROFILE', 'user', $currentUser['id'], 'Cập nhật thông tin cá nhân');

    $stmtGet = $db->prepare("SELECT id, full_name, email, phone, role, family_id, status, avatar FROM users WHERE id = ?");
    $stmtGet->execute([$currentUser['id']]);
    $updatedUser = $stmtGet->fetch();

    sendJson([
        'success' => true,
        'message' => 'Cập nhật hồ sơ cá nhân thành công',
        'user' => $updatedUser
    ]);
}

function handleChangePassword(PDO $db): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
    }

    $currentUser = requireAuth($db);
    $input = getJsonInput();

    $currentPassword = $input['currentPassword'] ?? $input['current_password'] ?? '';
    $newPassword = $input['newPassword'] ?? $input['new_password'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        sendJson(['success' => false, 'message' => 'Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới'], 422);
    }

    if (strlen($newPassword) < 8) {
        sendJson(['success' => false, 'message' => 'Mật khẩu mới phải có tối thiểu 8 ký tự'], 422);
    }

    // Kiểm tra mật khẩu cũ
    $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$currentUser['id']]);
    $currentHash = $stmt->fetchColumn();

    if (!password_verify($currentPassword, $currentHash)) {
        sendJson(['success' => false, 'message' => 'Mật khẩu hiện tại không chính xác'], 400);
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmtUpdate = $db->prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmtUpdate->execute([$newHash, $currentUser['id']]);

    logAudit($db, $currentUser['id'], $currentUser['email'], 'CHANGE_PASSWORD', 'user', $currentUser['id'], 'Đổi mật khẩu');

    sendJson([
        'success' => true,
        'message' => 'Đổi mật khẩu thành công. Vui lòng bảo mật mật khẩu mới.'
    ]);
}

function handleForgotPassword(PDO $db): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJson(['success' => false, 'message' => 'Phương thức không được hỗ trợ'], 405);
    }

    $input = getJsonInput();
    $email = trim(strtolower($input['email'] ?? ''));

    if (empty($email)) {
        sendJson(['success' => false, 'message' => 'Vui lòng cung cấp địa chỉ email'], 422);
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJson(['success' => false, 'message' => 'Không tìm thấy tài khoản với email này'], 404);
    }

    // Mô phỏng tạo mật khẩu ngẫu nhiên hoặc gửi link
    $tempPassword = 'Pass@' . rand(100000, 999999);
    $newHash = password_hash($tempPassword, PASSWORD_BCRYPT);
    $stmtUpdate = $db->prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmtUpdate->execute([$newHash, $user['id']]);

    logAudit($db, $user['id'], $email, 'FORGOT_PASSWORD', 'user', $user['id'], 'Đặt lại mật khẩu tạm thời');

    sendJson([
        'success' => true,
        'message' => "Hệ thống đã gửi liên kết khôi phục. Mật khẩu tạm thời mới của bạn là: $tempPassword"
    ]);
}

function handleGetFamilyMembers(PDO $db): void {
    $currentUser = requireAuth($db);
    $stmt = $db->prepare("
        SELECT id, full_name, email, phone, role, status, avatar, created_at
        FROM users
        WHERE family_id = ?
        ORDER BY role DESC, full_name ASC
    ");
    $stmt->execute([$currentUser['family_id']]);
    $members = $stmt->fetchAll();

    sendJson(['success' => true, 'members' => $members]);
}

