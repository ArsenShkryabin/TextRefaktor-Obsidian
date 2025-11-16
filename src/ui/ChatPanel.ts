import { ItemView, WorkspaceLeaf } from 'obsidian';
import { PluginSettings } from '../types';
import { AIService } from '../api/AIService';

export const CHAT_VIEW_TYPE = 'text-enhancer-chat';

export class ChatPanel extends ItemView {
	private settings: PluginSettings;
	private aiService: AIService;
	private messagesContainer: HTMLElement;
	private inputContainer: HTMLElement;
	private inputEl: HTMLTextAreaElement;
	private sendButton: HTMLButtonElement;
	private chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> = [];
	private isStreaming: boolean = false;

	constructor(leaf: WorkspaceLeaf, settings: PluginSettings, aiService: AIService) {
		super(leaf);
		this.settings = settings;
		this.aiService = aiService;
	}

	getViewType(): string {
		return CHAT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'AI Чат';
	}

	getIcon(): string {
		return 'message-square';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('text-enhancer-chat-container');

		// Заголовок
		const header = container.createDiv('text-enhancer-chat-header');
		header.createEl('h3', { text: '💬 AI Чат для подсказок' });
		
		const clearButton = header.createEl('button', { 
			text: 'Очистить',
			cls: 'mod-cta'
		});
		clearButton.onclick = () => this.clearChat();

		// Контейнер сообщений
		this.messagesContainer = container.createDiv('text-enhancer-chat-messages');
		this.messagesContainer.setAttribute('role', 'log');
		this.messagesContainer.setAttribute('aria-live', 'polite');

		// Контейнер ввода
		this.inputContainer = container.createDiv('text-enhancer-chat-input-container');
		
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

		// Добавляем приветственное сообщение
		this.addMessage('assistant', 'Привет! Я AI-ассистент. Задайте мне вопрос, и я помогу вам с подсказками и советами. 💡');
	}

	async onClose() {
		// Сохраняем историю при закрытии
	}

	private addMessage(role: 'user' | 'assistant', content: string, isStreaming: boolean = false): { messageContent: HTMLDivElement; textSpan: HTMLSpanElement; cursor: HTMLSpanElement } | undefined {
		const messageDiv = this.messagesContainer.createDiv(`text-enhancer-chat-message text-enhancer-chat-message-${role}`);
		
		const messageHeader = messageDiv.createDiv('text-enhancer-chat-message-header');
		messageHeader.createEl('strong', { text: role === 'user' ? 'Вы' : 'AI' });
		messageHeader.createEl('span', { 
			text: new Date().toLocaleTimeString(),
			cls: 'text-enhancer-chat-timestamp'
		});

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

		// Сохраняем в историю
		this.chatHistory.push({
			role,
			content,
			timestamp: Date.now()
		});

		// Прокрутка вниз
		this.scrollToBottom();
		
		return undefined;
	}

	private updateStreamingMessage(textSpan: HTMLSpanElement, newContent: string) {
		// Плавное обновление текста без мигания
		requestAnimationFrame(() => {
			textSpan.textContent = newContent;
			this.scrollToBottom();
		});
	}

	private finishStreaming(messageContent: HTMLDivElement, textSpan: HTMLSpanElement, cursor: HTMLSpanElement, finalContent: string) {
		// Убираем класс streaming
		messageContent.removeClass('text-enhancer-chat-streaming');
		
		// Обновляем финальный текст
		textSpan.textContent = finalContent;
		
		// Удаляем курсор
		cursor.remove();
		
		// Сохраняем в историю
		this.chatHistory.push({
			role: 'assistant',
			content: finalContent,
			timestamp: Date.now()
		});
		
		// Разблокируем ввод
		this.isStreaming = false;
		this.sendButton.disabled = false;
		this.inputEl.disabled = false;
		
		// Прокрутка вниз
		this.scrollToBottom();
	}

	private scrollToBottom() {
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private async sendMessage() {
		const message = this.inputEl.value.trim();
		if (!message || this.isStreaming) return;

		// Очищаем поле ввода
		this.inputEl.value = '';
		this.inputEl.style.height = 'auto';

		// Добавляем сообщение пользователя
		this.addMessage('user', message);

		// Блокируем ввод
		this.isStreaming = true;
		this.sendButton.disabled = true;
		this.inputEl.disabled = true;

		// Добавляем сообщение ассистента (streaming)
		const streamingResult = this.addMessage('assistant', '', true);
		
		if (!streamingResult) {
			this.isStreaming = false;
			this.sendButton.disabled = false;
			this.inputEl.disabled = false;
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
		}
	}

	private async streamResponse(prompt: string, onChunk: (chunk: string, isComplete: boolean) => void) {
		if (this.settings.testMode || !this.settings.apiKey) {
			// Мок streaming для тестового режима с более плавной анимацией
			const mockResponse = 'Это тестовый ответ. В тестовом режиме AI отвечает с эффектом печати. Для реальных ответов настройте API ключ в настройках плагина. 💡';
			let currentText = '';
			// Группируем символы для более плавного отображения
			const chunkSize = 2; // По 2 символа за раз
			for (let i = 0; i < mockResponse.length; i += chunkSize) {
				currentText += mockResponse.slice(i, i + chunkSize);
				// Используем requestAnimationFrame для плавного обновления
				await new Promise(resolve => {
					requestAnimationFrame(() => {
						onChunk(currentText, false);
						setTimeout(resolve, 10); // Небольшая задержка для визуального эффекта
					});
				});
			}
			onChunk(mockResponse, true);
			return;
		}

		// Реальный streaming запрос
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
					...this.chatHistory.slice(-10).map(msg => ({
						role: msg.role,
						content: msg.content
					})),
					{
						role: 'user',
						content: prompt,
					},
				],
				temperature: this.settings.temperature,
				max_tokens: this.settings.maxTokens,
				stream: true,
			}),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: { message: 'Неизвестная ошибка' } }));
			throw new Error(`Ошибка API: ${error.error?.message || response.statusText}`);
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

		// Функция для батчинга обновлений
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
				}, 16); // ~60 FPS для плавного обновления
			}
		};

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				// Финальное обновление
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
						const delta = json.choices[0]?.delta?.content;
						if (delta) {
							fullResponse += delta;
							// Используем батчинг для плавного обновления
							scheduleUpdate(fullResponse);
						}
					} catch (e) {
						// Игнорируем ошибки парсинга
					}
				}
			}
		}

		onChunk(fullResponse, true);
	}

	private clearChat() {
		this.chatHistory = [];
		this.messagesContainer.empty();
		this.addMessage('assistant', 'История очищена. Задайте новый вопрос! 💡');
	}
}

