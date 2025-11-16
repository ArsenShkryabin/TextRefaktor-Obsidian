# ⚡ Быстрая выгрузка на GitHub

## Команды для выполнения:

```bash
# 1. Инициализация (если еще не сделано)
git init

# 2. Добавление remote
git remote add origin https://github.com/ArsenShkryabin/TextRefaktor-Obsidian.git
# ИЛИ если уже есть:
git remote set-url origin https://github.com/ArsenShkryabin/TextRefaktor-Obsidian.git

# 3. Добавление всех файлов
git add .

# 4. Коммит
git commit -m "Initial commit: Text Enhancer plugin v1.0.0"

# 5. Установка основной ветки
git branch -M main

# 6. Отправка на GitHub
git push -u origin main
```

## Если репозиторий на GitHub не пустой:

```bash
git pull origin main --allow-unrelated-histories
# Разрешите конфликты, затем:
git add .
git commit -m "Merge with remote"
git push -u origin main
```

## Готово! ✅

Проверьте: https://github.com/ArsenShkryabin/TextRefaktor-Obsidian

