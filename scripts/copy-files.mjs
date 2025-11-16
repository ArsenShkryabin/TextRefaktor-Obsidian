import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const filesToCopy = ['main.js', 'manifest.json', 'styles.css'];
const targetDir = 'plugin-files';

console.log('📦 Копирование файлов в plugin-files...\n');

// Создаем папку если её нет
if (!existsSync(targetDir)) {
	mkdirSync(targetDir, { recursive: true });
	console.log(`✅ Создана папка ${targetDir}/\n`);
}

let copied = 0;
let errors = 0;

for (const file of filesToCopy) {
	try {
		if (existsSync(file)) {
			copyFileSync(file, join(targetDir, file));
			console.log(`✅ ${file} → ${targetDir}/${file}`);
			copied++;
		} else {
			console.log(`⚠️  ${file} не найден (пропущен)`);
			errors++;
		}
	} catch (error) {
		console.error(`❌ Ошибка при копировании ${file}:`, error.message);
		errors++;
	}
}

console.log('\n' + '='.repeat(40));
if (errors === 0 && copied === filesToCopy.length) {
	console.log('✅ Все файлы успешно скопированы!');
} else {
	console.log(`📊 Скопировано: ${copied}/${filesToCopy.length}`);
	if (errors > 0) {
		console.log(`⚠️  Пропущено: ${errors}`);
	}
}
console.log('='.repeat(40));

