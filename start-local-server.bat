@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=8080"
if not "%~1"=="" set "PORT=%~1"

set "ROOT=%~dp0modave"
if not exist "%ROOT%\index.html" (
    echo Could not find modave\index.html next to this script.
    echo Put start-local-server.bat in the Formas shop folder.
    pause
    exit /b 1
)

set "PHP="
if exist "%~dp0.tools\php\php.exe" set "PHP=%~dp0.tools\php\php.exe"
if not defined PHP (
    where php >nul 2>&1
    if not errorlevel 1 for /f "delims=" %%P in ('where php') do (
        set "PHP=%%P"
        goto :php_found
    )
)
:php_found

if not defined PHP (
    echo PHP was not found.
    echo This site needs PHP for Instagram reels, contact, and mail.
    echo python -m http.server cannot run those files.
    echo.
    echo Install PHP and add it to PATH, or keep the bundled copy at:
    echo   .tools\php\php.exe
    pause
    exit /b 1
)

echo.
echo  Formas shop local server
echo  PHP:  %PHP%
echo  Root: %ROOT%
echo  URL:  http://127.0.0.1:%PORT%/index.html
echo.
echo  Leave this window open. Press Ctrl+C to stop.
echo.

start "" "http://127.0.0.1:%PORT%/index.html"
cd /d "%ROOT%"
"%PHP%" -S 127.0.0.1:%PORT%
echo.
echo Server stopped.
pause
