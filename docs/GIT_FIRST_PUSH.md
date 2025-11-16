# 🚀 Первая выгрузка на GitHub

## Быстрая инструкция

### 1. Проверьте, что Git инициализирован

```bash
git status
```

Если Git не инициализирован:
```bash
git init
```

### 2. Добавьте remote репозиторий

```bash
git remote add origin https://github.com/ArsenShkryabin/TextRefaktor-Obsidian.git
```

Если remote уже существует, обновите его:
```bash
git remote set-url origin https://github.com/ArsenShkryabin/TextRefaktor-Obsidian.git
```

### 3. Проверьте статус

```bash
git status
```

### 4. Добавьте все файлы

```bash
git add .
```

### 5. Создайте первый коммит

```bash
git commit -m "Initial commit: Text Enhancer plugin with all features"
```

### 6. Установите основную ветку

```bash
git branch -M main
```

### 7. Отправьте на GitHub

```bash
git push -u origin main
```

## Если возникли проблемы

### Если репозиторий на GitHub не пустой

Если на GitHub уже есть файлы (например, README.md), сначала получите их:

```bash
git pull origin main --allow-unrelated-histories
```

Затем разрешите конфликты (если есть) и снова:

```bash
git add .
git commit -m "Merge with remote repository"
git push -u origin main
```

### Если нужно обновить существующий репозиторий

```bash
git add .
git commit -m "Update: Added speed optimization and custom provider support"
git push
```

## Проверка

После успешной выгрузки проверьте:
- https://github.com/ArsenShkryabin/TextRefaktor-Obsidian
- Все файлы должны быть видны
- README.md должен отображаться

## Следующие шаги

1. Создайте релиз на GitHub (Releases → New release)
2. Добавьте описание изменений
3. Укажите версию (например, v1.0.0)

