@echo off
setlocal enabledelayedexpansion
title HE THONG DAT VE XEM PHIM - KHOI DONG DU AN

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

rem Ho tro tham so dong lenh truc tiep
if "%~1"=="1" goto START_ALL_SEPARATE
if "%~1"=="all" goto START_ALL_SEPARATE
if "%~1"=="2" goto START_ALL_UNIFIED
if "%~1"=="3" goto RUN_TEST
if "%~1"=="test" goto RUN_TEST
if "%~1"=="4" goto START_NGROK_ONLY
if "%~1"=="ngrok" goto START_NGROK_ONLY
if "%~1"=="5" goto START_BACKEND_ONLY
if "%~1"=="backend" goto START_BACKEND_ONLY
if "%~1"=="6" goto START_CLIENT_ONLY
if "%~1"=="client" goto START_CLIENT_ONLY
if "%~1"=="7" goto START_ADMIN_ONLY
if "%~1"=="admin" goto START_ADMIN_ONLY
if "%~1"=="8" goto CHECK_PORTS
if "%~1"=="ports" goto CHECK_PORTS

:MENU
cls
echo ================================================================================
echo           HE THONG DAT VE XEM PHIM - MOI TRUONG PHAT TRIEN (DEV)
echo ================================================================================
echo Thu muc du an: %PROJECT_ROOT%
echo.

rem Kiem tra trang thai MongoDB
netstat -ano | findstr :27017 >nul 2>&1
if %errorlevel% equ 0 (
    echo [Trang thai DB]    MongoDB Server: DANG CHAY tren cong 27017
) else (
    echo [Trang thai DB]    MongoDB Server: CHUA CHAY tren cong 27017
)

rem Kiem tra trang thai Ngrok
netstat -ano | findstr :4040 >nul 2>&1
if %errorlevel% equ 0 (
    echo [Trang thai Ngrok] Ngrok Tunnel:   DANG CHAY (Dashboard: http://127.0.0.1:4040)
) else (
    echo [Trang thai Ngrok] Ngrok Tunnel:   CHUA CHAY (SePay: https://dramaturgically-unharsh-kailee.ngrok-free.dev)
)

echo.
echo Chon che do khoi dong (Tu dong chon [1] sau 5 giay):
echo   [1] Mo tat ca dich vu (Backend, Ngrok SePay, Client, Admin) [Khuyen dung]
echo   [2] Chay Backend + Client + Admin trong 1 cua so (concurrently)
echo   [3] Chay kiem thu trinh duyet vat ly (Headful Chrome E2E User Test)
echo   [4] Chi khoi dong Ngrok Tunnel cho SePay Webhook (Port 5000)
echo   [5] Chi khoi dong Backend API (Port 5000)
echo   [6] Chi khoi dong Client Web (Port 5173)
echo   [7] Chi khoi dong Admin Dashboard (Port 5174)
echo   [8] Kiem tra cac cong dang chay (5000, 5173, 5174, 4040, 27017)
echo   [0] Thoat
echo ================================================================================

choice /c 123456780 /t 5 /d 1 /m "Nhap lua chon cua ban [1-8, 0]: "
set "USER_CHOICE=%errorlevel%"

if "%USER_CHOICE%"=="1" goto START_ALL_SEPARATE
if "%USER_CHOICE%"=="2" goto START_ALL_UNIFIED
if "%USER_CHOICE%"=="3" goto RUN_TEST
if "%USER_CHOICE%"=="4" goto START_NGROK_ONLY
if "%USER_CHOICE%"=="5" goto START_BACKEND_ONLY
if "%USER_CHOICE%"=="6" goto START_CLIENT_ONLY
if "%USER_CHOICE%"=="7" goto START_ADMIN_ONLY
if "%USER_CHOICE%"=="8" goto CHECK_PORTS
if "%USER_CHOICE%"=="9" goto EXIT_SCRIPT

:CHECK_MONGODB
netstat -ano | findstr :27017 >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [MongoDB] Cong 27017 chua mo. Dang thu khoi dong MongoDB Server...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        if exist "D:\CodeAPP\MongoDB\bin\mongod.exe" (
            echo [MongoDB] Dang khoi dong mongod.exe tu D:\CodeAPP\MongoDB...
            start "MONGODB [Port 27017]" "D:\CodeAPP\MongoDB\bin\mongod.exe" --config "D:\CodeAPP\MongoDB\bin\mongod.cfg"
            timeout /t 2 /nobreak >nul
        ) else (
            echo [CANH BAO] Khong the tu dong khoi dong MongoDB service hoac binary.
            echo Vui long dam bao MongoDB dang hoat dong tren cong 27017!
        )
    ) else (
        echo [MongoDB] Da khoi dong service MongoDB thanh cong.
    )
)
exit /b 0

:CHECK_NGROK
netstat -ano | findstr :4040 >nul 2>&1
if %errorlevel% neq 0 (
    echo [2/4] Mo Terminal Ngrok Webhook Tunnel...
    start "NGROK TUNNEL [Port 5000]" cmd /k "title [NGROK TUNNEL] SePay Webhook && echo ======================================== && echo   NGROK PUBLIC URL - SePay VietQR && echo   https://dramaturgically-unharsh-kailee.ngrok-free.dev && echo ======================================== && ngrok http --url=dramaturgically-unharsh-kailee.ngrok-free.dev 5000 || ngrok http 5000"
    timeout /t 1 /nobreak >nul
) else (
    echo [Ngrok] Ngrok Tunnel da dang chay tren cong 4040.
)
exit /b 0

:START_ALL_SEPARATE
echo.
echo ================================================================================
echo Dang khoi dong cac dich vu vao cac cua so Terminal rieng biet...
echo ================================================================================
call :CHECK_MONGODB

echo [1/4] Mo Terminal Backend API (Port 5000)...
start "BACKEND API [Port 5000]" cmd /k "title [BACKEND API] Port 5000 && cd /d "%PROJECT_ROOT%backend" && echo ======================================== && echo   BACKEND API - http://localhost:5000 && echo ======================================== && npm run dev"

timeout /t 1 /nobreak >nul

call :CHECK_NGROK

echo [3/4] Mo Terminal Client Web (Port 5173)...
start "CLIENT WEB [Port 5173]" cmd /k "title [CLIENT WEB] Port 5173 && cd /d "%PROJECT_ROOT%client" && echo ======================================== && echo   CLIENT WEB - http://localhost:5173 && echo ======================================== && npm run dev"

timeout /t 1 /nobreak >nul

echo [4/4] Mo Terminal Admin Dashboard (Port 5174)...
start "ADMIN DASHBOARD [Port 5174]" cmd /k "title [ADMIN DASHBOARD] Port 5174 && cd /d "%PROJECT_ROOT%admin" && echo ======================================== && echo   ADMIN DASHBOARD - http://localhost:5174 && echo ======================================== && npm run dev"

echo.
echo Da mo day du cac cua so Terminal cho Backend, Ngrok, Client va Admin.
echo.
choice /c YN /t 5 /d Y /m "Mo trinh duyet (http://localhost:5173 va http://localhost:5174) [Y/N]: "
if %errorlevel% equ 1 (
    timeout /t 3 /nobreak >nul
    start http://localhost:5173
    start http://localhost:5174
)
goto EXIT_PROMPT

:START_ALL_UNIFIED
echo.
echo ================================================================================
echo Dang chay tat ca dich vu trong 1 Terminal duy nhat (concurrently)...
echo ================================================================================
call :CHECK_MONGODB
call :CHECK_NGROK
npm run dev
goto EXIT_PROMPT

:RUN_TEST
echo.
echo ================================================================================
echo Chay Headful Browser Test (Chrome that tu dong kiem thu user flow)...
echo ================================================================================
cd /d "%PROJECT_ROOT%backend"
npx ts-node src/scripts/real-browser-test.ts
cd /d "%PROJECT_ROOT%"
goto EXIT_PROMPT

:START_NGROK_ONLY
echo [Ngrok] Mo Terminal Ngrok Webhook Tunnel...
start "NGROK TUNNEL [Port 5000]" cmd /k "title [NGROK TUNNEL] SePay Webhook && echo ======================================== && echo   NGROK PUBLIC URL - SePay VietQR && echo   https://dramaturgically-unharsh-kailee.ngrok-free.dev && echo ======================================== && ngrok http --url=dramaturgically-unharsh-kailee.ngrok-free.dev 5000 || ngrok http 5000"
goto EXIT_PROMPT

:START_BACKEND_ONLY
call :CHECK_MONGODB
echo [Backend] Mo Terminal Backend API (Port 5000)...
start "BACKEND API [Port 5000]" cmd /k "title [BACKEND API] Port 5000 && cd /d "%PROJECT_ROOT%backend" && npm run dev"
goto EXIT_PROMPT

:START_CLIENT_ONLY
echo [Client] Mo Terminal Client Web (Port 5173)...
start "CLIENT WEB [Port 5173]" cmd /k "title [CLIENT WEB] Port 5173 && cd /d "%PROJECT_ROOT%client" && npm run dev"
goto EXIT_PROMPT

:START_ADMIN_ONLY
echo [Admin] Mo Terminal Admin Dashboard (Port 5174)...
start "ADMIN DASHBOARD [Port 5174]" cmd /k "title [ADMIN DASHBOARD] Port 5174 && cd /d "%PROJECT_ROOT%admin" && npm run dev"
goto EXIT_PROMPT

:CHECK_PORTS
echo.
echo ================================================================================
echo KIEM TRA TRANG THAI CAC CONG:
echo ================================================================================
echo [Cong 27017 - MongoDB]:
netstat -ano | findstr :27017
echo.
echo [Cong 5000 - Backend API]:
netstat -ano | findstr :5000
echo.
echo [Cong 4040 - Ngrok Dashboard]:
netstat -ano | findstr :4040
echo.
echo [Cong 5173 - Client Web]:
netstat -ano | findstr :5173
echo.
echo [Cong 5174 - Admin Dashboard]:
netstat -ano | findstr :5174
echo.
if not "%~1"=="" exit /b 0
pause
goto MENU

:EXIT_PROMPT
echo.
echo ================================================================================
echo Hoan tat thao tac.
echo ================================================================================
if not "%~1"=="" exit /b 0
pause
exit /b 0

:EXIT_SCRIPT
exit /b 0
