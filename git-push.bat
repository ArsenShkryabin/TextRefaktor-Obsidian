@echo off
chcp 65001 >nul
echo ===========================================
echo   Выгрузка проекта на GitHub
echo ===========================================
echo.

echo [1/6] Инициализация Git...
git init
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось инициализировать Git
    pause
    exit /b 1
)
echo [OK] Git инициализирован
echo.

echo [2/6] Добавление remote репозитория...
git remote remove origin 2>nul
git remote add origin https://github.com/ArsenShkryabin/TextRefaktor-Obsidian.git
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Remote уже существует или ошибка
)
echo [OK] Remote добавлен
echo.

echo [3/6] Добавление файлов...
git add .
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось добавить файлы
    pause
    exit /b 1
)
echo [OK] Файлы добавлены
echo.

echo [4/6] Создание коммита...
git commit -m "Initial commit: Text Enhancer plugin v1.0.0 with all features"
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Возможно, нет изменений для коммита
)
echo [OK] Коммит создан
echo.

echo [5/6] Установка основной ветки...
git branch -M main
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Ветка уже main или ошибка
)
echo [OK] Ветка установлена
echo.

echo [6/6] Отправка на GitHub...
echo [ВНИМАНИЕ] Вам может потребоваться ввести логин и пароль GitHub
echo.
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Не удалось отправить на GitHub
    echo Возможные причины:
    echo - Репозиторий на GitHub не пустой (нужно сначала сделать pull)
    echo - Неверные учетные данные
    echo - Нет доступа к репозиторию
    echo.
    echo Попробуйте выполнить вручную:
    echo   git pull origin main --allow-unrelated-histories
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

