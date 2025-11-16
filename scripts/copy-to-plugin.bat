@echo off
chcp 65001 >nul
echo ===========================================
echo   Копирование файлов плагина
echo ===========================================
echo.

if not exist "plugin-files" mkdir plugin-files

echo Копирование main.js...
if exist "main.js" (
    copy /Y main.js plugin-files\ >nul
    echo [OK] main.js скопирован
) else (
    echo [ОШИБКА] main.js не найден! Сначала выполните: npm run build
)

echo Копирование manifest.json...
copy /Y manifest.json plugin-files\ >nul
echo [OK] manifest.json скопирован

echo Копирование styles.css...
copy /Y styles.css plugin-files\ >nul
echo [OK] styles.css скопирован

echo.
echo ===========================================
echo   Готово!
echo ===========================================
echo.
echo Теперь скопируйте ВСЕ файлы из папки plugin-files
echo в .obsidian\plugins\text-enhancer\
echo.
pause

