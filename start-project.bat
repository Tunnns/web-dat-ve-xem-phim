@echo off
setlocal enabledelayedexpansion
title HE THONG DAT VE XEM PHIM (SINGLE TERMINAL)

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ================================================================================
echo           HE THONG DAT VE XEM PHIM - KHOI DONG DONG THOI (1 TERMINAL)
echo ================================================================================
echo Thu muc: %PROJECT_ROOT%
echo.

rem 1. Kiem tra va khoi dong MongoDB Server neu chua chay (chay ngam, khong tao tab moi)
netstat -ano | findstr :27017 >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/3] MongoDB:       DANG CHAY tren cong 27017
) else (
    echo [1/3] MongoDB:       Dang khoi dong MongoDB Server...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        if exist "D:\CodeAPP\MongoDB\bin\mongod.exe" (
            start /b "" "D:\CodeAPP\MongoDB\bin\mongod.exe" --config "D:\CodeAPP\MongoDB\bin\mongod.cfg" >nul 2>&1
            timeout /t 2 /nobreak >nul
        )
    )
    netstat -ano | findstr :27017 >nul 2>&1
    if %errorlevel% equ 0 (
        echo [1/3] MongoDB:       Khoi dong thanh cong tren cong 27017.
    ) else (
        echo [1/3] MongoDB:       CANH BAO - Chua ket noi duoc cong 27017.
    )
)

rem 2. Kiem tra trang thai Ngrok (neu da chay thi bo qua de khong xung dot)
netstat -ano | findstr :4040 >nul 2>&1
if %errorlevel% equ 0 (
    echo [2/3] Ngrok Tunnel:  DA CHAY truoc do (Dashboard: http://127.0.0.1:4040)
    set "RUN_COMMAND=npm run dev:local"
) else (
    echo [2/3] Ngrok Tunnel:  Se chay kem Webhook (https://dramaturgically-unharsh-kailee.ngrok-free.dev)
    set "RUN_COMMAND=npm run dev"
)

rem 3. Thong bao cac dich vu se chay chung trong Terminal duy nhat nay
echo [3/3] Cac dich vu chay chung trong 1 Terminal duy nhat:
echo       - BACKEND API:      http://localhost:5000 [Mau Xanh Duong]
echo       - CLIENT WEB:       http://localhost:5173 [Mau Xanh La]
echo       - ADMIN DASHBOARD:  http://localhost:5174 [Mau Tim]
echo       - NGROK WEBHOOK:    Port 5000            [Mau Vang]
echo.
echo ================================================================================
echo Dang khoi chay cac dich vu... Nhan Ctrl+C de dung tat ca cung luc.
echo ================================================================================
echo.

rem 4. Chay truc tiep tai cua so console hien tai, KHONG mo them cua so hay tab nao
%RUN_COMMAND%
