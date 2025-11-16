import { PluginSettings, EnhancementMode } from '../types';

export class AIService {
	private settings: PluginSettings;

	constructor(settings: PluginSettings) {
		this.settings = settings;
	}

	async enhanceText(text: string, mode: EnhancementMode): Promise<string> {
		// Режим тестирования - возвращаем мок-данные
		if (this.settings.testMode || !this.settings.apiKey) {
			return this.getMockResponse(text, mode);
		}

		const prompt = this.buildPrompt(text, mode);
		
		if (this.settings.apiProvider === 'openai' || this.settings.apiProvider === 'custom' || this.settings.apiProvider === 'ollama') {
			return this.callOpenAI(prompt);
		}
		
		if (this.settings.apiProvider === 'anthropic') {
			throw new Error('Провайдер Anthropic пока не поддерживается. Используйте OpenAI, Ollama или Custom API.');
		}
		
		throw new Error(`Провайдер ${this.settings.apiProvider} не поддерживается`);
	}

	private async getMockResponse(text: string, mode: EnhancementMode): Promise<string> {
		// Имитируем задержку API
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		const presetStyle = this.getPresetStyle();
		const styleNote = this.settings.selectedPreset !== 'default' 
			? `\n\n📌 Стиль: ${this.getPresetName()}\n` 
			: '\n';
		
		if (mode === EnhancementMode.IMPROVE) {
			// Мок-ответ для режима улучшения с учетом пресета и форматирования
			let improved = text;
			if (this.settings.selectedPreset === 'formal') {
				improved = text.replace(/!/g, '.').replace(/\?/g, '.'); // Убираем восклицательные знаки
			}
			
			// Форматируем мок-ответ в стиле Obsidian
			const formattedText = this.formatMockText(improved);
			
			return `### **Улучшенный текст** ${styleNote}\n\n${formattedText}\n\n---\n\n✅ **Орфографические ошибки исправлены**\n✅ **Структура улучшена**\n✅ **Текст отформатирован для Obsidian**${presetStyle ? '\n✅ **Применен выбранный стиль**' : ''}\n\n💡 *Это тестовый ответ. Для реальной работы настройте API ключ.*`;
		} else {
			// Мок-ответ для режима дополнения
			const additions = this.getMockAdditions();
			const formattedText = this.formatMockText(text);
			const formattedAdditions = this.formatMockText(additions);
			
			return `### **Улучшенный и дополненный текст** ${styleNote}\n\n${formattedText}\n\n#### **📝 Дополнительные мысли:**\n\n${formattedAdditions}\n\n---\n\n💡 *Это тестовый ответ. Для реальной работы настройте API ключ.*`;
		}
	}

	private getPresetName(): string {
		switch (this.settings.selectedPreset) {
			case 'formal': return 'Формальный';
			case 'informal': return 'Неформальный';
			case 'technical': return 'Технический';
			default: return 'По умолчанию';
		}
	}

	private getMockAdditions(): string {
		switch (this.settings.selectedPreset) {
			case 'formal':
				return 'Следует отметить, что представленная информация требует дополнительного анализа. Необходимо рассмотреть следующие аспекты:\n\n*   **Первый важный аспект**\n*   **Второй важный аспект**\n*   **Третий важный аспект**';
			case 'informal':
				return 'Кстати, это довольно интересная тема! 💡 Вот еще несколько мыслей:\n\n*   **Первая интересная мысль**\n*   **Вторая интересная мысль**\n*   **Третья интересная мысль**';
			case 'technical':
				return 'С технической точки зрения, необходимо рассмотреть следующие параметры:\n\n*   **Технический аспект №1**\n*   **Технический аспект №2**\n*   **Технический аспект №3**';
			default:
				return 'Это важная тема, которая требует внимательного рассмотрения. 📚 Стоит отметить несколько ключевых аспектов:\n\n*   **Первый важный момент**\n*   **Второй важный момент**\n*   **Третий важный момент**';
		}
	}

	private formatMockText(text: string): string {
		// Простое форматирование для мок-ответов
		// Разбиваем на абзацы и добавляем базовое форматирование
		const lines = text.split('\n');
		let formatted = '';
		let inList = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			
			if (!line) {
				if (inList) {
					formatted += '\n';
					inList = false;
				}
				formatted += '\n';
				continue;
			}

			// Если строка начинается с цифры и точки - это нумерованный список
			if (/^\d+\.\s/.test(line)) {
				const content = line.replace(/^\d+\.\s/, '');
				formatted += `*   **${content}**\n`;
				inList = true;
			} else if (line.length > 50) {
				// Обычный абзац
				formatted += `${line}\n\n`;
				inList = false;
			} else {
				// Короткая строка - возможно заголовок или пункт списка
				formatted += `*   ${line}\n`;
				inList = true;
			}
		}

		return formatted.trim();
	}

	async testAPI(): Promise<boolean> {
		// В тестовом режиме всегда возвращаем успех
		if (this.settings.testMode || !this.settings.apiKey) {
			return new Promise<boolean>((resolve) => {
				setTimeout(() => {
					resolve(true);
				}, 500);
			});
		}

		if (!this.settings.apiKey) {
			throw new Error('API ключ не установлен');
		}

		// Для custom и ollama провайдеров проверяем наличие URL
		if ((this.settings.apiProvider === 'custom' || this.settings.apiProvider === 'ollama') && !this.settings.apiUrl) {
			throw new Error(`Для ${this.settings.apiProvider === 'ollama' ? 'Ollama' : 'Custom API'} необходимо указать URL`);
		}

		try {
			const testPrompt = 'Ответь одним словом: "OK"';
			const response = await this.callOpenAI(testPrompt);
			return response.trim().toLowerCase().includes('ok');
		} catch (error) {
			throw error;
		}
	}

	private buildPrompt(text: string, mode: EnhancementMode): string {
		// Используем кастомные промпты если включены
		if (this.settings.useCustomPrompts) {
			if (mode === EnhancementMode.IMPROVE && this.settings.customPromptImprove) {
				const prompt = this.settings.customPromptImprove.replace('{text}', text);
				return prompt.includes(text) ? prompt : `${this.settings.customPromptImprove}\n\n${text}`;
			}
			if (mode === EnhancementMode.ENHANCE && this.settings.customPromptEnhance) {
				const prompt = this.settings.customPromptEnhance.replace('{text}', text);
				return prompt.includes(text) ? prompt : `${this.settings.customPromptEnhance}\n\n${text}`;
			}
		}

		// Промпты с учетом пресета и режима скорости
		const presetStyle = this.getPresetStyle();
		const formattingInstructions = this.getFormattingInstructions();
		
		if (mode === EnhancementMode.IMPROVE) {
			return `${presetStyle}Исправь ошибки и улучши структуру текста. Сделай его понятным и структурированным для Obsidian. Сохрани смысл и стиль.${formattingInstructions}\n\nОтветь только исправленным текстом без комментариев:\n\n${text}`;
		} else {
			return `${presetStyle}Исправь ошибки, улучши структуру и дополни текст релевантными мыслями. Сделай его понятным и структурированным для Obsidian. Сохрани стиль.${formattingInstructions}\n\nОтветь только улучшенным текстом без комментариев:\n\n${text}`;
		}
	}

	private getFormattingInstructions(): string {
		// Оптимизированные инструкции в зависимости от режима скорости
		const baseFormat = 'Форматируй для Obsidian: ### заголовки, #### подзаголовки, * списки, **жирный**, *курсив*, эмодзи где уместно.';
		
		switch (this.settings.speedMode) {
			case 'fast':
				// Минимальные инструкции для скорости
				return `\n\n${baseFormat}`;
			case 'balanced':
				// Сбалансированные инструкции
				return `\n\n${baseFormat} Структурируй логично.`;
			case 'quality':
			default:
				// Полные инструкции для качества
				return `\n\nВАЖНО: ${baseFormat} Структурируй с помощью заголовков и списков. Сохраняй логическую структуру и иерархию.`;
		}
	}

	private getPresetStyle(): string {
		switch (this.settings.selectedPreset) {
			case 'formal':
				return 'Используй формальный, официальный стиль. ';
			case 'informal':
				return 'Используй неформальный, дружелюбный стиль. ';
			case 'technical':
				return 'Используй технический, профессиональный стиль с терминологией. ';
			default:
				return '';
		}
	}

	/**
	 * Нормализует URL API, добавляя /chat/completions если нужно
	 */
	private normalizeApiUrl(url: string | undefined, provider: string): string {
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
	}

	private async callOpenAI(prompt: string): Promise<string> {
		if (!this.settings.apiKey) {
			throw new Error('API ключ не установлен. Пожалуйста, настройте его в настройках плагина.');
		}

		// Для custom и ollama провайдеров проверяем наличие URL
		if ((this.settings.apiProvider === 'custom' || this.settings.apiProvider === 'ollama') && !this.settings.apiUrl) {
			throw new Error(`Для ${this.settings.apiProvider === 'ollama' ? 'Ollama' : 'Custom API'} необходимо указать URL. Пожалуйста, настройте его в настройках плагина.`);
		}

		// Нормализуем URL (добавляем /chat/completions если нужно)
		const apiUrl = this.normalizeApiUrl(
			this.settings.apiProvider === 'custom' || this.settings.apiProvider === 'ollama'
				? this.settings.apiUrl
				: this.settings.apiUrl,
			this.settings.apiProvider
		);

		// Оптимизация параметров в зависимости от режима скорости
		const optimizedParams = this.getOptimizedParams(prompt.length);

		try {
			const response = await fetch(apiUrl, {
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
							content: prompt,
						},
					],
					temperature: optimizedParams.temperature,
					max_tokens: optimizedParams.maxTokens,
				}),
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
			
			// Поддержка разных форматов ответа (OpenAI и совместимые API)
			if (data.choices && data.choices[0]?.message?.content) {
				return data.choices[0].message.content;
			}
			
			// Альтернативный формат ответа
			if (data.content) {
				return data.content;
			}
			
			// Если ответ в другом формате, возвращаем весь ответ как строку
			if (data.text) {
				return data.text;
			}
			
			throw new Error('Неожиданный формат ответа от API. Проверьте формат ответа вашего API.');
		} catch (error) {
			// Улучшенная обработка ошибок для диагностики
			if (error instanceof TypeError && error.message.includes('fetch')) {
				throw new Error(`Ошибка подключения: Не удалось подключиться к ${apiUrl}. Проверьте:\n1. Правильность URL\n2. Доступность сервера\n3. Настройки CORS (если используется удаленный сервер)\n4. Сетевое подключение`);
			}
			throw error;
		}
	}

	private getOptimizedParams(textLength: number): { temperature: number; maxTokens: number } {
		// Оптимизация параметров для ускорения
		const baseMaxTokens = this.settings.maxTokens;
		
		switch (this.settings.speedMode) {
			case 'fast':
				// Быстрый режим: меньше токенов, стандартная температура
				return {
					temperature: this.settings.temperature,
					maxTokens: Math.min(baseMaxTokens, Math.max(1000, textLength * 2))
				};
			case 'balanced':
				// Сбалансированный режим: умеренное количество токенов
				return {
					temperature: this.settings.temperature,
					maxTokens: Math.min(baseMaxTokens, Math.max(1500, textLength * 3))
				};
			case 'quality':
			default:
				// Режим качества: полное количество токенов
				return {
					temperature: this.settings.temperature,
					maxTokens: baseMaxTokens
				};
		}
	}
}

