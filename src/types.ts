export interface PluginSettings {
	apiKey: string;
	apiProvider: 'openai' | 'anthropic' | 'custom' | 'ollama';
	apiUrl?: string;
	model: string;
	temperature: number;
	maxTokens: number;
	hotkeyImprove: string;
	hotkeyEnhance: string;
	testMode: boolean; // Режим тестирования без API
	// Настраиваемые промпты
	customPromptImprove: string;
	customPromptEnhance: string;
	useCustomPrompts: boolean;
	// Пресеты
	selectedPreset: 'default' | 'formal' | 'informal' | 'technical';
	// Скорость обработки
	speedMode: 'quality' | 'balanced' | 'fast'; // quality - качество, balanced - баланс, fast - скорость
	// Fallback провайдер (параллельная работа)
	enableFallback: boolean; // Включить fallback провайдер
	fallbackProvider: 'openai' | 'anthropic' | 'custom' | 'ollama' | 'none';
	fallbackApiUrl?: string;
	fallbackApiKey?: string;
	fallbackModel?: string; // Модель для резервного провайдера
	fallbackTimeout: number; // Таймаут в миллисекундах перед переключением на fallback (по умолчанию 5000)
}

export interface TextHistory {
	original: string;
	enhanced: string;
	timestamp: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	apiKey: '',
	apiProvider: 'openai',
	apiUrl: 'https://api.openai.com/v1/chat/completions',
	model: 'gpt-4o-mini',
	temperature: 0.7,
	maxTokens: 2000,
	hotkeyImprove: '',
	hotkeyEnhance: '',
	testMode: false,
	customPromptImprove: '',
	customPromptEnhance: '',
	useCustomPrompts: false,
	selectedPreset: 'default',
	speedMode: 'balanced',
	enableFallback: false,
	fallbackProvider: 'none',
	fallbackApiUrl: undefined,
	fallbackApiKey: undefined,
	fallbackModel: undefined,
	fallbackTimeout: 120000, // 2 минуты по умолчанию
};

export enum EnhancementMode {
	IMPROVE = 'improve', // Исправление и структурирование
	ENHANCE = 'enhance', // Дополнение мыслями
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
	isStreaming?: boolean;
}

export interface Chat {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: number;
	updatedAt: number;
}

export interface ChatSettings {
	chats: Chat[];
	currentChatId: string | null;
	maxHistoryLength: number;
}

