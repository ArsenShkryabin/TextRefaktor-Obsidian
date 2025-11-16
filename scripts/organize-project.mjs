import { renameSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('📁 Организация структуры проекта...\n');

// Создаем папки если их нет
if (!existsSync('docs')) mkdirSync('docs', { recursive: true });
if (!existsSync('scripts')) mkdirSync('scripts', { recursive: true });

// Файлы для перемещения в docs
const docsFiles = [
	'INSTALL_WINDOWS.md',
	'QUICKSTART.md',
	'ТЕСТИРОВАНИЕ.md',
	'ТЕСТИРОВАНИЕ_БЕЗ_API.md',
	'ИДЕИ_УЛУЧШЕНИЙ.md',
	'ОБНОВЛЕНИЕ.md',
	'БЫСТРОЕ_ОБНОВЛЕНИЕ.md',
	'ИСПРАВЛЕНИЕ_КОПИРОВАНИЯ.md',
	'НАЙТИ_ХРАНИЛИЩЕ.md',
	'ЧТО_КОПИРОВАТЬ.md',
	'СТРУКТУРА_ПРОЕКТА.md',
	'ARCHITECTURE.md',
	'CHANGELOG.md',
];

// Файлы для перемещения в scripts (уже там, но проверяем)
const scriptsFiles = [
	'copy-files.mjs',
	'copy-to-plugin.bat',
];

let moved = 0;

// Перемещаем файлы документации
for (const file of docsFiles) {
	if (existsSync(file) && !existsSync(join('docs', file))) {
		try {
			renameSync(file, join('docs', file));
			console.log(`✅ ${file} → docs/${file}`);
			moved++;
		} catch (error) {
			console.log(`⚠️  Не удалось переместить ${file}: ${error.message}`);
		}
	}
}

// Перемещаем скрипты (если они в корне)
for (const file of scriptsFiles) {
	if (existsSync(file) && !existsSync(join('scripts', file))) {
		try {
			renameSync(file, join('scripts', file));
			console.log(`✅ ${file} → scripts/${file}`);
			moved++;
		} catch (error) {
			console.log(`⚠️  Не удалось переместить ${file}: ${error.message}`);
		}
	}
}

console.log(`\n✅ Перемещено файлов: ${moved}`);
console.log('📁 Структура проекта организована!');

