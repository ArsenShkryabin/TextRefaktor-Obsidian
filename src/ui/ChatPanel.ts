import { ItemView, WorkspaceLeaf } from 'obsidian';
import { PluginSettings, ChatSettings, Chat, ChatMessage } from '../types';
import { AIService } from '../api/AIService';

export const CHAT_VIEW_TYPE = 'text-enhancer-chat';

export class ChatPanel extends ItemView {
	private settings: PluginSettings;
	private aiService: AIService;
	private chatSettings: ChatSettings;
	private saveChatSettings: (settings: ChatSettings) => Promise<void>;
	
	// UI элементы
	private sidebarContainer: HTMLElement;
	private chatListContainer: HTMLElement;
	private messagesContainer: HTMLElement;
	private inputContainer: HTMLElement;
	private inputEl: HTMLTextAreaElement;
	private sendButton: HTMLButtonElement;
	private titleEl: HTMLElement;
	
	// Текущий чат
	private currentChat: Chat | null = null;
	private chatHistory: ChatMessage[] = [];
	private isStreaming: boolean = false;
	private isGeneratingTitle: boolean = false;

	constructor(
		leaf: WorkspaceLeaf, 
		settings: PluginSettings, 
		aiService: AIService,
		chatSettings: ChatSettings,
		saveChatSettings: (settings: ChatSettings) => Promise<void>
	) {
		super(leaf);
		this.settings = settings;
		this.aiService = aiService;
		this.chatSettings = chatSettings;
		this.saveChatSettings = saveChatSettings;
	}

	getViewType(): string {
		return CHAT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.currentChat?.title || 'AI Чат';
	}

	getIcon(): string {
		return 'message-square';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('text-enhancer-chat-container');

		// Основной контейнер с боковой панелью
		const mainContainer = container.createDiv('text-enhancer-chat-main');
		
		// Боковая панель со списком чатов
		this.sidebarContainer = mainContainer.createDiv('text-enhancer-chat-sidebar');
		this.renderChatList();

		// Основная область чата
		const chatArea = mainContainer.createDiv('text-enhancer-chat-area');
		
		// Заголовок чата
		const header = chatArea.createDiv('text-enhancer-chat-header');
		this.titleEl = header.createEl('h3', { text: '💬 Новый чат' });
		
		const headerActions = header.createDiv('text-enhancer-chat-header-actions');
		const newChatButton = headerActions.createEl('button', { 
			text: '➕ Новый чат',
			cls: 'mod-cta'
		});
		newChatButton.onclick = () => this.createNewChat();

		const clearButton = headerActions.createEl('button', { 
			text: '🗑️ Очистить',
			cls: 'mod-button'
		});
		clearButton.onclick = () => this.clearCurrentChat();

		// Контейнер сообщений
		this.messagesContainer = chatArea.createDiv('text-enhancer-chat-messages');
		this.messagesContainer.setAttribute('role', 'log');
		this.messagesContainer.setAttribute('aria-live', 'polite');

		// Контейнер ввода
		this.inputContainer = chatArea.createDiv('text-enhancer-chat-input-container');
		
		this.inputEl = this.inputContainer.createEl('textarea', {
			placeholder: 'Задайте вопрос AI... (Enter для отправки, Shift+Enter для новой строки)',
			cls: 'text-enhancer-chat-input'
		}) as HTMLTextAreaElement;
		this.inputEl.rows = 3;

		// Кнопка отправки
		const buttonContainer = this.inputContainer.createDiv('text-enhancer-chat-button-container');
		this.sendButton = buttonContainer.createEl('button', {
			text: 'Отправить',
			cls: 'mod-cta'
		}) as HTMLButtonElement;

		// Обработчики событий
		this.inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		});

		this.sendButton.onclick = () => this.sendMessage();

		// Убеждаемся, что поле ввода разблокировано при открытии
		this.isStreaming = false;
		this.inputEl.disabled = false;
		this.sendButton.disabled = false;

		// Загружаем текущий чат или создаем новый
		await this.loadCurrentChat();
	}

	async onClose() {
		// Сохраняем текущий чат при закрытии (БЕЗ обновления timestamp)
		await this.saveCurrentChat(false);
	}

	private renderChatList() {
		// Сохраняем ссылку на контейнер списка, если он уже существует
		const existingContainer = this.chatListContainer;
		
		// Очищаем только контейнер списка, а не весь sidebar
		if (existingContainer) {
			existingContainer.empty();
		} else {
			// Если контейнер не существует, создаем весь sidebar заново
			this.sidebarContainer.empty();
			
			const sidebarHeader = this.sidebarContainer.createDiv('text-enhancer-chat-sidebar-header');
			sidebarHeader.createEl('h4', { text: '💬 Чаты' });
			
			const newChatBtn = sidebarHeader.createEl('button', {
				text: '➕',
				cls: 'text-enhancer-chat-new-btn',
				attr: { title: 'Создать новый чат' }
			});
			newChatBtn.onclick = () => this.createNewChat();

			this.chatListContainer = this.sidebarContainer.createDiv('text-enhancer-chat-list');
		}

		// Получаем актуальный currentChatId (может быть обновлен после переключения)
		const currentChatId = this.chatSettings.currentChatId || this.currentChat?.id;

		// Сортируем чаты по дате обновления (новые сверху)
		const sortedChats = [...this.chatSettings.chats].sort((a, b) => b.updatedAt - a.updatedAt);

		if (sortedChats.length === 0) {
			const emptyState = this.chatListContainer.createDiv('text-enhancer-chat-empty');
			emptyState.textContent = 'Нет сохраненных чатов';
		} else {
			sortedChats.forEach(chat => {
				const chatItem = this.chatListContainer.createDiv('text-enhancer-chat-item');
				
				// Проверяем, является ли этот чат активным
				const isActive = chat.id === currentChatId;
				if (isActive) {
					chatItem.addClass('is-active');
				} else {
					chatItem.removeClass('is-active');
				}

				// Обработчик клика на весь элемент чата
				chatItem.onclick = (e) => {
					// Если клик был на кнопке удаления, не переключаем чат
					if ((e.target as HTMLElement).closest('.text-enhancer-chat-item-delete')) {
						return;
					}
					this.switchToChat(chat.id);
				};

				const chatTitle = chatItem.createDiv('text-enhancer-chat-item-title');
				chatTitle.textContent = chat.title || 'Без названия';

				const chatActions = chatItem.createDiv('text-enhancer-chat-item-actions');
				const deleteBtn = chatActions.createEl('button', {
					text: '🗑️',
					cls: 'text-enhancer-chat-item-delete',
					attr: { title: 'Удалить чат' }
				});
				deleteBtn.onclick = (e) => {
					e.stopPropagation();
					this.deleteChat(chat.id);
				};
			});
		}
	}

	private async loadCurrentChat() {
		// Сбрасываем состояние streaming
		this.isStreaming = false;
		
		// Принудительно разблокируем поле ввода
		if (this.inputEl) {
			this.inputEl.disabled = false;
		}
		if (this.sendButton) {
			this.sendButton.disabled = false;
		}

		// Если есть текущий чат, загружаем его
		if (this.chatSettings.currentChatId) {
			const chat = this.chatSettings.chats.find(c => c.id === this.chatSettings.currentChatId);
			if (chat) {
				this.currentChat = chat;
				this.chatHistory = [...chat.messages];
				if (this.titleEl) {
					this.titleEl.textContent = chat.title || '💬 Чат';
				}
				this.renderMessages();
				// Убеждаемся, что поле ввода доступно
				if (this.inputEl) {
					this.inputEl.disabled = false;
				}
				if (this.sendButton) {
					this.sendButton.disabled = false;
				}
				return;
			}
		}

		// Если нет текущего чата, создаем новый
		await this.createNewChat();
	}

	private async createNewChat() {
		// Сохраняем предыдущий чат перед созданием нового (БЕЗ обновления timestamp)
		await this.saveCurrentChat(false);

		// Сбрасываем состояние streaming ПЕРЕД всеми операциями
		this.isStreaming = false;
		
		// Сразу разблокируем поле ввода
		if (this.inputEl) {
			this.inputEl.disabled = false;
		}
		if (this.sendButton) {
			this.sendButton.disabled = false;
		}

		// Очищаем историю и контейнер сообщений ПЕРЕД созданием нового чата
		this.chatHistory = [];
		if (this.messagesContainer) {
			this.messagesContainer.empty();
		}

		// Создаем новый чат с текущим временем для правильной сортировки
		const now = Date.now();
		const newChat: Chat = {
			id: `chat-${now}`,
			title: 'Новый чат',
			messages: [],
			createdAt: now,
			updatedAt: now // Устанавливаем максимальное время для сортировки сверху
		};

		// Добавляем новый чат в начало массива (чтобы он был сверху)
		this.chatSettings.chats.unshift(newChat);
		this.chatSettings.currentChatId = newChat.id;
		this.currentChat = newChat;
		
		// Сохраняем настройки
		await this.saveChatSettings(this.chatSettings);
		
		// Обновляем UI
		this.renderChatList();
		if (this.titleEl) {
			this.titleEl.textContent = '💬 Новый чат';
		}
		
		// Добавляем приветственное сообщение
		const welcomeMessage: ChatMessage = {
			role: 'assistant',
			content: 'Привет! Я AI-ассистент. Задайте мне вопрос, и я помогу вам с подсказками и советами. 💡',
			timestamp: now
		};
		this.chatHistory.push(welcomeMessage);
		this.renderMessage(welcomeMessage.role, welcomeMessage.content, 0);
		
		// Сохраняем чат с приветственным сообщением (с обновлением timestamp, так как это новое сообщение)
		await this.saveCurrentChat(true);
		
		// Обновляем список чатов после сохранения (чтобы выделить новый чат)
		this.renderChatList();
		
		// Убеждаемся, что поле ввода доступно и в фокусе (после всех операций)
		if (this.inputEl) {
			this.inputEl.disabled = false;
			this.inputEl.focus();
		}
		if (this.sendButton) {
			this.sendButton.disabled = false;
		}
	}

	private async switchToChat(chatId: string) {
		// Если уже переключены на этот чат, ничего не делаем
		if (this.chatSettings.currentChatId === chatId && this.currentChat?.id === chatId) {
			return;
		}

		// Сохраняем текущий чат перед переключением (БЕЗ обновления timestamp)
		await this.saveCurrentChat(false);

		// Сбрасываем состояние streaming
		this.isStreaming = false;
		this.sendButton.disabled = false;
		this.inputEl.disabled = false;

		// Переключаемся на выбранный чат
		const chat = this.chatSettings.chats.find(c => c.id === chatId);
		if (chat) {
			// Очищаем контейнер сообщений перед загрузкой нового чата
			this.messagesContainer.empty();
			
			// Загружаем сообщения из сохраненного чата (создаем новый массив, чтобы избежать ссылок)
			this.chatHistory = chat.messages.map(msg => ({
				role: msg.role,
				content: msg.content,
				timestamp: msg.timestamp
			}));
			
			// Обновляем currentChatId ПЕРЕД сохранением и рендерингом
			this.chatSettings.currentChatId = chatId;
			this.currentChat = chat;
			this.titleEl.textContent = chat.title || '💬 Чат';
			
			// Сохраняем настройки
			await this.saveChatSettings(this.chatSettings);
			
			// Обновляем список чатов (чтобы выделить активный)
			this.renderChatList();
			
			// Рендерим сообщения
			this.renderMessages();
			
			// Убеждаемся, что поле ввода доступно и в фокусе
			this.inputEl.disabled = false;
			this.sendButton.disabled = false;
			this.inputEl.focus();
		} else {
			console.error('Чат не найден:', chatId);
		}
	}

	private async deleteChat(chatId: string) {
		if (!confirm('Вы уверены, что хотите удалить этот чат?')) {
			return;
		}

		// Сбрасываем состояние streaming перед удалением
		this.isStreaming = false;
		if (this.inputEl) {
			this.inputEl.disabled = false;
		}
		if (this.sendButton) {
			this.sendButton.disabled = false;
		}

		// Удаляем чат из списка (создаем новый массив, чтобы избежать проблем с ссылками)
		const filteredChats = this.chatSettings.chats.filter(c => c.id !== chatId);
		
		// Проверяем, что чат действительно удален
		if (filteredChats.length === this.chatSettings.chats.length) {
			console.error('Чат не был удален из списка:', chatId);
			return;
		}

		// Обновляем список чатов
		this.chatSettings.chats = filteredChats;

		// Если удаляемый чат был текущим, переключаемся на другой или создаем новый
		if (this.chatSettings.currentChatId === chatId) {
			this.currentChat = null;
			if (this.chatSettings.chats.length > 0) {
				// Переключаемся на первый чат из отсортированного списка
				const sortedChats = [...this.chatSettings.chats].sort((a, b) => b.updatedAt - a.updatedAt);
				await this.switchToChat(sortedChats[0].id);
			} else {
				this.chatSettings.currentChatId = null;
				this.currentChat = null;
				this.chatHistory = [];
				if (this.messagesContainer) {
					this.messagesContainer.empty();
				}
				await this.saveChatSettings(this.chatSettings);
				await this.createNewChat();
			}
		}

		// Сохраняем изменения
		await this.saveChatSettings(this.chatSettings);
		this.renderChatList();
		
		// Убеждаемся, что поле ввода разблокировано после удаления
		if (this.inputEl) {
			this.inputEl.disabled = false;
		}
		if (this.sendButton) {
			this.sendButton.disabled = false;
		}
	}

	private async saveCurrentChat(updateTimestamp: boolean = true) {
		if (!this.currentChat) return;

		// Создаем копию сообщений, чтобы избежать дублирования
		const messagesCopy = this.chatHistory.map(msg => ({
			role: msg.role,
			content: msg.content,
			timestamp: msg.timestamp
		}));

		// Проверяем, были ли реальные изменения
		const chatIndex = this.chatSettings.chats.findIndex(c => c.id === this.currentChat!.id);
		const existingChat = chatIndex >= 0 ? this.chatSettings.chats[chatIndex] : null;
		
		// Проверяем изменения: количество сообщений, содержимое, заголовок
		const hasRealChanges = !existingChat || 
			existingChat.messages.length !== messagesCopy.length ||
			existingChat.title !== this.currentChat.title ||
			JSON.stringify(existingChat.messages) !== JSON.stringify(messagesCopy);

		// Обновляем updatedAt только если:
		// 1. Явно запрошено обновление (updateTimestamp = true)
		// 2. И были реальные изменения (hasRealChanges = true)
		const shouldUpdateTimestamp = updateTimestamp && hasRealChanges;
		const newUpdatedAt = shouldUpdateTimestamp 
			? Date.now() 
			: (existingChat?.updatedAt || this.currentChat.updatedAt || this.currentChat.createdAt);

		// Обновляем чат в списке
		if (chatIndex >= 0) {
			this.chatSettings.chats[chatIndex] = {
				...this.currentChat,
				messages: messagesCopy,
				updatedAt: newUpdatedAt
			};
			// Также обновляем текущий чат
			this.currentChat.messages = messagesCopy;
			this.currentChat.updatedAt = newUpdatedAt;
		} else {
			// Если чат не найден, добавляем его
			const newChat = {
				...this.currentChat,
				messages: messagesCopy,
				updatedAt: newUpdatedAt
			};
			this.chatSettings.chats.push(newChat);
			this.currentChat = newChat;
		}

		await this.saveChatSettings(this.chatSettings);
	}

	private async clearCurrentChat() {
		if (!this.currentChat) return;

		if (!confirm('Вы уверены, что хотите очистить этот чат? Все сообщения будут удалены.')) {
			return;
		}

		// Сбрасываем состояние streaming
		this.isStreaming = false;
		this.sendButton.disabled = false;
		this.inputEl.disabled = false;

		// Полностью очищаем историю и контейнер
		this.chatHistory = [];
		this.messagesContainer.empty();
		
		// Добавляем сообщение об очистке (создаем новое сообщение и добавляем в историю)
		const clearMessage: ChatMessage = {
			role: 'assistant',
			content: 'История очищена. Задайте новый вопрос! 💡',
			timestamp: Date.now()
		};
		this.chatHistory.push(clearMessage);
		this.renderMessage(clearMessage.role, clearMessage.content, 0);
		
		// Сохраняем очищенный чат
		await this.saveCurrentChat();
		
		// Убеждаемся, что поле ввода доступно
		this.inputEl.disabled = false;
		this.sendButton.disabled = false;
	}

	private renderMessages() {
		this.messagesContainer.empty();
		this.chatHistory.forEach((msg, index) => {
			this.renderMessage(msg.role, msg.content, index);
		});
		this.scrollToBottom();
	}

	private renderMessage(role: 'user' | 'assistant', content: string, messageIndex: number) {
		const messageDiv = this.messagesContainer.createDiv(`text-enhancer-chat-message text-enhancer-chat-message-${role}`);
		
		// Сохраняем индекс в data-атрибуте для редактирования (для пользовательских сообщений)
		if (role === 'user') {
			messageDiv.setAttribute('data-message-index', messageIndex.toString());
		}
		
		const messageHeader = messageDiv.createDiv('text-enhancer-chat-message-header');
		const headerLeft = messageHeader.createDiv('text-enhancer-chat-header-left');
		headerLeft.createEl('strong', { text: role === 'user' ? 'Вы' : 'AI' });
		headerLeft.createEl('span', { 
			text: new Date(this.chatHistory[messageIndex].timestamp).toLocaleTimeString(),
			cls: 'text-enhancer-chat-timestamp'
		});

		// Кнопки действий
		const actionsContainer = messageHeader.createDiv('text-enhancer-chat-message-actions');
		
		// Кнопка копирования (для всех сообщений)
		const copyButton = actionsContainer.createEl('button', {
			text: '📋',
			cls: 'text-enhancer-chat-action-button',
			attr: { 'aria-label': 'Копировать сообщение', title: 'Копировать сообщение' }
		});
		copyButton.onclick = () => {
			// Извлекаем текстовое содержимое из элемента сообщения
			const messageContentEl = messageDiv.querySelector('.text-enhancer-chat-message-content');
			const textToCopy = messageContentEl ? messageContentEl.textContent || content : content;
			this.copyMessage(textToCopy);
		};

		// Кнопка редактирования (только для пользовательских сообщений)
		if (role === 'user') {
			const editButton = actionsContainer.createEl('button', {
				text: '✏️',
				cls: 'text-enhancer-chat-action-button',
				attr: { 'aria-label': 'Редактировать сообщение', title: 'Редактировать сообщение' }
			});
			editButton.onclick = () => {
				this.editMessage(messageDiv, messageIndex, content);
			};
		}

		const messageContent = messageDiv.createDiv('text-enhancer-chat-message-content');
		const contentDiv = messageContent.createEl('div', { text: content });
		contentDiv.addClass('text-enhancer-chat-text');
	}

	private addMessage(role: 'user' | 'assistant', content: string, isStreaming: boolean = false, messageIndex?: number): { messageContent: HTMLDivElement; textSpan: HTMLSpanElement; cursor: HTMLSpanElement } | undefined {
		const messageDiv = this.messagesContainer.createDiv(`text-enhancer-chat-message text-enhancer-chat-message-${role}`);
		
		// Сохраняем в историю (для не-streaming сообщений)
		let historyIndex = -1;
		if (!isStreaming) {
			historyIndex = this.chatHistory.push({
				role,
				content,
				timestamp: Date.now()
			}) - 1;

			// Сохраняем индекс в data-атрибуте для редактирования (для пользовательских сообщений)
			if (role === 'user') {
				messageDiv.setAttribute('data-message-index', historyIndex.toString());
			}
		}
		
		const messageHeader = messageDiv.createDiv('text-enhancer-chat-message-header');
		const headerLeft = messageHeader.createDiv('text-enhancer-chat-header-left');
		headerLeft.createEl('strong', { text: role === 'user' ? 'Вы' : 'AI' });
		headerLeft.createEl('span', { 
			text: new Date().toLocaleTimeString(),
			cls: 'text-enhancer-chat-timestamp'
		});

		// Кнопки действий
		const actionsContainer = messageHeader.createDiv('text-enhancer-chat-message-actions');
		
		// Кнопка копирования (для всех сообщений)
		const copyButton = actionsContainer.createEl('button', {
			text: '📋',
			cls: 'text-enhancer-chat-action-button',
			attr: { 'aria-label': 'Копировать сообщение', title: 'Копировать сообщение' }
		});
		copyButton.onclick = () => {
			// Извлекаем текстовое содержимое из элемента сообщения
			const messageContentEl = messageDiv.querySelector('.text-enhancer-chat-message-content');
			const textToCopy = messageContentEl ? messageContentEl.textContent || content : content;
			this.copyMessage(textToCopy);
		};

		// Кнопка редактирования (только для пользовательских сообщений)
		if (role === 'user' && !isStreaming && historyIndex >= 0) {
			const editButton = actionsContainer.createEl('button', {
				text: '✏️',
				cls: 'text-enhancer-chat-action-button',
				attr: { 'aria-label': 'Редактировать сообщение', title: 'Редактировать сообщение' }
			});
			editButton.onclick = () => {
				this.editMessage(messageDiv, historyIndex, content);
			};
		}

		const messageContent = messageDiv.createDiv('text-enhancer-chat-message-content');
		
		if (isStreaming) {
			messageContent.addClass('text-enhancer-chat-streaming');
			const textSpan = messageContent.createSpan({ text: content, cls: 'text-enhancer-chat-text' });
			const cursor = messageContent.createSpan({ text: '▊', cls: 'text-enhancer-chat-cursor' });
			return { messageContent, textSpan, cursor };
		} else {
			const contentDiv = messageContent.createEl('div', { text: content });
			contentDiv.addClass('text-enhancer-chat-text');
		}

		// Прокрутка вниз
		this.scrollToBottom();
		
		return undefined;
	}

	private updateStreamingMessage(textSpan: HTMLSpanElement, newContent: string) {
		requestAnimationFrame(() => {
			textSpan.textContent = newContent;
			this.scrollToBottom();
		});
	}

	private finishStreaming(messageContent: HTMLDivElement, textSpan: HTMLSpanElement, cursor: HTMLSpanElement, finalContent: string) {
		messageContent.removeClass('text-enhancer-chat-streaming');
		textSpan.textContent = finalContent;
		cursor.remove();

		// Сохраняем в историю
		this.chatHistory.push({
			role: 'assistant',
			content: finalContent,
			timestamp: Date.now()
		});

		// Разблокируем ввод (принудительно)
		this.isStreaming = false;
		if (this.sendButton) {
			this.sendButton.disabled = false;
		}
		if (this.inputEl) {
			this.inputEl.disabled = false;
		}

		// Сохраняем чат
		this.saveCurrentChat();

		// Генерируем заголовок, если это первое сообщение пользователя
		if (!this.isGeneratingTitle && this.currentChat && this.currentChat.title === 'Новый чат') {
			const userMessages = this.chatHistory.filter(m => m.role === 'user');
			if (userMessages.length === 1) {
				this.generateChatTitle(userMessages[0].content);
			}
		}

		this.scrollToBottom();
	}

	private async generateChatTitle(firstUserMessage: string) {
		if (this.isGeneratingTitle || !this.currentChat) return;
		
		this.isGeneratingTitle = true;

		try {
			// Генерируем заголовок через AI
			const titlePrompt = `Создай короткий заголовок (максимум 5-7 слов) для этого чата на основе первого сообщения пользователя. Заголовок должен быть на русском языке и отражать суть вопроса. Ответь только заголовком, без дополнительных объяснений.\n\nПервое сообщение: "${firstUserMessage}"`;

			let generatedTitle = 'Новый чат';

			if (this.settings.testMode || !this.settings.apiKey) {
				// В тестовом режиме используем упрощенный заголовок
				generatedTitle = firstUserMessage.slice(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
			} else {
				const apiUrl = this.settings.apiProvider === 'custom' 
					? this.settings.apiUrl 
					: (this.settings.apiUrl || 'https://api.openai.com/v1/chat/completions');

				const response = await fetch(apiUrl!, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.settings.apiKey}`,
					},
					body: JSON.stringify({
						model: this.settings.model,
						messages: [
							{
								role: 'user',
								content: titlePrompt,
							},
						],
						temperature: 0.7,
						max_tokens: 50,
					}),
				});

				if (response.ok) {
					const data = await response.json();
					const title = data.choices[0]?.message?.content?.trim();
					if (title) {
						// Убираем кавычки, если они есть
						generatedTitle = title.replace(/^["']|["']$/g, '').trim();
						if (generatedTitle.length > 50) {
							generatedTitle = generatedTitle.slice(0, 50) + '...';
						}
					}
				}
			}

			// Обновляем заголовок
			if (this.currentChat) {
				this.currentChat.title = generatedTitle;
				this.titleEl.textContent = `💬 ${generatedTitle}`;
				await this.saveCurrentChat();
				this.renderChatList();
			}
		} catch (error) {
			console.error('Ошибка генерации заголовка:', error);
		} finally {
			this.isGeneratingTitle = false;
		}
	}

	private scrollToBottom() {
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private async sendMessage() {
		const message = this.inputEl.value.trim();
		if (!message || this.isStreaming) return;

		// Если нет текущего чата, создаем новый
		if (!this.currentChat) {
			await this.createNewChat();
		}

		// Очищаем поле ввода
		this.inputEl.value = '';
		this.inputEl.style.height = 'auto';

		// Добавляем сообщение пользователя
		this.addMessage('user', message);

		// Сохраняем чат
		await this.saveCurrentChat();

		// Блокируем ввод
		this.isStreaming = true;
		if (this.sendButton) {
			this.sendButton.disabled = true;
		}
		if (this.inputEl) {
			this.inputEl.disabled = true;
		}

		// Добавляем сообщение ассистента (streaming)
		const streamingResult = this.addMessage('assistant', '', true);
		
		if (!streamingResult) {
			this.isStreaming = false;
			if (this.sendButton) {
				this.sendButton.disabled = false;
			}
			if (this.inputEl) {
				this.inputEl.disabled = false;
			}
			return;
		}

		const { messageContent, textSpan, cursor } = streamingResult;

		try {
			// Отправляем запрос с streaming
			await this.streamResponse(message, (chunk: string, isComplete: boolean) => {
				if (isComplete) {
					this.finishStreaming(messageContent, textSpan, cursor, chunk);
				} else {
					this.updateStreamingMessage(textSpan, chunk);
				}
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
			this.finishStreaming(messageContent, textSpan, cursor, `Ошибка: ${errorMessage}`);
		} finally {
			// Убеждаемся, что поле ввода разблокировано даже при ошибке
			this.isStreaming = false;
			if (this.sendButton) {
				this.sendButton.disabled = false;
			}
			if (this.inputEl) {
				this.inputEl.disabled = false;
			}
		}
	}

	private async streamResponse(prompt: string, onChunk: (chunk: string, isComplete: boolean) => void) {
		if (this.settings.testMode || !this.settings.apiKey) {
			const mockResponse = 'Это тестовый ответ. В тестовом режиме AI отвечает с эффектом печати. Для реальных ответов настройте API ключ в настройках плагина. 💡';
			let currentText = '';
			const chunkSize = 2;
			for (let i = 0; i < mockResponse.length; i += chunkSize) {
				currentText += mockResponse.slice(i, i + chunkSize);
				await new Promise(resolve => {
					requestAnimationFrame(() => {
						onChunk(currentText, false);
						setTimeout(resolve, 10);
					});
				});
			}
			onChunk(mockResponse, true);
			return;
		}

		// Ollama не поддерживает streaming, используем обычный запрос
		if (this.settings.apiProvider === 'ollama') {
			let apiUrl = '';
			try {
				// Нормализуем URL
				const normalizeApiUrl = (url: string | undefined, provider: string): string => {
					if (!url) {
						throw new Error('Для Ollama необходимо указать URL');
					}
					url = url.trim().replace(/\/$/, '');
					if (!url.includes('/chat/completions')) {
						if (url.endsWith('/v1')) {
							url = url + '/chat/completions';
						} else if (!url.includes('/v1/')) {
							url = url + '/v1/chat/completions';
						} else {
							url = url + '/chat/completions';
						}
					}
					return url;
				};

				apiUrl = normalizeApiUrl(this.settings.apiUrl, this.settings.apiProvider);
				
				const historyMessages = this.chatHistory.slice(-10).map(msg => ({
					role: msg.role,
					content: msg.content
				}));
				
				const lastMessage = historyMessages[historyMessages.length - 1];
				const messages = lastMessage && lastMessage.role === 'user' && lastMessage.content === prompt
					? historyMessages
					: [...historyMessages, { role: 'user' as const, content: prompt }];

				console.debug('Ollama: Отправка обычного запроса (без streaming)', {
					originalUrl: this.settings.apiUrl,
					normalizedUrl: apiUrl,
					model: this.settings.model,
					hasKey: !!this.settings.apiKey,
					keyLength: this.settings.apiKey?.length || 0
				});

				const requestBody = {
					model: this.settings.model,
					messages,
					temperature: this.settings.temperature,
					max_tokens: this.settings.maxTokens,
				};

				console.debug('Ollama: Тело запроса', requestBody);

				const response = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.settings.apiKey}`,
					},
					body: JSON.stringify(requestBody),
				});

				if (!response.ok) {
					const errorText = await response.text();
					let error;
					try {
						error = JSON.parse(errorText);
					} catch {
						error = { error: { message: errorText || 'Неизвестная ошибка' } };
					}
					throw new Error(`Ошибка API (${response.status}): ${error.error?.message || error.message || response.statusText}`);
				}

				const data = await response.json();
				
				// Извлекаем ответ из разных форматов
				let content = '';
				if (data.choices && data.choices[0]?.message?.content) {
					content = data.choices[0].message.content;
				} else if (data.content) {
					content = data.content;
				} else if (data.text) {
					content = data.text;
				} else {
					throw new Error('Неожиданный формат ответа от Ollama API');
				}

				// Имитируем streaming для лучшего UX
				let currentText = '';
				const chunkSize = 3;
				for (let i = 0; i < content.length; i += chunkSize) {
					currentText = content.slice(0, i + chunkSize);
					await new Promise(resolve => {
						requestAnimationFrame(() => {
							onChunk(currentText, false);
							setTimeout(resolve, 15);
						});
					});
				}
				onChunk(content, true);
				return;
			} catch (error) {
				console.error('Ошибка Ollama API:', error);
				console.error('Детали ошибки:', {
					originalUrl: this.settings.apiUrl,
					normalizedUrl: apiUrl,
					errorType: error instanceof TypeError ? 'TypeError' : error instanceof Error ? 'Error' : 'Unknown',
					errorMessage: error instanceof Error ? error.message : String(error),
					errorStack: error instanceof Error ? error.stack : undefined
				});
				
				const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
				
				// Более детальные сообщения об ошибках
				if (error instanceof TypeError && error.message.includes('fetch')) {
					const errorMsg = error.message.toLowerCase();
					const isCorsError = errorMsg.includes('cors') || errorMsg.includes('access-control');
					const isConnectionRefused = errorMsg.includes('connection_refused') || errorMsg.includes('failed to fetch') || errorMsg.includes('networkerror');
					
					if (isCorsError) {
						throw new Error(`Ошибка CORS: Сервер блокирует запросы из Obsidian.\n\n🔧 РЕШЕНИЕ:\n1. Настройте CORS на сервере Ollama, добавив заголовки:\n   Access-Control-Allow-Origin: *\n   Access-Control-Allow-Methods: POST, OPTIONS\n   Access-Control-Allow-Headers: Content-Type, Authorization\n\n2. Или используйте локальный прокси/сервер\n\n3. Или используйте localhost вместо удаленного IP\n\nURL: ${apiUrl}\nИсходный URL: ${this.settings.apiUrl}`);
					}
					
					if (isConnectionRefused) {
						throw new Error(`Ошибка подключения: Сервер недоступен (ERR_CONNECTION_REFUSED).\n\n🔧 ПРОВЕРЬТЕ:\n1. Запущен ли сервер Ollama на ${this.settings.apiUrl?.replace('/v1', '') || '77.221.213.237:8000'}\n2. Доступен ли сервер из сети (проверьте в браузере или PowerShell)\n3. Не заблокирован ли порт файрволом\n4. Правильность IP-адреса и порта\n\n💡 Для проверки выполните в PowerShell:\n   Test-NetConnection -ComputerName 77.221.213.237 -Port 8000\n\nURL: ${apiUrl}\nИсходный URL: ${this.settings.apiUrl}`);
					}
					
					throw new Error(`Ошибка подключения к Ollama: Не удалось подключиться к ${apiUrl}.\n\nПроверьте:\n1. Правильность URL (должен быть: http://77.221.213.237:8000/v1)\n2. Доступность сервера\n3. Настройки CORS на сервере\n4. Сетевое подключение\n\nИсходный URL: ${this.settings.apiUrl}`);
				}
				
				throw new Error(`Ошибка Ollama API: ${errorMessage}`);
			}
		}

		// Нормализуем URL (добавляем /chat/completions если нужно)
		const normalizeApiUrl = (url: string | undefined, provider: string): string => {
			if (!url) {
				if (provider === 'ollama') {
					throw new Error('Для Ollama необходимо указать URL. Например: http://localhost:11434/v1');
				}
				return 'https://api.openai.com/v1/chat/completions';
			}

			// Убираем завершающий слэш
			url = url.trim().replace(/\/$/, '');

			// Если URL не содержит /chat/completions, добавляем его
			if (!url.includes('/chat/completions')) {
				// Если URL заканчивается на /v1, добавляем /chat/completions
				if (url.endsWith('/v1')) {
					url = url + '/chat/completions';
				} else if (!url.includes('/v1/')) {
					// Если нет /v1/, добавляем /v1/chat/completions
					url = url + '/v1/chat/completions';
				} else {
					// Если есть /v1/, но нет /chat/completions, добавляем
					url = url + '/chat/completions';
				}
			}

			return url;
		};

		const apiUrl = normalizeApiUrl(
			this.settings.apiUrl,
			this.settings.apiProvider
		);

		const historyMessages = this.chatHistory.slice(-10).map(msg => ({
			role: msg.role,
			content: msg.content
		}));
		
		const lastMessage = historyMessages[historyMessages.length - 1];
		const messages = lastMessage && lastMessage.role === 'user' && lastMessage.content === prompt
			? historyMessages
			: [...historyMessages, { role: 'user' as const, content: prompt }];

		let response: Response;
		try {
			// Логируем запрос для отладки
			console.debug('Отправка запроса к API:', {
				url: apiUrl,
				provider: this.settings.apiProvider,
				model: this.settings.model,
				hasKey: !!this.settings.apiKey
			});

			response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.settings.apiKey}`,
				},
				body: JSON.stringify({
					model: this.settings.model,
					messages,
					temperature: this.settings.temperature,
					max_tokens: this.settings.maxTokens,
					stream: true,
				}),
			});

			console.debug('Ответ от API:', {
				status: response.status,
				statusText: response.statusText,
				ok: response.ok
			});
		} catch (error) {
			// Улучшенная обработка ошибок для диагностики
			console.error('Ошибка при запросе к API:', error);
			if (error instanceof TypeError && error.message.includes('fetch')) {
				throw new Error(`Ошибка подключения: Не удалось подключиться к ${apiUrl}. Проверьте:\n1. Правильность URL\n2. Доступность сервера\n3. Настройки CORS (если используется удаленный сервер)\n4. Сетевое подключение`);
			}
			throw error;
		}

		if (!response.ok) {
			const errorText = await response.text();
			let error;
			try {
				error = JSON.parse(errorText);
			} catch {
				error = { error: { message: errorText || 'Неизвестная ошибка' } };
			}
			throw new Error(`Ошибка API (${response.status}): ${error.error?.message || error.message || response.statusText}`);
		}

		const reader = response.body?.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let fullResponse = '';
		let pendingUpdate: string | null = null;
		let updateTimer: number | null = null;

		if (!reader) {
			throw new Error('Не удалось получить reader для streaming');
		}

		const scheduleUpdate = (text: string) => {
			pendingUpdate = text;
			if (updateTimer === null) {
				updateTimer = window.setTimeout(() => {
					if (pendingUpdate !== null) {
						requestAnimationFrame(() => {
							onChunk(pendingUpdate!, false);
							pendingUpdate = null;
							updateTimer = null;
						});
					}
				}, 16);
			}
		};

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				if (updateTimer !== null) {
					clearTimeout(updateTimer);
					updateTimer = null;
				}
				if (pendingUpdate !== null) {
					onChunk(pendingUpdate, false);
				}
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);
					if (data === '[DONE]') {
						if (updateTimer !== null) {
							clearTimeout(updateTimer);
							updateTimer = null;
						}
						if (pendingUpdate !== null) {
							onChunk(pendingUpdate, false);
						}
						onChunk(fullResponse, true);
						return;
					}

					try {
						const json = JSON.parse(data);
						// Поддержка формата OpenAI
						let delta = json.choices?.[0]?.delta?.content;
						// Поддержка альтернативного формата (Ollama и другие)
						if (!delta && json.delta?.content) {
							delta = json.delta.content;
						}
						// Поддержка прямого content в delta
						if (!delta && json.content) {
							delta = json.content;
						}
						// Поддержка text поля
						if (!delta && json.text) {
							delta = json.text;
						}
						
						if (delta) {
							fullResponse += delta;
							scheduleUpdate(fullResponse);
						}
					} catch (e) {
						// Игнорируем ошибки парсинга, но логируем для отладки
						console.debug('Ошибка парсинга streaming данных:', e, 'Данные:', data);
					}
				}
			}
		}

		onChunk(fullResponse, true);
	}

	private copyMessage(content: string) {
		// Очищаем текст от лишних пробелов и форматирования
		const cleanText = content.trim().replace(/\s+/g, ' ');
		
		// Используем Clipboard API для копирования чистого текста
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(cleanText).then(() => {
				this.showCopyNotification();
			}).catch(err => {
				// Fallback для старых браузеров
				this.fallbackCopyText(cleanText);
			});
		} else {
			// Fallback для браузеров без Clipboard API
			this.fallbackCopyText(cleanText);
		}
	}

	private showCopyNotification() {
		const notification = document.createElement('div');
		notification.textContent = '✓ Скопировано в буфер обмена';
		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: var(--background-primary);
			border: 1px solid var(--interactive-accent);
			border-radius: 4px;
			padding: 10px 15px;
			z-index: 10000;
			box-shadow: 0 2px 8px rgba(0,0,0,0.2);
		`;
		document.body.appendChild(notification);
		setTimeout(() => notification.remove(), 2000);
	}

	private fallbackCopyText(text: string) {
		// Создаем временный textarea для копирования
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-999999px';
		textArea.style.top = '-999999px';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		
		try {
			const successful = document.execCommand('copy');
			if (successful) {
				this.showCopyNotification();
			} else {
				console.error('Не удалось скопировать текст');
			}
		} catch (err) {
			console.error('Ошибка копирования:', err);
		} finally {
			document.body.removeChild(textArea);
		}
	}

	private editMessage(messageDiv: HTMLElement, messageIndex: number, currentContent: string) {
		const messageContent = messageDiv.querySelector('.text-enhancer-chat-message-content') as HTMLElement;
		if (!messageContent) return;

		const indexAttr = messageDiv.getAttribute('data-message-index');
		const realIndex = indexAttr ? parseInt(indexAttr) : messageIndex;
		
		if (realIndex < 0 || realIndex >= this.chatHistory.length) {
			console.error('Неверный индекс сообщения для редактирования');
			return;
		}

		const originalContent = currentContent;

		messageContent.empty();
		const editTextarea = messageContent.createEl('textarea', {
			text: originalContent,
			cls: 'text-enhancer-chat-edit-textarea'
		});
		editTextarea.style.cssText = `
			width: 100%;
			min-height: 60px;
			padding: 8px;
			border: 1px solid var(--interactive-accent);
			border-radius: 4px;
			font-family: inherit;
			font-size: 0.9em;
			resize: vertical;
			background-color: var(--background-primary);
			color: var(--text-normal);
		`;

		const editActions = messageContent.createDiv('text-enhancer-chat-edit-actions');
		editActions.style.cssText = `
			display: flex;
			gap: 8px;
			margin-top: 8px;
			justify-content: flex-end;
		`;

		const saveButton = editActions.createEl('button', {
			text: '✓ Сохранить и отправить',
			cls: 'mod-cta'
		});
		saveButton.style.cssText = 'padding: 6px 12px; font-size: 0.85em;';

		const cancelButton = editActions.createEl('button', {
			text: '✕ Отмена',
			cls: 'mod-button'
		});
		cancelButton.style.cssText = 'padding: 6px 12px; font-size: 0.85em;';

		const saveEdit = () => {
			const newContent = editTextarea.value.trim();
			if (!newContent) {
				cancelEdit();
				return;
			}

			this.chatHistory[realIndex].content = newContent;
			this.removeMessagesAfterIndex(realIndex);

			messageContent.empty();
			const contentDiv = messageContent.createEl('div', { text: newContent });
			contentDiv.addClass('text-enhancer-chat-text');

			this.resendMessage(newContent);
		};

		const cancelEdit = () => {
			messageContent.empty();
			const contentDiv = messageContent.createEl('div', { text: originalContent });
			contentDiv.addClass('text-enhancer-chat-text');
		};

		saveButton.onclick = saveEdit;
		cancelButton.onclick = cancelEdit;

		editTextarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				saveEdit();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				cancelEdit();
			}
		});

		editTextarea.focus();
		editTextarea.select();
	}

	private removeMessagesAfterIndex(messageIndex: number) {
		this.chatHistory = this.chatHistory.slice(0, messageIndex + 1);

		const messages = Array.from(this.messagesContainer.children) as HTMLElement[];
		let foundIndex = -1;

		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];
			const indexAttr = msg.getAttribute('data-message-index');
			if (indexAttr && parseInt(indexAttr) === messageIndex) {
				foundIndex = i;
				break;
			}
		}

		if (foundIndex >= 0) {
			for (let i = foundIndex + 1; i < messages.length; i++) {
				messages[i].remove();
			}
		}
	}

	private async resendMessage(message: string) {
		if (this.isStreaming) return;

		this.isStreaming = true;
		if (this.sendButton) {
			this.sendButton.disabled = true;
		}
		if (this.inputEl) {
			this.inputEl.disabled = true;
		}

		const streamingResult = this.addMessage('assistant', '', true);
		
		if (!streamingResult) {
			this.isStreaming = false;
			if (this.sendButton) {
				this.sendButton.disabled = false;
			}
			if (this.inputEl) {
				this.inputEl.disabled = false;
			}
			return;
		}

		const { messageContent, textSpan, cursor } = streamingResult;

		try {
			await this.streamResponse(message, (chunk: string, isComplete: boolean) => {
				if (isComplete) {
					this.finishStreaming(messageContent, textSpan, cursor, chunk);
				} else {
					this.updateStreamingMessage(textSpan, chunk);
				}
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
			this.finishStreaming(messageContent, textSpan, cursor, `Ошибка: ${errorMessage}`);
		} finally {
			// Убеждаемся, что поле ввода разблокировано даже при ошибке
			this.isStreaming = false;
			if (this.sendButton) {
				this.sendButton.disabled = false;
			}
			if (this.inputEl) {
				this.inputEl.disabled = false;
			}
		}
	}
}
