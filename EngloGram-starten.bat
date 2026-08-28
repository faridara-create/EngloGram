@echo off
setlocal

cd /d "%~dp0"
title EngloGram Starter

if not exist "node_modules\" (
  echo Abhaengigkeiten fehlen. Sie werden jetzt installiert...
  call npm install
  if errorlevel 1 (
    echo.
    echo Die Installation ist fehlgeschlagen.
    pause
    exit /b 1
  )
)

rem Keinen zweiten Server starten, falls EngloGram bereits laeuft.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo EngloGram wird gestartet...
  start "EngloGram Server" cmd /k "cd /d ""%~dp0"" && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
  timeout /t 2 /nobreak >nul
)

start "" "http://127.0.0.1:5173/"

endlocal
exit /b 0
