@echo off
setlocal
title HanziMotion Studio - Launcher

REM ==== Absolute paths (WorkBuddy bundled runtimes, not in system PATH) ====
set "PY=C:\Users\99549\.workbuddy\binaries\python\versions\3.13.12\python.exe"
set "NODEDIR=C:\Users\99549\.workbuddy\binaries\node\versions\22.22.2-6"
set "PROJ=E:\workbuddy_proj\hanzi-motion-studio"
set "PATH=%NODEDIR%;%PATH%"

echo.
echo  ============================================================
echo    HanziMotion Studio  -  One Click Start
echo  ============================================================
echo.

echo  [1/3] Starting BACKEND  on  http://127.0.0.1:8100 ...
start "HanziMotion-Backend" cmd /k "cd /d %PROJ%\backend && %PY% -m uvicorn main:app --host 127.0.0.1 --port 8100"

echo  [2/3] Starting FRONTEND on  http://127.0.0.1:5173 ...
start "HanziMotion-Frontend" cmd /k "cd /d %PROJ%\frontend && %NODEDIR%\npm.cmd run dev"

echo  [3/3] Waiting for services to be ready ...
ping -n 7 127.0.0.1 >nul

start "" "http://127.0.0.1:5173"

echo.
echo  Done! Two service windows are now open.
echo  Use the app at http://127.0.0.1:5173 (should open in browser).
echo  Keep BOTH windows open while using the app.
echo  Close the two windows to stop the servers.
echo.
pause
