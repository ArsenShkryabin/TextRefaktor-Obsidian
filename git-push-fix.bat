@echo off
chcp 65001 >nul
echo ===========================================
echo   Исправление: Pull и Push на GitHub
echo ===========================================
echo.

echo [1/4] Получение изменений с GitHub...
git pull origin main --allow-unrelated-histories --no-edit
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Возможны конфликты или репозиторий пустой
)
echo [OK] Изменения получены
echo.

echo [2/4] Добавление всех файлов...
git add .
echo [OK] Файлы добавлены
echo.

echo [3/4] Создание коммита слияния...
git commit -m "Merge with remote repository and add all plugin files"
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Возможно, нет изменений для коммита
)
echo [OK] Коммит создан
echo.

echo [4/4] Отправка на GitHub...
echo [ВНИМАНИЕ] Вам может потребоваться ввести логин и пароль GitHub
echo.
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Не удалось отправить на GitHub
    echo.
    echo Если есть конфликты, разрешите их вручную:
    echo   1. Откройте файлы с конфликтами
    echo   2. Разрешите конфликты
    echo   3. Выполните: git add .
    echo   4. Выполните: git commit -m "Resolve conflicts"
    echo   5. Выполните: git push -u origin main
    pause
    exit /b 1
)
echo.
echo ===========================================
echo   Успешно выгружено на GitHub!
echo ===========================================
echo.
echo Репозиторий: https://github.com/ArsenShkryabin/TextRefaktor-Obsidian
echo.
pause

