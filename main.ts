import { Plugin, Editor, Notice, MarkdownView, Menu } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, EnhancementMode, TextHistory, ChatSettings, Chat } from './src/types';
import { SettingsTab } from './src/settings/SettingsTab';
import { EnhancementModal } from './src/ui/EnhancementModal';
import { AIService } from './src/api/AIService';
import { ChatPanel, CHAT_VIEW_TYPE } from './src/ui/ChatPanel';

export default class TextEnhancerPlugin extends Plugin {
	settings: PluginSettings;
	private aiService: AIService;
	private textHistory: TextHistory | null = null;
	private chatSettings: ChatSettings = {
		chats: [],
		currentChatId: null,
		maxHistoryLength: 100
	};

	async onload() {
		await this.loadSettings();
		await this.loadChatSettings();
		this.aiService = new AIService(this.settings);

		// Регистрируем view для чата
		this.registerView(CHAT_VIEW_TYPE, (leaf) => {
			return new ChatPanel(
				leaf, 
				this.settings, 
				this.aiService,
				this.chatSettings,
				async (settings: ChatSettings) => {
					this.chatSettings = settings;
					await this.saveChatSettings();
				}
			);
		});

		// Добавляем вкладку настроек
		this.addSettingTab(new SettingsTab(this.app, this));

		// Добавляем иконку в ribbon (быстрый доступ)
		this.addRibbonIcon('sparkles', 'Улучшить текст', async (evt) => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view && view.editor) {
				// Показываем меню выбора режима
				const menu = new Menu();
				menu.addItem((item) => {
					item.setTitle('Исправить и структурировать');
					item.setIcon('edit');
					item.onClick(() => {
						this.enhanceText(view.editor, EnhancementMode.IMPROVE);
					});
				});
				menu.addItem((item) => {
					item.setTitle('Улучшить и дополнить');
					item.setIcon('plus-circle');
					item.onClick(() => {
						this.enhanceText(view.editor, EnhancementMode.ENHANCE);
					});
				});
				menu.showAtMouseEvent(evt);
			}
		});

		// Команда для улучшения текста (исправление и структурирование)
		this.addCommand({
			id: 'improve-text',
			name: 'Улучшить текст (исправить и структурировать)',
			icon: 'edit',
			editorCallback: (editor: Editor) => {
				this.enhanceText(editor, EnhancementMode.IMPROVE);
			},
		});

		// Команда для дополнения текста
		this.addCommand({
			id: 'enhance-text',
			name: 'Улучшить и дополнить текст',
			icon: 'plus-circle',
			editorCallback: (editor: Editor) => {
				this.enhanceText(editor, EnhancementMode.ENHANCE);
			},
		});

		// Горячие клавиши настраиваются пользователем через настройки Obsidian
		// Команды уже зарегистрированы выше через addCommand

		// Добавляем иконку для открытия чата
		this.addRibbonIcon('message-square', 'Открыть AI Чат', () => {
			this.openChatPanel();
		});

		// Команда для открытия чата
		this.addCommand({
			id: 'open-chat',
			name: 'Открыть AI Чат',
			icon: 'message-square',
			callback: () => {
				this.openChatPanel();
			},
		});

		console.log('Text Enhancer plugin loaded');
	}

	private async openChatPanel() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({ type: CHAT_VIEW_TYPE, active: true });
			} else {
				// Если нет правого листа, создаем новый
				leaf = workspace.getLeaf('split', 'vertical');
				await leaf.setViewState({ type: CHAT_VIEW_TYPE, active: true });
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	// Горячие клавиши настраиваются пользователем через стандартный интерфейс Obsidian
	// Команды уже зарегистрированы через addCommand выше
	// Пользователь может настроить горячие клавиши в: Настройки → Горячие клавиши → найти команды плагина

	private parseHotkey(hotkey: string): { modifiers: string[], key: string } | null {
		const parts = hotkey.split('+').map(p => p.trim());
		const modifiers: string[] = [];
		let key = '';

		for (const part of parts) {
			const normalized = part.toLowerCase();
			if (normalized === 'ctrl' || normalized === 'control') {
				modifiers.push('Mod');
			} else if (normalized === 'alt') {
				modifiers.push('Alt');
			} else if (normalized === 'shift') {
				modifiers.push('Shift');
			} else if (part) {
				// Нормализуем ключ - преобразуем русские буквы в английские коды
				key = this.normalizeKey(part);
			}
		}

		if (!key) return null;
		return { modifiers, key };
	}

	private normalizeKey(key: string): string {
		// Маппинг кириллических букв на латинские коды клавиш для Obsidian
		// Важно: Obsidian использует английские коды клавиш, даже если на клавиатуре русские символы
		const cyrillicToLatin: { [key: string]: string } = {
			'я': 'Z', 'Я': 'Z',  // Я на русской = Z на английской
			'ч': 'X', 'Ч': 'X',  // Ч на русской = X на английской
			'ю': 'Q', 'Ю': 'Q',  // Ю на русской = Q на английской
			'ж': 'J', 'Ж': 'J',  // Ж на русской = J на английской
			'э': 'E', 'Э': 'E',  // Э на русской = E на английской
			'ё': '`', 'Ё': '`',  // Ё на русской = ` на английской
			'х': '[', 'Х': '[',  // Х на русской = [ на английской
			'ъ': ']', 'Ъ': ']',  // Ъ на русской = ] на английской
			'б': ',', 'Б': ',',  // Б на русской = , на английской
			'ь': ';', 'Ь': ';',  // Ь на русской = ; на английской
		};
		
		// Если это кириллическая буква, преобразуем в английский код
		if (cyrillicToLatin[key]) {
			return cyrillicToLatin[key];
		}
		
		const lower = key.toLowerCase();
		
		// Латинские буквы - возвращаем в верхнем регистре
		if (lower.length === 1 && lower >= 'a' && lower <= 'z') {
			return key.toUpperCase(); // 'k' -> 'K', 'z' -> 'Z'
		}
		
		// Функциональные клавиши
		if (lower.startsWith('f') && /^f\d+$/.test(lower)) {
			return lower.toUpperCase(); // 'f1' -> 'F1'
		}
		
		// Специальные клавиши - возвращаем как есть
		return key;
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Обновляем AI сервис с новыми настройками
		this.aiService = new AIService(this.settings);
	}

	async onunload() {
		// Закрываем view чата
		this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);

		console.log('Text Enhancer plugin unloaded');
	}

	private async enhanceText(editor: Editor, mode: EnhancementMode) {
		let selectedText = editor.getSelection();
		
		// Если ничего не выделено, выделяем весь текст в документе
		if (!selectedText || selectedText.trim() === '') {
			const fullText = editor.getValue();
			if (fullText && fullText.trim() !== '') {
				// Выделяем весь текст
				const lineCount = editor.lineCount();
				editor.setSelection(
					{ line: 0, ch: 0 },
					{ line: lineCount - 1, ch: editor.getLine(lineCount - 1).length }
				);
				selectedText = editor.getSelection();
			} else {
				new Notice('Документ пуст. Нет текста для улучшения.');
				return;
			}
		}

		// Показываем уведомление о начале обработки
		const loadingText = this.settings.testMode || !this.settings.apiKey 
			? 'Обработка текста (тестовый режим)...' 
			: 'Обработка текста...';
		const loadingNotice = new Notice(loadingText, 0);

		try {
			// Обновляем сервис с актуальными настройками
			this.aiService = new AIService(this.settings);
			
			// Получаем улучшенный текст
			const enhancedText = await this.aiService.enhanceText(selectedText, mode);

			// Закрываем уведомление о загрузке
			loadingNotice.hide();

			// Сохраняем историю для отмены
			this.textHistory = {
				original: selectedText,
				enhanced: enhancedText,
				timestamp: Date.now(),
			};

			// Показываем модальное окно с результатом
			new EnhancementModal(
				this.app,
				selectedText,
				enhancedText,
				(text: string) => {
					// Применяем улучшенный текст
					editor.replaceSelection(text);
					new Notice('Текст успешно улучшен!');
					this.textHistory = null; // Очищаем историю после применения
				},
				() => {
					new Notice('Отменено');
				},
				() => {
					// Отмена - возвращаем оригинальный текст
					if (this.textHistory) {
						editor.replaceSelection(this.textHistory.original);
						new Notice('Изменения отменены');
						this.textHistory = null;
					}
				},
				this.textHistory
			).open();

		} catch (error) {
			loadingNotice.hide();
			const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
			new Notice(`Ошибка: ${errorMessage}`, 5000);
			console.error('Text enhancement error:', error);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async loadChatSettings() {
		const data = await this.loadData();
		if (data && data.chatSettings) {
			this.chatSettings = Object.assign({
				chats: [],
				currentChatId: null,
				maxHistoryLength: 100
			}, data.chatSettings);
		}
	}

	async saveChatSettings() {
		// Загружаем текущие данные, чтобы не перезаписать другие настройки
		const currentData = await this.loadData() || {};
		// Объединяем все настройки
		// Важно: создаем глубокую копию chatSettings, чтобы избежать проблем с ссылками
		const chatSettingsCopy = {
			chats: this.chatSettings.chats.map(chat => ({
				id: chat.id,
				title: chat.title,
				messages: chat.messages.map(msg => ({
					role: msg.role,
					content: msg.content,
					timestamp: msg.timestamp
				})),
				createdAt: chat.createdAt,
				updatedAt: chat.updatedAt
			})),
			currentChatId: this.chatSettings.currentChatId,
			maxHistoryLength: this.chatSettings.maxHistoryLength
		};
		
		const allData = Object.assign({}, currentData, this.settings, {
			chatSettings: chatSettingsCopy
		});
		await this.saveData(allData);
	}
}

