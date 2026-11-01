# HỆ THỐNG QUẢN LÝ TÀI SẢN VÀ BẢO HÀNH GIA ĐÌNH
> **Đồ án môn học: Lập trình Web với PHP & Cơ sở dữ liệu**

Hệ thống website hoàn chỉnh giúp các hộ gia đình số hóa và lưu trữ thông tin trang thiết bị, theo dõi ngày mua, tự động tính toán thời hạn bảo hành, quản lý lịch sử sửa chữa và nhận cảnh báo khi sắp hết hạn bảo hành.

---

## 1. CÔNG NGHỆ ÁP DỤNG TRONG MÔN HỌC PHP

- **Ngôn ngữ Back-end**: **PHP ≥ 8.0** thuần chuẩn **REST API theo module** (sử dụng các thư viện mở rộng `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`).
- **Cơ sở dữ liệu**: **MySQL (XAMPP Port 3306)** (Database `family_assets`, chuẩn InnoDB, tự động khởi tạo bảng, bật ràng buộc khóa ngoại và seed dữ liệu mẫu chuẩn tiếng Việt UTF-8).
- **Mã hóa dữ liệu & Bảo mật**:
  - Mã hóa mật khẩu bằng hàm chuẩn `password_hash()` với thuật toán `PASSWORD_BCRYPT`.
  - Cơ chế xác thực Token chữ ký số `HMAC-SHA256` (tương thích JWT).
  - Phân quyền người dùng dựa trên vai trò (Role-Based Access Control - RBAC).
  - Ghi nhật ký kiểm toán hệ thống (Audit Logs) cho các hành động nhạy cảm.
  - Chống lỗ hổng Path Traversal bằng `realpath()`, chỉ cho phép upload tệp an toàn (jpg, png, webp, pdf) và đổi tên ngẫu nhiên.
- **Tiêu chuẩn mã hóa tiếng Việt (UTF-8)**:
  - Thiết lập thẻ HTML `<meta charset="UTF-8">` và header HTTP `Content-Type: ...; charset=UTF-8`.
  - Cơ sở dữ liệu MySQL lưu trữ dữ liệu tiếng Việt chuẩn `utf8mb4_unicode_ci`.
  - Xuất báo cáo Excel / CSV có gắn **UTF-8 BOM (`\xEF\xBB\xBF`)** giúp Microsoft Excel tự động hiển thị tiếng Việt có dấu chuẩn 100%, không bị lỗi phông chữ.
- **Giao diện Front-end (Client)**:
  - HTML5, CSS3, JavaScript ES6+ (kiến trúc Single Page Application mượt mà, không giật trang).
  - Tailwind CSS & Font Awesome 6 Icons.
  - Chart.js (Biểu đồ phân bổ danh mục, vị trí phòng và biểu đồ cột so sánh chi phí mua vs sửa chữa theo tháng).
  - SweetAlert2 (Hộp thoại xác nhận thao tác xóa/sửa và thông báo toast).
  - SheetJS (Hỗ trợ xuất và tải tệp Excel trực tiếp phía client).

---

## 2. YÊU CẦU MÔI TRƯỜNG & HỆ THỐNG
- **Phiên bản PHP**: **PHP ≥ 8.0** (hỗ trợ đầy đủ PHP 8.0, 8.1, 8.2, 8.3).
- **Các Extensions bắt buộc kích hoạt trong `php.ini`**:
  - `pdo_sqlite` (hoặc `sqlite3`): Cơ sở dữ liệu SQLite gọn nhẹ, không cần cài đặt SQL Server riêng.
  - `mbstring`: Xử lý chuỗi đa byte tiếng Việt có dấu UTF-8.
  - `fileinfo`: Kiểm tra MIME type thực tế của tệp tải lên.

---

## 3. HƯỚNG DẪN KHỞI CHẠY ĐỒ ÁN PHP

### Cách 1: Khởi chạy 1-Click bằng tệp `start.bat` (Khuyên dùng trên Windows)
Nhấp đúp chuột vào tệp **`start.bat`** (hoặc chạy `.\start.bat` trong terminal):
- Tệp sẽ tự động kiểm tra xem `php` đã có trong PATH hay chưa.
- Tự động chạy `php database/init.php` để khởi tạo cơ sở dữ liệu nếu chưa có tệp DB.
- Tự động mở trình duyệt web đến địa chỉ: 👉 **`http://localhost:8000`**
- Khởi động máy chủ phát triển PHP Built-in Server.

### Cách 2: Khởi chạy bằng dòng lệnh PHP Built-in Server
Mở terminal tại thư mục gốc của dự án và chạy:
```powershell
php -S localhost:8000 router.php
```
Mở trình duyệt web và truy cập địa chỉ:
👉 **`http://localhost:8000`**

### Cách 3: Khởi tạo lại Cơ sở dữ liệu và Dữ liệu mẫu (Seed Data)
Nếu muốn làm mới hoặc nạp lại toàn bộ dữ liệu mẫu ban đầu:
```powershell
php database/init.php --force
```

---

## 4. TÀI KHOẢN TRẢI NGHIỆM VÀ PHÂN QUYỀN (RBAC)

Hệ thống đã tích hợp sẵn tính năng **1-Click Demo** tại trang Đăng nhập và thanh Header giúp người chấm/giảng viên chuyển đổi vai trò ngay tức thì:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@familyassets.vn` | `Admin@123456` | Toàn quyền quản trị hệ thống: Quản lý người dùng, khóa/mở khóa tài khoản, reset mật khẩu, CRUD danh mục, kiểm duyệt tài sản vi phạm, cấu hình ngưỡng cảnh báo, xem Audit logs. |
| **Chủ hộ (Head)** | `nguyenvanan@gmail.com` | `An@123456` | Quản lý toàn bộ tài sản gia đình: Thêm/sửa/xóa tài sản, ghi nhận sửa chữa, gia hạn bảo hành, xuất báo cáo Excel/CSV, quản lý thành viên gia đình. |
| **Thành viên (Member)** | `lethibinh@gmail.com` | `Binh@123456` | Xem danh mục tài sản, tra cứu thông tin bảo hành, hotline hãng, vị trí phòng (quyền chỉ xem). |

---

## 5. CHI TIẾT TÍNH NĂNG VÀ LOGIC NGHIỆP VỤ ĐÃ HOÀN THIỆN

### 5.1. Phân biệt rõ hai chỉ số: Hết hạn bảo hành vs Đang sửa chữa
Hệ thống phân tách rạch ròi 2 chỉ số này trên cả giao diện và cơ sở dữ liệu:
- **Tài sản hết hạn bảo hành (`expiredWarranties`)**: Dựa trên ngày kết thúc bảo hành `end_date < CURRENT_DATE` (số ngày còn lại $< 0$). Thiết bị vẫn có thể đang hoạt động bình thường (`usage_status = 'good'`) nhưng hãng đã hết trách nhiệm bảo hành miễn phí.
- **Tài sản đang sửa chữa (`repairingCount`)**: Dựa trên tình trạng vật lý của thiết bị (`usage_status = 'repairing'`) hoặc có bản ghi sửa chữa đang diễn ra (`repairs.status = 'repairing'`). Thiết bị này có thể vẫn đang trong thời hạn bảo hành.
- **Giao diện Dashboard** cung cấp **5 Thẻ chỉ số riêng biệt**:
  1. `Tổng tài sản`: Hiển thị tổng số lượng tài sản (dòng phụ: tổng trị giá mua sắm).
  2. `Còn bảo hành`: Hiển thị số tài sản đang trong thời hạn bảo hành (màu xanh lá, dòng phụ: *Đang an tâm sử dụng*).
  3. `Sắp hết hạn`: Cảnh báo số tài sản sắp hết hạn trong ngưỡng 30 ngày (màu vàng cam, dòng phụ: *Trong vòng 30 ngày*).
  4. `Đã hết hạn bảo hành`: Số tài sản đã quá thời hạn bảo hành chính hãng (màu đỏ, dòng phụ: *Hết thời hạn bảo hành*).
  5. `Đang sửa chữa`: Số lượng tài sản đang đi bảo dưỡng/sửa chữa (màu tím, ví dụ: *1 tài sản*, dòng phụ: *Tổng chi phí*).

### 5.2. Tự động tính toán số ngày còn lại theo thời gian thực (Dynamic Countdown)
- **Không bao giờ nhập số ngày cố định**. Hệ thống chỉ lưu `start_date`, `duration_months` và `end_date`.
- Thuật toán tự động tính:
  $$\text{days\_remaining} = \lfloor \frac{\text{strtotime}(end\_date) - \text{strtotime}(\text{today})}{86400} \rfloor$$
- Phân loại màu sắc và nhãn theo quy tắc:
  - $\text{days\_remaining} < 0$: Đỏ (`Đã hết hạn bảo hành`).
  - $0 \le \text{days\_remaining} \le \text{threshold}$ (30 ngày): Vàng cam (`Sắp hết hạn`).
  - $\text{days\_remaining} > \text{threshold}$: Xanh lục (`Còn bảo hành`).

### 5.3. Quản lý danh mục & Tìm kiếm đa tiêu chí
- Danh mục hỗ trợ đa cấp **Cha – Con** (Điện tử $\rightarrow$ Tivi, Máy tính; Điện lạnh $\rightarrow$ Tủ lạnh, Máy giặt; Đồ bếp $\rightarrow$ Nồi chiên...).
- Tìm kiếm tức thì theo: Tên sản phẩm, Thương hiệu, Model, Số Serial.
- Bộ lọc đa chiều:
  - Danh mục thiết bị.
  - Vị trí đặt trong nhà (Phòng khách, Bếp, Phòng ngủ, Phòng làm việc, Ban công, Garage...).
  - Tình trạng sử dụng máy (Mới mua, Tốt, Đang sửa chữa, Hỏng hóc, Cũ).
  - Tình trạng bảo hành (Còn hạn, Sắp hết hạn, Đã hết hạn).
  - Khoảng giá mua và khoảng ngày mua.
- Sắp xếp linh hoạt theo ngày mua, giá tiền, ngày hết hạn bảo hành, tên thiết bị.
- **Thùng rác (Soft Delete)**: Cho phép xóa mềm và khôi phục tài sản khi cần thiết.

### 5.4. Quản lý lịch sử sửa chữa & Đồng bộ trạng thái tự động
- Thêm bản ghi sửa chữa: ngày sửa, nội dung lỗi, đơn vị sửa chữa, chi phí, sửa trong hạn bảo hành hay trả phí, ngày hẹn nhận lại, ảnh biên nhận hóa đơn.
- **Đồng bộ tự động**: Khi thêm bản ghi sửa chữa với trạng thái `Đang sửa (repairing)`, trạng thái tài sản tự động chuyển thành `repairing`. Khi hoàn thành (`completed`), tài sản tự động phục hồi về `good`.
- Tự động thống kê tổng số tiền đã bỏ ra sửa chữa cho từng món đồ.

### 5.5. Xuất báo cáo thực tế chuẩn UTF-8 BOM
- Hỗ trợ xuất dữ liệu ra file Excel / CSV có tiếng Việt có dấu.
- Ghi mã nhận diện **UTF-8 Byte Order Mark (`\xEF\xBB\xBF`)** ngay đầu luồng xuất tệp.
- Báo cáo thống kê trực quan với biểu đồ Chart.js (tỷ lệ danh mục, chi phí theo tháng, xếp hạng top tài sản hay hỏng hóc).

### 5.6. Khu vực Quản trị viên (Admin Portal)
- Dashboard toàn hệ thống: Tổng người dùng, tài sản toàn hệ thống, tổng chi phí sửa chữa.
- Quản lý tài khoản: Thêm mới, chỉnh sửa vai trò, khóa/mở khóa tài khoản, đặt lại mật khẩu.
- Quản lý danh mục: Thêm, sửa, xóa danh mục (ràng buộc không cho xóa danh mục khi đang có tài sản).
- Kiểm duyệt tài sản: Gắn cờ / gỡ cờ kiểm duyệt tài sản.
- Cấu hình hệ thống: Thay đổi ngưỡng ngày cảnh báo bảo hành (mặc định 30 ngày), cấu hình email.
- Nhật ký hoạt động (Audit Logs): Lưu lại toàn bộ thao tác thêm, sửa, xóa, đăng nhập của người dùng.

---

## 6. CẤU TRÚC THƯ MỤC MÃ NGUỒN

```
.
├── config/
│   └── database.php         # Quản lý kết nối PDO SQLite UTF-8 singleton
├── database/
│   ├── family_assets.sqlite # Tệp cơ sở dữ liệu SQLite
│   └── init.php             # Kịch bản khởi tạo cấu trúc bảng & nạp dữ liệu mẫu
├── helpers/
│   ├── auth.php             # Xác thực Token HMAC-SHA256 & phân quyền RBAC
│   └── utils.php            # Hàm tính hạn bảo hành, JSON response UTF-8, upload file
├── api/
│   ├── auth.php             # API đăng ký, đăng nhập, hồ sơ, mật khẩu, thành viên
│   ├── assets.php           # API tài sản, dashboard stats, bộ lọc, soft delete
│   ├── categories.php       # API danh mục thiết bị
│   ├── warranty.php         # API cảnh báo hạn bảo hành, gia hạn, TT bảo hành
│   ├── repairs.php          # API lịch sử sửa chữa, đơn vị sửa chữa uy tín
│   ├── reports.php          # API thống kê biểu đồ & xuất Excel UTF-8 BOM
│   ├── notifications.php    # API thông báo hệ thống
│   └── admin.php            # API quản trị: người dùng, danh mục, cài đặt, audit log
├── public/
│   ├── index.html           # Giao diện chính Single Page Application chuẩn UTF-8
│   ├── css/
│   │   └── custom.css       # Định kiểu bổ sung
│   └── js/
│       ├── api.js           # Client gọi API Fetch
│       ├── auth.js          # Quản lý phiên đăng nhập & Demo 1-Click
│       ├── utils.js         # Tiện ích định dạng tiền tệ VNĐ, ngày tháng, badge
│       ├── app.js           # Router điều hướng trang
│       └── views/           # Các màn hình chức năng (Dashboard, Assets, Repairs, Reports, Admin...)
├── uploads/                 # Thư mục lưu trữ ảnh tải lên (ảnh thiết bị, hóa đơn, biên nhận)
├── router.php               # Bộ định tuyến cho PHP Built-in Server
├── index.php                # Cổng vào ứng dụng
└── README.md                # Tài liệu hướng dẫn đồ án
```
