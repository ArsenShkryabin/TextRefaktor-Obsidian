@echo off
chcp 65001 >nul
echo ===========================================
echo   Выгрузка проекта на GitHub
echo ===========================================
echo.

echo [1/7] Инициализация Git...
git init
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось инициализировать Git
    pause
    exit /b 1
)
echo [OK] Git инициализирован
echo.

echo [2/7] Добавление remote репозитория...
git remote remove origin 2>nul
git remote add origin https://github.com/ArsenShkryabin/TextRefaktor-Obsidian.git
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Remote уже существует или ошибка
)
echo [OK] Remote добавлен
echo.

echo [3/7] Добавление файлов...
git add .
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось добавить файлы
    pause
    exit /b 1
)
echo [OK] Файлы добавлены
echo.

echo [4/7] Создание коммита...
git commit -m "Initial commit: Text Enhancer plugin v1.0.0 with all features"
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Возможно, нет изменений для коммита
)
echo [OK] Коммит создан
echo.

echo [5/7] Установка основной ветки...
git branch -M main
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Ветка уже main или ошибка
)
echo [OK] Ветка установлена
echo.

echo [6/7] Получение изменений с GitHub (если репозиторий не пустой)...
git pull origin main --allow-unrelated-histories --no-edit
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось получить изменения (возможно, репозиторий пустой)
)
echo [OK] Изменения получены
echo.

echo [7/7] Отправка на GitHub...
echo [ВНИМАНИЕ] Вам может потребоваться ввести логин и пароль GitHub
echo.
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Не удалось отправить на GitHub
    echo Возможные причины:
    echo - Неверные учетные данные
    echo - Нет доступа к репозиторию
    echo - Конфликты, которые нужно разрешить вручную
    echo.
    echo Попробуйте выполнить вручную:
    echo   git pull origin main --allow-unrelated-histories
    echo   git add .
    echo   git commit -m "Merge with remote"
    echo   git push -u origin main
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

