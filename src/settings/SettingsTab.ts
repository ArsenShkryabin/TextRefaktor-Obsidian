import { App, PluginSettingTab, Setting, Hotkey, Notice } from 'obsidian';
import TextEnhancerPlugin from '../../main';
import { PluginSettings } from '../types';
import { AIService } from '../api/AIService';

export class SettingsTab extends PluginSettingTab {
	plugin: TextEnhancerPlugin;

	constructor(app: App, plugin: TextEnhancerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Настройки Text Enhancer' });

		// API ключ
		new Setting(containerEl)
			.setName('API ключ')
			.setDesc('Введите ваш API ключ от OpenAI или другого провайдера')
			.addText((text) =>
				text
					.setPlaceholder('sk-...')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);

		// Провайдер API
		new Setting(containerEl)
			.setName('Провайдер API')
			.setDesc('Выберите провайдера AI')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('openai', 'OpenAI')
					.addOption('anthropic', 'Anthropic (Claude)')
					.addOption('custom', 'Custom API')
					.setValue(this.plugin.settings.apiProvider)
					.onChange(async (value: 'openai' | 'anthropic' | 'custom') => {
						this.plugin.settings.apiProvider = value;
						await this.plugin.saveSettings();
						this.display(); // Перерисовываем для показа/скрытия дополнительных настроек
					})
			);

		// URL API (для custom)
		if (this.plugin.settings.apiProvider === 'custom') {
			new Setting(containerEl)
				.setName('URL API')
				.setDesc('URL для вашего кастомного API')
				.addText((text) =>
					text
						.setPlaceholder('https://api.example.com/v1/chat')
						.setValue(this.plugin.settings.apiUrl || '')
						.onChange(async (value) => {
							this.plugin.settings.apiUrl = value;
							await this.plugin.saveSettings();
						})
				);
		}

		// Модель
		new Setting(containerEl)
			.setName('Модель')
			.setDesc('Название модели для использования')
			.addText((text) =>
				text
					.setPlaceholder('gpt-4o-mini')
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						await this.plugin.saveSettings();
					})
			);

		// Temperature
		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Креативность ответов (0.0 - 1.0). Низкие значения дают более предсказуемые результаты.')
			.addSlider((slider) =>
				slider
					.setLimits(0, 1, 0.1)
					.setValue(this.plugin.settings.temperature)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.temperature = value;
						await this.plugin.saveSettings();
					})
			);

		// Max tokens
		new Setting(containerEl)
			.setName('Максимум токенов')
			.setDesc('Максимальная длина ответа (в режиме "Качество" используется полностью, в других режимах может быть оптимизировано)')
			.addText((text) =>
				text
					.setPlaceholder('2000')
					.setValue(this.plugin.settings.maxTokens.toString())
					.onChange(async (value) => {
						const numValue = parseInt(value);
						if (!isNaN(numValue)) {
							this.plugin.settings.maxTokens = numValue;
							await this.plugin.saveSettings();
						}
					})
			);

		// Режим скорости
		new Setting(containerEl)
			.setName('Режим скорости')
			.setDesc('Выберите баланс между скоростью и качеством обработки')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('quality', 'Качество (медленнее, лучше)')
					.addOption('balanced', 'Баланс (рекомендуется)')
					.addOption('fast', 'Скорость (быстрее, короче)')
					.setValue(this.plugin.settings.speedMode)
					.onChange(async (value: 'quality' | 'balanced' | 'fast') => {
						this.plugin.settings.speedMode = value;
						await this.plugin.saveSettings();
					})
			);

		// Режим тестирования
		new Setting(containerEl)
			.setName('Режим тестирования')
			.setDesc('Включите для тестирования без API ключа. Показывает мок-данные вместо реальных ответов.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.testMode)
					.onChange(async (value) => {
						this.plugin.settings.testMode = value;
						await this.plugin.saveSettings();
					});
			});

		// Тест API
		new Setting(containerEl)
			.setName('Тест API')
			.setDesc(this.plugin.settings.testMode 
				? '⚠️ Тестовый режим активен - будет показан мок-ответ' 
				: 'Проверьте подключение к API')
			.addButton((button) => {
				button.setButtonText('Тестировать')
					.setCta()
					.onClick(async () => {
						button.setButtonText('Тестирование...');
						button.setDisabled(true);
						
						try {
							const aiService = new AIService(this.plugin.settings);
							await aiService.testAPI();
							if (this.plugin.settings.testMode || !this.plugin.settings.apiKey) {
								new Notice('✅ Тестовый режим: проверка прошла успешно!', 3000);
							} else {
								new Notice('✅ API ключ работает!', 3000);
							}
						} catch (error) {
							const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
							new Notice(`❌ Ошибка: ${errorMessage}`, 5000);
						} finally {
							button.setButtonText('Тестировать');
							button.setDisabled(false);
						}
					});
			});

		// Горячие клавиши
		containerEl.createEl('h3', { text: 'Горячие клавиши' });

		// Горячая клавиша для улучшения
		new Setting(containerEl)
			.setName('Улучшить текст (исправить и структурировать)')
			.setDesc('Нажмите сочетание клавиш для настройки')
			.addText((text) => {
				text.setPlaceholder('Нажмите клавиши...')
					.setValue(this.plugin.settings.hotkeyImprove);
				
				const hotkeySetting = text.inputEl;
				hotkeySetting.setAttribute('readonly', 'true');
				hotkeySetting.style.cursor = 'pointer';
				
				hotkeySetting.addEventListener('click', () => {
					hotkeySetting.focus();
				});
				
				hotkeySetting.addEventListener('keydown', (e) => {
					e.preventDefault();
					e.stopPropagation();
					const keys: string[] = [];
					if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
					if (e.altKey) keys.push('Alt');
					if (e.shiftKey) keys.push('Shift');
					
					// Получаем код клавиши для правильной обработки кириллицы
					const keyCode = e.code || e.key;
					let displayKey = e.key;
					
					// Маппинг кодов клавиш на отображаемые символы (для удобства пользователя)
					const keyMap: { [key: string]: string } = {
						'KeyZ': 'Я', 'KeyX': 'Ч', 'KeyQ': 'Ю',
						'KeyJ': 'Ж', 'KeyE': 'Э', 'Backquote': 'Ё',
						'BracketLeft': 'Х', 'BracketRight': 'Ъ',
						'Comma': 'Б', 'Period': 'Ю', 'Semicolon': 'Ь',
					};
					
					// Маппинг для сохранения (английские коды)
					const saveKeyMap: { [key: string]: string } = {
						'KeyZ': 'Z', 'KeyX': 'X', 'KeyQ': 'Q',
						'KeyJ': 'J', 'KeyE': 'E', 'Backquote': '`',
						'BracketLeft': '[', 'BracketRight': ']',
						'Comma': ',', 'Period': '.', 'Semicolon': ';',
					};
					
					// Если это кириллическая клавиша, используем отображаемый символ для UI
					if (keyMap[keyCode]) {
						displayKey = keyMap[keyCode];
					}
					
					// Но сохраняем английский код для Obsidian
					let saveKey = saveKeyMap[keyCode] || displayKey;
					
					if (keyCode && keyCode !== 'ControlLeft' && keyCode !== 'ControlRight' && 
					    keyCode !== 'AltLeft' && keyCode !== 'AltRight' && 
					    keyCode !== 'ShiftLeft' && keyCode !== 'ShiftRight' && 
					    keyCode !== 'MetaLeft' && keyCode !== 'MetaRight') {
						// Для отображения используем русские символы (если есть)
						keys.push(displayKey);
						const displayHotkey = keys.join('+');
						
						// Для сохранения используем английские коды
						const saveKeys = [...keys];
						saveKeys[saveKeys.length - 1] = saveKey; // Заменяем последний ключ на английский
						const saveHotkey = saveKeys.join('+');
						
						text.setValue(displayHotkey); // Показываем пользователю русские символы
						this.plugin.settings.hotkeyImprove = saveHotkey; // Сохраняем английские коды
						this.plugin.saveSettings();
						hotkeySetting.blur();
					}
				});
			})
			.addButton((button) => {
				button.setButtonText('Очистить')
					.onClick(async () => {
						this.plugin.settings.hotkeyImprove = '';
						this.display();
						await this.plugin.saveSettings();
					});
			})
			.addButton((button) => {
				button.setButtonText('Тест')
					.setCta()
					.onClick(() => {
						if (this.plugin.settings.hotkeyImprove) {
							new Notice(`Горячая клавиша: ${this.plugin.settings.hotkeyImprove}`, 2000);
						} else {
							new Notice('Горячая клавиша не настроена', 2000);
						}
					});
			});

		// Горячая клавиша для дополнения
		new Setting(containerEl)
			.setName('Улучшить и дополнить текст')
			.setDesc('Нажмите сочетание клавиш для настройки')
			.addText((text) => {
				text.setPlaceholder('Нажмите клавиши...')
					.setValue(this.plugin.settings.hotkeyEnhance);
				
				const hotkeySetting = text.inputEl;
				hotkeySetting.setAttribute('readonly', 'true');
				hotkeySetting.style.cursor = 'pointer';
				
				hotkeySetting.addEventListener('click', () => {
					hotkeySetting.focus();
				});
				
				hotkeySetting.addEventListener('keydown', (e) => {
					e.preventDefault();
					e.stopPropagation();
					const keys: string[] = [];
					if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
					if (e.altKey) keys.push('Alt');
					if (e.shiftKey) keys.push('Shift');
					
					// Получаем код клавиши для правильной обработки кириллицы
					const keyCode = e.code || e.key;
					let displayKey = e.key;
					
					// Маппинг кодов клавиш на отображаемые символы (для удобства пользователя)
					const keyMap: { [key: string]: string } = {
						'KeyZ': 'Я', 'KeyX': 'Ч', 'KeyQ': 'Ю',
						'KeyJ': 'Ж', 'KeyE': 'Э', 'Backquote': 'Ё',
						'BracketLeft': 'Х', 'BracketRight': 'Ъ',
						'Comma': 'Б', 'Period': 'Ю', 'Semicolon': 'Ь',
					};
					
					// Маппинг для сохранения (английские коды)
					const saveKeyMap: { [key: string]: string } = {
						'KeyZ': 'Z', 'KeyX': 'X', 'KeyQ': 'Q',
						'KeyJ': 'J', 'KeyE': 'E', 'Backquote': '`',
						'BracketLeft': '[', 'BracketRight': ']',
						'Comma': ',', 'Period': '.', 'Semicolon': ';',
					};
					
					// Если это кириллическая клавиша, используем отображаемый символ для UI
					if (keyMap[keyCode]) {
						displayKey = keyMap[keyCode];
					}
					
					// Но сохраняем английский код для Obsidian
					let saveKey = saveKeyMap[keyCode] || displayKey;
					
					if (keyCode && keyCode !== 'ControlLeft' && keyCode !== 'ControlRight' && 
					    keyCode !== 'AltLeft' && keyCode !== 'AltRight' && 
					    keyCode !== 'ShiftLeft' && keyCode !== 'ShiftRight' && 
					    keyCode !== 'MetaLeft' && keyCode !== 'MetaRight') {
						// Для отображения используем русские символы (если есть)
						keys.push(displayKey);
						const displayHotkey = keys.join('+');
						
						// Для сохранения используем английские коды
						const saveKeys = [...keys];
						saveKeys[saveKeys.length - 1] = saveKey; // Заменяем последний ключ на английский
						const saveHotkey = saveKeys.join('+');
						
						text.setValue(displayHotkey); // Показываем пользователю русские символы
						this.plugin.settings.hotkeyEnhance = saveHotkey; // Сохраняем английские коды
						this.plugin.saveSettings();
						hotkeySetting.blur();
					}
				});
			})
			.addButton((button) => {
				button.setButtonText('Очистить')
					.onClick(async () => {
						this.plugin.settings.hotkeyEnhance = '';
						this.display();
						await this.plugin.saveSettings();
					});
			})
			.addButton((button) => {
				button.setButtonText('Тест')
					.setCta()
					.onClick(() => {
						if (this.plugin.settings.hotkeyEnhance) {
							new Notice(`Горячая клавиша: ${this.plugin.settings.hotkeyEnhance}`, 2000);
						} else {
							new Notice('Горячая клавиша не настроена', 2000);
						}
					});
			});

		containerEl.createEl('p', {
			text: '💡 Совет: Нажмите на поле ввода и затем нажмите нужное сочетание клавиш',
			cls: 'setting-item-description',
		});

		// Пресеты стилей
		containerEl.createEl('h3', { text: 'Пресеты стилей' });

		new Setting(containerEl)
			.setName('Стиль текста')
			.setDesc('Выберите стиль для улучшения текста')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('default', 'По умолчанию')
					.addOption('formal', 'Формальный')
					.addOption('informal', 'Неформальный')
					.addOption('technical', 'Технический')
					.setValue(this.plugin.settings.selectedPreset)
					.onChange(async (value: 'default' | 'formal' | 'informal' | 'technical') => {
						this.plugin.settings.selectedPreset = value;
						await this.plugin.saveSettings();
					})
			);

		// Настраиваемые промпты
		containerEl.createEl('h3', { text: 'Настраиваемые промпты' });

		new Setting(containerEl)
			.setName('Использовать кастомные промпты')
			.setDesc('Включите для использования собственных промптов вместо стандартных')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.useCustomPrompts)
					.onChange(async (value) => {
						this.plugin.settings.useCustomPrompts = value;
						await this.plugin.saveSettings();
						this.display(); // Перерисовываем для показа/скрытия полей
					});
			});

		if (this.plugin.settings.useCustomPrompts) {
			// Промпт для улучшения
			new Setting(containerEl)
				.setName('Промпт для улучшения текста')
				.setDesc('Введите свой промпт. Используйте {text} для вставки текста (или просто добавьте текст в конец)')
				.addTextArea((text) => {
					text.setPlaceholder('Исправь ошибки и улучши структуру следующего текста:\n\n{text}')
						.setValue(this.plugin.settings.customPromptImprove)
						.inputEl.style.minHeight = '100px';
					text.onChange(async (value) => {
						this.plugin.settings.customPromptImprove = value;
						await this.plugin.saveSettings();
					});
				});

			// Промпт для дополнения
			new Setting(containerEl)
				.setName('Промпт для дополнения текста')
				.setDesc('Введите свой промпт. Используйте {text} для вставки текста (или просто добавьте текст в конец)')
				.addTextArea((text) => {
					text.setPlaceholder('Улучши и дополни следующий текст:\n\n{text}')
						.setValue(this.plugin.settings.customPromptEnhance)
						.inputEl.style.minHeight = '100px';
					text.onChange(async (value) => {
						this.plugin.settings.customPromptEnhance = value;
						await this.plugin.saveSettings();
					});
				});
		}
	}
}

