export interface PluginSettings {
	apiKey: string;
	apiProvider: 'openai' | 'anthropic' | 'custom';
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

export interface ChatSettings {
	chatHistory: ChatMessage[];
	maxHistoryLength: number;
}

