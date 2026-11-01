@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================================
echo   HỆ THỐNG QUẢN LÝ TÀI SẢN VÀ BẢO HÀNH GIA ĐÌNH 
echo ===================================================================

:: 1. Tự động nhận diện đường dẫn PHP nếu chưa có trong biến môi trường PATH
where php >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%LOCALAPPDATA%\Programs\php\php.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\php;%PATH%"
    ) else if exist "C:\Users\%USERNAME%\AppData\Local\Programs\php\php.exe" (
        set "PATH=C:\Users\%USERNAME%\AppData\Local\Programs\php;%PATH%"
    ) else if exist "C:\Users\chaun\AppData\Local\Programs\php\php.exe" (
        set "PATH=C:\Users\chaun\AppData\Local\Programs\php;%PATH%"
    ) else if exist "C:\php\php.exe" (
        set "PATH=C:\php;%PATH%"
    ) else if exist "C:\xampp\php\php.exe" (
        set "PATH=C:\xampp\php;%PATH%"
    )
)

where php >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Không tìm thấy lệnh 'php' trong biến môi trường PATH!
    echo Vui lòng cài đặt PHP 8.x và thêm thư mục chứa php.exe vào PATH.
    echo.
    pause
    exit /b 1
)

:: 2. Tự động giải phóng cổng 8000 nếu có tiến trình PHP cũ đang chạy ngầm
echo [THÔNG BÁO] Kiểm tra và làm mới cổng kết nối 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

:: 3. Tự động kiểm tra và khởi tạo cơ sở dữ liệu MySQL
echo [THÔNG BÁO] Kiểm tra kết nối cơ sở dữ liệu MySQL (port 3306)...
php database\init.php
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Không thể kết nối tới MySQL. Vui lòng bật MySQL trên XAMPP Control Panel!
    pause
    exit /b 1
)
echo.

:: 4. Tự động mở trình duyệt web
echo Đang mở trình duyệt: http://localhost:8000 ...
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8000"

:: 5. Khởi động PHP Built-in Server
echo ===================================================================
echo   Máy chủ đang chạy tại: http://localhost:8000
echo   Nhấn Ctrl + C để dừng máy chủ.
echo ===================================================================
php -S 127.0.0.1:8000 router.php

pause
