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

	async testAPI(): Promise<{primary: boolean, fallback?: boolean, primaryError?: string, fallbackError?: string}> {
		// В тестовом режиме всегда возвращаем успех
		if (this.settings.testMode || !this.settings.apiKey) {
			return new Promise<{primary: boolean, fallback?: boolean}>(resolve => {
				setTimeout(() => {
					resolve({ primary: true });
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

		const testPrompt = 'Ответь одним словом: "OK"';
		const results: {primary: boolean, fallback?: boolean, primaryError?: string, fallbackError?: string} = { primary: false };

		// Тестируем основной API
		try {
			const response = await this.callAPI(testPrompt, undefined, this.settings.apiProvider, this.settings.apiUrl, this.settings.apiKey);
			results.primary = response.trim().toLowerCase().includes('ok');
		} catch (error) {
			results.primary = false;
			results.primaryError = error instanceof Error ? error.message : 'Неизвестная ошибка';
		}

		// Тестируем fallback API, если он включен
		if (this.settings.enableFallback && 
			this.settings.fallbackProvider !== 'none' && 
			this.settings.fallbackApiKey &&
			(this.settings.fallbackProvider === 'openai' || 
			 (this.settings.fallbackProvider === 'custom' || this.settings.fallbackProvider === 'ollama') && this.settings.fallbackApiUrl)) {
			try {
				const fallbackResponse = await this.callAPI(
					testPrompt, 
					undefined, 
					this.settings.fallbackProvider as 'openai' | 'anthropic' | 'custom' | 'ollama', 
					this.settings.fallbackApiUrl, 
					this.settings.fallbackApiKey,
					this.settings.fallbackModel
				);
				results.fallback = fallbackResponse.trim().toLowerCase().includes('ok');
			} catch (error) {
				results.fallback = false;
				results.fallbackError = error instanceof Error ? error.message : 'Неизвестная ошибка';
			}
		}

		return results;
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

		// Проверяем, содержит ли URL уже /chat/completions или /completions
		if (url.includes('/chat/completions')) {
			// Уже содержит правильный путь
			return url;
		}

		// Если содержит /completions (но не /chat/completions), заменяем
		if (url.includes('/completions') && !url.includes('/chat/completions')) {
			url = url.replace('/completions', '/chat/completions');
			return url;
		}

		// Если URL не содержит /chat/completions, добавляем его
		// Если URL заканчивается на /v1, добавляем /chat/completions
		if (url.endsWith('/v1')) {
			url = url + '/chat/completions';
		} else if (url.includes('/v1/') && !url.includes('/chat/completions')) {
			// Если есть /v1/, но нет /chat/completions, добавляем
			url = url + '/chat/completions';
		} else if (!url.includes('/v1')) {
			// Если нет /v1/, добавляем /v1/chat/completions
			url = url + '/v1/chat/completions';
		}

		return url;
	}

	/**
	 * Выполняет запрос с поддержкой fallback провайдера
	 * Если включен fallback и основной провайдер не отвечает в течение таймаута,
	 * автоматически переключается на fallback провайдер
	 */
	async callWithFallback(prompt: string, messages?: Array<{role: string, content: string}>): Promise<{response: string, provider: string, usedFallback: boolean}> {
		// Если fallback не включен, используем обычный запрос
		if (!this.settings.enableFallback || this.settings.fallbackProvider === 'none') {
			const response = await this.callAPI(prompt, messages, this.settings.apiProvider, this.settings.apiUrl, this.settings.apiKey);
			return { response, provider: this.settings.apiProvider, usedFallback: false };
		}

		// Проверяем наличие fallback настроек
		if (!this.settings.fallbackApiKey) {
			console.warn('Fallback включен, но API ключ не указан. Используется основной провайдер.');
			const response = await this.callAPI(prompt, messages, this.settings.apiProvider, this.settings.apiUrl, this.settings.apiKey);
			return { response, provider: this.settings.apiProvider, usedFallback: false };
		}

		// Для custom и ollama fallback провайдеров проверяем наличие URL
		if ((this.settings.fallbackProvider === 'custom' || this.settings.fallbackProvider === 'ollama') && !this.settings.fallbackApiUrl) {
			console.warn('Fallback включен, но URL не указан. Используется основной провайдер.');
			const response = await this.callAPI(prompt, messages, this.settings.apiProvider, this.settings.apiUrl, this.settings.apiKey);
			return { response, provider: this.settings.apiProvider, usedFallback: false };
		}

		// Запускаем параллельные запросы
		const timeout = this.settings.fallbackTimeout || 120000;
		
		const primaryRequest = this.callAPI(
			prompt, 
			messages, 
			this.settings.apiProvider, 
			this.settings.apiUrl, 
			this.settings.apiKey,
			undefined // Используем основную модель
		).then(response => ({ response, provider: this.settings.apiProvider, usedFallback: false }));

		const fallbackRequest = new Promise<{response: string, provider: string, usedFallback: boolean}>(resolve => {
			setTimeout(async () => {
				try {
					if (this.settings.fallbackProvider !== 'none') {
						const response = await this.callAPI(
							prompt, 
							messages, 
							this.settings.fallbackProvider as 'openai' | 'anthropic' | 'custom' | 'ollama', 
							this.settings.fallbackApiUrl, 
							this.settings.fallbackApiKey,
							this.settings.fallbackModel // Используем модель fallback
						);
						resolve({ response, provider: this.settings.fallbackProvider, usedFallback: true });
					} else {
						resolve({ response: '', provider: 'none', usedFallback: false });
					}
				} catch (error) {
					// Если fallback тоже не сработал, пробрасываем ошибку
					resolve({ response: '', provider: this.settings.fallbackProvider, usedFallback: true });
				}
			}, timeout);
		});

		// Используем Promise.race для получения первого успешного ответа
		try {
			// Обрабатываем fallback request, чтобы он всегда возвращал валидный результат
			const processedFallbackRequest = fallbackRequest.then(async result => {
				if (!result.response || result.response === '') {
					// Fallback не дал ответ, ждем основной
					return await primaryRequest;
				}
				return result;
			});
			
			const result = await Promise.race([
				primaryRequest,
				processedFallbackRequest
			]);
			
			// Если основной запрос еще не завершился, отменяем его (хотя мы не можем реально отменить fetch)
			// Но это нормально, запрос просто завершится в фоне
			
			return result;
		} catch (error) {
			// Если основной запрос упал, пробуем fallback
			// В этом месте fallbackProvider уже не может быть 'none', так как мы проверили это в начале функции
			try {
				const fallbackResult = await this.callAPI(
					prompt, 
					messages, 
					this.settings.fallbackProvider as 'openai' | 'anthropic' | 'custom' | 'ollama', 
					this.settings.fallbackApiUrl, 
					this.settings.fallbackApiKey,
					this.settings.fallbackModel // Используем модель fallback
				);
				return { response: fallbackResult, provider: this.settings.fallbackProvider, usedFallback: true };
			} catch (fallbackError) {
				// Оба провайдера не сработали
				throw error; // Пробрасываем ошибку основного провайдера
			}
		}
	}

	private async callOpenAI(prompt: string): Promise<string> {
		const result = await this.callWithFallback(prompt);
		return result.response;
	}

	/**
	 * Базовый метод для вызова API
	 */
	private async callAPI(
		prompt: string, 
		messages?: Array<{role: string, content: string}>,
		provider?: 'openai' | 'anthropic' | 'custom' | 'ollama',
		apiUrl?: string,
		apiKey?: string,
		model?: string
	): Promise<string> {
		const actualProvider = provider || this.settings.apiProvider;
		const actualApiKey = apiKey || this.settings.apiKey;
		const actualApiUrl = apiUrl || this.settings.apiUrl;

		if (!actualApiKey) {
			throw new Error('API ключ не установлен. Пожалуйста, настройте его в настройках плагина.');
		}

		// Для custom и ollama провайдеров проверяем наличие URL
		if ((actualProvider === 'custom' || actualProvider === 'ollama') && !actualApiUrl) {
			throw new Error(`Для ${actualProvider === 'ollama' ? 'Ollama' : 'Custom API'} необходимо указать URL. Пожалуйста, настройте его в настройках плагина.`);
		}

		// Нормализуем URL (добавляем /chat/completions если нужно)
		const normalizedUrl = this.normalizeApiUrl(actualApiUrl, actualProvider);

		// Оптимизация параметров в зависимости от режима скорости
		const optimizedParams = this.getOptimizedParams(prompt.length);

		// Формируем сообщения
		const requestMessages = messages || [
			{
				role: 'user',
				content: prompt,
			},
		];

		try {
			const response = await fetch(normalizedUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${actualApiKey}`,
				},
				body: JSON.stringify({
					model: model || this.settings.model,
					messages: requestMessages,
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
				throw new Error(`Ошибка подключения: Не удалось подключиться к ${normalizedUrl}. Проверьте:\n1. Правильность URL\n2. Доступность сервера\n3. Настройки CORS (если используется удаленный сервер)\n4. Сетевое подключение`);
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

